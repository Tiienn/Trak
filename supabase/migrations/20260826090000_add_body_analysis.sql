-- Trak Progress: additive Body Analysis schema. Existing Nutrition tables and
-- contracts are unchanged so released Play Store clients can coexist safely.

create table if not exists public.body_analysis_preferences (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  consent_version        integer not null check (consent_version > 0),
  consent_accepted_at    timestamptz not null,
  training_location      text not null check (training_location in ('home', 'gym', 'both')),
  experience             text not null check (experience in ('beginner', 'intermediate', 'advanced')),
  days_available         smallint not null check (days_available between 2 and 6),
  equipment              text[] not null default '{}'::text[] check (cardinality(equipment) <= 12),
  limitations_note       text check (char_length(limitations_note) <= 500),
  preferences_version    integer not null default 1 check (preferences_version > 0),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table if not exists public.body_scans (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  created_at                 timestamptz not null default now(),
  previous_scan_id           uuid references public.body_scans(id) on delete set null,
  goal_snapshot              text not null check (goal_snapshot in ('lose', 'maintain', 'gain')),
  weight_kg_snapshot         numeric,
  waist_cm_snapshot          numeric check (waist_cm_snapshot is null or waist_cm_snapshot between 40 and 200),
  nutrition_evidence_snapshot jsonb not null default '{}'::jsonb,
  result                     jsonb not null,
  schema_version             integer not null default 1,
  model_version              text not null,
  prompt_version             text not null
);

create index if not exists body_scans_user_created_idx
  on public.body_scans (user_id, created_at desc);

create index if not exists body_scans_previous_scan_idx
  on public.body_scans (previous_scan_id)
  where previous_scan_id is not null;

-- Dedicated service-role-only counter. Body Analysis has a much smaller cap
-- than the existing shared nutrition/chat counter.
create table if not exists public.body_analysis_usage (
  user_id uuid not null,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

-- Atomically consume a daily attempt. The conditional conflict update makes
-- parallel requests obey the same cap instead of racing a select-then-upsert.
create or replace function public.consume_body_analysis_attempt(
  p_user_id uuid,
  p_day date,
  p_limit integer default 3
) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_limit < 1 then return false; end if;
  insert into public.body_analysis_usage (user_id, day, count)
  values (p_user_id, p_day, 1)
  on conflict (user_id, day) do update
    set count = public.body_analysis_usage.count + 1
    where public.body_analysis_usage.count < p_limit
  returning count into new_count;
  return new_count is not null and new_count <= p_limit;
end;
$$;

-- Minimal user feedback required for reporting unsafe/inaccurate generated
-- analysis. It stores no photos and does not duplicate the generated result.
create table if not exists public.body_analysis_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid not null references public.body_scans(id) on delete cascade,
  category text not null check (category in ('inaccurate', 'unsafe', 'other')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists body_analysis_reports_user_created_idx
  on public.body_analysis_reports (user_id, created_at desc);

create index if not exists body_analysis_reports_scan_idx
  on public.body_analysis_reports (scan_id);

alter table public.body_analysis_preferences enable row level security;
alter table public.body_scans enable row level security;
alter table public.body_analysis_usage enable row level security;
alter table public.body_analysis_reports enable row level security;

drop policy if exists "own body preferences" on public.body_analysis_preferences;
create policy "own body preferences" on public.body_analysis_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own body scans select" on public.body_scans;
create policy "own body scans select" on public.body_scans
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own body scans delete" on public.body_scans;
create policy "own body scans delete" on public.body_scans
  for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "own body reports insert" on public.body_analysis_reports;
create policy "own body reports insert" on public.body_analysis_reports
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.body_scans scan
      where scan.id = scan_id and scan.user_id = (select auth.uid())
    )
  );

-- Supabase now requires explicit Data API grants for new tables. Revoke any
-- inherited defaults first so each client role has only the intended access.
revoke all on public.body_analysis_preferences from anon, authenticated;
revoke all on public.body_scans from anon, authenticated;
revoke all on public.body_analysis_reports from anon, authenticated;

grant select, insert, update, delete on public.body_analysis_preferences to authenticated;
grant select, delete on public.body_scans to authenticated;
grant insert on public.body_analysis_reports to authenticated;

revoke all on public.body_analysis_usage from anon, authenticated;
revoke all on function public.consume_body_analysis_attempt(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.consume_body_analysis_attempt(uuid, date, integer) to service_role;
grant select, insert, update, delete on public.body_analysis_usage to service_role;
grant select, insert, update, delete on public.body_scans to service_role;
grant select, insert, update, delete on public.body_analysis_reports to service_role;

-- Extend the maintained operational-only telemetry enum without changing any
-- row shape used by the released Nutrition functions.
alter table public.ai_runs drop constraint if exists ai_runs_feature_check;
alter table public.ai_runs add constraint ai_runs_feature_check
  check (feature in ('photo_scan', 'chat', 'nutrition_enrichment', 'body_analysis'));
