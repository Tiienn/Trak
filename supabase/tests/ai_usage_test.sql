begin;
select plan(8);

select ok(
  has_function_privilege('service_role', 'public.consume_ai_usage_request(uuid,date,integer)', 'execute'),
  'service role can consume AI usage'
);
select ok(
  not has_function_privilege('authenticated', 'public.consume_ai_usage_request(uuid,date,integer)', 'execute'),
  'authenticated clients cannot consume AI usage directly'
);
select ok(
  not has_function_privilege('anon', 'public.consume_ai_usage_request(uuid,date,integer)', 'execute'),
  'anonymous clients cannot consume AI usage directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.ai_usage', 'select,insert,update,delete'),
  'authenticated clients cannot read or mutate AI usage'
);

set local role service_role;

select is(
  public.consume_ai_usage_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', date '2099-01-01', 2),
  true,
  'first request is allowed'
);
select is(
  public.consume_ai_usage_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', date '2099-01-01', 2),
  true,
  'second request is allowed at the cap'
);
select is(
  public.consume_ai_usage_request('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', date '2099-01-01', 2),
  false,
  'request beyond the cap is denied'
);
select is(
  (select count from public.ai_usage where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and day = '2099-01-01'),
  2,
  'a denied request does not increment the stored count'
);

select * from finish();
rollback;
