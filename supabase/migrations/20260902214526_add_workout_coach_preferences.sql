-- Workout coaching preferences are deliberately separate from Body Analysis.
-- A user can receive personalised recommendations without accepting photo analysis.
create table public.workout_coach_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  training_location text not null check (training_location in ('home', 'gym', 'both')),
  experience text not null check (experience in ('beginner', 'intermediate', 'advanced')),
  days_per_week smallint not null check (days_per_week between 2 and 6),
  session_minutes smallint not null check (session_minutes in (20, 30, 45, 60, 75, 90)),
  routine text not null check (routine in ('coach', 'full_body', 'upper_lower', 'push_pull_legs')),
  equipment text[] not null default '{}',
  limitations_note text,
  updated_at timestamptz not null default now(),
  check (limitations_note is null or char_length(limitations_note) <= 240),
  check (cardinality(equipment) <= 12)
);

alter table public.workout_coach_preferences enable row level security;
revoke all on table public.workout_coach_preferences from anon, authenticated;
grant select, insert, update on table public.workout_coach_preferences to authenticated;

create policy "own workout coach preferences select"
  on public.workout_coach_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "own workout coach preferences insert"
  on public.workout_coach_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "own workout coach preferences update"
  on public.workout_coach_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
