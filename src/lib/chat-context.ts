import type { LoggedMeal } from './types';

export type ChatMealContext = {
  title: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const MAX_CONTEXT_MEALS = 20;

function rounded(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value * 10) / 10);
}

/**
 * Keep Ask's meal context small and privacy-conscious: the model receives only
 * a display label and totals, never database IDs, photos, notes, or food items.
 */
export function chatMealContext(meals: LoggedMeal[]): ChatMealContext[] {
  return [...meals]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-MAX_CONTEXT_MEALS)
    .map((meal) => ({
      title: meal.title.trim().replace(/[\r\n\t]+/g, ' ').slice(0, 80) || 'Logged meal',
      calories: rounded(meal.total.calories),
      protein_g: rounded(meal.total.protein_g),
      carbs_g: rounded(meal.total.carbs_g),
      fat_g: rounded(meal.total.fat_g),
    }));
}
