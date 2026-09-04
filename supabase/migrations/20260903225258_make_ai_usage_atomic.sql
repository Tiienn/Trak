-- Consume the shared nutrition/chat allowance in one statement. The previous
-- select-then-upsert flow could lose increments when requests arrived together.
-- Keep the RPC service-role-only: clients never need to inspect usage counters.

alter table public.ai_usage
  drop constraint if exists ai_usage_count_nonnegative;

alter table public.ai_usage
  add constraint ai_usage_count_nonnegative check (count >= 0);

create or replace function public.consume_ai_usage_request(
  p_user_id uuid,
  p_day date,
  p_limit integer default 150
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_count integer;
begin
  if p_user_id is null or p_day is null or p_limit < 1 or p_limit > 10000 then
    return false;
  end if;

  insert into public.ai_usage (user_id, day, count)
  values (p_user_id, p_day::text, 1)
  on conflict (user_id, day) do update
    set count = public.ai_usage.count + 1
    where public.ai_usage.count < p_limit
  returning count into new_count;

  return new_count is not null and new_count <= p_limit;
end;
$$;

revoke all on table public.ai_usage from public, anon, authenticated;
grant select, insert, update, delete on table public.ai_usage to service_role;

revoke all on function public.consume_ai_usage_request(uuid, date, integer)
  from public, anon, authenticated;
grant execute on function public.consume_ai_usage_request(uuid, date, integer)
  to service_role;
