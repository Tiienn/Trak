import { FoodTotals } from './types';

/**
 * The Trak Score — a daily 0–100 read on how today's choices support the
 * user's goals. Starts at a 40-point base (showing up matters) and climbs as
 * healthy behaviors accumulate. Fully local and explainable: every point has
 * a named source so the breakdown screen can show exactly why.
 */

export type ScorePart = {
  key: string;
  label: string;
  /** Short explanation of how to earn the full amount. */
  hint: string;
  earned: number;
  max: number;
};

export type TrakScore = {
  value: number;
  parts: ScorePart[];
};

export function computeScore(input: {
  totals: FoodTotals;
  targets: FoodTotals;
  /** Calories target adjusted for exercise. */
  calorieBudget: number;
  mealsLogged: number;
  waterToday: number;
  waterGoal: number;
  streak: number;
}): TrakScore {
  const { totals, targets, calorieBudget, mealsLogged, waterToday, waterGoal, streak } = input;

  const parts: ScorePart[] = [];

  // Base — the score starts at 40 just for being here today.
  parts.push({ key: 'base', label: 'Base', hint: 'Everyone starts the day at 40.', earned: 40, max: 40 });

  // Logging — up to 15 for recording meals (5 each, first three).
  parts.push({
    key: 'logging',
    label: 'Meals logged',
    hint: '5 points per meal you log, up to 3 meals.',
    earned: Math.min(3, mealsLogged) * 5,
    max: 15,
  });

  // Protein — up to 15 as you approach your protein target.
  const proteinPct = targets.protein_g > 0 ? Math.min(1, totals.protein_g / targets.protein_g) : 0;
  parts.push({
    key: 'protein',
    label: 'Protein',
    hint: 'Fills in as you reach your daily protein target.',
    earned: Math.round(proteinPct * 15),
    max: 15,
  });

  // Calorie discipline — 10 while inside the budget, 5 if only a little over.
  let calPoints = 0;
  if (mealsLogged > 0) {
    if (totals.calories <= calorieBudget) calPoints = 10;
    else if (totals.calories <= calorieBudget * 1.1) calPoints = 5;
  }
  parts.push({
    key: 'calories',
    label: 'Calorie budget',
    hint: 'Stay within your daily budget (small overshoots earn half).',
    earned: calPoints,
    max: 10,
  });

  // Hydration — up to 10 as glasses fill.
  const waterPct = waterGoal > 0 ? Math.min(1, waterToday / waterGoal) : 0;
  parts.push({
    key: 'water',
    label: 'Hydration',
    hint: 'Fills in as you reach your daily water goal.',
    earned: Math.round(waterPct * 10),
    max: 10,
  });

  // Consistency — 1 point per day of streak, up to 10.
  parts.push({
    key: 'streak',
    label: 'Streak',
    hint: '1 point per day of your logging streak, up to 10.',
    earned: Math.min(10, Math.max(0, streak)),
    max: 10,
  });

  const value = Math.min(
    100,
    parts.reduce((acc, p) => acc + p.earned, 0)
  );
  return { value, parts };
}

/** One-line encouragement matched to the score band. */
export function scoreCaption(value: number): string {
  if (value >= 90) return 'Outstanding — today is textbook.';
  if (value >= 75) return 'Strong day. Keep the rhythm going.';
  if (value >= 60) return 'Solid progress — a little more gets you there.';
  if (value >= 45) return 'Off to a start. Log meals and drink up.';
  return 'See how your food choices support your health. Start at 40, aim for 100.';
}
