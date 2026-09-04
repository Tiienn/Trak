BEGIN;
SELECT plan(9);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'games-one@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'games-two@example.com');

insert into public.game_stats (user_id, stats)
values ('22222222-2222-2222-2222-222222222222', '{"played": 8}'::jsonb);

select ok(
  has_table_privilege('authenticated', 'public.game_stats', 'select,insert,update'),
  'authenticated can sync game progress'
);
select ok(
  not has_table_privilege('authenticated', 'public.game_stats', 'delete'),
  'authenticated cannot delete game progress directly'
);
select ok(
  not has_table_privilege('anon', 'public.game_stats', 'select,insert,update,delete'),
  'anon has no game progress access'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

select lives_ok(
  $$insert into public.game_stats (user_id, stats)
    values ('11111111-1111-1111-1111-111111111111', '{"played": 1}'::jsonb)$$,
  'a player inserts their own progress'
);
select throws_ok(
  $$insert into public.game_stats (user_id, stats)
    values ('22222222-2222-2222-2222-222222222222', '{"played": 99}'::jsonb)
    on conflict (user_id) do update set stats = excluded.stats$$,
  '42501',
  null,
  'a player cannot overwrite another player'
);
select lives_ok(
  $$update public.game_stats set stats = '{"played": 2}'::jsonb
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  'a player updates their own progress'
);
select results_eq(
  $$select (stats->>'played')::integer from public.game_stats order by user_id$$,
  array[2],
  'a player sees only their own progress'
);

select is(
  (public.award_game_trak_points('compare')->>'amount')::integer,
  5,
  'the first Compare round awards five points'
);
select is(
  (public.award_game_trak_points('compare')->>'amount')::integer,
  0,
  'the same game cannot be farmed twice in one day'
);

SELECT * FROM finish();
ROLLBACK;
