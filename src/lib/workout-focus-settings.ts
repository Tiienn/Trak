import type { MuscleGroup } from './types';

export type PriorityMuscle = Exclude<MuscleGroup, 'other'>;

export type WorkoutFocusSettings = {
  priorityMuscle: PriorityMuscle | null;
  focusStartedOn: string | null;
  baselineWeeklySets: number;
};

export const PRIORITY_MUSCLES: PriorityMuscle[] = [
  'chest',
  'legs',
  'back',
  'arms',
  'shoulders',
  'abs',
  'glutes',
];

export const DEFAULT_WORKOUT_FOCUS_SETTINGS: WorkoutFocusSettings = {
  priorityMuscle: null,
  focusStartedOn: null,
  baselineWeeklySets: 0,
};

type SettingsStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function workoutFocusSettingsKey(userId: string): string {
  if (!userId) throw new Error('Sign in to save a muscle focus.');
  return `trak.workoutFocus.v1.${userId}`;
}

function dateKey(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function normalizeWorkoutFocusSettings(value: unknown): WorkoutFocusSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const priorityMuscle = PRIORITY_MUSCLES.includes(raw.priorityMuscle as PriorityMuscle)
    ? raw.priorityMuscle as PriorityMuscle
    : null;
  const focusStartedOn = dateKey(raw.focusStartedOn);
  if (!priorityMuscle || !focusStartedOn) return DEFAULT_WORKOUT_FOCUS_SETTINGS;
  return {
    priorityMuscle,
    focusStartedOn,
    baselineWeeklySets: Math.max(0, Math.min(20, Math.round(Number(raw.baselineWeeklySets) || 0))),
  };
}

export function workoutFocusWeek(settings: WorkoutFocusSettings, anchor = new Date()): number | null {
  if (!settings.priorityMuscle || !settings.focusStartedOn) return null;
  const start = new Date(`${settings.focusStartedOn}T12:00:00`);
  const current = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12);
  const days = Math.floor((current.getTime() - start.getTime()) / 86_400_000);
  return days < 0 ? null : Math.floor(days / 7) + 1;
}

export async function readWorkoutFocusSettings(
  storage: SettingsStorage,
  userId: string,
): Promise<WorkoutFocusSettings> {
  const raw = await storage.getItem(workoutFocusSettingsKey(userId));
  return normalizeWorkoutFocusSettings(raw ? JSON.parse(raw) : null);
}

export async function writeWorkoutFocusSettings(
  storage: SettingsStorage,
  userId: string,
  settings: WorkoutFocusSettings,
): Promise<WorkoutFocusSettings> {
  const next = normalizeWorkoutFocusSettings(settings);
  await storage.setItem(workoutFocusSettingsKey(userId), JSON.stringify(next));
  return next;
}
