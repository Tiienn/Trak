import { ActivityLevel, DietStyle, FoodTotals, Goal, UserProfile } from './types';

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
 * Protein target in grams per kg of bodyweight, per goal. Anchored to
 * bodyweight (not a % of calories) to match sports-nutrition guidance:
 *  - Cutting needs MORE protein to spare muscle in a deficit — ISSN cites
 *    2.3–3.1 g/kg to retain lean mass while hypocaloric.
 *  - Building muscle plateaus around 1.4–2.0 g/kg; beyond that, extra protein
 *    doesn't add muscle, so surplus calories are better spent on carbs.
 */
const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose: 2.3,
  maintain: 1.6,
  gain: 1.8,
};

/**
 * Fat is ~30% of calories, but never below this per-kg floor: dropping under
 * ~0.5–0.8 g/kg (or 20% of calories) compromises hormones and performance.
 */
const FAT_FLOOR_G_PER_KG = 0.8;

/** Diet-style presets — how the calorie target is balanced across macros. */
export const DIETS: { key: DietStyle; label: string; desc: string }[] = [
  {
    key: 'balanced',
    label: 'Balanced',
    desc: 'A well-rounded macro split for steady energy and overall health.',
  },
  {
    key: 'high_protein',
    label: 'High protein',
    desc: 'Extra protein for muscle and satiety, with a slightly leaner fat share.',
  },
  {
    key: 'low_carb',
    label: 'Lower carb',
    desc: 'More of your energy from fat and fewer carbs — many find appetite steadier.',
  },
];

/** Share of calories that goes to fat, per diet style. */
const FAT_SHARE: Record<DietStyle, number> = {
  balanced: 0.3,
  high_protein: 0.25,
  low_carb: 0.42,
};

/** Extra protein (g/kg) layered on top of the goal amount, per diet style. */
const PROTEIN_EXTRA_G_PER_KG: Record<DietStyle, number> = {
  balanced: 0,
  high_protein: 0.3,
  low_carb: 0,
};

/**
 * Compute daily calorie + macro targets from a profile using the
 * Mifflin-St Jeor equation, an activity multiplier, and a goal adjustment.
 *
 * Protein is anchored to bodyweight × a goal-specific g/kg multiplier (see
 * PROTEIN_G_PER_KG); fat takes ~30% of calories but respects a per-kg floor;
 * carbs absorb whatever calories remain. This keeps protein sane on a bulk
 * (a flat % of calories inflates it) and high enough on a cut to spare muscle.
 */
export function computeTargets(p: UserProfile): FoodTotals {
  const diet: DietStyle = p.diet ?? 'balanced';
  const bmr =
    10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_MULTIPLIER[p.activity];

  // Round to the nearest 10 and never drop below a safe floor.
  const calories = Math.max(1200, Math.round((tdee + GOAL_DELTA[p.goal]) / 10) * 10);

  // Protein from bodyweight and goal (plus any diet-style extra), not a flat
  // share of calories.
  const protein_g = Math.round(
    p.weightKg * (PROTEIN_G_PER_KG[p.goal] + PROTEIN_EXTRA_G_PER_KG[diet])
  );

  // Fat takes the diet's calorie share, floored so aggressive cuts stay
  // hormonally safe.
  const fat_g = Math.round(
    Math.max(p.weightKg * FAT_FLOOR_G_PER_KG, (calories * FAT_SHARE[diet]) / 9)
  );

  // Carbs fill the remaining calories after protein and fat are set.
  const carbs_g = Math.max(0, Math.round((calories - protein_g * 4 - fat_g * 9) / 4));

  return { calories, protein_g, carbs_g, fat_g };
}
