-- Each customised exercise can be planned for multiple training days per week.
-- Existing plans remain once weekly so the migration is backwards compatible.
alter table public.training_plan_items
  add column if not exists weekly_target integer not null default 1;

alter table public.training_plan_items
  drop constraint if exists training_plan_items_weekly_target_check,
  add constraint training_plan_items_weekly_target_check
    check (weekly_target between 1 and 7);

-- Link completed workout rows back to the plan item that created them. The
-- workout remains in history if the user later removes the plan item.
alter table public.exercises
  add column if not exists training_plan_item_id uuid
    references public.training_plan_items(id) on delete set null;

create index if not exists exercises_user_plan_day_idx
  on public.exercises (user_id, training_plan_item_id, day);

-- Keep the existing account isolation and additionally prevent a signed-in
-- user from attaching a workout to another account's plan item.
drop policy if exists "own exercises" on public.exercises;
create policy "own exercises" on public.exercises
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      training_plan_item_id is null
      or exists (
        select 1
        from public.training_plan_items item
        where item.id = training_plan_item_id
          and item.user_id = (select auth.uid())
      )
    )
  );
