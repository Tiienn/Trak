begin;
select plan(6);

insert into auth.users (id, email)
values
  ('55555555-5555-5555-5555-555555555555', 'coach-one@example.com'),
  ('66666666-6666-6666-6666-666666666666', 'coach-two@example.com');

insert into public.workout_coach_preferences (user_id, training_location, experience, days_per_week, session_minutes, routine, equipment)
values ('66666666-6666-6666-6666-666666666666', 'home', 'beginner', 3, 30, 'full_body', '{}');

select ok(has_table_privilege('authenticated', 'public.workout_coach_preferences', 'select,insert,update'), 'authenticated can sync their workout setup');
select ok(not has_table_privilege('authenticated', 'public.workout_coach_preferences', 'delete'), 'authenticated cannot delete workout setup directly');
select ok(not has_table_privilege('anon', 'public.workout_coach_preferences', 'select,insert,update,delete'), 'anon has no workout setup access');

set local role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-5555-5555-555555555555', true);

select lives_ok(
  $$insert into public.workout_coach_preferences (user_id, training_location, experience, days_per_week, session_minutes, routine, equipment)
    values ('55555555-5555-5555-5555-555555555555', 'gym', 'intermediate', 7, 73, 'push_pull_legs', array['Machines'])$$,
  'a user saves a custom workout schedule'
);
select lives_ok(
  $$update public.workout_coach_preferences set training_location = 'both' where user_id = '55555555-5555-5555-5555-555555555555'$$,
  'a user updates their own workout setup'
);
select results_eq(
  $$select training_location from public.workout_coach_preferences order by user_id$$,
  array['both'::text],
  'a user sees only their own setup'
);

select * from finish();
rollback;
