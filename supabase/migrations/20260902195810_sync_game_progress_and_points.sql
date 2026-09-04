-- Keep game progress on the signed-in account and award a small, bounded
-- Trak Points bonus for the first completed round of each game per server day.
create table public.game_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(stats) = 'object')
);

alter table public.game_stats enable row level security;
revoke all on table public.game_stats from anon, authenticated;
grant select, insert, update on table public.game_stats to authenticated;

create policy "own game stats select"
  on public.game_stats for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own game stats insert"
  on public.game_stats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own game stats update"
  on public.game_stats for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.trak_point_ledger
  add column if not exists game_key text;

alter table public.trak_point_ledger
  drop constraint if exists trak_point_ledger_source_check,
  drop constraint if exists trak_point_ledger_check;

alter table public.trak_point_ledger
  add constraint trak_point_ledger_source_check
    check (source in ('mission', 'reward', 'game')),
  add constraint trak_point_ledger_check check (
    (source = 'mission' and amount = 20 and mission_key is not null and day is not null
      and reward_key is null and game_key is null)
    or
    (source = 'reward' and amount < 0 and mission_key is null and day is null
      and reward_key is not null and game_key is null)
    or
    (source = 'game' and amount in (5, 10) and mission_key is null and day is not null
      and reward_key is null and game_key in ('compare', 'portion', 'build', 'daily_build'))
  );

create or replace function public.award_game_trak_points(p_game_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_amount integer;
  v_awarded boolean := false;
  v_balance integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  v_amount := case p_game_key
    when 'daily_build' then 10
    when 'compare' then 5
    when 'portion' then 5
    when 'build' then 5
    else null
  end;
  if v_amount is null then raise exception 'Unknown game'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  insert into public.trak_point_ledger (
    user_id, event_key, amount, source, day, game_key
  ) values (
    v_user_id,
    'game:' || current_date::text || ':' || p_game_key,
    v_amount,
    'game',
    current_date,
    p_game_key
  ) on conflict (user_id, event_key) do nothing;
  v_awarded := found;

  select coalesce(sum(amount), 0)::integer into v_balance
    from public.trak_point_ledger where user_id = v_user_id;

  return jsonb_build_object(
    'awarded', v_awarded,
    'amount', case when v_awarded then v_amount else 0 end,
    'balance', v_balance
  );
end;
$$;

revoke all on function public.award_game_trak_points(text) from public, anon;
grant execute on function public.award_game_trak_points(text) to authenticated;
