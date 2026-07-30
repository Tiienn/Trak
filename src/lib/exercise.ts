import type { ExerciseEntry } from './types';

/**
 * Only part of a logged burn is added back to the food budget.
 *
 * The base target already includes the user's usual activity level, while
 * exercise-calorie estimates are noisy. Crediting half keeps workouts useful
 * without treating every estimated calorie as extra expenditure.
 */
export const EXERCISE_CALORIE_CREDIT_PERCENT = 50;
export const EXERCISE_CALORIE_CREDIT_RATE = EXERCISE_CALORIE_CREDIT_PERCENT / 100;

export function creditedExerciseCalories(caloriesBurned: number): number {
  if (!Number.isFinite(caloriesBurned)) return 0;
  return Math.max(0, Math.round(caloriesBurned * EXERCISE_CALORIE_CREDIT_RATE));
}

export function calorieBudgetForDay(baseTarget: number, caloriesBurned: number): number {
  const safeTarget = Number.isFinite(baseTarget) ? Math.max(0, Math.round(baseTarget)) : 0;
  return safeTarget + creditedExerciseCalories(caloriesBurned);
}

export function caloriesBurnedForDay(exercises: ExerciseEntry[], date: string): number {
  return exercises
    .filter((exercise) => exercise.date === date)
    .reduce((total, exercise) => total + Math.max(0, exercise.caloriesBurned), 0);
}
