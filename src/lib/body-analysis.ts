import type { Goal } from './types';

export const BODY_ANALYSIS_SCHEMA_VERSION = 1 as const;
export const BODY_ANALYSIS_CONSENT_VERSION = 1 as const;
export const BODY_ANALYSIS_PREFERENCES_VERSION = 1 as const;

export type BodyPose = 'front' | 'side' | 'back';
export type BodyAnalysisStatus = 'usable' | 'retake' | 'unsupported';
export type EvidenceLevel = 'high' | 'medium' | 'low';
export type TrainingLocation = 'home' | 'gym' | 'both';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
export type BodyFocusDomain = 'nutrition' | 'training' | 'consistency';

export type BodyAnalysisResult = {
  schemaVersion: 1;
  status: BodyAnalysisStatus;
  capture: {
    quality: EvidenceLevel;
    issues: string[];
    poseChecks: { pose: BodyPose; usable: boolean; issue?: string }[];
  };
  summary: string;
  confidence: EvidenceLevel;
  visualEstimate?: {
    bodyFatRangeMin: number;
    bodyFatRangeMax: number;
    explanation: string;
  };
  strengths: string[];
  focusAreas: {
    id: string;
    domain: BodyFocusDomain;
    title: string;
    reason: string;
    evidence: string[];
  }[];
  progress: {
    comparisonAvailable: boolean;
    basis: 'photos_and_history' | 'history_only' | 'first_scan';
    summary: string;
    changes: string[];
  };
  training: {
    weeklyFocus: string;
    daysPerWeek: number;
    exercises: {
      name: string;
      sets: string;
      reps: string;
      reason: string;
      equipment?: string;
    }[];
  };
  nutrition: {
    dataSufficiency: 'sufficient' | 'limited' | 'none';
    targetAction: 'keep' | 'small_decrease' | 'small_increase' | 'log_consistently';
    calorieAdjustment?: number;
    proteinTargetG?: number;
    habits: string[];
    swaps: { current: string; tryInstead: string; reason: string }[];
  };
  coachHandoff: {
    checkInWindowDays: 21 | 28;
    priorityIds: string[];
    evidenceQuality: 'strong' | 'mixed' | 'limited';
    doNotAdjustPlan: boolean;
    reason: string;
  };
  disclaimer: string;
};

export type BodyAnalysisPreferences = {
  userId: string;
  consentVersion: number | null;
  consentAcceptedAt: string | null;
  trainingLocation: TrainingLocation;
  experience: TrainingExperience;
  daysAvailable: number;
  equipment: string[];
  limitationsNote?: string;
  preferencesVersion: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BodyScan = {
  id: string;
  userId: string;
  createdAt: string;
  previousScanId?: string;
  goalSnapshot: Goal;
  weightKg?: number;
  waistCm?: number;
  nutritionEvidence: Record<string, unknown>;
  result: BodyAnalysisResult;
  schemaVersion: number;
  modelVersion: string;
  promptVersion: string;
};

export type BodyEligibility =
  | 'signed_out'
  | 'missing_profile'
  | 'underage'
  | 'locked'
  | 'needs_consent'
  | 'ready';

const UNSAFE_OUTPUT =
  /attractiveness|desirability|human worth|worth score|race|ethnicity|pregnan|steroid|natural\s*(?:versus|vs\.?|or)\s*enhanced|genetic potential|posture disorder|eating disorder|purging|starvation|dehydrat|punitive exercise|forbidden food|bad food/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: unknown, min: number, max: number, fallback = min): number {
  return Math.min(max, Math.max(min, Math.round(numberValue(value, fallback))));
}

export function sanitizeBodyText(value: unknown, maxLength: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f<>\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function strings(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((item) => sanitizeBodyText(item, maxLength))
    .filter(Boolean);
}

function assertSafeOutput(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (UNSAFE_OUTPUT.test(serialized)) {
    throw new Error('Unsafe Body Analysis output was rejected.');
  }
}

export function normalizeBodyAnalysisResult(value: unknown): BodyAnalysisResult {
  const root = record(value);
  const capture = record(root?.capture);
  if (
    !root ||
    numberValue(root.schemaVersion, 0) !== BODY_ANALYSIS_SCHEMA_VERSION ||
    !['usable', 'retake', 'unsupported'].includes(String(root.status)) ||
    !capture
  ) {
    throw new Error('Invalid Body Analysis result.');
  }
  assertSafeOutput(root);

  const status = root.status as BodyAnalysisStatus;
  const confidence = enumValue(root.confidence, ['high', 'medium', 'low'] as const, 'low');
  const quality = enumValue(capture.quality, ['high', 'medium', 'low'] as const, 'low');
  const rawPoseChecks = Array.isArray(capture.poseChecks) ? capture.poseChecks : [];
  const poseChecks = (['front', 'side', 'back'] as const).map((pose) => {
    const check = record(rawPoseChecks.find((item) => record(item)?.pose === pose));
    const issue = sanitizeBodyText(check?.issue, 160);
    return { pose, usable: check?.usable === true, ...(issue ? { issue } : {}) };
  });

  const rawFocus = Array.isArray(root.focusAreas) ? root.focusAreas : [];
  const focusAreas = rawFocus.slice(0, 2).flatMap((item, index) => {
    const entry = record(item);
    if (!entry) return [];
    const id = sanitizeBodyText(entry.id, 48).replace(/[^a-zA-Z0-9_-]/g, '-') || `focus-${index + 1}`;
    return [{
      id,
      domain: enumValue(entry.domain, ['nutrition', 'training', 'consistency'] as const, 'consistency'),
      title: sanitizeBodyText(entry.title, 80) || 'Current focus',
      reason: sanitizeBodyText(entry.reason, 240),
      evidence: strings(entry.evidence, 3, 160),
    }];
  });

  const progress = record(root.progress) ?? {};
  const training = record(root.training) ?? {};
  const rawExercises = Array.isArray(training.exercises) ? training.exercises : [];
  const exercises = rawExercises.slice(0, 5).flatMap((item) => {
    const entry = record(item);
    if (!entry) return [];
    const name = sanitizeBodyText(entry.name, 80);
    if (!name) return [];
    const equipment = sanitizeBodyText(entry.equipment, 60);
    return [{
      name,
      sets: sanitizeBodyText(entry.sets, 30),
      reps: sanitizeBodyText(entry.reps, 30),
      reason: sanitizeBodyText(entry.reason, 180),
      ...(equipment ? { equipment } : {}),
    }];
  });
  if (status === 'usable' && exercises.length < 3) {
    throw new Error('Invalid Body Analysis training recommendations.');
  }

  const nutrition = record(root.nutrition) ?? {};
  const dataSufficiency = enumValue(
    nutrition.dataSufficiency,
    ['sufficient', 'limited', 'none'] as const,
    'none',
  );
  let targetAction = enumValue(
    nutrition.targetAction,
    ['keep', 'small_decrease', 'small_increase', 'log_consistently'] as const,
    'log_consistently',
  );
  if (dataSufficiency !== 'sufficient' && targetAction !== 'keep') targetAction = 'log_consistently';
  const calorieAdjustment = clamp(nutrition.calorieAdjustment, -250, 250, 0);
  const proteinTargetG = clamp(nutrition.proteinTargetG, 20, 400, 20);
  const rawSwaps = Array.isArray(nutrition.swaps) ? nutrition.swaps : [];
  const swaps = rawSwaps.slice(0, 3).flatMap((item) => {
    const entry = record(item);
    if (!entry) return [];
    const current = sanitizeBodyText(entry.current, 80);
    const tryInstead = sanitizeBodyText(entry.tryInstead, 80);
    if (!current || !tryInstead) return [];
    return [{ current, tryInstead, reason: sanitizeBodyText(entry.reason, 180) }];
  });

  const coach = record(root.coachHandoff) ?? {};
  const validPriorityIds = new Set(focusAreas.map((area) => area.id));
  const priorityIds = strings(coach.priorityIds, 2, 48).filter((id) => validPriorityIds.has(id));
  const visual = record(root.visualEstimate);
  let visualEstimate: BodyAnalysisResult['visualEstimate'];
  if (visual && confidence !== 'low' && quality !== 'low') {
    let min = clamp(visual.bodyFatRangeMin, 3, 66, 10);
    let max = clamp(visual.bodyFatRangeMax, 7, 70, min + 4);
    if (max < min) [min, max] = [Math.max(3, max), Math.min(70, min)];
    if (max - min < 4) max = Math.min(70, min + 4);
    if (max - min < 4) min = Math.max(3, max - 4);
    visualEstimate = {
      bodyFatRangeMin: min,
      bodyFatRangeMax: max,
      explanation: sanitizeBodyText(visual.explanation, 220),
    };
  }

  const normalized: BodyAnalysisResult = {
    schemaVersion: 1,
    status,
    capture: {
      quality,
      issues: strings(capture.issues, 4, 160),
      poseChecks,
    },
    summary: sanitizeBodyText(root.summary, 280),
    confidence,
    ...(visualEstimate ? { visualEstimate } : {}),
    strengths: strings(root.strengths, 3, 120),
    focusAreas,
    progress: {
      comparisonAvailable: progress.comparisonAvailable === true,
      basis: enumValue(
        progress.basis,
        ['photos_and_history', 'history_only', 'first_scan'] as const,
        'first_scan',
      ),
      summary: sanitizeBodyText(progress.summary, 280),
      changes: strings(progress.changes, 3, 160),
    },
    training: {
      weeklyFocus: sanitizeBodyText(training.weeklyFocus, 240),
      daysPerWeek: clamp(training.daysPerWeek, 2, 6, 3),
      exercises,
    },
    nutrition: {
      dataSufficiency,
      targetAction,
      ...(['small_decrease', 'small_increase'].includes(targetAction)
        ? { calorieAdjustment }
        : {}),
      ...(numberValue(nutrition.proteinTargetG, 0) > 0 ? { proteinTargetG } : {}),
      habits: strings(nutrition.habits, 3, 160),
      swaps: dataSufficiency === 'sufficient' ? swaps : [],
    },
    coachHandoff: {
      checkInWindowDays: numberValue(coach.checkInWindowDays, 28) === 21 ? 21 : 28,
      priorityIds,
      evidenceQuality: enumValue(
        coach.evidenceQuality,
        ['strong', 'mixed', 'limited'] as const,
        'limited',
      ),
      // This MVP never authorizes an automatic plan adjustment.
      doNotAdjustPlan: true,
      reason: sanitizeBodyText(coach.reason, 240),
    },
    disclaimer:
      sanitizeBodyText(root.disclaimer, 280) ||
      'Visual estimates and general wellness guidance only—not medical advice, diagnosis, or treatment.',
  };

  if (status === 'usable' && (!normalized.summary || focusAreas.length === 0)) {
    throw new Error('Invalid Body Analysis result content.');
  }
  return normalized;
}

export function canShowVisualEstimate(result: BodyAnalysisResult): boolean {
  return Boolean(
    result.visualEstimate && result.capture.quality !== 'low' && result.confidence !== 'low',
  );
}

export function bodyAnalysisEligibility(input: {
  signedIn: boolean;
  profileAge: number | null;
  capability: boolean;
  consentVersion: number | null;
}): BodyEligibility {
  if (!input.signedIn) return 'signed_out';
  if (input.profileAge == null) return 'missing_profile';
  if (input.profileAge < 18) return 'underage';
  if (!input.capability) return 'locked';
  if (input.consentVersion !== BODY_ANALYSIS_CONSENT_VERSION) return 'needs_consent';
  return 'ready';
}

export function waistCmFromInput(value: string, unit: 'metric' | 'imperial'): number | null {
  const parsed = Number(value.replace(',', '.'));
  const cm = unit === 'imperial' ? parsed * 2.54 : parsed;
  if (!Number.isFinite(cm) || cm < 40 || cm > 200) return null;
  return Math.round(cm * 10) / 10;
}

export function waistInputFromCm(cm: number, unit: 'metric' | 'imperial'): string {
  if (!Number.isFinite(cm)) return '';
  const value = unit === 'imperial' ? cm / 2.54 : cm;
  return String(Math.round(value * 10) / 10);
}

export function daysUntilNextCheckIn(
  createdAt: Date,
  windowDays: 21 | 28,
  now = new Date(),
): number {
  const elapsed = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
  return Math.max(0, windowDays - elapsed);
}
