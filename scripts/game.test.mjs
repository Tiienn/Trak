import assert from 'node:assert/strict';
import test from 'node:test';

import { higherLowerAnsweredRounds } from '../src/lib/game-rules.ts';

test('Higher or Lower counts the final incorrect answer', () => {
  assert.equal(higherLowerAnsweredRounds(0), 1);
  assert.equal(higherLowerAnsweredRounds(3), 4);
});

test('Higher or Lower round counting is defensive', () => {
  assert.equal(higherLowerAnsweredRounds(-4), 1);
  assert.equal(higherLowerAnsweredRounds(Number.NaN), 1);
});

