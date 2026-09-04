import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adultEligibilityForAge,
  MAXIMUM_TRAK_AGE,
  MINIMUM_TRAK_AGE,
} from '../src/lib/adult-eligibility.ts';

test('Trak treats 18 as the adult eligibility boundary', () => {
  assert.equal(adultEligibilityForAge(MINIMUM_TRAK_AGE - 1), 'underage');
  assert.equal(adultEligibilityForAge(MINIMUM_TRAK_AGE), 'adult');
  assert.equal(adultEligibilityForAge(MAXIMUM_TRAK_AGE), 'adult');
});

test('missing or implausible ages require confirmation', () => {
  assert.equal(adultEligibilityForAge(undefined), 'unknown');
  assert.equal(adultEligibilityForAge(null), 'unknown');
  assert.equal(adultEligibilityForAge(''), 'unknown');
  assert.equal(adultEligibilityForAge(0), 'unknown');
  assert.equal(adultEligibilityForAge(101), 'unknown');
  assert.equal(adultEligibilityForAge(18.5), 'unknown');
});
