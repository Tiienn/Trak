-- Per-user daily AI request counter backing the edge functions' rate limiter
-- (underDailyLimit in supabase/functions/_shared/nutrition.ts). Written only
-- by the service role from server-side code; the mobile client never reads
-- or writes it directly, so RLS is enabled with no policies for anon/authenticated.
create table if not exists public.ai_usage (
  user_id uuid not null,
  day     text not null,
  count   int not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
