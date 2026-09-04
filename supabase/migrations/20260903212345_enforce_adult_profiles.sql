-- Trak's nutrition, weight-management, and AI coaching experience is currently
-- designed for adults. NOT VALID preserves existing rows so affected users can
-- still sign in and delete their account, while PostgreSQL immediately rejects
-- new or updated profiles outside the supported age range.
alter table public.profiles
  add constraint profiles_adult_age_check
  check (age between 18 and 100)
  not valid;

comment on constraint profiles_adult_age_check on public.profiles is
  'Trak currently supports adult profiles aged 18 through 100.';
