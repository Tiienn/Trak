alter table public.exercises
  add column if not exists duration_minutes integer not null default 30;

alter table public.exercises
  drop constraint if exists exercises_duration_minutes_check;

alter table public.exercises
  add constraint exercises_duration_minutes_check
  check (duration_minutes between 1 and 1440);
