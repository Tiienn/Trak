create table public.fat_loss_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  activity_baseline text not null default 'some' check (activity_baseline in ('inactive', 'some', 'active')),
  comfortable_cardio_minutes smallint not null default 10 check (comfortable_cardio_minutes in (5, 10, 20, 30)),
  preferred_cardio_modes text[] not null default array['walking']::text[],
  balance_concern boolean not null default false,
  chair_stand_comfortable boolean not null default true,
  movement_breaks boolean not null default false,
  phase text not null default 'loss' check (phase in ('loss', 'maintenance')),
  updated_at timestamptz not null default now(),
  check (preferred_cardio_modes <@ array['walking', 'indoor_low_impact', 'cycling', 'elliptical', 'pool']::text[]),
  check (cardinality(preferred_cardio_modes) between 1 and 5)
);

alter table public.fat_loss_preferences enable row level security;
revoke all on table public.fat_loss_preferences from anon, authenticated;
grant select, insert, update on table public.fat_loss_preferences to authenticated;

create policy "own fat loss preferences select"
  on public.fat_loss_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "own fat loss preferences insert"
  on public.fat_loss_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own fat loss preferences update"
  on public.fat_loss_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

