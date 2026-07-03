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
  photo_uri  text
);

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

-- 5) Exercises: logged workouts that add calories back to the daily budget
create table if not exists public.exercises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  day             date not null,
  name            text not null,
  calories_burned int not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists exercises_user_day_idx on public.exercises (user_id, day);

-- 6) Per-user water goal lives on the profile (nullable → app default of 8)
alter table public.profiles add column if not exists water_goal int;

-- 7) Row Level Security: users can only touch their own data
alter table public.profiles  enable row level security;
alter table public.meals     enable row level security;
alter table public.weights   enable row level security;
alter table public.water     enable row level security;
alter table public.exercises enable row level security;

drop policy if exists "own water" on public.water;
create policy "own water" on public.water
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own exercises" on public.exercises;
create policy "own exercises" on public.exercises
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own meals" on public.meals;
create policy "own meals" on public.meals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own weights" on public.weights;
create policy "own weights" on public.weights
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
