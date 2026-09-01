-- Follow-up for stricter PL/pgSQL linting on the initial points migration.
create or replace function public.sync_daily_trak_missions(p_day date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_meal_count integer := 0;
  v_calories numeric := 0;
  v_protein numeric := 0;
  v_water integer := 0;
  v_workout_minutes integer := 0;
  v_burned integer := 0;
  v_activity_multiplier numeric;
  v_goal_delta integer;
  v_protein_multiplier numeric;
  v_calorie_target integer;
  v_protein_target integer;
  v_calorie_budget integer;
  v_key text;
  v_complete boolean;
  v_awarded text[] := array[]::text[];
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_day is null or p_day < current_date - 2 or p_day > current_date + 1 then
    raise exception 'Mission date is outside the allowed range';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select * into v_profile from public.profiles where user_id = v_user_id;
  if not found then
    raise exception 'Complete your profile before earning Trak Points';
  end if;

  select count(*), coalesce(sum(calories), 0), coalesce(sum(protein_g), 0)
    into v_meal_count, v_calories, v_protein
    from public.meals
    where user_id = v_user_id and day = p_day;

  select coalesce(max(glasses), 0)
    into v_water
    from public.water
    where user_id = v_user_id and day = p_day;

  select coalesce(sum(duration_minutes), 0), coalesce(sum(calories_burned), 0)
    into v_workout_minutes, v_burned
    from public.exercises
    where user_id = v_user_id and day = p_day;

  v_activity_multiplier := case v_profile.activity
    when 'sedentary' then 1.2
    when 'light' then 1.375
    when 'moderate' then 1.55
    when 'active' then 1.725
    when 'very_active' then 1.9
    else 1.2
  end;
  v_goal_delta := case v_profile.goal when 'lose' then -500 when 'gain' then 400 else 0 end;
  v_protein_multiplier := case v_profile.goal when 'lose' then 2.3 when 'gain' then 1.8 else 1.6 end
    + case v_profile.diet when 'high_protein' then 0.3 else 0 end;
  v_calorie_target := greatest(
    1200,
    round(((10 * v_profile.weight_kg + 6.25 * v_profile.height_cm - 5 * v_profile.age
      + case v_profile.sex when 'male' then 5 else -161 end) * v_activity_multiplier
      + v_goal_delta) / 10.0) * 10
  );
  v_protein_target := round(v_profile.weight_kg * v_protein_multiplier);
  v_calorie_budget := v_calorie_target + round(v_burned * 0.5);

  foreach v_key in array array['meals', 'protein', 'calories', 'water', 'workout'] loop
    v_complete := case v_key
      when 'meals' then v_meal_count >= 3
      when 'protein' then v_protein_target > 0 and v_protein >= v_protein_target
      when 'calories' then v_meal_count >= 3 and v_calories >= v_calorie_budget * 0.8
      when 'water' then v_water >= greatest(1, coalesce(v_profile.water_goal, 8))
      when 'workout' then v_workout_minutes >= 30
      else false
    end;

    if v_complete then
      insert into public.trak_point_ledger (
        user_id, event_key, amount, source, mission_key, day
      ) values (
        v_user_id, 'mission:' || p_day::text || ':' || v_key, 20, 'mission', v_key, p_day
      ) on conflict (user_id, event_key) do nothing;
      if found then v_awarded := array_append(v_awarded, v_key); end if;
    end if;
  end loop;

  select coalesce(sum(amount), 0)::integer into v_balance
    from public.trak_point_ledger where user_id = v_user_id;

  return jsonb_build_object('balance', v_balance, 'awarded', to_jsonb(v_awarded));
end;
$$;

create or replace function public.purchase_trak_reward(p_reward_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_reward public.trak_reward_catalog%rowtype;
  v_balance integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select * into v_reward
    from public.trak_reward_catalog
    where key = p_reward_key and active;
  if not found then raise exception 'Reward is unavailable'; end if;

  if v_reward.kind <> 'shield' and exists (
    select 1 from public.trak_reward_inventory
    where user_id = v_user_id and reward_key = p_reward_key
  ) then
    raise exception 'Reward already owned';
  end if;

  select coalesce(sum(amount), 0)::integer into v_balance
    from public.trak_point_ledger where user_id = v_user_id;
  if v_balance < v_reward.cost then raise exception 'Not enough Trak Points'; end if;

  insert into public.trak_point_ledger (
    user_id, event_key, amount, source, reward_key
  ) values (
    v_user_id, 'reward:' || p_reward_key || ':' || gen_random_uuid()::text,
    -v_reward.cost, 'reward', p_reward_key
  );

  insert into public.trak_reward_inventory (user_id, reward_key, quantity)
  values (v_user_id, p_reward_key, 1)
  on conflict (user_id, reward_key) do update
    set quantity = public.trak_reward_inventory.quantity + 1,
        updated_at = now();

  return jsonb_build_object('balance', v_balance - v_reward.cost, 'rewardKey', p_reward_key);
end;
$$;
