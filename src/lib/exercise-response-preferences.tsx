import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import {
  DEFAULT_EXERCISE_RESPONSE_SETTINGS,
  readExerciseResponseSettings,
  writeExerciseResponseSettings,
  type ExerciseResponse,
  type ExerciseResponseSettings,
} from './exercise-response-settings';

type ContextValue = {
  settings: ExerciseResponseSettings;
  loaded: boolean;
  saving: boolean;
  error: boolean;
  retry: () => void;
  setResponse: (exerciseId: string, response: ExerciseResponse | null) => Promise<void>;
  restoreUnsuitable: () => Promise<void>;
};

const Context = createContext<ContextValue | null>(null);

export function ExerciseResponsePreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const currentUser = useRef(userId);
  useLayoutEffect(() => { currentUser.current = userId; }, [userId]);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{
    userId: string | null;
    settings: ExerciseResponseSettings;
    error: boolean;
  }>({ userId: null, settings: DEFAULT_EXERCISE_RESPONSE_SETTINGS, error: false });
  const loaded = !!userId && state.userId === userId;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    readExerciseResponseSettings(AsyncStorage, userId)
      .then((settings) => { if (active) setState({ userId, settings, error: false }); })
      .catch(() => { if (active) setState({ userId, settings: DEFAULT_EXERCISE_RESPONSE_SETTINGS, error: true }); });
    return () => { active = false; };
  }, [userId, reload]);

  const setResponse = useCallback(async (exerciseId: string, response: ExerciseResponse | null) => {
    if (!userId || !loaded || state.error) throw new Error('Load your exercise feedback before changing it.');
    if (savingRef.current) throw new Error('Your previous feedback is still saving.');
    savingRef.current = true;
    setSaving(true);
    const responses = { ...state.settings.responses };
    if (response) responses[exerciseId] = response;
    else delete responses[exerciseId];
    try {
      const settings = await writeExerciseResponseSettings(AsyncStorage, userId, { responses });
      if (currentUser.current === userId) setState({ userId, settings, error: false });
    } catch {
      throw new Error('Could not save exercise feedback. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [loaded, state.error, state.settings.responses, userId]);

  const restoreUnsuitable = useCallback(async () => {
    if (!userId || !loaded || state.error) throw new Error('Load your exercise feedback before changing it.');
    if (savingRef.current) throw new Error('Your previous feedback is still saving.');
    savingRef.current = true;
    setSaving(true);
    const responses = Object.fromEntries(
      Object.entries(state.settings.responses).filter(([, response]) => response !== 'unsuitable')
    );
    try {
      const settings = await writeExerciseResponseSettings(AsyncStorage, userId, { responses });
      if (currentUser.current === userId) setState({ userId, settings, error: false });
    } catch {
      throw new Error('Could not restore hidden exercises. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [loaded, state.error, state.settings.responses, userId]);

  return (
    <Context.Provider value={{
      settings: loaded ? state.settings : DEFAULT_EXERCISE_RESPONSE_SETTINGS,
      loaded,
      saving,
      error: loaded && state.error,
      retry: () => setReload((value) => value + 1),
      setResponse,
      restoreUnsuitable,
    }}>
      {children}
    </Context.Provider>
  );
}

export function useExerciseResponsePreferences(): ContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useExerciseResponsePreferences must be inside ExerciseResponsePreferencesProvider');
  return value;
}
