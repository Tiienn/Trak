alter table public.workout_coach_preferences
  drop constraint workout_coach_preferences_days_per_week_check,
  drop constraint workout_coach_preferences_session_minutes_check;

alter table public.workout_coach_preferences
  add constraint workout_coach_preferences_days_per_week_check
    check (days_per_week between 1 and 7),
  add constraint workout_coach_preferences_session_minutes_check
    check (session_minutes between 5 and 180);
