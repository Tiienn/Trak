import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveTrakCapabilities } from '../src/lib/access.ts';

test('legacy pro, account trial, and tester access each preserve every current AI feature', () => {
  for (const source of [
    { isPro: true, inTrial: false, testerAccess: false },
    { isPro: false, inTrial: true, testerAccess: false },
    { isPro: false, inTrial: false, testerAccess: true },
  ]) {
    assert.deepEqual(resolveTrakCapabilities(source), {
      nutritionAi: true,
      bodyAnalysis: true,
      coach: true,
    });
  }
});

test('future entitlements are isolated without removing legacy access', () => {
  assert.deepEqual(
    resolveTrakCapabilities({
      isPro: false,
      inTrial: false,
      testerAccess: false,
      activeEntitlements: ['nutrition'],
    }),
    { nutritionAi: true, bodyAnalysis: false, coach: false },
  );
  assert.deepEqual(
    resolveTrakCapabilities({
      isPro: true,
      inTrial: false,
      testerAccess: false,
      activeEntitlements: [],
    }),
    { nutritionAi: true, bodyAnalysis: true, coach: true },
  );
  assert.deepEqual(
    resolveTrakCapabilities({
      isPro: false,
      inTrial: false,
      testerAccess: false,
      activeEntitlements: ['coach'],
    }),
    { nutritionAi: false, bodyAnalysis: true, coach: true },
  );
});
