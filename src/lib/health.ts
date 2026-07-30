import { Platform } from 'react-native';
import {
  ExerciseType,
  RecordingMethod,
  SdkAvailabilityStatus,
  deleteRecordsByUuids,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  insertRecords,
  openHealthConnectSettings,
  requestPermission,
  revokeAllPermissions,
} from 'react-native-health-connect';

import type { ExerciseEntry, FoodTotals } from './types';

/**
 * Trak <-> Android Health Connect.
 *
 * We WRITE logged meals as Nutrition records and workouts as an
 * ExerciseSession plus ActiveCaloriesBurned. Requires a dev/production build
 * — Health Connect is not available inside Expo Go.
 */

const HEALTH_WRITE_PERMISSIONS = [
  { accessType: 'write' as const, recordType: 'Nutrition' as const },
  { accessType: 'write' as const, recordType: 'ActiveCaloriesBurned' as const },
  { accessType: 'write' as const, recordType: 'ExerciseSession' as const },
];

async function grantedWriteTypes(): Promise<Set<string>> {
  const granted = await getGrantedPermissions();
  return new Set(
    granted
      .filter((permission) => permission.accessType === 'write')
      .map((permission) => permission.recordType)
  );
}

function reportHealthError(operation: string, error: unknown): void {
  // Never include meal names, nutrition values, or other health data here.
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? 'unknown')
      : 'unknown';
  console.warn(`[Health Connect] ${operation} failed (${code})`);
}

export async function healthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

/** True when all meal + workout write permissions are available. */
export async function healthSyncEnabled(): Promise<boolean> {
  try {
    if (!(await healthAvailable())) return false;
    if (!(await initialize())) return false;
    const granted = await grantedWriteTypes();
    return HEALTH_WRITE_PERMISSIONS.every((permission) => granted.has(permission.recordType));
  } catch {
    return false;
  }
}

/** Ask the user for permission. Resolves true if they granted it. */
export async function enableHealthSync(): Promise<boolean> {
  try {
    if (!(await healthAvailable())) return false;
    if (!(await initialize())) return false;
    const granted = await requestPermission(HEALTH_WRITE_PERMISSIONS);
    return HEALTH_WRITE_PERMISSIONS.every((required) =>
      granted.some(
        (permission) =>
          permission.recordType === required.recordType && permission.accessType === 'write'
      )
    );
  } catch (error) {
    reportHealthError('permission request', error);
    return false;
  }
}

/** Revoke Trak's Health Connect access. Existing records remain user-owned. */
export async function disableHealthSync(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    if (!(await initialize())) return false;
    await revokeAllPermissions();
    return !(await healthSyncEnabled());
  } catch (error) {
    reportHealthError('disconnect', error);
    return false;
  }
}

export function openHealthSettings(): void {
  if (Platform.OS !== 'android') return;
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
export async function writeMealToHealth(
  mealId: string,
  title: string,
  total: FoodTotals,
  at: number,
  version = 1
): Promise<void> {
  try {
    if (!(await healthAvailable())) return;
    if (!(await initialize())) return;
    if (!(await grantedWriteTypes()).has('Nutrition')) return;
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
        metadata: {
          clientRecordId: `trak-meal-${mealId}`,
          clientRecordVersion: Math.max(1, Math.round(version)),
          recordingMethod: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY,
        },
      },
    ]);
  } catch (error) {
    reportHealthError('meal write', error);
  }
}

/** Remove the Health Connect nutrition record created for a Trak meal. */
export async function removeMealFromHealth(mealId: string): Promise<void> {
  try {
    if (!(await healthAvailable())) return;
    if (!(await initialize())) return;
    if (!(await grantedWriteTypes()).has('Nutrition')) return;
    await deleteRecordsByUuids('Nutrition', [], [`trak-meal-${mealId}`]);
  } catch (error) {
    reportHealthError('meal delete', error);
  }
}

function exerciseTypeForName(name: string): number {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes('walk')) return ExerciseType.WALKING;
  if (normalized.includes('run')) return ExerciseType.RUNNING;
  if (normalized.includes('cycl') || normalized.includes('bike')) return ExerciseType.BIKING;
  if (normalized.includes('swim')) return ExerciseType.SWIMMING_POOL;
  if (normalized.includes('yoga')) return ExerciseType.YOGA;
  if (
    normalized.includes('gym') ||
    normalized.includes('weight') ||
    normalized.includes('strength')
  ) {
    return ExerciseType.STRENGTH_TRAINING;
  }
  return ExerciseType.OTHER_WORKOUT;
}

/**
 * Mirror one Trak workout to Health Connect. Trak currently logs workouts as
 * roughly 30-minute sessions, so the exported interval uses the same duration.
 * Never throws: cloud persistence remains the source of truth.
 */
export async function writeExerciseToHealth(exercise: ExerciseEntry): Promise<void> {
  try {
    if (!(await healthAvailable())) return;
    if (!(await initialize())) return;
    const granted = await grantedWriteTypes();
    const end = new Date(exercise.createdAt);
    const durationMinutes = Math.max(1, Math.min(24 * 60, exercise.durationMinutes || 30));
    const start = new Date(exercise.createdAt - durationMinutes * 60 * 1000);
    const metadata = {
      clientRecordId: `trak-exercise-${exercise.id}`,
      clientRecordVersion: 1,
      recordingMethod: RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY,
    };
    const writes: Promise<string[]>[] = [];

    if (granted.has('ActiveCaloriesBurned')) {
      writes.push(
        insertRecords([
          {
            recordType: 'ActiveCaloriesBurned',
            energy: { unit: 'kilocalories', value: exercise.caloriesBurned },
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            metadata,
          },
        ])
      );
    }
    if (granted.has('ExerciseSession')) {
      writes.push(
        insertRecords([
          {
            recordType: 'ExerciseSession',
            exerciseType: exerciseTypeForName(exercise.name),
            title: exercise.name,
            notes: `${exercise.caloriesBurned} kcal logged in Trak`,
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            metadata,
          },
        ])
      );
    }
    await Promise.all(writes);
  } catch (error) {
    reportHealthError('workout write', error);
  }
}

/** Remove the Health Connect records created for a deleted Trak workout. */
export async function removeExerciseFromHealth(exerciseId: string): Promise<void> {
  try {
    if (!(await healthAvailable())) return;
    if (!(await initialize())) return;
    const granted = await grantedWriteTypes();
    const clientRecordIds = [`trak-exercise-${exerciseId}`];
    const removals: Promise<void>[] = [];
    if (granted.has('ActiveCaloriesBurned')) {
      removals.push(deleteRecordsByUuids('ActiveCaloriesBurned', [], clientRecordIds));
    }
    if (granted.has('ExerciseSession')) {
      removals.push(deleteRecordsByUuids('ExerciseSession', [], clientRecordIds));
    }
    await Promise.all(removals);
  } catch (error) {
    reportHealthError('workout delete', error);
  }
}
