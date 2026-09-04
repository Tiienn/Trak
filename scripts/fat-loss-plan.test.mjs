import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFatLossWeek, weightTrendGuidance } from '../src/lib/fat-loss-plan.ts';
import {
  DEFAULT_FAT_LOSS_SETTINGS,
  cardioTargetForSettings,
  normalizeFatLossSettings,
  preferredCardioCatalogIds,
  readFatLossSettings,
  writeFatLossSettings,
} from '../src/lib/fat-loss-settings.ts';

test('fat-loss preferences normalize, remain account scoped, and map cardio choices', async () => {
  const settings = normalizeFatLossSettings({
    activityBaseline: 'inactive',
    comfortableCardioMinutes: 5,
    preferredCardioModes: ['pool', 'pool', 'bad'],
    balanceConcern: true,
    chairStandComfortable: false,
    movementBreaks: true,
    phase: 'loss',
  });
  assert.deepEqual(settings.preferredCardioModes, ['pool']);
  assert.equal(cardioTargetForSettings(settings), 30);
  assert.deepEqual(preferredCardioCatalogIds(settings), ['swimming-water-walking']);
  const values = new Map();
  const storage = { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => values.set(key, value) };
  await writeFatLossSettings(storage, 'one', settings);
  assert.deepEqual(await readFatLossSettings(storage, 'one'), settings);
  assert.deepEqual(await readFatLossSettings(storage, 'two'), DEFAULT_FAT_LOSS_SETTINGS);
  await assert.rejects(writeFatLossSettings(storage, '', settings), /Sign in/);
});

test('weekly structure preserves two strength exposures and scales cardio days from baseline', () => {
  const inactive = buildFatLossWeek({ ...DEFAULT_FAT_LOSS_SETTINGS, activityBaseline: 'inactive', comfortableCardioMinutes: 5 }, 6);
  assert.equal(inactive.length, 3);
  assert.equal(inactive.filter((session) => session.kind !== 'cardio').length, 2);
  assert.ok(inactive.every((session) => session.cardioMinutes === 5));
  const active = buildFatLossWeek({ ...DEFAULT_FAT_LOSS_SETTINGS, activityBaseline: 'active', comfortableCardioMinutes: 30 }, 5);
  assert.equal(active.length, 5);
  assert.equal(active.filter((session) => session.kind === 'mixed').length, 2);
  assert.equal(active.reduce((sum, session) => sum + session.cardioMinutes, 0), 150);
});

test('weight trend waits for comparable three-week data and never prescribes compensatory exercise', () => {
  const sparse = [{ date: '2026-08-14', weightKg: 90 }, { date: '2026-09-03', weightKg: 90 }];
  assert.equal(weightTrendGuidance(sparse, 'lose', '2026-09-03'), null);
  const steady = ['2026-08-14', '2026-08-15', '2026-08-20', '2026-08-28', '2026-09-02', '2026-09-03']
    .map((date, index) => ({ date, weightKg: 90 + (index % 2) * 0.1 }));
  const guidance = weightTrendGuidance(steady, 'lose', '2026-09-03');
  assert.match(guidance, /Before adding exercise/);
  assert.match(guidance, /one small lever/);
  const losing = steady.map((entry, index) => ({ ...entry, weightKg: 90 - index * 0.4 }));
  assert.equal(weightTrendGuidance(losing, 'lose', '2026-09-03'), null);
});
