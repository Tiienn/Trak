export type ExerciseResponse = 'comfortable' | 'uncomfortable' | 'unsuitable';

export type ExerciseResponseSettings = {
  responses: Record<string, ExerciseResponse>;
};

export const DEFAULT_EXERCISE_RESPONSE_SETTINGS: ExerciseResponseSettings = { responses: {} };

type SettingsStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function exerciseResponseSettingsKey(userId: string): string {
  if (!userId) throw new Error('Sign in to save exercise feedback.');
  return `trak.exerciseResponses.v1.${userId}`;
}

export function normalizeExerciseResponseSettings(value: unknown): ExerciseResponseSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const candidates = raw.responses && typeof raw.responses === 'object'
    ? raw.responses as Record<string, unknown>
    : {};
  const responses = Object.fromEntries(
    Object.entries(candidates).flatMap(([exerciseId, response]) => {
      const id = exerciseId.trim();
      if (!id || !['comfortable', 'uncomfortable', 'unsuitable'].includes(String(response))) return [];
      return [[id, response as ExerciseResponse]];
    })
  );
  return { responses };
}

export async function readExerciseResponseSettings(
  storage: SettingsStorage,
  userId: string
): Promise<ExerciseResponseSettings> {
  const raw = await storage.getItem(exerciseResponseSettingsKey(userId));
  return normalizeExerciseResponseSettings(raw ? JSON.parse(raw) : null);
}

export async function writeExerciseResponseSettings(
  storage: SettingsStorage,
  userId: string,
  settings: ExerciseResponseSettings
): Promise<ExerciseResponseSettings> {
  const next = normalizeExerciseResponseSettings(settings);
  await storage.setItem(exerciseResponseSettingsKey(userId), JSON.stringify(next));
  return next;
}
