import assert from 'node:assert/strict';
import test from 'node:test';

import { groupsForExercise, muscleScores, trainingDayKeys, workoutMinutesByDay } from '../src/lib/training-progress.ts';

const emptySets = { chest: 0, legs: 0, back: 0, arms: 0, shoulders: 0, abs: 0, glutes: 0, other: 0 };

const exercise = (id, date, name, durationMinutes, muscleSets = emptySets) => ({
  id,
  date,
  name,
  durationMinutes,
  caloriesBurned: 100,
  createdAt: 1,
  workoutSplits: [],
  muscleSets,
});

test('maps focused and full-body workouts to transparent muscle groups', () => {
  assert.deepEqual(groupsForExercise('Chest session'), ['chest']);
  assert.deepEqual(groupsForExercise('Squat and deadlift'), ['legs', 'back']);
  assert.deepEqual(groupsForExercise('Shoulder and abs'), ['shoulders', 'abs']);
  assert.deepEqual(groupsForExercise('Full body circuit'), ['chest', 'legs', 'back', 'arms', 'shoulders', 'abs', 'glutes', 'other']);
  assert.deepEqual(groupsForExercise('Cardio'), []);
});

test('muscle scores award two points for chest, legs, and back and cap at 100', () => {
  const rows = [
    exercise('a', '2026-08-27', 'Chest', 30, { ...emptySets, chest: 3, arms: 2 }),
    exercise('b', '2026-08-24', 'Bench press', 45, { ...emptySets, chest: 3, arms: 3 }),
    exercise('old', '2026-08-20', 'Chest', 200, { ...emptySets, chest: 100 }),
  ];
  const chest = muscleScores(rows, '2026-08-27').find((item) => item.key === 'chest');
  const arms = muscleScores(rows, '2026-08-27').find((item) => item.key === 'arms');
  assert.equal(chest?.sets, 6);
  assert.equal(chest?.points, 12);
  assert.equal(chest?.pointsPerSet, 2);
  assert.equal(chest?.score, 100);
  assert.equal(arms?.points, 5);
  assert.equal(arms?.pointsPerSet, 1);
  assert.deepEqual(trainingDayKeys('2026-08-27'), [
    '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
  ]);
});

test('workout time totals minutes by day', () => {
  const rows = [
    exercise('a', '2026-08-27', 'Chest', 20),
    exercise('b', '2026-08-27', 'Arms', 15),
  ];
  assert.equal(workoutMinutesByDay(rows, '2026-08-27').at(-1)?.minutes, 35);
});
