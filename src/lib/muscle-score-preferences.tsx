import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { DEFAULT_MUSCLE_SCORE_SETTINGS, readMuscleScoreSettings, writeMuscleScoreSettings, type MuscleScoreSettings } from './muscle-score-settings';

type ContextValue = {
  settings: MuscleScoreSettings;
  loaded: boolean;
  saving: boolean;
  error: boolean;
  retry: () => void;
  save: (settings: MuscleScoreSettings) => Promise<void>;
};
const Context = createContext<ContextValue | null>(null);

export function MuscleScorePreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentUser = useRef(userId);
  useLayoutEffect(() => { currentUser.current = userId; }, [userId]);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{ userId: string | null; settings: MuscleScoreSettings; error: boolean }>({ userId: null, settings: DEFAULT_MUSCLE_SCORE_SETTINGS, error: false });
  const loaded = !!userId && state.userId === userId;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    readMuscleScoreSettings(AsyncStorage, userId)
      .then((settings) => { if (active) setState({ userId, settings, error: false }); })
      .catch(() => { if (active) setState({ userId, settings: DEFAULT_MUSCLE_SCORE_SETTINGS, error: true }); });
    return () => { active = false; };
  }, [userId, reload]);

  const save = useCallback(async (settings: MuscleScoreSettings) => {
    if (!userId || !loaded || state.error) throw new Error('Load your settings before changing them.');
    if (savingRef.current) throw new Error('Your previous change is still saving.');
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await writeMuscleScoreSettings(AsyncStorage, userId, settings);
      if (currentUser.current === userId) setState({ userId, settings: saved, error: false });
    } catch {
      throw new Error('Could not save muscle score settings. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [userId, loaded, state.error]);

  return <Context.Provider value={{ settings: loaded ? state.settings : DEFAULT_MUSCLE_SCORE_SETTINGS, loaded, saving, error: loaded && state.error, retry: () => setReload((value) => value + 1), save }}>{children}</Context.Provider>;
}

export function useMuscleScorePreferences(): ContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useMuscleScorePreferences must be inside MuscleScorePreferencesProvider');
  return value;
}
