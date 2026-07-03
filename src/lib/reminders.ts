import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** A daily meal-logging reminder (device-local, not synced). */
export type Reminder = {
  id: string;
  label: string;
  /** Notification body shown when it fires. */
  message: string;
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
};

const STORAGE_KEY = 'trak.reminders.v1';
const CHANNEL_ID = 'meal-reminders';

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'breakfast', label: 'Breakfast', message: 'What did you have for breakfast?', hour: 8, minute: 0, enabled: false },
  { id: 'lunch', label: 'Lunch', message: 'Time to log your lunch 🍽️', hour: 12, minute: 30, enabled: false },
  { id: 'dinner', label: 'Dinner', message: 'Don’t forget to log dinner.', hour: 18, minute: 30, enabled: false },
];

// Show reminders as a banner even when the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Merge stored reminders over the defaults so new defaults still appear. */
export async function loadReminders(): Promise<Reminder[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDERS;
    const stored: Reminder[] = JSON.parse(raw);
    return DEFAULT_REMINDERS.map((d) => {
      const s = stored.find((r) => r.id === d.id);
      return s ? { ...d, hour: s.hour, minute: s.minute, enabled: s.enabled } : d;
    });
  } catch {
    return DEFAULT_REMINDERS;
  }
}

async function persist(list: Reminder[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Non-critical: a failed persist just means defaults next launch.
  }
}

/** Ask for notification permission; returns true if granted. */
export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Meal reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });
}

/**
 * Cancel every scheduled reminder and re-schedule the enabled ones.
 * Reminders are the only notifications Trak schedules, so a blanket
 * cancel is safe. Persists the list too.
 */
export async function applyReminders(list: Reminder[]): Promise<void> {
  await persist(list);
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of list) {
    if (!r.enabled) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: `${r.label} · Trak`,
        body: r.message,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: r.hour,
        minute: r.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/**
 * Re-apply saved reminders on app start (survives OS clearing them) —
 * only touches the notification system if at least one is enabled and
 * permission is already granted. Never prompts.
 */
export async function bootstrapReminders(): Promise<void> {
  try {
    const list = await loadReminders();
    if (!list.some((r) => r.enabled)) return;
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await applyReminders(list);
  } catch {
    // Best-effort — a missing native module or permission issue is a no-op.
  }
}
