import type { ExerciseEntry, MuscleGroup } from './types';
import { DEFAULT_MUSCLE_SCORE_SETTINGS, type MuscleScoreSettings } from './muscle-score-settings.ts';

export type { MuscleGroup } from './types';

export const WEEKLY_SET_TARGET = 12;

export type MuscleScore = {
  key: MuscleGroup;
  label: string;
  sets: number;
  points: number;
  pointsPerSet: number;
  score: number;
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

/** Large compound areas earn two points per completed set; all others earn one. */
export const MUSCLE_POINTS_PER_SET: Record<MuscleGroup, number> = {
  chest: 2,
  legs: 2,
  back: 2,
  arms: 1,
  shoulders: 1,
  abs: 1,
  glutes: 1,
  other: 1,
};

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
  return (Object.keys(sets) as MuscleGroup[]).map((key) => {
    const pointsPerSet = MUSCLE_POINTS_PER_SET[key];
    const points = sets[key] * pointsPerSet;
    return {
      key,
      label: GROUP_LABELS[key],
      sets: sets[key],
      points,
      pointsPerSet,
      score: targetSets > 0 ? Math.min(100, Math.round((points / targetSets) * 100)) : 0,
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
