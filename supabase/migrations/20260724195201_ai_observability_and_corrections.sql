-- Privacy-safe AI operational telemetry. Edge Functions write with the service
-- role; mobile clients cannot read or write this table.
create table if not exists public.ai_runs (
  request_id                 uuid primary key,
  created_at                 timestamptz not null default now(),
  feature                    text not null check (feature in ('photo_scan', 'chat', 'nutrition_enrichment')),
  user_hash                  text,
  model                      text not null,
  prompt_version             text not null,
  pipeline_version           text not null,
  status                     text not null check (status in ('success', 'degraded', 'error')),
  error_code                 text,
  latency_ms                 int not null check (latency_ms >= 0),
  attempts                   smallint not null default 1 check (attempts between 0 and 10),
  input_kind                 text not null,
  source_counts              jsonb not null default '{}'::jsonb,
  prompt_tokens              int,
  completion_tokens          int
);

create index if not exists ai_runs_created_feature_idx
  on public.ai_runs (created_at desc, feature, status);

alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from anon, authenticated;
grant select, insert, update, delete on public.ai_runs to service_role;

-- Store the AI/pipeline provenance with the user's meal so future corrections
-- can be attributed to the right model and data source.
alter table public.meals add column if not exists analysis_meta jsonb;

-- A correction is useful evaluation ground truth owned by the same user as the
-- meal. It deliberately contains totals and version metadata, never the meal
-- photo, chat text, email, profile, or Health Connect data.
create table if not exists public.meal_corrections (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  meal_id                    uuid references public.meals(id) on delete set null,
  created_at                 timestamptz not null default now(),
  before_totals              jsonb not null,
  after_totals               jsonb not null,
  calorie_delta_pct          numeric,
  analysis_meta              jsonb
);

create index if not exists meal_corrections_user_created_idx
  on public.meal_corrections (user_id, created_at desc);

alter table public.meal_corrections enable row level security;

drop policy if exists "own meal corrections select" on public.meal_corrections;
create policy "own meal corrections select"
  on public.meal_corrections for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own meal corrections insert" on public.meal_corrections;
create policy "own meal corrections insert"
  on public.meal_corrections for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

grant select, insert on public.meal_corrections to authenticated;
