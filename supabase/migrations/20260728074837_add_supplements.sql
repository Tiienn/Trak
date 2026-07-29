-- Supplements: the user's daily checklist of vitamins/supplements, plus one
-- row per supplement per day it was taken. Formalizes docs/supabase-supplements.sql
-- (already applied manually against production) as a tracked migration.

create table if not exists public.supplements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index if not exists supplements_user_idx on public.supplements (user_id, created_at);

-- Composite primary key makes "taken today" idempotent — checking the same
-- supplement twice in a day can't create a duplicate row. Deleting a
-- supplement cascades its checks away (foreign key on delete cascade).
create table if not exists public.supplement_checks (
  user_id       uuid not null references auth.users(id) on delete cascade,
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  day           text not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, supplement_id, day)
);

create index if not exists supplement_checks_user_day_idx
  on public.supplement_checks (user_id, day);

alter table public.supplements       enable row level security;
alter table public.supplement_checks enable row level security;

drop policy if exists "own supplements" on public.supplements;
create policy "own supplements" on public.supplements
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own supplement_checks" on public.supplement_checks;
create policy "own supplement_checks" on public.supplement_checks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
