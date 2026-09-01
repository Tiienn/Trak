import assert from 'node:assert/strict';
import test from 'node:test';

import { recommendWorkout, WORKOUT_CATALOG } from '../src/lib/workout-catalog.ts';

const base = {
  goal: 'gain',
  experience: 'beginner',
  location: 'home',
  equipment: ['Dumbbells', 'Bench', 'Bands', 'Pull-up bar'],
  availableMinutes: 30,
  recentMuscleSets: { chest: 8, back: 0, arms: 4, shoulders: 2 },
  musclesNeedingAttention: ['back', 'shoulders', 'arms', 'chest'],
  includeCardio: false,
};

test('approved catalogue preserves internal video sources and timestamps', () => {
  assert.equal(WORKOUT_CATALOG.length, 19);
  for (const item of WORKOUT_CATALOG) {
    const videos = item.sources.filter((source) => source.kind === 'video');
    assert.ok(videos.length > 0);
    assert.ok(videos.every((video) => video.creator === 'Jeremy Ethier'));
    assert.ok(videos.every((video) => Number.isFinite(video.timestampSeconds)));
  }
  assert.equal(WORKOUT_CATALOG.find((item) => item.id === 'machine-chest-fly')?.name, 'Machine chest fly');
  const approvedIds = [
    'flat-dumbbell-press',
    'dumbbell-shoulder-press',
    'cable-row',
    'cable-curl',
    'preacher-curl',
    'rope-triceps-pushdown',
    'hip-thrust',
    'weighted-step-up',
    'leg-extension',
    'leg-press',
  ];
  for (const id of approvedIds) {
    const item = WORKOUT_CATALOG.find((entry) => entry.id === id);
    assert.ok(item, `${id} should be in the catalogue`);
    assert.ok(item.sources.some((source) => source.url === 'https://www.youtube.com/watch?v=4OP8FI1TXK8'));
  }
  for (const id of ['machine-chest-fly', 'lateral-raise', 'pull-up', 'overhead-cable-triceps-extension']) {
    const item = WORKOUT_CATALOG.find((entry) => entry.id === id);
    assert.ok(item.sources.some((source) => source.url === 'https://www.youtube.com/watch?v=4OP8FI1TXK8'));
  }
});

test('approved specialization pairs are reciprocal catalogue relationships', () => {
  for (const item of WORKOUT_CATALOG.filter((entry) => entry.rotationGroup)) {
    for (const alternateId of item.alternateWithIds ?? []) {
      const alternate = WORKOUT_CATALOG.find((entry) => entry.id === alternateId);
      assert.ok(alternate, `${alternateId} should exist`);
      assert.equal(alternate.rotationGroup, item.rotationGroup);
      assert.ok(alternate.alternateWithIds?.includes(item.id));
    }
  }
});

test('recommendations prioritize neglected muscles and fit the time budget', () => {
  const result = recommendWorkout(base);
  assert.equal(result[0].exercise.id, 'assisted-pull-up');
  assert.ok(result.some((item) => item.exercise.id === 'lateral-raise'));
  assert.ok(result.reduce((sum, item) => sum + item.exercise.estimatedMinutes, 0) <= 30);
});

test('equipment, location, experience, and limitations remove unsuitable variations', () => {
  const result = recommendWorkout({
    ...base,
    equipment: ['Machines'],
    location: 'gym',
    limitations: ['Previous shoulder pain with overhead work'],
  });
  assert.ok(result.every((item) => !item.exercise.avoidWhenLimitationMatches.includes('shoulder')));
  assert.ok(result.every((item) => item.exercise.id !== 'overhead-cable-triceps-extension'));
  assert.ok(result.every((item) => item.exercise.id !== 'pull-up'));
});

test('fat-loss plans may include one duration/intensity cardio item without calorie targets', () => {
  const result = recommendWorkout({
    ...base,
    goal: 'lose',
    experience: 'intermediate',
    equipment: [],
    includeCardio: true,
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].exercise.activityType, 'cardio');
  assert.equal(result[0].exercise.cardio.calorieTarget, null);
});

test('tracked loads are carried into progression guidance without automatic increases', () => {
  const result = recommendWorkout({
    ...base,
    musclesNeedingAttention: ['arms'],
    loadHistory: {
      'overhead-dumbbell-triceps-extension': [
        { loadValue: 14, loadUnit: 'kg', recordedAt: 2 },
        { loadValue: 12, loadUnit: 'kg', recordedAt: 1 },
      ],
    },
  });
  const extension = result.find((item) => item.exercise.id === 'overhead-dumbbell-triceps-extension');
  assert.match(extension.loadGuidance, /14 kg/);
  assert.match(extension.loadGuidance, /recent increase/);
  assert.match(extension.loadGuidance, /only after reaching the top/);
});

test('recent exercise history rotates to the paired movement when it fits the user', () => {
  const result = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Machines', 'Pull-up bar'],
    recentMuscleSets: { back: 0 },
    musclesNeedingAttention: ['back'],
    recentExerciseIds: ['pull-up'],
    limit: 1,
  });
  assert.equal(result[0].exercise.id, 'cable-row');
});

test('explicit specialization is temporary, excludes beginners, and caps added sets', () => {
  const specialization = {
    muscle: 'legs',
    baselineWeeklySets: 10,
    weekOfBlock: 2,
    additionalSetTarget: 4,
  };
  const eligible = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Machines'],
    recentMuscleSets: { legs: 12 },
    musclesNeedingAttention: ['legs'],
    recentExerciseIds: ['leg-extension'],
    specialization,
    limit: 1,
  });
  assert.equal(eligible[0].exercise.id, 'leg-press');
  assert.equal(eligible[0].recommendedSets, 2);
  assert.equal(eligible[0].isSpecialization, true);

  const beginner = recommendWorkout({
    ...base,
    location: 'gym',
    equipment: ['Machines'],
    recentMuscleSets: { legs: 10 },
    musclesNeedingAttention: ['legs'],
    specialization,
    limit: 1,
  });
  assert.equal(beginner[0].isSpecialization, false);

  const capped = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Machines'],
    recentMuscleSets: { legs: 13 },
    musclesNeedingAttention: ['legs'],
    specialization,
    limit: 1,
  });
  assert.equal(capped[0].isSpecialization, false);
  assert.equal(capped[0].recommendedSets, undefined);
});

test('recommendation generation does not mutate seven-day muscle input', () => {
  const input = structuredClone(base);
  const original = structuredClone(input);
  recommendWorkout(input);
  assert.deepEqual(input, original);
});
