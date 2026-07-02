import { Platform } from 'react-native';
import {
  SdkAvailabilityStatus,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  requestPermission,
} from 'react-native-health-connect';

import { FoodTotals } from './types';

/**
 * Trak <-> Android Health Connect.
 *
 * We WRITE each logged meal as a Nutrition record (calories + macros) so it
 * shows up alongside the user's other health data. Requires a dev/production
 * build — Health Connect is not available inside Expo Go.
 */

export async function healthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

/** True when we already hold WRITE_NUTRITION permission. */
export async function healthSyncEnabled(): Promise<boolean> {
  try {
    if (!(await healthAvailable())) return false;
    if (!(await initialize())) return false;
    const granted = await getGrantedPermissions();
    return granted.some((p) => p.recordType === 'Nutrition' && p.accessType === 'write');
  } catch {
    return false;
  }
}

/** Ask the user for permission. Resolves true if they granted it. */
export async function enableHealthSync(): Promise<boolean> {
  if (!(await healthAvailable())) return false;
  if (!(await initialize())) return false;
  const granted = await requestPermission([{ accessType: 'write', recordType: 'Nutrition' }]);
  return granted.some((p) => p.recordType === 'Nutrition' && p.accessType === 'write');
}

export function openHealthSettings(): void {
  try {
    openHealthConnectSettings();
  } catch {
    // Health Connect not present — nothing to open.
  }
}

/**
 * Write one meal to Health Connect. Never throws — health sync is a bonus,
 * and a failure here must not break meal logging.
 */
export async function writeMealToHealth(title: string, total: FoodTotals, at: number): Promise<void> {
  try {
    if (!(await healthSyncEnabled())) return;
    const end = new Date(at);
    const start = new Date(at - 15 * 60 * 1000); // assume a 15-minute meal
    await insertRecords([
      {
        recordType: 'Nutrition',
        name: title,
        mealType: 0, // unknown
        energy: { unit: 'kilocalories', value: total.calories },
        protein: { unit: 'grams', value: total.protein_g },
        totalCarbohydrate: { unit: 'grams', value: total.carbs_g },
        totalFat: { unit: 'grams', value: total.fat_g },
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    ]);
  } catch {
    // best-effort only
  }
}
