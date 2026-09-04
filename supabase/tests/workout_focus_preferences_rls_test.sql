BEGIN;
SELECT plan(1);

-- Examples: https://pgtap.org/documentation.html

SELECT * FROM finish();
ROLLBACK;
begin;
select plan(8);

insert into auth.users (id, email)
values
  ('33333333-3333-3333-3333-333333333333', 'focus-one@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'focus-two@example.com');

insert into public.workout_focus_preferences (user_id, priority_muscle, focus_started_on, baseline_weekly_sets)
values ('44444444-4444-4444-4444-444444444444', 'back', current_date, 8);

select ok(
  has_table_privilege('authenticated', 'public.workout_focus_preferences', 'select,insert,update'),
  'authenticated can sync workout focus'
);
select ok(
  not has_table_privilege('authenticated', 'public.workout_focus_preferences', 'delete'),
  'authenticated cannot delete workout focus directly'
);
select ok(
  not has_table_privilege('anon', 'public.workout_focus_preferences', 'select,insert,update,delete'),
  'anon has no workout focus access'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select lives_ok(
  $$insert into public.workout_focus_preferences (user_id, priority_muscle, focus_started_on, baseline_weekly_sets)
    values ('33333333-3333-3333-3333-333333333333', 'chest', current_date, 6)$$,
  'a user saves their own focus'
);
select throws_ok(
  $$insert into public.workout_focus_preferences (user_id, priority_muscle, focus_started_on, baseline_weekly_sets)
    values ('44444444-4444-4444-4444-444444444444', 'legs', current_date, 6)
    on conflict (user_id) do update set priority_muscle = excluded.priority_muscle$$,
  '42501',
  null,
  'a user cannot overwrite another focus'
);
select results_eq(
  $$select priority_muscle from public.workout_focus_preferences order by user_id$$,
  array['chest'::text],
  'a user sees only their own focus'
);
select lives_ok(
  $$update public.workout_focus_preferences set priority_muscle = 'arms' where user_id = '33333333-3333-3333-3333-333333333333'$$,
  'a user updates their own focus'
);
select results_eq(
  $$select priority_muscle from public.workout_focus_preferences where user_id = '33333333-3333-3333-3333-333333333333'$$,
  array['arms'::text],
  'the own-row update is visible'
);

select * from finish();
rollback;
