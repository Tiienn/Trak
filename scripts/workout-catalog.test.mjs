import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_RECOMMENDED_SETS_PER_MUSCLE_SESSION, recommendWorkout, WORKOUT_CATALOG } from '../src/lib/workout-catalog.ts';
import { DEFAULT_EXERCISE_RESPONSE_SETTINGS, normalizeExerciseResponseSettings, readExerciseResponseSettings, writeExerciseResponseSettings } from '../src/lib/exercise-response-settings.ts';
import { DEFAULT_GYM_EQUIPMENT, equipmentForWorkoutSettings, nextRoutineSession, normalizeWorkoutCoachSettings } from '../src/lib/workout-coach-settings.ts';

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
  const evidenceOnlyIds = new Set([
    'chair-sit-to-stand', 'wall-push-up', 'incline-push-up', 'glute-bridge',
    'supported-split-squat', 'backpack-row', 'resistance-band-row', 'bird-dog',
    'comfortable-walk', 'brisk-walk', 'indoor-low-impact-cardio', 'stationary-cycling',
    'elliptical-cardio', 'swimming-water-walking', 'low-impact-cardio-intervals',
  ]);
  assert.equal(WORKOUT_CATALOG.length, 51);
  for (const item of WORKOUT_CATALOG.filter((entry) => !evidenceOnlyIds.has(entry.id))) {
    const videos = item.sources.filter((source) => source.kind === 'video');
    assert.ok(videos.length > 0);
    assert.ok(videos.every((video) => video.creator === 'Jeremy Ethier'));
    assert.ok(videos.every((video) => Number.isFinite(video.timestampSeconds)));
  }
  for (const id of evidenceOnlyIds) {
    const item = WORKOUT_CATALOG.find((entry) => entry.id === id);
    assert.ok(item, `${id} should be in the evidence-based catalogue`);
    assert.ok(item.sources.some((source) => source.kind === 'study'));
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
  const fullBodyIds = [
    'goblet-squat',
    'barbell-squat',
    'inverted-row',
    'dumbbell-romanian-deadlift',
    'barbell-romanian-deadlift',
    'prone-incline-rear-delt-raise',
    'dead-bug',
    'hip-abduction',
    'standing-calf-raise',
    'incline-dumbbell-curl',
    'incline-kelso-shrug',
  ];
  for (const id of fullBodyIds) {
    const item = WORKOUT_CATALOG.find((entry) => entry.id === id);
    assert.ok(item, `${id} should be in the catalogue`);
    assert.ok(item.sources.some((source) => source.url === 'https://www.youtube.com/watch?v=n_YW24F5HGc'));
  }
  for (const id of ['incline-dumbbell-press', 'pull-up', 'assisted-pull-up', 'cable-row', 'lateral-raise', 'overhead-dumbbell-triceps-extension', 'machine-chest-fly']) {
    const item = WORKOUT_CATALOG.find((entry) => entry.id === id);
    assert.ok(item.sources.some((source) => source.url === 'https://www.youtube.com/watch?v=n_YW24F5HGc'));
  }
  for (const id of ['converging-machine-chest-press', 'lat-pulldown', 'chest-supported-machine-row', 'hack-squat', 'bayesian-cable-curl', 'dumbbell-skull-crusher']) {
    const item = WORKOUT_CATALOG.find((entry) => entry.id === id);
    assert.ok(item, `${id} should be in the catalogue`);
    assert.ok(item.sources.some((source) => source.url === 'https://www.youtube.com/watch?v=ehQ_5TThkRI'));
  }
  for (const id of ['lateral-raise', 'hip-thrust', 'dumbbell-romanian-deadlift', 'barbell-romanian-deadlift', 'standing-calf-raise']) {
    const item = WORKOUT_CATALOG.find((entry) => entry.id === id);
    assert.ok(item.sources.some((source) => source.url === 'https://www.youtube.com/watch?v=ehQ_5TThkRI'));
  }
});

test('workout setup normalizes account preferences without requiring Body Analysis', () => {
  const settings = normalizeWorkoutCoachSettings({
    configured: true,
    trainingLocation: 'gym',
    experience: 'intermediate',
    daysPerWeek: 4,
    sessionMinutes: 60,
    routine: 'push_pull_legs',
    equipment: ['Machines', 'Barbell', 'Machines'],
  });
  assert.equal(settings.configured, true);
  assert.equal(settings.trainingLocation, 'gym');
  assert.deepEqual(settings.equipment, ['Machines', 'Barbell']);
  assert.deepEqual(equipmentForWorkoutSettings({ trainingLocation: 'gym', equipment: [] }), DEFAULT_GYM_EQUIPMENT);
  assert.deepEqual(equipmentForWorkoutSettings({ trainingLocation: 'gym', equipment: ['Bodyweight'] }), ['Bodyweight']);

  const customSchedule = normalizeWorkoutCoachSettings({ daysPerWeek: 7, sessionMinutes: 73 });
  assert.equal(customSchedule.daysPerWeek, 7);
  assert.equal(customSchedule.sessionMinutes, 73);
  assert.equal(normalizeWorkoutCoachSettings({ daysPerWeek: 1 }).daysPerWeek, 1);
  assert.equal(normalizeWorkoutCoachSettings({ daysPerWeek: 0, sessionMinutes: 3 }).daysPerWeek, 3);
  assert.equal(normalizeWorkoutCoachSettings({ daysPerWeek: 8, sessionMinutes: 240 }).sessionMinutes, 180);
});

test('routine coaching rotates from completed workout history', () => {
  const exercise = {
    id: 'one', date: '2026-09-03', createdAt: 10, name: 'Push workout', caloriesBurned: 0, durationMinutes: 45,
    workoutSplits: ['push'], cardioIntensity: null,
    muscleSets: { chest: 3, legs: 0, back: 0, arms: 3, shoulders: 3, abs: 0, glutes: 0, other: 0 },
  };
  assert.equal(nextRoutineSession('push_pull_legs', [exercise]).label, 'Pull');
  assert.equal(nextRoutineSession('upper_lower', [{ ...exercise, workoutSplits: ['upper_body'] }]).label, 'Lower body');
  assert.equal(nextRoutineSession('push_pull_legs', [{ ...exercise, workoutSplits: ['back'], muscleSets: { ...exercise.muscleSets, chest: 0, arms: 2, shoulders: 0, back: 4 } }]).label, 'Legs');
  assert.equal(nextRoutineSession('full_body', []).sessionStyle, 'full_body');
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
  assert.ok(result[0].exercise.primaryMuscles.includes('back'));
  assert.ok(result.some((item) => item.exercise.id === 'lateral-raise'));
  assert.ok(result.reduce((sum, item) => sum + item.estimatedMinutes, 0) <= 30);
});

test('a user-selected muscle focus changes exercise priority without ignoring setup', () => {
  const result = recommendWorkout({
    ...base,
    experience: 'beginner',
    location: 'gym',
    equipment: ['Machines'],
    recentMuscleSets: { chest: 6, legs: 6, back: 6, arms: 6, shoulders: 6, abs: 6, glutes: 6 },
    musclesNeedingAttention: [],
    priorityMuscle: 'chest',
    limit: 1,
  });
  assert.ok(result[0].exercise.primaryMuscles.includes('chest'));
  assert.equal(result[0].isSpecialization, false);
  assert.match(result[0].reason, /chosen chest focus/);
});

test('a beginner focus does not override a completed weekly target', () => {
  const result = recommendWorkout({
    ...base,
    location: 'gym',
    equipment: ['Machines'],
    recentMuscleSets: { chest: 12, back: 0 },
    musclesNeedingAttention: ['back'],
    priorityMuscle: 'chest',
    limit: 1,
  });
  assert.ok(result[0].exercise.primaryMuscles.includes('back'));
  assert.equal(result[0].isSpecialization, false);
});

test('recommendations deprioritize muscles already at recovery-check or high volume', () => {
  const result = recommendWorkout({
    ...base,
    recentMuscleSets: { chest: 20, back: 0, arms: 16, shoulders: 12 },
    musclesNeedingAttention: ['chest', 'arms', 'back'],
    limit: 1,
  });
  assert.ok(result[0].exercise.primaryMuscles.includes('back'));
  assert.ok(!result[0].exercise.primaryMuscles.includes('chest'));
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

test('an explicit deadlift avoidance removes every deadlift variation', () => {
  const result = recommendWorkout({
    ...base,
    experience: 'advanced',
    location: 'gym',
    equipment: DEFAULT_GYM_EQUIPMENT,
    availableMinutes: 75,
    targetMuscles: ['legs', 'glutes'],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'glutes'],
    limitations: ['Avoid deadlift exercises'],
    limit: 6,
  });
  assert.ok(result.length > 0);
  assert.ok(result.every((item) => !/deadlift/i.test(item.exercise.name)));
  assert.ok(result.some((item) => item.exercise.primaryMuscles.some((muscle) => ['legs', 'glutes'].includes(muscle))));
});

test('a selected routine limits strength recommendations to the scheduled muscles', () => {
  const result = recommendWorkout({
    ...base,
    location: 'gym',
    equipment: ['Dumbbells', 'Bench', 'Machines', 'Barbell'],
    targetMuscles: ['legs', 'glutes'],
    musclesNeedingAttention: ['chest', 'back', 'legs', 'glutes'],
    limit: 3,
  });
  assert.ok(result.length > 0);
  assert.ok(result.length > 1, 'a focused routine day should include complementary exercises');
  assert.ok(result.every((item) => item.exercise.activityType === 'cardio' || item.exercise.primaryMuscles.some((muscle) => ['legs', 'glutes'].includes(muscle))));
});

test('experience and location audit keeps starter regressions out of regular and advanced gym plans', () => {
  const chair = WORKOUT_CATALOG.find((item) => item.id === 'chair-sit-to-stand');
  const wall = WORKOUT_CATALOG.find((item) => item.id === 'wall-push-up');
  assert.deepEqual(chair?.experience, ['beginner']);
  assert.deepEqual(chair?.locations, ['home', 'both']);
  assert.deepEqual(wall?.experience, ['beginner']);
  assert.deepEqual(wall?.locations, ['home', 'both']);

  for (const experience of ['intermediate', 'advanced']) {
    const result = recommendWorkout({
      ...base,
      experience,
      location: 'gym',
      equipment: DEFAULT_GYM_EQUIPMENT,
      availableMinutes: 75,
      targetMuscles: ['legs', 'glutes'],
      recentMuscleSets: {},
      musclesNeedingAttention: ['legs', 'glutes'],
      limit: 4,
    });
    assert.ok(result.length > 0);
    assert.ok(result.every((item) => !['chair-sit-to-stand', 'wall-push-up'].includes(item.exercise.id)));
    assert.ok(result.some((item) => item.equipment !== 'Stable chair against a wall'));
    assert.ok(result.some((item) => !item.exercise.experience.includes('beginner')), `${experience} gym should surface an exercise from its higher-skill pool`);
  }
});

test('home, gym, and both setups return only exercises approved for the selected level and location', () => {
  const setupEquipment = {
    home: ['Dumbbells', 'Bench', 'Bands', 'Pull-up bar'],
    gym: DEFAULT_GYM_EQUIPMENT,
    both: ['Dumbbells', 'Bench', 'Bands', 'Pull-up bar'],
  };
  for (const location of ['home', 'gym', 'both']) {
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      const result = recommendWorkout({ ...base, location, experience, equipment: setupEquipment[location], sessionStyle: 'full_body', limit: 3 });
      assert.ok(result.length > 0, `${experience} ${location} should have recommendations`);
      assert.ok(result.every((item) => item.exercise.locations.includes(location)), `${experience} ${location} should respect location`);
      assert.ok(result.every((item) => item.exercise.experience.includes(experience)), `${experience} ${location} should respect experience`);
    }
  }
});

test('fat-loss plans reserve room for both strength and conditioning within the session budget', () => {
  const result = recommendWorkout({
    ...base,
    goal: 'lose',
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Dumbbells', 'Bench', 'Barbell', 'Machines', 'Pull-up bar'],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'back', 'chest', 'shoulders', 'glutes', 'arms', 'abs'],
    sessionStyle: 'full_body',
    includeCardio: true,
  });
  const cardio = result.filter((item) => item.exercise.activityType === 'cardio');
  assert.equal(cardio.length, 1);
  assert.ok(result.some((item) => item.exercise.activityType === 'strength'));
  assert.equal(cardio[0].exercise.activityType, 'cardio');
  assert.equal(cardio[0].exercise.cardio.calorieTarget, null);
  assert.equal(cardio[0].recommendedDurationMinutes, 15);
  assert.equal(cardio[0].cardioIntensity, 'moderate');
  assert.ok(result.reduce((sum, item) => sum + item.estimatedMinutes, 0) <= 30);
});

test('beginner fat-loss plans use moderate conditioning rather than vigorous intervals', () => {
  const result = recommendWorkout({
    ...base,
    goal: 'lose',
    experience: 'beginner',
    equipment: [],
    recentMuscleSets: {},
    musclesNeedingAttention: ['abs'],
    sessionStyle: 'full_body',
    includeCardio: true,
  });
  assert.ok(result.some((item) => item.exercise.activityType === 'cardio' && item.cardioIntensity === 'moderate'));
  assert.ok(result.every((item) => item.exercise.id !== 'vigorous-cardio-intervals'));
});

test('eligible fat-loss plans rotate from recent steady cardio to intervals', () => {
  const result = recommendWorkout({
    ...base,
    goal: 'lose',
    experience: 'intermediate',
    equipment: [],
    recentMuscleSets: {},
    musclesNeedingAttention: [],
    recentExerciseIds: ['moderate-steady-cardio'],
    includeCardio: true,
    limit: 1,
  });
  assert.equal(result[0].exercise.id, 'vigorous-cardio-intervals');
  assert.equal(result[0].recommendedDurationMinutes, 15);
  assert.equal(result[0].cardioIntensity, 'vigorous');
});

test('fat-loss cardio prescriptions use the remaining equivalent minutes and stop forcing cardio at baseline', () => {
  const nearlyThere = recommendWorkout({
    ...base,
    goal: 'lose',
    experience: 'intermediate',
    equipment: [],
    recentMuscleSets: {},
    musclesNeedingAttention: [],
    recentCardioEquivalentMinutes: 142,
    includeCardio: true,
    limit: 1,
  });
  assert.equal(nearlyThere[0].exercise.activityType, 'cardio');
  assert.equal(nearlyThere[0].recommendedDurationMinutes, 8);
  assert.match(nearlyThere[0].reason, /8 moderate-equivalent minutes/);

  const baselineMet = recommendWorkout({
    ...base,
    goal: 'lose',
    recentCardioEquivalentMinutes: 150,
    includeCardio: true,
    limit: 3,
  });
  assert.ok(baselineMet.every((item) => item.exercise.activityType !== 'cardio'));

  const mixedThirtyMinuteSession = recommendWorkout({
    ...base,
    goal: 'lose',
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Dumbbells', 'Machines'],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'back', 'chest'],
    recentCardioEquivalentMinutes: 60,
    sessionStyle: 'full_body',
    includeCardio: true,
  });
  assert.ok(mixedThirtyMinuteSession.some((item) => item.exercise.activityType === 'strength'));
  assert.equal(mixedThirtyMinuteSession.find((item) => item.exercise.activityType === 'cardio')?.recommendedDurationMinutes, 15);
  assert.ok(mixedThirtyMinuteSession.reduce((sum, item) => sum + item.estimatedMinutes, 0) <= 30);
});

test('vigorous cardio is capped after two sessions and withheld after hard leg training', () => {
  for (const input of [
    { recentVigorousCardioSessions: 2 },
    { recentHardLegTraining: true },
  ]) {
    const result = recommendWorkout({
      ...base,
      ...input,
      goal: 'lose',
      experience: 'intermediate',
      equipment: [],
      recentMuscleSets: {},
      musclesNeedingAttention: [],
      recentExerciseIds: ['moderate-steady-cardio'],
      includeCardio: true,
      limit: 1,
    });
    assert.equal(result[0].exercise.cardio?.intensity, 'moderate');
  }
});

test('inactive fat-loss users receive preferred short cardio and accessible strength', () => {
  const result = recommendWorkout({
    ...base,
    goal: 'lose',
    experience: 'beginner',
    equipment: [],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'glutes', 'chest', 'back', 'abs'],
    activityBaseline: 'inactive',
    comfortableCardioMinutes: 5,
    cardioTargetMinutes: 30,
    preferredCardioIds: ['comfortable-walk', 'brisk-walk'],
    sessionStyle: 'full_body',
    includeCardio: true,
  });
  const cardio = result.find((item) => item.exercise.activityType === 'cardio');
  assert.equal(cardio?.exercise.id, 'comfortable-walk');
  assert.equal(cardio?.recommendedDurationMinutes, 5);
  assert.ok(result.some((item) => ['chair-sit-to-stand', 'wall-push-up', 'glute-bridge'].includes(item.exercise.id)));
  assert.match(cardio.reason, /30-minute staged target/);
});

test('cardio preference, balance, chair comfort, and completed sessions adapt recommendations', () => {
  const cycling = recommendWorkout({
    ...base,
    goal: 'lose',
    equipment: [],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs'],
    comfortableCardioMinutes: 10,
    recentCardioSessions: 2,
    recentCardioEquivalentMinutes: 20,
    preferredCardioIds: ['stationary-cycling'],
    balanceConcern: true,
    chairStandComfortable: false,
    includeCardio: true,
  });
  const cardio = cycling.find((item) => item.exercise.activityType === 'cardio');
  assert.equal(cardio?.exercise.id, 'stationary-cycling');
  assert.equal(cardio?.recommendedDurationMinutes, 15);
  assert.ok(cycling.every((item) => item.exercise.id !== 'chair-sit-to-stand'));
  assert.ok(cycling.every((item) => !item.exercise.avoidWhenLimitationMatches.includes('balance')));
});

test('gain and maintain plans do not add conditioning when it is not requested', () => {
  for (const goal of ['gain', 'maintain']) {
    const result = recommendWorkout({ ...base, goal, includeCardio: false });
    assert.ok(result.every((item) => item.exercise.activityType === 'strength'));
  }
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

test('exercise responses favor comfortable movements, lower uncomfortable ones, and exclude unsuitable ones', () => {
  const input = {
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Machines', 'Pull-up bar'],
    recentMuscleSets: { back: 0 },
    musclesNeedingAttention: ['back'],
    limit: 1,
  };
  const comfortable = recommendWorkout({
    ...input,
    exerciseResponses: { 'lat-pulldown': 'comfortable' },
  });
  assert.equal(comfortable[0].exercise.id, 'lat-pulldown');

  const unsuitable = recommendWorkout({
    ...input,
    exerciseResponses: { 'lat-pulldown': 'unsuitable', 'chest-supported-machine-row': 'uncomfortable' },
  });
  assert.ok(unsuitable.every((item) => item.exercise.id !== 'lat-pulldown'));
  assert.notEqual(unsuitable[0].exercise.id, 'chest-supported-machine-row');
});

test('full-body recommendations select distinct foundation patterns to fit the time budget', () => {
  const result = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Dumbbells', 'Bench', 'Barbell', 'Machines', 'Pull-up bar'],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'back', 'chest', 'shoulders', 'glutes', 'arms', 'abs'],
    availableMinutes: 30,
    sessionStyle: 'full_body',
  });
  assert.equal(result.length, 3);
  assert.ok(result.every((item) => item.exercise.foundationPattern));
  assert.equal(new Set(result.map((item) => item.exercise.foundationPattern)).size, 3);
  assert.ok(result.reduce((sum, item) => sum + item.estimatedMinutes, 0) <= 30);
});

test('a sixty-minute full-body request can cover all six foundation patterns', () => {
  const result = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Dumbbells', 'Bench', 'Barbell', 'Machines', 'Pull-up bar'],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'back', 'chest', 'shoulders', 'glutes'],
    availableMinutes: 60,
    sessionStyle: 'full_body',
  });
  assert.equal(result.length, 6);
  assert.deepEqual(
    new Set(result.map((item) => item.exercise.foundationPattern)),
    new Set(['press', 'knee_dominant', 'vertical_pull', 'hip_hinge', 'horizontal_pull', 'shoulder_accessory'])
  );
  assert.ok(result.reduce((sum, item) => sum + item.estimatedMinutes, 0) <= 60);
});

test('generated sessions stay under the direct per-muscle set guardrail', () => {
  const result = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Dumbbells', 'Bench', 'Barbell', 'Machines', 'Pull-up bar'],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'back', 'chest', 'shoulders', 'glutes', 'arms', 'abs'],
    availableMinutes: 120,
    sessionStyle: 'full_body',
    limit: 8,
  });
  const totals = {};
  for (const recommendation of result.filter((item) => item.exercise.activityType === 'strength')) {
    const sets = recommendation.recommendedSets ?? recommendation.exercise.strength.sets;
    for (const muscle of recommendation.exercise.primaryMuscles) totals[muscle] = (totals[muscle] ?? 0) + sets;
  }
  assert.ok(Object.values(totals).every((sets) => sets <= MAX_RECOMMENDED_SETS_PER_MUSCLE_SESSION));
});

test('recent full-body patterns yield to omitted patterns, with accessories added last', () => {
  const rotated = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Dumbbells', 'Bench', 'Barbell', 'Machines', 'Pull-up bar'],
    recentMuscleSets: { chest: 6, legs: 6, back: 6, shoulders: 6, glutes: 6 },
    musclesNeedingAttention: [],
    recentExerciseIds: ['incline-dumbbell-press', 'goblet-squat', 'pull-up'],
    availableMinutes: 20,
    sessionStyle: 'full_body',
  });
  assert.equal(rotated.length, 2);
  assert.ok(rotated.every((item) => !['press', 'knee_dominant', 'vertical_pull'].includes(item.exercise.foundationPattern)));

  const withAccessories = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Dumbbells', 'Bench', 'Barbell', 'Machines', 'Bands', 'Pull-up bar'],
    recentMuscleSets: {},
    musclesNeedingAttention: ['legs', 'back', 'chest', 'shoulders', 'glutes', 'arms', 'abs'],
    availableMinutes: 80,
    sessionStyle: 'full_body',
    limit: 8,
  });
  assert.equal(withAccessories.length, 8);
  assert.ok(withAccessories.slice(0, 6).every((item) => item.exercise.foundationPattern));
  assert.ok(withAccessories.slice(6).every((item) => !item.exercise.foundationPattern));
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
  assert.ok(['leg-press', 'hack-squat'].includes(eligible[0].exercise.id));
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
  assert.ok(capped[0].recommendedSets >= 1 && capped[0].recommendedSets <= 2);
  assert.equal(capped[0].isTimeEfficient, true);

  const recoveryCheck = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Machines'],
    recentMuscleSets: { legs: 16 },
    musclesNeedingAttention: [],
    specialization: { ...specialization, baselineWeeklySets: 16 },
    limit: 1,
  });
  assert.equal(recoveryCheck[0].isSpecialization, false);
});

test('short sessions use one or two focused working sets and preserve the reduced time budget', () => {
  const result = recommendWorkout({ ...base, sessionStyle: 'full_body' });
  assert.ok(result.length > 0);
  assert.ok(result.every((item) => item.exercise.activityType !== 'strength' || item.isTimeEfficient));
  assert.ok(result.every((item) => item.exercise.activityType !== 'strength' || (item.recommendedSets >= 1 && item.recommendedSets <= 2)));
  assert.ok(result.reduce((sum, item) => sum + item.estimatedMinutes, 0) <= 30);
});

test('failure reminders depend on experience and exercise safety', () => {
  const beginner = recommendWorkout({ ...base, limit: 1 })[0];
  assert.match(beginner.effortGuidance, /1–2 clean reps in reserve/);
  assert.doesNotMatch(beginner.effortGuidance, /go to technical failure/);

  const isolation = recommendWorkout({
    ...base,
    experience: 'intermediate',
    location: 'gym',
    equipment: ['Machines'],
    recentMuscleSets: { chest: 0, legs: 20, arms: 20, shoulders: 20, back: 20, glutes: 20, abs: 20 },
    musclesNeedingAttention: ['chest'],
    limit: 1,
  })[0];
  assert.equal(isolation.exercise.id, 'machine-chest-fly');
  assert.match(isolation.effortGuidance, /go to technical failure/);

  const compound = recommendWorkout({
    ...base,
    experience: 'intermediate',
    equipment: ['Dumbbells'],
    recentMuscleSets: { chest: 20, legs: 0, arms: 20, shoulders: 20, back: 20, glutes: 0, abs: 20 },
    musclesNeedingAttention: ['legs'],
    limit: 1,
  })[0];
  assert.equal(compound.exercise.technicalFailureSuitable, undefined);
  assert.match(compound.effortGuidance, /do not fail under the load/);
});

test('longer sessions keep catalogue set counts and standard reps-in-reserve guidance', () => {
  const result = recommendWorkout({ ...base, availableMinutes: 60, limit: 1 });
  assert.equal(result[0].recommendedSets, undefined);
  assert.equal(result[0].isTimeEfficient, false);
  assert.equal(result[0].estimatedMinutes, result[0].exercise.estimatedMinutes);
  assert.match(result[0].effortGuidance, /controlled reps in reserve/);
});

test('recommendation generation does not mutate seven-day muscle input', () => {
  const input = structuredClone(base);
  const original = structuredClone(input);
  recommendWorkout(input);
  assert.deepEqual(input, original);
});

test('exercise responses normalize and persist per account', async () => {
  assert.deepEqual(normalizeExerciseResponseSettings(null), DEFAULT_EXERCISE_RESPONSE_SETTINGS);
  assert.deepEqual(normalizeExerciseResponseSettings({ responses: {
    'lat-pulldown': 'comfortable',
    ' hack-squat ': 'uncomfortable',
    invalid: 'painful',
    '': 'unsuitable',
  } }), { responses: { 'lat-pulldown': 'comfortable', 'hack-squat': 'uncomfortable' } });

  const data = new Map();
  const storage = { getItem: async (key) => data.get(key) ?? null, setItem: async (key, value) => { data.set(key, value); } };
  const settings = { responses: { 'lat-pulldown': 'comfortable', 'hack-squat': 'unsuitable' } };
  await writeExerciseResponseSettings(storage, 'account-a', settings);
  assert.deepEqual(await readExerciseResponseSettings(storage, 'account-a'), settings);
  assert.deepEqual(await readExerciseResponseSettings(storage, 'account-b'), DEFAULT_EXERCISE_RESPONSE_SETTINGS);
  await assert.rejects(writeExerciseResponseSettings(storage, '', settings), /Sign in/);
});
