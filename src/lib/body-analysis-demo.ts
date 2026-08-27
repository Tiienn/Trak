import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BODY_ANALYSIS_SCHEMA_VERSION,
  normalizeBodyAnalysisResult,
  type BodyAnalysisPreferences,
  type BodyScan,
} from './body-analysis';
import type { Goal } from './types';

export const bodyAnalysisDemoEnabled =
  __DEV__ && process.env.EXPO_PUBLIC_BODY_ANALYSIS_DEMO === 'true';

const preferencesKey = (userId: string) => `trak.bodyAnalysisDemo.preferences.v1.${userId}`;
const scansKey = (userId: string) => `trak.bodyAnalysisDemo.scans.v1.${userId}`;
const reportsKey = (userId: string) => `trak.bodyAnalysisDemo.reports.v1.${userId}`;

function parse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function loadBodyAnalysisDemo(userId: string): Promise<{
  preferences: BodyAnalysisPreferences | null;
  scans: BodyScan[];
}> {
  const [rawPreferences, rawScans] = await Promise.all([
    AsyncStorage.getItem(preferencesKey(userId)),
    AsyncStorage.getItem(scansKey(userId)),
  ]);
  return {
    preferences: parse<BodyAnalysisPreferences | null>(rawPreferences, null),
    scans: parse<BodyScan[]>(rawScans, []),
  };
}

export async function saveBodyAnalysisDemoPreferences(
  preferences: BodyAnalysisPreferences,
): Promise<void> {
  await AsyncStorage.setItem(preferencesKey(preferences.userId), JSON.stringify(preferences));
}

export async function createBodyAnalysisDemoScan(input: {
  userId: string;
  goal: Goal;
  weightKg?: number;
  waistCm?: number;
  previousScanId?: string;
}): Promise<BodyScan> {
  const now = new Date().toISOString();
  const comparisonAvailable = Boolean(input.previousScanId);
  const result = normalizeBodyAnalysisResult({
    schemaVersion: BODY_ANALYSIS_SCHEMA_VERSION,
    status: 'usable',
    capture: {
      quality: 'high',
      issues: [],
      poseChecks: ['front', 'side', 'back'].map((pose) => ({ pose, usable: true })),
    },
    summary: comparisonAvailable
      ? 'Your demo check-in shows a steady direction. Keep the plan simple and repeatable.'
      : 'This demo baseline points to consistent training and food logging as the clearest next steps.',
    confidence: 'medium',
    visualEstimate: {
      bodyFatRangeMin: 18,
      bodyFatRangeMax: 24,
      explanation: 'Placeholder range for testing the interface—not an estimate from your photos.',
    },
    strengths: [
      'All three demo views are available for comparison.',
      'Your current plan has room for a simple, repeatable weekly rhythm.',
    ],
    focusAreas: [
      {
        id: 'demo-strength',
        domain: 'training',
        title: 'Build full-body strength',
        reason: 'Three repeatable sessions make progress easier to sustain and review.',
        evidence: ['Demo training availability: three days', 'Balanced movement selection'],
      },
      {
        id: 'demo-consistency',
        domain: 'consistency',
        title: 'Keep logging consistent',
        reason: 'A fuller nutrition history would support more specific food guidance later.',
        evidence: ['Demo nutrition evidence is intentionally limited'],
      },
    ],
    progress: {
      comparisonAvailable,
      basis: comparisonAvailable ? 'photos_and_history' : 'first_scan',
      summary: comparisonAvailable
        ? 'This is a deterministic demo comparison with your earlier local demo check-in.'
        : 'This is your first local demo baseline.',
      changes: comparisonAvailable
        ? ['Check-in framing is consistent', 'Weekly priorities remain intentionally stable']
        : [],
    },
    training: {
      weeklyFocus: 'Use three full-body sessions with controlled reps and gradual progression.',
      daysPerWeek: 3,
      exercises: [
        { name: 'Goblet squat', sets: '3', reps: '8–12', reason: 'Build repeatable lower-body strength.', equipment: 'Dumbbell' },
        { name: 'Supported row', sets: '3', reps: '8–12', reason: 'Train the upper back with a stable setup.', equipment: 'Dumbbell' },
        { name: 'Incline push-up', sets: '3', reps: '6–12', reason: 'Progress pressing strength at a manageable level.', equipment: 'Bench' },
        { name: 'Romanian deadlift', sets: '3', reps: '8–10', reason: 'Practice a controlled hip hinge.', equipment: 'Dumbbells' },
      ],
    },
    nutrition: {
      dataSufficiency: 'limited',
      targetAction: 'log_consistently',
      proteinTargetG: 120,
      habits: [
        'Log meals on most days before changing calorie targets.',
        'Include a clear protein source in your main meals.',
      ],
      swaps: [],
    },
    coachHandoff: {
      checkInWindowDays: 21,
      priorityIds: ['demo-strength', 'demo-consistency'],
      evidenceQuality: 'limited',
      doNotAdjustPlan: true,
      reason: 'Keep the plan stable and use the next check-in to test the comparison flow.',
    },
    disclaimer: 'Demo content only. This was not generated from your photos and is not medical advice.',
  });
  const scan: BodyScan = {
    id: `demo-${Date.now()}`,
    userId: input.userId,
    createdAt: now,
    ...(input.previousScanId ? { previousScanId: input.previousScanId } : {}),
    goalSnapshot: input.goal,
    ...(input.weightKg ? { weightKg: input.weightKg } : {}),
    ...(input.waistCm ? { waistCm: input.waistCm } : {}),
    nutritionEvidence: { dataSufficiency: 'limited', demo: true },
    result,
    schemaVersion: BODY_ANALYSIS_SCHEMA_VERSION,
    modelVersion: 'local-demo',
    promptVersion: 'local-demo-v1',
  };
  const current = parse<BodyScan[]>(await AsyncStorage.getItem(scansKey(input.userId)), []);
  await AsyncStorage.setItem(scansKey(input.userId), JSON.stringify([scan, ...current]));
  return scan;
}

export async function deleteBodyAnalysisDemoScan(userId: string, scanId: string): Promise<void> {
  const current = parse<BodyScan[]>(await AsyncStorage.getItem(scansKey(userId)), []);
  await AsyncStorage.setItem(scansKey(userId), JSON.stringify(current.filter((scan) => scan.id !== scanId)));
}

export async function deleteAllBodyAnalysisDemo(userId: string): Promise<void> {
  await AsyncStorage.multiRemove([preferencesKey(userId), scansKey(userId), reportsKey(userId)]);
}

export async function reportBodyAnalysisDemo(
  userId: string,
  scanId: string,
  category: 'inaccurate' | 'unsafe' | 'other',
): Promise<void> {
  const key = reportsKey(userId);
  const current = parse<unknown[]>(await AsyncStorage.getItem(key), []);
  await AsyncStorage.setItem(key, JSON.stringify([
    { scanId, category, createdAt: new Date().toISOString() },
    ...current,
  ]));
}

export async function waitForBodyAnalysisDemo(signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 1200);
    const abort = () => {
      clearTimeout(timer);
      const error = new Error('Aborted');
      error.name = 'AbortError';
      reject(error);
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}
