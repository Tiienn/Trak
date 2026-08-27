import AsyncStorage from '@react-native-async-storage/async-storage';

import { extractError } from './analyzeFood';
import { bodyPhotoRepository } from './body-photo-store';
import { applyReminders, cancelBodyAnalysisRecheck } from './reminders';
import { supabase } from './supabase';

// Non-personal device preference (theme) is deliberately kept.
const CLEAR_KEYS = ['trak.chat.v1', 'trak.ask.v1', 'trak.game.v1', 'trak.waterUnit.v1'];

/**
 * Permanently delete the signed-in user's account: server wipes all cloud
 * data + the auth user, then local traces are cleared and the session ends.
 * Throws a friendly Error if the server call fails (nothing local is touched
 * in that case, so the user can retry).
 */
export async function deleteAccount(): Promise<void> {
  // The session dies once the auth user is deleted, so capture the id first
  // to build the per-user diet key we clear afterward.
  const userId = (await supabase.auth.getUser()).data.user?.id;

  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });
  if (error) {
    throw new Error(await extractError(error));
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }

  // Server succeeded — now best-effort clear every local trace. A failure here
  // must not surface as an error: the account is already gone server-side.

  // Clears stored reminders AND cancels every scheduled notification.
  await cancelBodyAnalysisRecheck().catch(() => {});
  await applyReminders([]).catch(() => {});

  const keys = [...CLEAR_KEYS, 'trak.dietStyle.v1'];
  if (userId) keys.push(`trak.dietStyle.v1.${userId}`);
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {
    // Best-effort: a failed clear leaves harmless local scraps behind.
  }

  if (userId) {
    await bodyPhotoRepository.deleteAll(userId).catch(() => {});
  }

  // The server already deleted the auth user, so this signOut may 4xx.
  // supabase-js clears the local session regardless; ignore any throw.
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore — the local session is cleared even when the server call fails.
  }
}
