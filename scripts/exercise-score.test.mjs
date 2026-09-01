import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calorieBudgetForDay,
  caloriesBurnedForDay,
  creditedExerciseCalories,
} from '../src/lib/exercise.ts';
import { computeScore } from '../src/lib/score.ts';

test('credits half of a valid logged exercise burn', () => {
  assert.equal(creditedExerciseCalories(200), 100);
  assert.equal(creditedExerciseCalories(121), 61);
  assert.equal(creditedExerciseCalories(-50), 0);
  assert.equal(creditedExerciseCalories(Number.NaN), 0);
  assert.equal(calorieBudgetForDay(2_000, 200), 2_100);
});

test('totals exercise calories only for the requested local day', () => {
  const exercises = [
    { id: 'a', date: '2026-07-26', createdAt: 1, name: 'Walk', caloriesBurned: 120 },
    { id: 'b', date: '2026-07-26', createdAt: 2, name: 'Run', caloriesBurned: 320 },
    { id: 'c', date: '2026-07-25', createdAt: 3, name: 'Yoga', caloriesBurned: 100 },
  ];

  assert.equal(caloriesBurnedForDay(exercises, '2026-07-26'), 440);
  assert.equal(caloriesBurnedForDay(exercises, '2026-07-24'), 0);
});

test('exercise credit raises the calorie mission target while workout minutes earn their own mission', () => {
  const input = {
    totals: { calories: 2_050, protein_g: 0, carbs_g: 0, fat_g: 0 },
    targets: { calories: 2_000, protein_g: 100, carbs_g: 200, fat_g: 60 },
    mealsLogged: 1,
    waterToday: 0,
    waterGoal: 8,
    streak: 0,
  };

  const withoutWorkout = computeScore({ ...input, mealsLogged: 3, calorieBudget: 2_000 });
  const withWorkout = computeScore({ ...input, mealsLogged: 3, calorieBudget: calorieBudgetForDay(2_000, 200), workoutMinutes: 30 });
  assert.equal(withoutWorkout.parts.find((part) => part.key === 'calories')?.earned, 20);
  assert.equal(withWorkout.parts.find((part) => part.key === 'calories')?.earned, 20);
  assert.equal(withWorkout.parts.find((part) => part.key === 'workout')?.earned, 20);
  assert.equal(withWorkout.value - withoutWorkout.value, 20);

  const noMeals = computeScore({ ...input, mealsLogged: 0, calorieBudget: 2_100 });
  assert.equal(noMeals.parts.find((part) => part.key === 'calories')?.earned, 0);
});
