import { ActivityLevel, FoodTotals, Goal, UserProfile } from './types';

/** How much activity multiplies the resting metabolic rate. */
const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Daily calorie adjustment for the chosen goal. */
const GOAL_DELTA: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 400,
};

/**
 * Compute daily calorie + macro targets from a profile using the
 * Mifflin-St Jeor equation, an activity multiplier, and a goal adjustment.
 * Macros use a balanced 30% protein / 40% carbs / 30% fat split.
 */
export function computeTargets(p: UserProfile): FoodTotals {
  const bmr =
    10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_MULTIPLIER[p.activity];

  // Round to the nearest 10 and never drop below a safe floor.
  const calories = Math.max(1200, Math.round((tdee + GOAL_DELTA[p.goal]) / 10) * 10);

  return {
    calories,
    protein_g: Math.round((calories * 0.3) / 4),
    carbs_g: Math.round((calories * 0.4) / 4),
    fat_g: Math.round((calories * 0.3) / 9),
  };
}
