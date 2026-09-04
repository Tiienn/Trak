export type FatLossActivityBaseline = 'inactive' | 'some' | 'active';
export type CardioToleranceMinutes = 5 | 10 | 20 | 30;
export type FatLossPhase = 'loss' | 'maintenance';
export type CardioMode =
  | 'walking'
  | 'indoor_low_impact'
  | 'cycling'
  | 'elliptical'
  | 'pool';

export type FatLossSettings = {
  activityBaseline: FatLossActivityBaseline;
  comfortableCardioMinutes: CardioToleranceMinutes;
  preferredCardioModes: CardioMode[];
  balanceConcern: boolean;
  chairStandComfortable: boolean;
  movementBreaks: boolean;
  phase: FatLossPhase;
};

export const CARDIO_MODES: { key: CardioMode; label: string }[] = [
  { key: 'walking', label: 'Walking' },
  { key: 'indoor_low_impact', label: 'Indoor low-impact' },
  { key: 'cycling', label: 'Cycling' },
  { key: 'elliptical', label: 'Elliptical' },
  { key: 'pool', label: 'Pool' },
];

export const DEFAULT_FAT_LOSS_SETTINGS: FatLossSettings = {
  activityBaseline: 'some',
  comfortableCardioMinutes: 10,
  preferredCardioModes: ['walking'],
  balanceConcern: false,
  chairStandComfortable: true,
  movementBreaks: false,
  phase: 'loss',
};

type SettingsStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function fatLossSettingsKey(userId: string): string {
  if (!userId) throw new Error('Sign in to save fat-loss preferences.');
  return `trak.fatLoss.v1.${userId}`;
}

export function normalizeFatLossSettings(value: unknown): FatLossSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const baseline = ['inactive', 'some', 'active'].includes(String(raw.activityBaseline))
    ? raw.activityBaseline as FatLossActivityBaseline
    : DEFAULT_FAT_LOSS_SETTINGS.activityBaseline;
  const comfortable = [5, 10, 20, 30].includes(Number(raw.comfortableCardioMinutes))
    ? Number(raw.comfortableCardioMinutes) as CardioToleranceMinutes
    : DEFAULT_FAT_LOSS_SETTINGS.comfortableCardioMinutes;
  const modes = Array.isArray(raw.preferredCardioModes)
    ? [...new Set(raw.preferredCardioModes.filter((mode): mode is CardioMode =>
      CARDIO_MODES.some((option) => option.key === mode)
    ))].slice(0, CARDIO_MODES.length)
    : [];
  return {
    activityBaseline: baseline,
    comfortableCardioMinutes: comfortable,
    preferredCardioModes: modes.length > 0 ? modes : DEFAULT_FAT_LOSS_SETTINGS.preferredCardioModes,
    balanceConcern: raw.balanceConcern === true,
    chairStandComfortable: raw.chairStandComfortable !== false,
    movementBreaks: raw.movementBreaks === true,
    phase: raw.phase === 'maintenance' ? 'maintenance' : 'loss',
  };
}

export async function readFatLossSettings(storage: SettingsStorage, userId: string): Promise<FatLossSettings> {
  const raw = await storage.getItem(fatLossSettingsKey(userId));
  return normalizeFatLossSettings(raw ? JSON.parse(raw) : null);
}

export async function writeFatLossSettings(
  storage: SettingsStorage,
  userId: string,
  settings: FatLossSettings,
): Promise<FatLossSettings> {
  const next = normalizeFatLossSettings(settings);
  await storage.setItem(fatLossSettingsKey(userId), JSON.stringify(next));
  return next;
}

export function cardioTargetForSettings(settings: FatLossSettings): number {
  if (settings.phase === 'maintenance') return 150;
  if (settings.activityBaseline === 'inactive') return 30;
  if (settings.activityBaseline === 'some') return 90;
  return 150;
}

export function preferredCardioCatalogIds(settings: FatLossSettings): string[] {
  return settings.preferredCardioModes.flatMap((mode) => ({
    walking: ['comfortable-walk', 'brisk-walk'],
    indoor_low_impact: ['indoor-low-impact-cardio'],
    cycling: ['stationary-cycling', 'low-impact-cardio-intervals'],
    elliptical: ['elliptical-cardio', 'low-impact-cardio-intervals'],
    pool: ['swimming-water-walking'],
  })[mode]);
}
