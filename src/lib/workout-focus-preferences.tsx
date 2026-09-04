import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';
import {
  DEFAULT_WORKOUT_FOCUS_SETTINGS,
  normalizeWorkoutFocusSettings,
  readWorkoutFocusSettings,
  writeWorkoutFocusSettings,
  type PriorityMuscle,
  type WorkoutFocusSettings,
} from './workout-focus-settings';

type ContextValue = {
  loaded: boolean;
  saving: boolean;
  settings: WorkoutFocusSettings;
  saveFocus: (muscle: PriorityMuscle | null, baselineWeeklySets?: number) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<ContextValue | null>(null);

function mapRow(row: any): WorkoutFocusSettings {
  return normalizeWorkoutFocusSettings({
    priorityMuscle: row?.priority_muscle,
    focusStartedOn: row?.focus_started_on,
    baselineWeeklySets: row?.baseline_weekly_sets,
  });
}

export function WorkoutFocusPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentUser = useRef(userId);
  useLayoutEffect(() => { currentUser.current = userId; }, [userId]);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<{
    userId: string | null;
    loaded: boolean;
    settings: WorkoutFocusSettings;
  }>({ userId: null, loaded: false, settings: DEFAULT_WORKOUT_FOCUS_SETTINGS });

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ userId: null, loaded: true, settings: DEFAULT_WORKOUT_FOCUS_SETTINGS });
      return;
    }
    let local = DEFAULT_WORKOUT_FOCUS_SETTINGS;
    try {
      local = await readWorkoutFocusSettings(AsyncStorage, userId);
    } catch {
      // A fresh default remains usable if local storage is unavailable.
    }
    if (currentUser.current !== userId) return;
    setState({ userId, loaded: true, settings: local });
    try {
      const { data, error } = await supabase
        .from('workout_focus_preferences')
        .select('priority_muscle, focus_started_on, baseline_weekly_sets')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) return;
      if (data) {
        const remote = mapRow(data);
        await writeWorkoutFocusSettings(AsyncStorage, userId, remote).catch(() => remote);
        if (currentUser.current === userId) setState({ userId, loaded: true, settings: remote });
      } else if (local.priorityMuscle) {
        await supabase.from('workout_focus_preferences').upsert({
          user_id: userId,
          priority_muscle: local.priorityMuscle,
          focus_started_on: local.focusStartedOn,
          baseline_weekly_sets: local.baselineWeeklySets,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // Keep the account-scoped local preference available offline and on older backends.
    }
  }, [userId]);

  useEffect(() => {
    const timeout = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const saveFocus = useCallback(async (muscle: PriorityMuscle | null, baselineWeeklySets = 0) => {
    if (!userId) throw new Error('Please sign in first.');
    const now = new Date();
    const startedOn = muscle
      ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      : null;
    const next = normalizeWorkoutFocusSettings({
      priorityMuscle: muscle,
      focusStartedOn: startedOn,
      baselineWeeklySets,
    });
    setSaving(true);
    try {
      await writeWorkoutFocusSettings(AsyncStorage, userId, next);
      if (currentUser.current === userId) setState({ userId, loaded: true, settings: next });
      await supabase.from('workout_focus_preferences').upsert({
        user_id: userId,
        priority_muscle: next.priorityMuscle,
        focus_started_on: next.focusStartedOn,
        baseline_weekly_sets: next.baselineWeeklySets,
        updated_at: new Date().toISOString(),
      });
    } catch {
      throw new Error('Could not save your muscle focus. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const loaded = state.loaded && state.userId === userId;
  const value = useMemo<ContextValue>(() => ({
    loaded,
    saving,
    settings: loaded ? state.settings : DEFAULT_WORKOUT_FOCUS_SETTINGS,
    saveFocus,
    refresh,
  }), [loaded, refresh, saveFocus, saving, state.settings]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWorkoutFocusPreferences(): ContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useWorkoutFocusPreferences must be inside WorkoutFocusPreferencesProvider');
  return value;
}
