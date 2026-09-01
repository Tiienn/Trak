import assert from 'node:assert/strict';
import test from 'node:test';

import { buildDailyMissions, missionScore } from '../src/lib/missions.ts';
import { compactMissionProgress, missionDetail } from '../src/lib/mission-presentation.ts';

const base = {
  totals: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  targets: { calories: 2_000, protein_g: 120, carbs_g: 200, fat_g: 60 },
  calorieBudget: 2_000,
  mealsLogged: 0,
  waterToday: 0,
  waterGoal: 8,
  workoutMinutes: 0,
  goal: 'maintain',
};

test('daily score is exactly five all-or-nothing missions worth 20 points', () => {
  const missions = buildDailyMissions(base);
  assert.equal(missions.length, 5);
  assert.ok(missions.every((mission) => mission.points === 20));
  assert.equal(missionScore(missions), 0);

  const complete = buildDailyMissions({
    ...base,
    totals: { ...base.totals, calories: 1_600, protein_g: 120 },
    mealsLogged: 3,
    waterToday: 8,
    workoutMinutes: 30,
  });
  assert.equal(missionScore(complete), 100);
  assert.ok(complete.every((mission) => mission.complete));
});

test('calorie mission needs three meals and uses 80 percent of the exercise-adjusted budget', () => {
  const underLogged = buildDailyMissions({ ...base, totals: { ...base.totals, calories: 1_800 }, mealsLogged: 2 });
  assert.equal(underLogged.find((mission) => mission.key === 'calories')?.complete, false);

  const exercised = buildDailyMissions({ ...base, totals: { ...base.totals, calories: 1_680 }, calorieBudget: 2_100, mealsLogged: 3 });
  assert.equal(exercised.find((mission) => mission.key === 'calories')?.target, 1_680);
  assert.equal(exercised.find((mission) => mission.key === 'calories')?.complete, true);
});

test('compact indicators keep full targets available without changing mission points', () => {
  const missions = buildDailyMissions({
    ...base,
    totals: { ...base.totals, calories: 800, protein_g: 60 },
    mealsLogged: 2,
    waterToday: 8,
    workoutMinutes: 15,
  });
  assert.deepEqual(missions.map(compactMissionProgress), ['2/3', '50%', '50%', 'Done', '15/30']);
  assert.equal(missionDetail(missions[1]), '60 of 120 g');
  assert.equal(missionDetail(missions[3]), 'Complete');
  assert.equal(missionScore(missions), 20);
});

test('hitting the fuel target without three meals never shows a completed mission', () => {
  const missions = buildDailyMissions({ ...base, totals: { ...base.totals, calories: 1_800 }, mealsLogged: 2 });
  const fuel = missions.find((mission) => mission.key === 'calories');
  assert.equal(compactMissionProgress(fuel), 'Log meals');
  assert.match(missionDetail(fuel), /log 3 meals/);
  assert.equal(missionScore(missions), 0);
});

test('near-target protein stays below 100 percent until complete', () => {
  const missions = buildDailyMissions({ ...base, totals: { ...base.totals, protein_g: 119 } });
  assert.equal(compactMissionProgress(missions[1]), '99%');
  assert.equal(missions[1].complete, false);
});
