-- Expand completed-workout detail to every strength area shown in Progress.
-- Legacy split values remain valid so existing workout rows continue to load.
alter table public.exercises
  add column if not exists shoulder_sets integer not null default 0,
  add column if not exists ab_sets integer not null default 0,
  add column if not exists glute_sets integer not null default 0,
  add column if not exists other_sets integer not null default 0;

alter table public.exercises
  drop constraint if exists exercises_workout_splits_check,
  drop constraint if exists exercises_shoulder_sets_check,
  drop constraint if exists exercises_ab_sets_check,
  drop constraint if exists exercises_glute_sets_check,
  drop constraint if exists exercises_other_sets_check;

alter table public.exercises
  add constraint exercises_workout_splits_check
    check (workout_splits <@ array[
      'upper_body', 'lower_body', 'push', 'pull',
      'chest', 'legs', 'back', 'arms', 'shoulders', 'abs', 'glutes', 'other',
      'full_body', 'cardio'
    ]::text[]),
  add constraint exercises_shoulder_sets_check check (shoulder_sets between 0 and 100),
  add constraint exercises_ab_sets_check check (ab_sets between 0 and 100),
  add constraint exercises_glute_sets_check check (glute_sets between 0 and 100),
  add constraint exercises_other_sets_check check (other_sets between 0 and 100);

-- Strength plan items keep a target load. Cardio items replace sets/reps with
-- a duration and calorie target. Existing items remain strength exercises.
alter table public.training_plan_items
  add column if not exists activity_type text not null default 'strength',
  add column if not exists load_value numeric(7,2),
  add column if not exists load_unit text not null default 'kg',
  add column if not exists duration_target_minutes integer,
  add column if not exists calorie_target integer;

alter table public.training_plan_items
  alter column muscle_group drop not null,
  drop constraint if exists training_plan_items_muscle_group_check,
  drop constraint if exists training_plan_items_activity_type_check,
  drop constraint if exists training_plan_items_load_value_check,
  drop constraint if exists training_plan_items_load_unit_check,
  drop constraint if exists training_plan_items_strength_details_check,
  drop constraint if exists training_plan_items_cardio_details_check;

alter table public.training_plan_items
  add constraint training_plan_items_muscle_group_check
    check (muscle_group is null or muscle_group in (
      'chest', 'legs', 'back', 'arms', 'shoulders', 'abs', 'glutes', 'other'
    )),
  add constraint training_plan_items_activity_type_check
    check (activity_type in ('strength', 'cardio')),
  add constraint training_plan_items_load_value_check
    check (load_value is null or load_value between 0 and 2000),
  add constraint training_plan_items_load_unit_check
    check (load_unit in ('kg', 'lb')),
  add constraint training_plan_items_strength_details_check
    check (activity_type <> 'strength' or muscle_group is not null),
  add constraint training_plan_items_cardio_details_check
    check (
      activity_type <> 'cardio'
      or (
        muscle_group is null
        and duration_target_minutes between 1 and 1440
        and calorie_target between 0 and 10000
      )
    );

-- Record each load target change so the user can compare progressive overload
-- across weeks instead of only seeing the latest value.
create table if not exists public.training_load_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_plan_item_id uuid not null references public.training_plan_items(id) on delete cascade,
  load_value numeric(7,2) not null check (load_value between 0 and 2000),
  load_unit text not null check (load_unit in ('kg', 'lb')),
  created_at timestamptz not null default now()
);

create index if not exists training_load_history_user_item_created_idx
  on public.training_load_history (user_id, training_plan_item_id, created_at desc);

alter table public.training_load_history enable row level security;

revoke all on table public.training_load_history from anon, authenticated;
grant select, insert, delete on table public.training_load_history to authenticated;

drop policy if exists "own training load history select" on public.training_load_history;
create policy "own training load history select"
  on public.training_load_history for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own training load history insert" on public.training_load_history;
create policy "own training load history insert"
  on public.training_load_history for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.training_plan_items item
      where item.id = training_plan_item_id
        and item.user_id = (select auth.uid())
    )
  );

drop policy if exists "own training load history delete" on public.training_load_history;
create policy "own training load history delete"
  on public.training_load_history for delete
  to authenticated
  using ((select auth.uid()) = user_id);
