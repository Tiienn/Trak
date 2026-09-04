-- Store the user's explicit muscle priority independently of Body Analysis so
-- every signed-in user can use workout recommendations.
create table public.workout_focus_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  priority_muscle text check (priority_muscle in ('chest', 'legs', 'back', 'arms', 'shoulders', 'abs', 'glutes')),
  focus_started_on date,
  baseline_weekly_sets smallint not null default 0 check (baseline_weekly_sets between 0 and 20),
  updated_at timestamptz not null default now(),
  check (
    (priority_muscle is null and focus_started_on is null and baseline_weekly_sets = 0)
    or (priority_muscle is not null and focus_started_on is not null)
  )
);

alter table public.workout_focus_preferences enable row level security;
revoke all on table public.workout_focus_preferences from anon, authenticated;
grant select, insert, update on table public.workout_focus_preferences to authenticated;

create policy "own workout focus select"
  on public.workout_focus_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own workout focus insert"
  on public.workout_focus_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own workout focus update"
  on public.workout_focus_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
