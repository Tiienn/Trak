-- Completed workouts now carry the split(s) selected by the user and an
-- explicit set count per muscle group. One recorded set is one Progress point.
alter table public.exercises
  add column if not exists workout_splits text[] not null default '{}'::text[],
  add column if not exists chest_sets integer not null default 0,
  add column if not exists leg_sets integer not null default 0,
  add column if not exists back_sets integer not null default 0,
  add column if not exists arm_sets integer not null default 0;

alter table public.exercises
  drop constraint if exists exercises_workout_splits_check,
  drop constraint if exists exercises_chest_sets_check,
  drop constraint if exists exercises_leg_sets_check,
  drop constraint if exists exercises_back_sets_check,
  drop constraint if exists exercises_arm_sets_check;

alter table public.exercises
  add constraint exercises_workout_splits_check
    check (workout_splits <@ array['upper_body', 'lower_body', 'push', 'pull']::text[]),
  add constraint exercises_chest_sets_check check (chest_sets between 0 and 100),
  add constraint exercises_leg_sets_check check (leg_sets between 0 and 100),
  add constraint exercises_back_sets_check check (back_sets between 0 and 100),
  add constraint exercises_arm_sets_check check (arm_sets between 0 and 100);

-- A small reusable plan powers Today's training. It belongs to the signed-in
-- user, so customisation follows the account across devices.
create table if not exists public.training_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  muscle_group text not null check (muscle_group in ('chest', 'legs', 'back', 'arms')),
  sets integer not null check (sets between 1 and 20),
  reps text not null default '8–12' check (char_length(trim(reps)) between 1 and 20),
  position integer not null default 0 check (position between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists training_plan_items_user_position_idx
  on public.training_plan_items (user_id, position, created_at);

alter table public.training_plan_items enable row level security;

revoke all on table public.training_plan_items from anon, authenticated;
grant select, insert, update, delete on table public.training_plan_items to authenticated;

drop policy if exists "own training plan select" on public.training_plan_items;
create policy "own training plan select"
  on public.training_plan_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own training plan insert" on public.training_plan_items;
create policy "own training plan insert"
  on public.training_plan_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own training plan update" on public.training_plan_items;
create policy "own training plan update"
  on public.training_plan_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own training plan delete" on public.training_plan_items;
create policy "own training plan delete"
  on public.training_plan_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);
