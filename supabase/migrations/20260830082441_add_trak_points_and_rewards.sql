-- Daily Trak Points are a durable wallet. Weekly muscle points intentionally
-- remain on exercise rows and never enter this ledger.
alter table public.profiles
  add column if not exists diet text not null default 'balanced';

alter table public.profiles
  drop constraint if exists profiles_diet_check,
  add constraint profiles_diet_check
    check (diet in ('balanced', 'high_protein', 'low_carb'));

create table public.trak_reward_catalog (
  key text primary key,
  kind text not null check (kind in ('shield', 'badge', 'frame', 'theme')),
  title text not null check (char_length(trim(title)) between 1 and 60),
  description text not null check (char_length(trim(description)) between 1 and 180),
  cost integer not null check (cost > 0),
  accent text,
  tint text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.trak_reward_catalog (key, kind, title, description, cost, accent, tint)
values
  ('streak_shield', 'shield', 'Streak Shield', 'Bank one shield for a future missed-day save.', 200, '#3D6B4F', '#E3EAD7'),
  ('trailblazer_badge', 'badge', 'Trailblazer badge', 'Show a green achievement mark on your profile.', 300, '#3D6B4F', '#E3EAD7'),
  ('forest_frame', 'frame', 'Forest frame', 'Add a deep forest ring around your profile avatar.', 450, '#2C5039', '#E3EAD7'),
  ('sunrise_missions', 'theme', 'Sunrise missions', 'Warm terracotta styling for your Daily Missions card.', 600, '#D97843', '#F5E2D4'),
  ('golden_missions', 'theme', 'Golden missions', 'A soft gold Daily Missions card theme.', 800, '#A67A16', '#F4E8BD');

create table public.trak_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  amount integer not null check (amount <> 0),
  source text not null check (source in ('mission', 'reward')),
  mission_key text check (mission_key is null or mission_key in ('meals', 'protein', 'calories', 'water', 'workout')),
  day date,
  reward_key text references public.trak_reward_catalog(key),
  created_at timestamptz not null default now(),
  unique (user_id, event_key),
  check (
    (source = 'mission' and amount = 20 and mission_key is not null and day is not null and reward_key is null)
    or
    (source = 'reward' and amount < 0 and mission_key is null and day is null and reward_key is not null)
  )
);

create index trak_point_ledger_user_created_idx
  on public.trak_point_ledger (user_id, created_at desc);

create table public.trak_reward_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_key text not null references public.trak_reward_catalog(key),
  quantity integer not null default 1 check (quantity > 0),
  purchased_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, reward_key)
);

create table public.trak_reward_equipment (
  user_id uuid primary key references auth.users(id) on delete cascade,
  badge_key text references public.trak_reward_catalog(key),
  frame_key text references public.trak_reward_catalog(key),
  theme_key text references public.trak_reward_catalog(key),
  updated_at timestamptz not null default now()
);

alter table public.trak_reward_catalog enable row level security;
alter table public.trak_point_ledger enable row level security;
alter table public.trak_reward_inventory enable row level security;
alter table public.trak_reward_equipment enable row level security;

revoke all on public.trak_reward_catalog from anon, authenticated;
revoke all on public.trak_point_ledger from anon, authenticated;
revoke all on public.trak_reward_inventory from anon, authenticated;
revoke all on public.trak_reward_equipment from anon, authenticated;

grant select on public.trak_reward_catalog to authenticated;
grant select on public.trak_point_ledger to authenticated;
grant select on public.trak_reward_inventory to authenticated;
grant select on public.trak_reward_equipment to authenticated;

create policy "authenticated reward catalog"
  on public.trak_reward_catalog for select
  to authenticated
  using (active);

create policy "own point ledger"
  on public.trak_point_ledger for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own reward inventory"
  on public.trak_reward_inventory for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own reward equipment"
  on public.trak_reward_equipment for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Re-check source logs inside the database before awarding currency. The
-- client cannot choose an amount or directly insert a ledger row.
create or replace function public.sync_daily_trak_missions(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_meal_count integer := 0;
  v_calories numeric := 0;
  v_protein numeric := 0;
  v_water integer := 0;
  v_workout_minutes integer := 0;
  v_burned integer := 0;
  v_activity_multiplier numeric;
  v_goal_delta integer;
  v_protein_multiplier numeric;
  v_calorie_target integer;
  v_protein_target integer;
  v_calorie_budget integer;
  v_key text;
  v_complete boolean;
  v_awarded text[] := '{}';
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_day is null or p_day < current_date - 2 or p_day > current_date + 1 then
    raise exception 'Mission date is outside the allowed range';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select * into v_profile from public.profiles where user_id = v_user_id;
  if not found then
    raise exception 'Complete your profile before earning Trak Points';
  end if;

  select count(*), coalesce(sum(calories), 0), coalesce(sum(protein_g), 0)
    into v_meal_count, v_calories, v_protein
    from public.meals
    where user_id = v_user_id and day = p_day;

  select coalesce(max(glasses), 0)
    into v_water
    from public.water
    where user_id = v_user_id and day = p_day;

  select coalesce(sum(duration_minutes), 0), coalesce(sum(calories_burned), 0)
    into v_workout_minutes, v_burned
    from public.exercises
    where user_id = v_user_id and day = p_day;

  v_activity_multiplier := case v_profile.activity
    when 'sedentary' then 1.2
    when 'light' then 1.375
    when 'moderate' then 1.55
    when 'active' then 1.725
    when 'very_active' then 1.9
    else 1.2
  end;
  v_goal_delta := case v_profile.goal when 'lose' then -500 when 'gain' then 400 else 0 end;
  v_protein_multiplier := case v_profile.goal when 'lose' then 2.3 when 'gain' then 1.8 else 1.6 end
    + case v_profile.diet when 'high_protein' then 0.3 else 0 end;
  v_calorie_target := greatest(
    1200,
    round(((10 * v_profile.weight_kg + 6.25 * v_profile.height_cm - 5 * v_profile.age
      + case v_profile.sex when 'male' then 5 else -161 end) * v_activity_multiplier
      + v_goal_delta) / 10.0) * 10
  );
  v_protein_target := round(v_profile.weight_kg * v_protein_multiplier);
  v_calorie_budget := v_calorie_target + round(v_burned * 0.5);

  foreach v_key in array array['meals', 'protein', 'calories', 'water', 'workout'] loop
    v_complete := case v_key
      when 'meals' then v_meal_count >= 3
      when 'protein' then v_protein_target > 0 and v_protein >= v_protein_target
      when 'calories' then v_meal_count >= 3 and v_calories >= v_calorie_budget * 0.8
      when 'water' then v_water >= greatest(1, coalesce(v_profile.water_goal, 8))
      when 'workout' then v_workout_minutes >= 30
      else false
    end;

    if v_complete then
      insert into public.trak_point_ledger (
        user_id, event_key, amount, source, mission_key, day
      ) values (
        v_user_id, 'mission:' || p_day::text || ':' || v_key, 20, 'mission', v_key, p_day
      ) on conflict (user_id, event_key) do nothing;
      if found then v_awarded := array_append(v_awarded, v_key); end if;
    end if;
  end loop;

  select coalesce(sum(amount), 0)::integer into v_balance
    from public.trak_point_ledger where user_id = v_user_id;

  return jsonb_build_object('balance', v_balance, 'awarded', to_jsonb(v_awarded));
end;
$$;

create or replace function public.purchase_trak_reward(p_reward_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_reward public.trak_reward_catalog%rowtype;
  v_balance integer;
  v_existing integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select * into v_reward
    from public.trak_reward_catalog
    where key = p_reward_key and active;
  if not found then raise exception 'Reward is unavailable'; end if;

  select quantity into v_existing
    from public.trak_reward_inventory
    where user_id = v_user_id and reward_key = p_reward_key;
  if found and v_reward.kind <> 'shield' then
    raise exception 'Reward already owned';
  end if;

  select coalesce(sum(amount), 0)::integer into v_balance
    from public.trak_point_ledger where user_id = v_user_id;
  if v_balance < v_reward.cost then raise exception 'Not enough Trak Points'; end if;

  insert into public.trak_point_ledger (
    user_id, event_key, amount, source, reward_key
  ) values (
    v_user_id, 'reward:' || p_reward_key || ':' || gen_random_uuid()::text,
    -v_reward.cost, 'reward', p_reward_key
  );

  insert into public.trak_reward_inventory (user_id, reward_key, quantity)
  values (v_user_id, p_reward_key, 1)
  on conflict (user_id, reward_key) do update
    set quantity = public.trak_reward_inventory.quantity + 1,
        updated_at = now();

  return jsonb_build_object('balance', v_balance - v_reward.cost, 'rewardKey', p_reward_key);
end;
$$;

create or replace function public.equip_trak_reward(p_reward_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_kind text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select catalog.kind into v_kind
    from public.trak_reward_inventory inventory
    join public.trak_reward_catalog catalog on catalog.key = inventory.reward_key
    where inventory.user_id = v_user_id
      and inventory.reward_key = p_reward_key
      and catalog.kind in ('badge', 'frame', 'theme');
  if not found then raise exception 'Reward is not owned or cannot be equipped'; end if;

  insert into public.trak_reward_equipment (user_id, badge_key, frame_key, theme_key)
  values (
    v_user_id,
    case when v_kind = 'badge' then p_reward_key end,
    case when v_kind = 'frame' then p_reward_key end,
    case when v_kind = 'theme' then p_reward_key end
  )
  on conflict (user_id) do update set
    badge_key = case when v_kind = 'badge' then p_reward_key else public.trak_reward_equipment.badge_key end,
    frame_key = case when v_kind = 'frame' then p_reward_key else public.trak_reward_equipment.frame_key end,
    theme_key = case when v_kind = 'theme' then p_reward_key else public.trak_reward_equipment.theme_key end,
    updated_at = now();

  return jsonb_build_object('equipped', p_reward_key, 'kind', v_kind);
end;
$$;

create or replace function public.get_trak_points_balance()
returns integer
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(sum(amount), 0)::integer
  from public.trak_point_ledger
  where user_id = (select auth.uid());
$$;

revoke all on function public.sync_daily_trak_missions(date) from public, anon;
revoke all on function public.purchase_trak_reward(text) from public, anon;
revoke all on function public.equip_trak_reward(text) from public, anon;
revoke all on function public.get_trak_points_balance() from public, anon;
grant execute on function public.sync_daily_trak_missions(date) to authenticated;
grant execute on function public.purchase_trak_reward(text) to authenticated;
grant execute on function public.equip_trak_reward(text) to authenticated;
grant execute on function public.get_trak_points_balance() to authenticated;
