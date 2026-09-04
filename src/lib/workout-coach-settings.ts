import type { TrainingExperience, TrainingLocation } from './body-analysis';
import type { ExerciseEntry, MuscleGroup, WorkoutSplit } from './types';

export type WorkoutRoutine = 'coach' | 'full_body' | 'upper_lower' | 'push_pull_legs';

export type WorkoutCoachSettings = {
  configured: boolean;
  trainingLocation: TrainingLocation;
  experience: TrainingExperience;
  daysPerWeek: number;
  sessionMinutes: number;
  routine: WorkoutRoutine;
  equipment: string[];
  limitationsNote: string;
};

export const DEFAULT_WORKOUT_COACH_SETTINGS: WorkoutCoachSettings = {
  configured: false,
  trainingLocation: 'both',
  experience: 'beginner',
  daysPerWeek: 3,
  sessionMinutes: 45,
  routine: 'coach',
  equipment: [],
  limitationsNote: '',
};

export const WORKOUT_EQUIPMENT = [
  'Bodyweight',
  'Dumbbells',
  'Barbell',
  'Bench',
  'Machines',
  'Bands',
  'Pull-up bar',
  'Backpack',
] as const;

export const DEFAULT_GYM_EQUIPMENT: string[] = [
  'Dumbbells',
  'Barbell',
  'Bench',
  'Machines',
  'Pull-up bar',
];

/** Older gym setups saved before equipment was required receive a useful gym baseline. */
export function equipmentForWorkoutSettings(settings: Pick<WorkoutCoachSettings, 'trainingLocation' | 'equipment'>): string[] {
  if (settings.equipment.length > 0) return settings.equipment;
  return settings.trainingLocation === 'gym' ? DEFAULT_GYM_EQUIPMENT : [];
}

export const WORKOUT_ROUTINES: { key: WorkoutRoutine; label: string; detail: string }[] = [
  { key: 'coach', label: 'Coach chooses', detail: 'Trak balances what needs work next' },
  { key: 'full_body', label: 'Full body', detail: 'Train the whole body each session' },
  { key: 'upper_lower', label: 'Upper / lower', detail: 'Alternate upper- and lower-body days' },
  { key: 'push_pull_legs', label: 'Push / pull / legs', detail: 'Rotate through three focused sessions' },
];

type SettingsStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function workoutCoachSettingsKey(userId: string): string {
  if (!userId) throw new Error('Sign in to save workout setup.');
  return `trak.workoutCoach.v1.${userId}`;
}

function allowed<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
}

export function normalizeWorkoutCoachSettings(value: unknown): WorkoutCoachSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const equipment = Array.isArray(raw.equipment)
    ? [...new Set(raw.equipment.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))].slice(0, 12)
    : [];
  const rawSessionMinutes = Math.round(Number(raw.sessionMinutes));
  const sessionMinutes = Number.isFinite(rawSessionMinutes)
    ? Math.max(5, Math.min(180, rawSessionMinutes))
    : 45;
  return {
    configured: raw.configured === true,
    trainingLocation: allowed(raw.trainingLocation, ['home', 'gym', 'both'] as const, 'both'),
    experience: allowed(raw.experience, ['beginner', 'intermediate', 'advanced'] as const, 'beginner'),
    daysPerWeek: Math.max(1, Math.min(7, Math.round(Number(raw.daysPerWeek) || 3))),
    sessionMinutes,
    routine: allowed(raw.routine, ['coach', 'full_body', 'upper_lower', 'push_pull_legs'] as const, 'coach'),
    equipment,
    limitationsNote: String(raw.limitationsNote ?? '').replace(/\s+/g, ' ').trim().slice(0, 240),
  };
}

export async function readWorkoutCoachSettings(storage: SettingsStorage, userId: string): Promise<WorkoutCoachSettings> {
  const raw = await storage.getItem(workoutCoachSettingsKey(userId));
  return normalizeWorkoutCoachSettings(raw ? JSON.parse(raw) : null);
}

export async function writeWorkoutCoachSettings(storage: SettingsStorage, userId: string, value: WorkoutCoachSettings): Promise<WorkoutCoachSettings> {
  const next = normalizeWorkoutCoachSettings(value);
  await storage.setItem(workoutCoachSettingsKey(userId), JSON.stringify(next));
  return next;
}

const UPPER: MuscleGroup[] = ['chest', 'back', 'arms', 'shoulders'];
const LOWER: MuscleGroup[] = ['legs', 'glutes'];
const PUSH: MuscleGroup[] = ['chest', 'shoulders', 'arms'];
const PULL: MuscleGroup[] = ['back', 'arms'];

function newestStrengthEntry(exercises: ExerciseEntry[]): ExerciseEntry | null {
  return [...exercises]
    .filter((entry) => entry.workoutSplits.some((split) => split !== 'cardio') || Object.values(entry.muscleSets).some((sets) => sets > 0))
    .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

function directSplit(entry: ExerciseEntry | null, allowedSplits: WorkoutSplit[]): WorkoutSplit | null {
  if (!entry) return null;
  const allowedSet = new Set<WorkoutSplit>(allowedSplits);
  return entry.workoutSplits.find((split) => allowedSet.has(split)) ?? null;
}

function setsFor(entry: ExerciseEntry, muscles: MuscleGroup[]): number {
  return muscles.reduce((sum, muscle) => sum + (entry.muscleSets[muscle] ?? 0), 0);
}

export type RoutineSession = {
  label: string;
  targetMuscles?: MuscleGroup[];
  sessionStyle: 'balanced' | 'full_body';
};

/** Chooses the next repeatable session from completed workout history. */
export function nextRoutineSession(routine: WorkoutRoutine, exercises: ExerciseEntry[]): RoutineSession {
  if (routine === 'full_body') return { label: 'Full body', sessionStyle: 'full_body' };
  const latest = newestStrengthEntry(exercises);
  if (routine === 'upper_lower') {
    const direct = directSplit(latest, ['upper_body', 'lower_body']);
    const previous = direct ?? (latest && setsFor(latest, LOWER) > setsFor(latest, UPPER) ? 'lower_body' : 'upper_body');
    return previous === 'upper_body'
      ? { label: 'Lower body', targetMuscles: LOWER, sessionStyle: 'balanced' }
      : { label: 'Upper body', targetMuscles: UPPER, sessionStyle: 'balanced' };
  }
  if (routine === 'push_pull_legs') {
    const direct = directSplit(latest, ['push', 'pull', 'legs']);
    const previous = direct ?? (latest
      ? setsFor(latest, LOWER) > Math.max(setsFor(latest, ['back']), setsFor(latest, ['chest', 'shoulders']))
        ? 'legs'
        : setsFor(latest, ['back']) > setsFor(latest, ['chest', 'shoulders'])
          ? 'pull'
          : 'push'
      : null);
    if (previous === 'push') return { label: 'Pull', targetMuscles: PULL, sessionStyle: 'balanced' };
    if (previous === 'pull') return { label: 'Legs', targetMuscles: LOWER, sessionStyle: 'balanced' };
    return { label: 'Push', targetMuscles: PUSH, sessionStyle: 'balanced' };
  }
  return { label: 'Coach’s choice', sessionStyle: 'balanced' };
}
