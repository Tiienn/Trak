import assert from 'node:assert/strict';
import test from 'node:test';

import { groupsForExercise, muscleScoreGuidance, muscleScores, muscleScoreWindow, plannedTrainingCompletionDays, trainingDayKeys, weeklyActivitySummary, workoutMinutesByDay } from '../src/lib/training-progress.ts';
import { DEFAULT_MUSCLE_SCORE_SETTINGS, normalizeMuscleScoreSettings, readMuscleScoreSettings, writeMuscleScoreSettings } from '../src/lib/muscle-score-settings.ts';

const mondayScores = (rows, day) => muscleScores(rows, day, 12, { resetWeekdays: [1], manualResets: [] });

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
  cardioIntensity: null,
  trainingPlanItemId: null,
});

test('maps focused and full-body workouts to transparent muscle groups', () => {
  assert.deepEqual(groupsForExercise('Chest session'), ['chest']);
  assert.deepEqual(groupsForExercise('Squat and deadlift'), ['legs', 'back']);
  assert.deepEqual(groupsForExercise('Shoulder and abs'), ['shoulders', 'abs']);
  assert.deepEqual(groupsForExercise('Full body circuit'), ['chest', 'legs', 'back', 'arms', 'shoulders', 'abs', 'glutes', 'other']);
  assert.deepEqual(groupsForExercise('Cardio'), []);
});

test('muscle scores award one point per completed set for every scored muscle and cap at 100', () => {
  const rows = [
    exercise('a', '2026-08-27', 'Chest', 30, { ...emptySets, chest: 3, arms: 2 }),
    exercise('b', '2026-08-24', 'Bench press', 45, { ...emptySets, chest: 3, arms: 3 }),
    exercise('old', '2026-08-20', 'Chest', 200, { ...emptySets, chest: 100 }),
  ];
  const chest = muscleScores(rows, '2026-08-27').find((item) => item.key === 'chest');
  const arms = muscleScores(rows, '2026-08-27').find((item) => item.key === 'arms');
  assert.equal(chest?.sets, 6);
  assert.equal(chest?.points, 6);
  assert.equal(chest?.pointsPerSet, 1);
  assert.equal(chest?.score, 50);
  assert.equal(arms?.points, 5);
  assert.equal(arms?.pointsPerSet, 1);
  assert.equal(
    muscleScores([
      exercise('cap', '2026-08-27', 'Chest', 30, { ...emptySets, chest: 15 }),
    ], '2026-08-27').find((item) => item.key === 'chest')?.score,
    100
  );
  assert.deepEqual(trainingDayKeys('2026-08-27'), [
    '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27',
  ]);
});

test('muscle score guidance distinguishes useful volume from recovery checks', () => {
  assert.equal(muscleScoreGuidance(0), 'No working sets yet');
  assert.equal(muscleScoreGuidance(1), 'Some stimulus');
  assert.equal(muscleScoreGuidance(6), 'Building toward target');
  assert.equal(muscleScoreGuidance(12), 'Target met');
  assert.equal(muscleScoreGuidance(16), 'Check recovery');
  assert.equal(muscleScoreGuidance(20), 'High volume');
});

test('the catch-all other category remains loggable but is not a scored target', () => {
  const scores = muscleScores([
    exercise('other', '2026-08-27', 'Other strength', 30, { ...emptySets, other: 12 }),
  ], '2026-08-27');
  assert.equal(scores.length, 7);
  assert.equal(scores.some((item) => item.key === 'other'), false);
});

test('workout time totals minutes by day', () => {
  const rows = [
    exercise('a', '2026-08-27', 'Chest', 20),
    exercise('b', '2026-08-27', 'Arms', 15),
  ];
  assert.equal(workoutMinutesByDay(rows, '2026-08-27').at(-1)?.minutes, 35);
});

test('planned training progress counts distinct days and preserves legacy name matches', () => {
  const rows = [
    { ...exercise('linked-a', '2026-09-03', 'Incline press', 20), trainingPlanItemId: 'plan-a' },
    { ...exercise('linked-b', '2026-09-03', 'Renamed incline press', 20), trainingPlanItemId: 'plan-a' },
    { ...exercise('linked-other', '2026-09-04', 'Incline press', 20), trainingPlanItemId: 'plan-b' },
    exercise('legacy', '2026-09-02', '  INCLINE PRESS ', 20),
    exercise('expired', '2026-08-28', 'Incline press', 20),
  ];
  assert.deepEqual(plannedTrainingCompletionDays(rows, '2026-09-04', 'plan-a', 'Incline press'), [
    '2026-09-02',
    '2026-09-03',
  ]);
});

test('weekly activity separates strength sessions and cardio minutes over the last seven days', () => {
  const rows = [
    { ...exercise('strength-a', '2026-08-27', 'Full body', 35, { ...emptySets, chest: 3 }), workoutSplits: ['full_body'] },
    { ...exercise('strength-b', '2026-08-27', 'Chest', 10, { ...emptySets, chest: 2 }), workoutSplits: ['chest'] },
    { ...exercise('cardio', '2026-08-26', 'Brisk walking', 30), workoutSplits: ['cardio'], cardioIntensity: 'moderate' },
    { ...exercise('mixed', '2026-08-25', 'Strength and cardio', 40, { ...emptySets, legs: 3 }), workoutSplits: ['legs', 'cardio'], cardioIntensity: 'vigorous' },
    { ...exercise('old', '2026-08-20', 'Running', 90), workoutSplits: ['cardio'] },
  ];
  assert.deepEqual(weeklyActivitySummary(rows, '2026-08-27'), {
    strengthSessions: 2,
    cardioSessions: 2,
    vigorousCardioSessions: 1,
    strengthMinutes: 85,
    cardioMinutes: 70,
    lightCardioMinutes: 0,
    moderateCardioMinutes: 30,
    vigorousCardioMinutes: 40,
    cardioEquivalentMinutes: 110,
    totalMinutes: 115,
  });
});

test('weekly cardio equivalents exclude light movement and treat legacy cardio as moderate', () => {
  const rows = [
    { ...exercise('light', '2026-08-27', 'Easy walk', 20), workoutSplits: ['cardio'], cardioIntensity: 'light' },
    { ...exercise('legacy', '2026-08-26', 'Cycling', 25), workoutSplits: ['cardio'] },
    { ...exercise('vigorous', '2026-08-25', 'Intervals', 15), workoutSplits: ['cardio'], cardioIntensity: 'vigorous' },
  ];
  const activity = weeklyActivitySummary(rows, '2026-08-27');
  assert.equal(activity.cardioMinutes, 60);
  assert.equal(activity.lightCardioMinutes, 20);
  assert.equal(activity.moderateCardioMinutes, 25);
  assert.equal(activity.vigorousCardioMinutes, 15);
  assert.equal(activity.cardioEquivalentMinutes, 55);
  assert.equal(activity.vigorousCardioSessions, 1);
});

test('Monday resets are opt-in; the default keeps Sunday sets and workout history', () => {
  const rows = [
    exercise('sunday', '2026-08-30', 'Full body', 60, Object.fromEntries(Object.keys(emptySets).map((key) => [key, 3]))),
  ];
  assert.ok(muscleScores(rows, '2026-08-30').every((item) => item.sets === 3));
  assert.ok(muscleScores(rows, '2026-08-31').every((item) => item.sets === 3));
  assert.ok(mondayScores(rows, '2026-08-31').every((item) => item.sets === 0 && item.points === 0 && item.score === 0));
  assert.equal(rows.length, 1);
  assert.ok(muscleScores(rows, '2026-08-30').every((item) => item.sets === 3));
  // The Workout Time chart intentionally remains a trailing seven-day chart.
  assert.equal(workoutMinutesByDay(rows, '2026-08-31').find((day) => day.date === '2026-08-30')?.minutes, 60);
});

test('an optional Monday schedule includes only Monday through the selected day', () => {
  const rows = [
    exercise('old', '2026-08-30', 'Chest', 30, { ...emptySets, chest: 100 }),
    exercise('monday', '2026-08-31', 'Chest', 30, { ...emptySets, chest: 2 }),
    exercise('tuesday', '2026-09-01', 'Chest', 30, { ...emptySets, chest: 1 }),
    exercise('sunday', '2026-09-06', 'Chest', 30, { ...emptySets, chest: 3 }),
  ];
  assert.equal(mondayScores(rows, '2026-08-31')[0].points, 2);
  assert.equal(mondayScores(rows, '2026-09-01')[0].points, 3);
  assert.equal(mondayScores(rows, '2026-09-06')[0].points, 6);
  assert.equal(mondayScores(rows, '2026-09-07')[0].points, 0);
});

test('weekly reset handles year boundaries and local daylight-saving weeks', () => {
  const rows = [
    exercise('previous-sunday', '2025-12-28', 'Arms', 30, { ...emptySets, arms: 100 }),
    exercise('monday', '2025-12-29', 'Arms', 30, { ...emptySets, arms: 2 }),
    exercise('new-year', '2026-01-01', 'Arms', 30, { ...emptySets, arms: 3 }),
  ];
  assert.equal(mondayScores(rows, '2026-01-04').find((item) => item.key === 'arms')?.points, 5);
  assert.equal(mondayScores(rows, '2026-01-05').find((item) => item.key === 'arms')?.points, 0);
  for (const [sunday, monday] of [['2026-03-08', '2026-03-09'], ['2026-11-01', '2026-11-02']]) {
    const dstRows = [exercise('sunday', sunday, 'Back', 30, { ...emptySets, back: 3 })];
    assert.equal(muscleScores(dstRows, sunday).find((item) => item.key === 'back')?.points, 3);
    assert.equal(mondayScores(dstRows, monday).find((item) => item.key === 'back')?.points, 0);
  }
});

test('rolling window includes today and six prior days, excluding future and expired entries', () => {
  const rows = ['2026-08-24', '2026-08-25', '2026-08-31', '2026-09-01'].map((day) => exercise(day, day, 'Chest', 30, { ...emptySets, chest: 1 }));
  assert.equal(muscleScores(rows, '2026-08-31')[0].sets, 2);
  assert.equal(muscleScores(rows, '2026-09-01')[0].sets, 2);
});

test('multiple selected weekdays reset on the most recent day, including Sunday', () => {
  const settings = { resetWeekdays: [1, 4], manualResets: [] };
  assert.deepEqual(muscleScoreWindow('2026-09-02', settings).days, ['2026-08-31', '2026-09-01', '2026-09-02']);
  assert.deepEqual(muscleScoreWindow('2026-09-03', settings).days, ['2026-09-03']);
  assert.deepEqual(muscleScoreWindow('2026-09-06', { ...settings, resetWeekdays: [0] }).days, ['2026-09-06']);
  assert.equal(muscleScoreWindow('2026-09-06', DEFAULT_MUSCLE_SCORE_SETTINGS).days.length, 7);
});

test('manual reset excludes earlier sets but counts new sets on the same day; undo restores them', () => {
  const at = new Date('2026-08-31T12:00:00').getTime();
  const settings = { resetWeekdays: [], manualResets: [{ day: '2026-08-31', at }] };
  const rows = [
    exercise('sunday', '2026-08-30', 'Chest', 30, { ...emptySets, chest: 2 }),
    { ...exercise('before', '2026-08-31', 'Chest', 20, { ...emptySets, chest: 3 }), createdAt: at - 1000 },
    { ...exercise('after', '2026-08-31', 'Chest', 10, { ...emptySets, chest: 1 }), createdAt: at + 1000 },
  ];
  const original = structuredClone(rows);
  assert.equal(muscleScores(rows, '2026-08-31', 12, settings)[0].points, 1);
  assert.equal(muscleScores(rows, '2026-08-30', 12, settings)[0].points, 2);
  assert.equal(muscleScores(rows, '2026-08-31', 12, { ...settings, manualResets: [] })[0].points, 6);
  assert.equal(workoutMinutesByDay(rows, '2026-08-31').at(-1)?.minutes, 30);
  assert.deepEqual(rows, original);
});

test('manual reset history is date-aware and expires outside the rolling window', () => {
  const settings = { resetWeekdays: [], manualResets: [
    { day: '2026-08-28', at: new Date('2026-08-28T12:00:00').getTime() },
    { day: '2026-08-31', at: new Date('2026-08-31T12:00:00').getTime() },
  ] };
  assert.equal(muscleScoreWindow('2026-08-30', settings).manualReset.day, '2026-08-28');
  assert.equal(muscleScoreWindow('2026-08-31', settings).manualReset.day, '2026-08-31');
  assert.equal(muscleScoreWindow('2026-09-07', settings).manualReset, null);
  assert.equal(muscleScoreWindow('2026-09-03', { ...settings, resetWeekdays: [4] }).manualReset, null);
});

test('settings normalize invalid values and preserve a rolling default', () => {
  assert.deepEqual(normalizeMuscleScoreSettings(null), DEFAULT_MUSCLE_SCORE_SETTINGS);
  assert.deepEqual(normalizeMuscleScoreSettings({ resetWeekdays: [1, 1, 0, 4, -1, 7, '2'], manualResets: [{ day: '2026-02-31', at: 123 }, { day: '2026-08-31', at: -1 }] }), { resetWeekdays: [1, 4, 0], manualResets: [] });
});

test('preferences persist across reloads, stay account-isolated, and report storage failures', async () => {
  const data = new Map();
  const storage = { getItem: async (key) => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
  const settings = { resetWeekdays: [1, 4], manualResets: [{ day: '2026-08-31', at: new Date('2026-08-31T12:00:00').getTime() }] };
  await writeMuscleScoreSettings(storage, 'account-a', settings);
  assert.deepEqual(await readMuscleScoreSettings(storage, 'account-a'), settings);
  assert.deepEqual(await readMuscleScoreSettings(storage, 'account-b'), DEFAULT_MUSCLE_SCORE_SETTINGS);
  await assert.rejects(writeMuscleScoreSettings(storage, '', settings), /Sign in/);
  await assert.rejects(writeMuscleScoreSettings({ ...storage, setItem: async () => { throw new Error('disk full'); } }, 'account-a', DEFAULT_MUSCLE_SCORE_SETTINGS), /disk full/);
  assert.deepEqual(await readMuscleScoreSettings(storage, 'account-a'), settings);
});
