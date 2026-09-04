-- Cardio intensity lets completed workouts contribute moderate-equivalent
-- minutes to the weekly target. Existing explicit cardio logs and plans are
-- conservatively treated as moderate; strength-only rows keep this nullable.
alter table public.exercises
  add column if not exists cardio_intensity text;

update public.exercises
set cardio_intensity = 'moderate'
where cardio_intensity is null
  and 'cardio' = any(workout_splits);

alter table public.exercises
  drop constraint if exists exercises_cardio_intensity_check,
  add constraint exercises_cardio_intensity_check
    check (
      cardio_intensity is null
      or (
        cardio_intensity in ('light', 'moderate', 'vigorous')
        and 'cardio' = any(workout_splits)
      )
    );

alter table public.training_plan_items
  add column if not exists cardio_intensity text;

update public.training_plan_items
set cardio_intensity = 'moderate'
where activity_type = 'cardio'
  and cardio_intensity is null;

alter table public.training_plan_items
  drop constraint if exists training_plan_items_cardio_intensity_check,
  add constraint training_plan_items_cardio_intensity_check
    check (
      (activity_type = 'cardio' and cardio_intensity in ('light', 'moderate', 'vigorous'))
      or (activity_type <> 'cardio' and cardio_intensity is null)
    );
