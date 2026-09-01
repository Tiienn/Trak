export type MuscleScoreReset = { day: string; at: number };
export type MuscleScoreSettings = {
  /** JS weekdays: Sunday = 0. Empty means rolling seven days with no scheduled reset. */
  resetWeekdays: number[];
  manualResets: MuscleScoreReset[];
};

export const DEFAULT_MUSCLE_SCORE_SETTINGS: MuscleScoreSettings = { resetWeekdays: [], manualResets: [] };
export const RESET_WEEKDAYS = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 0, short: 'Sun', label: 'Sunday' },
] as const;

export function muscleScoreSettingsKey(userId: string): string {
  if (!userId) throw new Error('Sign in to save muscle score settings.');
  return `trak.muscleScore.v1.${userId}`;
}

export function normalizeMuscleScoreSettings(value: unknown): MuscleScoreSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const resetWeekdays = RESET_WEEKDAYS.map((day) => day.value).filter((day) =>
    Array.isArray(raw.resetWeekdays) && raw.resetWeekdays.includes(day));
  const manualResets = (Array.isArray(raw.manualResets) ? raw.manualResets : [])
    .filter((reset): reset is MuscleScoreReset => {
      if (!reset || typeof reset !== 'object' || typeof reset.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(reset.day)) return false;
      const parsed = new Date(`${reset.day}T12:00:00Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === reset.day
        && typeof reset.at === 'number' && Number.isFinite(reset.at) && reset.at > 0;
    })
    .map(({ day, at }) => ({ day, at }))
    .sort((a, b) => a.at - b.at);
  return { resetWeekdays, manualResets };
}

export function muscleScoreScheduleLabel(settings: MuscleScoreSettings): string {
  return settings.resetWeekdays.length === 0
    ? 'Last 7 days'
    : `Resets ${RESET_WEEKDAYS.filter((day) => settings.resetWeekdays.includes(day.value)).map((day) => day.short).join(', ')}`;
}

type SettingsStorage = { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<unknown> };

export async function readMuscleScoreSettings(storage: SettingsStorage, userId: string): Promise<MuscleScoreSettings> {
  const raw = await storage.getItem(muscleScoreSettingsKey(userId));
  return normalizeMuscleScoreSettings(raw ? JSON.parse(raw) : null);
}

export async function writeMuscleScoreSettings(storage: SettingsStorage, userId: string, settings: MuscleScoreSettings): Promise<MuscleScoreSettings> {
  const next = normalizeMuscleScoreSettings(settings);
  await storage.setItem(muscleScoreSettingsKey(userId), JSON.stringify(next));
  return next;
}
