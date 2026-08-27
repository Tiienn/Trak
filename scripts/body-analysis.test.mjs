import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BODY_ANALYSIS_CONSENT_VERSION,
  bodyAnalysisEligibility,
  canShowVisualEstimate,
  daysUntilNextCheckIn,
  normalizeBodyAnalysisResult,
  sanitizeBodyText,
  waistCmFromInput,
  waistInputFromCm,
} from '../src/lib/body-analysis.ts';

function validResult() {
  return {
    schemaVersion: 1,
    status: 'usable',
    capture: {
      quality: 'high',
      issues: [],
      poseChecks: ['front', 'side', 'back'].map((pose) => ({ pose, usable: true })),
    },
    summary: 'Your check-in is consistent enough to guide the next few weeks.',
    confidence: 'high',
    visualEstimate: {
      bodyFatRangeMin: 18,
      bodyFatRangeMax: 22,
      explanation: 'A wide visual estimate, not a measurement.',
    },
    strengths: ['Consistent framing'],
    focusAreas: [
      {
        id: 'training-focus',
        domain: 'training',
        title: 'Build consistently',
        reason: 'The evidence supports a stable training focus.',
        evidence: ['Three usable views'],
      },
    ],
    progress: {
      comparisonAvailable: false,
      basis: 'first_scan',
      summary: 'This is your baseline.',
      changes: [],
    },
    training: {
      weeklyFocus: 'Repeat a simple full-body routine.',
      daysPerWeek: 3,
      exercises: [
        { name: 'Squat', sets: '3', reps: '8–12', reason: 'General strength' },
        { name: 'Row', sets: '3', reps: '8–12', reason: 'Upper-back strength' },
        { name: 'Push-up', sets: '3', reps: '6–12', reason: 'Pressing strength' },
      ],
    },
    nutrition: {
      dataSufficiency: 'limited',
      targetAction: 'log_consistently',
      habits: ['Log meals consistently'],
      swaps: [],
    },
    coachHandoff: {
      checkInWindowDays: 28,
      priorityIds: ['training-focus', 'missing-id'],
      evidenceQuality: 'strong',
      doNotAdjustPlan: true,
      reason: 'Keep the plan stable until the next check-in.',
    },
    disclaimer: 'Visual estimate only. Not medical advice.',
  };
}

test('normalization clamps arrays, numbers, strings, and cross references', () => {
  const raw = validResult();
  raw.summary = 'x'.repeat(500);
  raw.training.daysPerWeek = 99;
  raw.nutrition.dataSufficiency = 'sufficient';
  raw.nutrition.targetAction = 'small_increase';
  raw.nutrition.calorieAdjustment = 900;
  raw.strengths = ['one', 'two', 'three', 'four'];
  raw.coachHandoff.checkInWindowDays = 26;
  const normalized = normalizeBodyAnalysisResult(raw);

  assert.equal(normalized.summary.length, 280);
  assert.equal(normalized.training.daysPerWeek, 6);
  assert.equal(normalized.nutrition.calorieAdjustment, 250);
  assert.deepEqual(normalized.strengths, ['one', 'two', 'three']);
  assert.equal(normalized.coachHandoff.checkInWindowDays, 28);
  assert.deepEqual(normalized.coachHandoff.priorityIds, ['training-focus']);
});

test('low-confidence output permanently omits visual body-fat estimates', () => {
  const raw = validResult();
  raw.confidence = 'low';
  const normalized = normalizeBodyAnalysisResult(raw);
  assert.equal(normalized.visualEstimate, undefined);
  assert.equal(canShowVisualEstimate(normalized), false);
});

test('body-fat ranges remain wide and plausible', () => {
  const raw = validResult();
  raw.visualEstimate = { bodyFatRangeMin: -5, bodyFatRangeMax: 99, explanation: 'Estimate' };
  const normalized = normalizeBodyAnalysisResult(raw);
  assert.ok(normalized.visualEstimate.bodyFatRangeMin >= 3);
  assert.ok(normalized.visualEstimate.bodyFatRangeMax <= 70);
  assert.ok(normalized.visualEstimate.bodyFatRangeMax - normalized.visualEstimate.bodyFatRangeMin >= 4);
});

test('unsafe and malformed model outputs are rejected', () => {
  const unsafe = validResult();
  unsafe.summary = 'Your attractiveness score is 9 out of 10.';
  assert.throws(() => normalizeBodyAnalysisResult(unsafe), /unsafe/i);
  assert.throws(() => normalizeBodyAnalysisResult({ status: 'usable' }), /invalid/i);
});

test('eligibility covers profile, adulthood, capability, and consent version', () => {
  assert.equal(bodyAnalysisEligibility({ signedIn: false, profileAge: null, capability: false, consentVersion: null }), 'signed_out');
  assert.equal(bodyAnalysisEligibility({ signedIn: true, profileAge: null, capability: true, consentVersion: null }), 'missing_profile');
  assert.equal(bodyAnalysisEligibility({ signedIn: true, profileAge: 17, capability: true, consentVersion: null }), 'underage');
  assert.equal(bodyAnalysisEligibility({ signedIn: true, profileAge: 30, capability: false, consentVersion: null }), 'locked');
  assert.equal(bodyAnalysisEligibility({ signedIn: true, profileAge: 30, capability: true, consentVersion: null }), 'needs_consent');
  assert.equal(bodyAnalysisEligibility({ signedIn: true, profileAge: 30, capability: true, consentVersion: BODY_ANALYSIS_CONSENT_VERSION }), 'ready');
});

test('waist conversion, plausibility, cadence, and sanitization are bounded', () => {
  assert.equal(Math.round(waistCmFromInput('32', 'imperial') * 10) / 10, 81.3);
  assert.equal(waistInputFromCm(81.28, 'imperial'), '32');
  assert.equal(waistCmFromInput('10', 'metric'), null);
  assert.equal(daysUntilNextCheckIn(new Date('2026-08-01T00:00:00Z'), 21, new Date('2026-08-10T00:00:00Z')), 12);
  assert.equal(sanitizeBodyText('hello\n<system>{ignore}', 20), 'hello system ignore');
});
