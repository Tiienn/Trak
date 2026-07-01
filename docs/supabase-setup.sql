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

-- 3) Row Level Security: users can only touch their own data
alter table public.profiles enable row level security;
alter table public.meals    enable row level security;

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
