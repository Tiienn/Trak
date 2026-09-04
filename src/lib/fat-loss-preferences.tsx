import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import {
  DEFAULT_FAT_LOSS_SETTINGS,
  normalizeFatLossSettings,
  readFatLossSettings,
  writeFatLossSettings,
  type FatLossSettings,
} from './fat-loss-settings';
import { supabase } from './supabase';

type ContextValue = {
  loaded: boolean;
  saving: boolean;
  settings: FatLossSettings;
  save: (settings: FatLossSettings) => Promise<void>;
  refresh: () => Promise<void>;
};

const Context = createContext<ContextValue | null>(null);

function mapRow(row: any): FatLossSettings {
  return normalizeFatLossSettings({
    activityBaseline: row?.activity_baseline,
    comfortableCardioMinutes: row?.comfortable_cardio_minutes,
    preferredCardioModes: row?.preferred_cardio_modes,
    balanceConcern: row?.balance_concern,
    chairStandComfortable: row?.chair_stand_comfortable,
    movementBreaks: row?.movement_breaks,
    phase: row?.phase,
  });
}

function rowFor(settings: FatLossSettings, userId: string) {
  return {
    user_id: userId,
    activity_baseline: settings.activityBaseline,
    comfortable_cardio_minutes: settings.comfortableCardioMinutes,
    preferred_cardio_modes: settings.preferredCardioModes,
    balance_concern: settings.balanceConcern,
    chair_stand_comfortable: settings.chairStandComfortable,
    movement_breaks: settings.movementBreaks,
    phase: settings.phase,
    updated_at: new Date().toISOString(),
  };
}

export function FatLossPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentUser = useRef(userId);
  useLayoutEffect(() => { currentUser.current = userId; }, [userId]);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<{ userId: string | null; loaded: boolean; settings: FatLossSettings }>({
    userId: null,
    loaded: false,
    settings: DEFAULT_FAT_LOSS_SETTINGS,
  });

  const refresh = useCallback(async () => {
    if (!userId) {
      setState({ userId: null, loaded: true, settings: DEFAULT_FAT_LOSS_SETTINGS });
      return;
    }
    let local = DEFAULT_FAT_LOSS_SETTINGS;
    try {
      local = await readFatLossSettings(AsyncStorage, userId);
    } catch {
      // The evidence-based defaults remain available when storage is unavailable.
    }
    if (currentUser.current !== userId) return;
    setState({ userId, loaded: true, settings: local });
    try {
      const { data, error } = await supabase.from('fat_loss_preferences').select('*').eq('user_id', userId).maybeSingle();
      if (error) return;
      if (data) {
        const remote = mapRow(data);
        await writeFatLossSettings(AsyncStorage, userId, remote).catch(() => remote);
        if (currentUser.current === userId) setState({ userId, loaded: true, settings: remote });
      } else {
        await supabase.from('fat_loss_preferences').upsert(rowFor(local, userId));
      }
    } catch {
      // Keep the account-scoped offline preference on older backends.
    }
  }, [userId]);

  useEffect(() => {
    const timeout = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  const save = useCallback(async (value: FatLossSettings) => {
    if (!userId) throw new Error('Please sign in first.');
    const next = normalizeFatLossSettings(value);
    setSaving(true);
    try {
      await writeFatLossSettings(AsyncStorage, userId, next);
      if (currentUser.current === userId) setState({ userId, loaded: true, settings: next });
      await supabase.from('fat_loss_preferences').upsert(rowFor(next, userId));
    } catch {
      throw new Error('Could not save your fat-loss preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [userId]);

  const loaded = state.loaded && state.userId === userId;
  const value = useMemo<ContextValue>(() => ({
    loaded,
    saving,
    settings: loaded ? state.settings : DEFAULT_FAT_LOSS_SETTINGS,
    save,
    refresh,
  }), [loaded, refresh, save, saving, state.settings]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFatLossPreferences(): ContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useFatLossPreferences must be inside FatLossPreferencesProvider');
  return value;
}

