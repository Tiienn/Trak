import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_WORKOUT_FOCUS_SETTINGS,
  normalizeWorkoutFocusSettings,
  readWorkoutFocusSettings,
  workoutFocusSettingsKey,
  workoutFocusWeek,
  writeWorkoutFocusSettings,
} from '../src/lib/workout-focus-settings.ts';

test('workout focus accepts only a bounded, dated muscle preference', () => {
  assert.deepEqual(normalizeWorkoutFocusSettings({ priorityMuscle: 'chest', focusStartedOn: '2026-09-03', baselineWeeklySets: 99 }), {
    priorityMuscle: 'chest',
    focusStartedOn: '2026-09-03',
    baselineWeeklySets: 20,
  });
  assert.deepEqual(normalizeWorkoutFocusSettings({ priorityMuscle: 'other', focusStartedOn: '2026-09-03' }), DEFAULT_WORKOUT_FOCUS_SETTINGS);
  assert.deepEqual(normalizeWorkoutFocusSettings({ priorityMuscle: 'legs', focusStartedOn: 'not-a-date' }), DEFAULT_WORKOUT_FOCUS_SETTINGS);
});

test('workout focus week expires after the six-week block', () => {
  const settings = { priorityMuscle: 'back', focusStartedOn: '2026-07-23', baselineWeeklySets: 8 };
  assert.equal(workoutFocusWeek(settings, new Date(2026, 6, 23)), 1);
  assert.equal(workoutFocusWeek(settings, new Date(2026, 8, 2)), 6);
  assert.equal(workoutFocusWeek(settings, new Date(2026, 8, 3)), 7);
});

test('workout focus storage is account scoped and normalized', async () => {
  const values = new Map();
  const storage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value),
  };
  await writeWorkoutFocusSettings(storage, 'user-one', {
    priorityMuscle: 'glutes',
    focusStartedOn: '2026-09-03',
    baselineWeeklySets: 7.6,
  });
  assert.equal(values.has(workoutFocusSettingsKey('user-two')), false);
  assert.deepEqual(await readWorkoutFocusSettings(storage, 'user-one'), {
    priorityMuscle: 'glutes',
    focusStartedOn: '2026-09-03',
    baselineWeeklySets: 8,
  });
});
