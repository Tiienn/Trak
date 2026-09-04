import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';
import {
  DEFAULT_WORKOUT_COACH_SETTINGS,
  normalizeWorkoutCoachSettings,
  readWorkoutCoachSettings,
  writeWorkoutCoachSettings,
  type WorkoutCoachSettings,
} from './workout-coach-settings';

type ContextValue = {
  loaded: boolean;
  saving: boolean;
  settings: WorkoutCoachSettings;
  save: (settings: WorkoutCoachSettings) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<ContextValue | null>(null);

function mapRow(row: any): WorkoutCoachSettings {
  return normalizeWorkoutCoachSettings({
    configured: true,
    trainingLocation: row?.training_location,
    experience: row?.experience,
    daysPerWeek: row?.days_per_week,
    sessionMinutes: row?.session_minutes,
    routine: row?.routine,
    equipment: row?.equipment,
    limitationsNote: row?.limitations_note,
  });
}

function toRow(userId: string, settings: WorkoutCoachSettings) {
  return {
    user_id: userId,
    training_location: settings.trainingLocation,
    experience: settings.experience,
    days_per_week: settings.daysPerWeek,
    session_minutes: settings.sessionMinutes,
    routine: settings.routine,
    equipment: settings.equipment,
    limitations_note: settings.limitationsNote || null,
    updated_at: new Date().toISOString(),
  };
}

export function WorkoutCoachPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentUser = useRef(userId);
  useLayoutEffect(() => { currentUser.current = userId; }, [userId]);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState({ userId: null as string | null, loaded: false, settings: DEFAULT_WORKOUT_COACH_SETTINGS });

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ userId: null, loaded: true, settings: DEFAULT_WORKOUT_COACH_SETTINGS });
      return;
    }
    let local = DEFAULT_WORKOUT_COACH_SETTINGS;
    try { local = await readWorkoutCoachSettings(AsyncStorage, userId); } catch {}
    if (currentUser.current !== userId) return;
    setState({ userId, loaded: true, settings: local });
    try {
      const { data, error } = await supabase.from('workout_coach_preferences').select('*').eq('user_id', userId).maybeSingle();
      if (error) return;
      if (data) {
        const remote = mapRow(data);
        await writeWorkoutCoachSettings(AsyncStorage, userId, remote).catch(() => remote);
        if (currentUser.current === userId) setState({ userId, loaded: true, settings: remote });
      } else if (local.configured) {
        await supabase.from('workout_coach_preferences').upsert(toRow(userId, local));
      }
    } catch {
      // Local account-scoped preferences keep coaching available offline and on older backends.
    }
  }, [userId]);

  useEffect(() => { const timeout = setTimeout(() => { void refresh(); }, 0); return () => clearTimeout(timeout); }, [refresh]);

  const save = useCallback(async (value: WorkoutCoachSettings) => {
    if (!userId) throw new Error('Please sign in first.');
    const next = normalizeWorkoutCoachSettings({ ...value, configured: true });
    setSaving(true);
    try {
      await writeWorkoutCoachSettings(AsyncStorage, userId, next);
      if (currentUser.current === userId) setState({ userId, loaded: true, settings: next });
      try {
        await supabase.from('workout_coach_preferences').upsert(toRow(userId, next));
      } catch {
        // Local setup remains usable offline; refresh retries account sync later.
      }
    } catch {
      throw new Error('Could not save your workout setup. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const loaded = state.loaded && state.userId === userId;
  const value = useMemo<ContextValue>(() => ({ loaded, saving, settings: loaded ? state.settings : DEFAULT_WORKOUT_COACH_SETTINGS, save, refresh }), [loaded, refresh, save, saving, state.settings]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWorkoutCoachPreferences(): ContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useWorkoutCoachPreferences must be inside WorkoutCoachPreferencesProvider');
  return value;
}
