-- Trak — Supabase database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It creates the tables for profiles + meals and locks them down so each
-- user can only read/write their own rows (Row Level Security).

-- 1) Profiles: one row per user (mirrors the onboarding profile)
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  sex        text not null,
  age        int  not null,
  height_cm  numeric not null,
  weight_kg  numeric not null,
  goal       text not null,
  activity   text not null,
  created_at timestamptz not null default now()
);

-- 2) Meals: many rows per user (the daily log)
create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  title      text not null,
  calories   int  not null,
  protein_g  int  not null,
  carbs_g    int  not null,
  fat_g      int  not null,
  items      jsonb not null default '[]',
  confidence numeric not null default 0.5,
  notes      text,
  photo_uri  text
);

-- The AI's "how I estimated this" explanation (added after initial launch).
alter table public.meals add column if not exists notes text;

create index if not exists meals_user_day_idx on public.meals (user_id, day);

-- 3) Weights: the user's weight history (one row per day)
create table if not exists public.weights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  weight_kg  numeric not null,
  created_at timestamptz not null default now(),
  -- one weight per day: logging again the same day overwrites it
  unique (user_id, day)
);

create index if not exists weights_user_day_idx on public.weights (user_id, day);

-- 4) Water: glasses of water per day (one row per day)
create table if not exists public.water (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  glasses    int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists water_user_day_idx on public.water (user_id, day);

-- 5) Exercises: logged workouts; the app credits a conservative portion to the daily budget
create table if not exists public.exercises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  day             date not null,
  name            text not null,
  calories_burned int not null default 0,
  duration_minutes int not null default 30 check (duration_minutes between 1 and 1440),
  created_at      timestamptz not null default now()
);

-- Older projects created before workout duration was tracked.
alter table public.exercises add column if not exists duration_minutes int not null default 30;

create index if not exists exercises_user_day_idx on public.exercises (user_id, day);

-- 6) Per-user water goal lives on the profile (nullable → app default of 8)
alter table public.profiles add column if not exists water_goal int;

-- Per-user AI-estimate bias, percent (e.g. 10 = +10%). Default 0 = unchanged.
alter table public.profiles add column if not exists calorie_bias int default 0;

-- 7) Saved meals: reusable meal templates for one-tap re-logging
create table if not exists public.saved_meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  title      text not null,
  calories   int  not null,
  protein_g  int  not null,
  carbs_g    int  not null,
  fat_g      int  not null,
  items      jsonb not null default '[]'
);

create index if not exists saved_meals_user_idx on public.saved_meals (user_id, created_at desc);

-- 8) Row Level Security: users can only touch their own data
alter table public.profiles    enable row level security;
alter table public.meals       enable row level security;
alter table public.weights     enable row level security;
alter table public.water       enable row level security;
alter table public.exercises   enable row level security;
alter table public.saved_meals enable row level security;

drop policy if exists "own saved_meals" on public.saved_meals;
create policy "own saved_meals" on public.saved_meals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own water" on public.water;
create policy "own water" on public.water
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own exercises" on public.exercises;
create policy "own exercises" on public.exercises
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own meals" on public.meals;
create policy "own meals" on public.meals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own weights" on public.weights;
create policy "own weights" on public.weights
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 9) AI provenance and privacy-safe reliability tracking
alter table public.meals add column if not exists analysis_meta jsonb;

create table if not exists public.ai_runs (
  request_id       uuid primary key,
  created_at       timestamptz not null default now(),
  feature          text not null check (feature in ('photo_scan', 'chat', 'nutrition_enrichment')),
  user_hash        text,
  model            text not null,
  prompt_version   text not null,
  pipeline_version text not null,
  status           text not null check (status in ('success', 'degraded', 'error')),
  error_code       text,
  latency_ms       int not null check (latency_ms >= 0),
  attempts         smallint not null default 1 check (attempts between 0 and 10),
  input_kind       text not null,
  source_counts    jsonb not null default '{}'::jsonb,
  prompt_tokens    int,
  completion_tokens int
);

create index if not exists ai_runs_created_feature_idx
  on public.ai_runs (created_at desc, feature, status);
alter table public.ai_runs enable row level security;
revoke all on public.ai_runs from anon, authenticated;
grant select, insert, update, delete on public.ai_runs to service_role;

create table if not exists public.meal_corrections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  meal_id           uuid references public.meals(id) on delete set null,
  created_at        timestamptz not null default now(),
  before_totals     jsonb not null,
  after_totals      jsonb not null,
  calorie_delta_pct numeric,
  analysis_meta     jsonb
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

-- 10) Body Analysis (raw photos are never stored in Supabase)
create table if not exists public.body_analysis_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  consent_version integer not null check (consent_version > 0),
  consent_accepted_at timestamptz not null,
  training_location text not null check (training_location in ('home', 'gym', 'both')),
  experience text not null check (experience in ('beginner', 'intermediate', 'advanced')),
  days_available smallint not null check (days_available between 2 and 6),
  equipment text[] not null default '{}'::text[] check (cardinality(equipment) <= 12),
  limitations_note text check (char_length(limitations_note) <= 500),
  preferences_version integer not null default 1 check (preferences_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  previous_scan_id uuid references public.body_scans(id) on delete set null,
  goal_snapshot text not null check (goal_snapshot in ('lose', 'maintain', 'gain')),
  weight_kg_snapshot numeric,
  waist_cm_snapshot numeric check (waist_cm_snapshot is null or waist_cm_snapshot between 40 and 200),
  nutrition_evidence_snapshot jsonb not null default '{}'::jsonb,
  result jsonb not null,
  schema_version integer not null default 1,
  model_version text not null,
  prompt_version text not null
);

create index if not exists body_scans_user_created_idx
  on public.body_scans (user_id, created_at desc);

create table if not exists public.body_analysis_usage (
  user_id uuid not null,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (user_id, day)
);

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
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "own body scans delete" on public.body_scans;
create policy "own body scans delete" on public.body_scans
  for delete to authenticated using ((select auth.uid()) = user_id);

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

grant select, insert, update, delete on public.body_analysis_preferences to authenticated;
grant select, delete on public.body_scans to authenticated;
grant insert on public.body_analysis_reports to authenticated;
revoke all on public.body_analysis_usage from anon, authenticated;
revoke all on function public.consume_body_analysis_attempt(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.consume_body_analysis_attempt(uuid, date, integer) to service_role;
grant select, insert, update, delete on public.body_analysis_usage to service_role;
grant select, insert, update, delete on public.body_scans to service_role;
grant select, insert, update, delete on public.body_analysis_reports to service_role;

alter table public.ai_runs drop constraint if exists ai_runs_feature_check;
alter table public.ai_runs add constraint ai_runs_feature_check
  check (feature in ('photo_scan', 'chat', 'nutrition_enrichment', 'body_analysis'));
