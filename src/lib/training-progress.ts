import type { ExerciseEntry, MuscleGroup } from './types';
import { DEFAULT_MUSCLE_SCORE_SETTINGS, type MuscleScoreSettings } from './muscle-score-settings.ts';

export type { MuscleGroup } from './types';

export const WEEKLY_SET_TARGET = 12;
export const RECOVERY_CHECK_SET_THRESHOLD = 16;
export const HIGH_VOLUME_SET_THRESHOLD = 20;
export const FAT_LOSS_CARDIO_BASELINE = 150;
export const FAT_LOSS_CARDIO_MILESTONES = [60, 90, 120, FAT_LOSS_CARDIO_BASELINE] as const;

export const SCORED_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'legs',
  'back',
  'arms',
  'shoulders',
  'abs',
  'glutes',
];

export type MuscleScoreGuidance =
  | 'No working sets yet'
  | 'Some stimulus'
  | 'Building toward target'
  | 'Target met'
  | 'Check recovery'
  | 'High volume';

export type MuscleScore = {
  key: MuscleGroup;
  label: string;
  sets: number;
  points: number;
  pointsPerSet: number;
  score: number;
  guidance: MuscleScoreGuidance;
};

export type WeeklyActivitySummary = {
  strengthSessions: number;
  cardioSessions: number;
  vigorousCardioSessions: number;
  strengthMinutes: number;
  cardioMinutes: number;
  lightCardioMinutes: number;
  moderateCardioMinutes: number;
  vigorousCardioMinutes: number;
  /** Moderate minutes plus twice the completed vigorous minutes. */
  cardioEquivalentMinutes: number;
  totalMinutes: number;
};

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  legs: 'Legs',
  back: 'Back',
  arms: 'Arms',
  shoulders: 'Shoulders',
  abs: 'Abs',
  glutes: 'Glutes',
  other: 'Other',
};

/** Every completed working set for a scored muscle earns one weekly muscle point. */
export const MUSCLE_POINTS_PER_SET: Record<MuscleGroup, number> = {
  chest: 1,
  legs: 1,
  back: 1,
  arms: 1,
  shoulders: 1,
  abs: 1,
  glutes: 1,
  // "Other" remains loggable, but a catch-all category has no meaningful universal target.
  other: 0,
};

export function muscleScoreGuidance(sets: number): MuscleScoreGuidance {
  if (sets >= HIGH_VOLUME_SET_THRESHOLD) return 'High volume';
  if (sets >= RECOVERY_CHECK_SET_THRESHOLD) return 'Check recovery';
  if (sets >= WEEKLY_SET_TARGET) return 'Target met';
  if (sets >= 6) return 'Building toward target';
  if (sets >= 1) return 'Some stimulus';
  return 'No working sets yet';
}

const GROUP_WORDS: Record<MuscleGroup, string[]> = {
  chest: ['chest', 'bench', 'push-up', 'pushup', 'pec'],
  legs: ['legs', 'leg', 'squat', 'lunge', 'deadlift', 'glute', 'calf', 'hamstring', 'quad'],
  back: ['back', 'row', 'pull-up', 'pullup', 'lat', 'deadlift'],
  arms: ['arms', 'arm', 'bicep', 'tricep', 'curl', 'press'],
  shoulders: ['shoulder', 'deltoid', 'overhead press', 'lateral raise'],
  abs: ['abs', 'abdominal', 'core', 'crunch', 'plank'],
  glutes: ['glute', 'hip thrust', 'bridge'],
  other: ['other'],
};

function dateFromKey(value: string): Date {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

export function trainingDayKeys(anchorKey: string, count = 7): string[] {
  const anchor = dateFromKey(anchorKey);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - (count - 1 - index));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
}

/** Rolling seven days, optionally shortened by the user's most recent reset. */
export function muscleScoreWindow(anchorKey: string, settings = DEFAULT_MUSCLE_SCORE_SETTINGS) {
  let days = trainingDayKeys(anchorKey);
  const scheduledStart = days.findLast((day) => settings.resetWeekdays.includes(dateFromKey(day).getDay()));
  if (scheduledStart) days = days.filter((day) => day >= scheduledStart);
  const manualReset = settings.manualResets
    .filter((reset) => reset.day >= days[0] && reset.day <= anchorKey)
    .sort((a, b) => b.day.localeCompare(a.day) || b.at - a.at)[0] ?? null;
  if (manualReset) days = days.filter((day) => day >= manualReset.day);
  return { days, manualReset };
}

export function groupsForExercise(name: string): MuscleGroup[] {
  const normalized = name.toLowerCase();
  const explicit = (Object.keys(GROUP_WORDS) as MuscleGroup[]).filter((group) =>
    GROUP_WORDS[group].some((word) => normalized.includes(word))
  );
  if (explicit.length > 0) return explicit;
  if (/gym|weight|strength|full body|circuit/.test(normalized)) {
    return ['chest', 'legs', 'back', 'arms', 'shoulders', 'abs', 'glutes', 'other'];
  }
  return [];
}

/** Default: last seven local calendar days. Resets affect only this derived score. */
export function muscleScores(
  exercises: ExerciseEntry[],
  anchorKey: string,
  targetSets = WEEKLY_SET_TARGET,
  settings: MuscleScoreSettings = DEFAULT_MUSCLE_SCORE_SETTINGS
): MuscleScore[] {
  const window = muscleScoreWindow(anchorKey, settings);
  const days = new Set(window.days);
  const sets: Record<MuscleGroup, number> = {
    chest: 0,
    legs: 0,
    back: 0,
    arms: 0,
    shoulders: 0,
    abs: 0,
    glutes: 0,
    other: 0,
  };
  for (const exercise of exercises) {
    if (!days.has(exercise.date)) continue;
    if (window.manualReset && exercise.date === window.manualReset.day && exercise.createdAt <= window.manualReset.at) continue;
    for (const group of Object.keys(sets) as MuscleGroup[]) {
      sets[group] += Math.max(0, exercise.muscleSets?.[group] || 0);
    }
  }
  return SCORED_MUSCLE_GROUPS.map((key) => {
    const pointsPerSet = MUSCLE_POINTS_PER_SET[key];
    const points = sets[key] * pointsPerSet;
    return {
      key,
      label: GROUP_LABELS[key],
      sets: sets[key],
      points,
      pointsPerSet,
      score: targetSets > 0 ? Math.min(100, Math.round((points / targetSets) * 100)) : 0,
      guidance: muscleScoreGuidance(sets[key]),
    };
  });
}

export function workoutMinutesByDay(exercises: ExerciseEntry[], anchorKey: string) {
  return trainingDayKeys(anchorKey).map((date) => ({
    date,
    minutes: exercises
      .filter((exercise) => exercise.date === date)
      .reduce((sum, exercise) => sum + Math.max(0, exercise.durationMinutes || 0), 0),
  }));
}

/**
 * Distinct training days completed for one customised plan item in the rolling
 * week. New logs use the durable plan id; unlinked legacy logs fall back to an
 * exact normalized exercise name so existing progress is not lost.
 */
export function plannedTrainingCompletionDays(
  exercises: ExerciseEntry[],
  anchorKey: string,
  trainingPlanItemId: string,
  exerciseName: string
): string[] {
  const days = new Set(trainingDayKeys(anchorKey));
  const normalizedName = exerciseName.trim().toLowerCase();
  return Array.from(new Set(
    exercises
      .filter((exercise) => days.has(exercise.date))
      .filter((exercise) => exercise.trainingPlanItemId === trainingPlanItemId
        || (!exercise.trainingPlanItemId && exercise.name.trim().toLowerCase() === normalizedName))
      .map((exercise) => exercise.date)
  )).sort();
}

/** Goal-facing weekly activity totals derived from the same durable workout logs. */
export function weeklyActivitySummary(
  exercises: ExerciseEntry[],
  anchorKey: string
): WeeklyActivitySummary {
  const days = new Set(trainingDayKeys(anchorKey));
  const strengthDays = new Set<string>();
  const cardioDays = new Set<string>();
  let vigorousCardioSessions = 0;
  let strengthMinutes = 0;
  let cardioMinutes = 0;
  let lightCardioMinutes = 0;
  let moderateCardioMinutes = 0;
  let vigorousCardioMinutes = 0;
  let totalMinutes = 0;

  for (const exercise of exercises) {
    if (!days.has(exercise.date)) continue;
    const duration = Math.max(0, exercise.durationMinutes || 0);
    const hasLoggedSets = Object.values(exercise.muscleSets ?? {}).some((sets) => sets > 0);
    const hasStrengthFocus = exercise.workoutSplits.some((split) => split !== 'cardio');
    const inferredStrength = groupsForExercise(exercise.name).length > 0;
    const isStrength = hasLoggedSets || hasStrengthFocus || inferredStrength;
    const isCardio = exercise.workoutSplits.includes('cardio') || /\b(cardio|walk|walking|run|running|cycle|cycling|elliptical|swim|swimming)\b/i.test(exercise.name);

    if (isStrength) {
      strengthDays.add(exercise.date);
      strengthMinutes += duration;
    }
    if (isCardio) {
      cardioDays.add(exercise.date);
      cardioMinutes += duration;
      const intensity = exercise.cardioIntensity ?? 'moderate';
      if (intensity === 'light') lightCardioMinutes += duration;
      else if (intensity === 'vigorous') {
        vigorousCardioSessions += 1;
        vigorousCardioMinutes += duration;
      } else moderateCardioMinutes += duration;
    }
    totalMinutes += duration;
  }

  return {
    strengthSessions: strengthDays.size,
    cardioSessions: cardioDays.size,
    vigorousCardioSessions,
    strengthMinutes,
    cardioMinutes,
    lightCardioMinutes,
    moderateCardioMinutes,
    vigorousCardioMinutes,
    cardioEquivalentMinutes: moderateCardioMinutes + vigorousCardioMinutes * 2,
    totalMinutes,
  };
}
