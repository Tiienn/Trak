import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from './auth';
import { writeMealToHealth } from './health';
import { computeTargets } from './nutrition';
import { supabase } from './supabase';
import { syncWidget } from './widget-sync';
import {
  ExerciseEntry,
  FoodAnalysis,
  FoodTotals,
  LoggedMeal,
  UserProfile,
  WeightEntry,
} from './types';

/** Daily water goal, in glasses (~250 ml each). */
export const WATER_GOAL = 8;

/** Fallback goals used until the user completes onboarding. */
export const DEFAULT_TARGETS: FoodTotals = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 60,
};

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function emptyTotals(): FoodTotals {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

export function sumTotals(meals: LoggedMeal[]): FoodTotals {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.total.calories,
      protein_g: acc.protein_g + m.total.protein_g,
      carbs_g: acc.carbs_g + m.total.carbs_g,
      fat_g: acc.fat_g + m.total.fat_g,
    }),
    emptyTotals()
  );
}

/** Consecutive days (ending today or yesterday) that have at least one meal. */
function computeStreak(meals: LoggedMeal[]): number {
  const days = new Set(meals.map((m) => m.date));
  if (days.size === 0) return 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Map a Supabase row to our client types. */
function rowToProfile(r: any): UserProfile {
  return {
    sex: r.sex,
    age: r.age,
    heightCm: Number(r.height_cm),
    weightKg: Number(r.weight_kg),
    goal: r.goal,
    activity: r.activity,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    waterGoal: r.water_goal != null ? Number(r.water_goal) : undefined,
  };
}

function rowToExercise(r: any): ExerciseEntry {
  return {
    id: r.id,
    date: r.day,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    name: r.name,
    caloriesBurned: r.calories_burned ?? 0,
  };
}

function rowToWeight(r: any): WeightEntry {
  return { date: r.day, weightKg: Number(r.weight_kg) };
}

function rowToMeal(r: any): LoggedMeal {
  return {
    id: r.id,
    date: r.day,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    title: r.title,
    total: {
      calories: r.calories,
      protein_g: r.protein_g,
      carbs_g: r.carbs_g,
      fat_g: r.fat_g,
    },
    items: Array.isArray(r.items) ? r.items : [],
    confidence: Number(r.confidence),
    photoUri: r.photo_uri ?? undefined,
  };
}

type MealsContextValue = {
  loaded: boolean;
  /** True when the cloud load failed (e.g. offline) — show a retry, never onboarding. */
  loadError: boolean;
  retryLoad: () => void;
  /** Silent re-fetch for pull-to-refresh (never blanks the screen). */
  refresh: () => Promise<void>;
  meals: LoggedMeal[];
  /** Weight history, oldest first. */
  weights: WeightEntry[];
  /** Most recent logged weight in kg, or null if none. */
  latestWeight: number | null;
  /** Glasses of water logged today. */
  waterToday: number;
  /** Daily water goal, in glasses. */
  waterGoal: number;
  /** Set today's water glass count. */
  setWater: (glasses: number) => Promise<void>;
  /** Change the daily water goal (persisted on the profile). */
  setWaterGoal: (goal: number) => Promise<void>;
  /** Workouts logged today. */
  todayExercises: ExerciseEntry[];
  /** Total calories burned via exercise today. */
  burnedToday: number;
  /** Log a workout for today. */
  addExercise: (name: string, caloriesBurned: number) => Promise<void>;
  /** Remove a logged workout. */
  removeExercise: (id: string) => Promise<void>;
  profile: UserProfile | null;
  hasProfile: boolean;
  targets: FoodTotals;
  todayMeals: LoggedMeal[];
  todayTotals: FoodTotals;
  streak: number;
  addMeal: (analysis: FoodAnalysis, photoUri?: string) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  /** Edit a logged meal's title/totals (correct an AI estimate). */
  updateMeal: (id: string, patch: { title: string; total: FoodTotals }) => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  /** Log (or overwrite) today's weight; also updates the profile weight. */
  logWeight: (weightKg: number) => Promise<void>;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function MealsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  /** Glasses of water logged today. */
  const [waterToday, setWaterToday] = useState(0);
  /** All exercises for the signed-in user (filtered to today for the budget). */
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [today, setToday] = useState(dayKey());

  // Keep "today" honest across midnight: refresh when the app comes to the
  // foreground and once a minute while it stays open.
  useEffect(() => {
    const refresh = () => setToday((prev) => (dayKey() === prev ? prev : dayKey()));
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    const timer = setInterval(refresh, 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);

  // Load the signed-in user's data from Supabase whenever the user changes
  // (or a retry is requested).
  useEffect(() => {
    let active = true;
    if (!user) {
      setMeals([]);
      setWeights([]);
      setWaterToday(0);
      setExercises([]);
      setProfile(null);
      setLoadError(false);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    setLoadError(false);
    (async () => {
      try {
        const [profileRes, mealRes, weightRes, waterRes, exerciseRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
          supabase
            .from('meals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('weights')
            .select('*')
            .eq('user_id', user.id)
            .order('day', { ascending: true }),
          supabase
            .from('water')
            .select('glasses')
            .eq('user_id', user.id)
            .eq('day', dayKey())
            .maybeSingle(),
          supabase
            .from('exercises')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);
        if (!active) return;
        // Weights, water + exercises are non-critical: a missing table or
        // error just means empty state, never a hard load failure.
        setWeights(weightRes.error ? [] : (weightRes.data ?? []).map(rowToWeight));
        setWaterToday(waterRes.error || !waterRes.data ? 0 : (waterRes.data.glasses ?? 0));
        setExercises(exerciseRes.error ? [] : (exerciseRes.data ?? []).map(rowToExercise));
        if (profileRes.error || mealRes.error) {
          // A failed load must NOT look like "new user" — that would bounce
          // the user into onboarding and overwrite their real profile.
          setLoadError(true);
          setLoaded(true);
          return;
        }
        setProfile(profileRes.data ? rowToProfile(profileRes.data) : null);
        setMeals((mealRes.data ?? []).map(rowToMeal));
        setLoaded(true);
      } catch {
        if (!active) return;
        setLoadError(true);
        setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  const retryLoad = useCallback(() => setReloadKey((k) => k + 1), []);

  // Silent re-fetch for pull-to-refresh: updates data in place without
  // toggling `loaded` (which would blank the screen mid-gesture).
  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [profileRes, mealRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      if (profileRes.error || mealRes.error) return; // keep showing current data
      setProfile(profileRes.data ? rowToProfile(profileRes.data) : null);
      setMeals((mealRes.data ?? []).map(rowToMeal));
      setLoadError(false);
    } catch {
      // Offline pull-to-refresh: keep current data, no error state.
    }
  }, [user]);

  const addMeal = useCallback(
    async (analysis: FoodAnalysis, photoUri?: string) => {
      if (!user) return;
      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          day: dayKey(),
          title: analysis.title,
          calories: analysis.total.calories,
          protein_g: analysis.total.protein_g,
          carbs_g: analysis.total.carbs_g,
          fat_g: analysis.total.fat_g,
          items: analysis.items,
          confidence: analysis.confidence,
          photo_uri: photoUri ?? null,
        })
        .select()
        .single();
      if (error || !data) {
        // Surface the failure — callers show it and keep the user on the
        // result screen instead of silently losing the meal.
        throw new Error('Could not save your meal. Check your connection and try again.');
      }
      setMeals((prev) => [rowToMeal(data), ...prev]);
      // Best-effort mirror to Android Health Connect (no-op unless enabled).
      writeMealToHealth(analysis.title, analysis.total, Date.now());
    },
    [user]
  );

  const removeMeal = useCallback(async (id: string) => {
    // Optimistic removal, but remember the row so we can restore it on failure.
    let removed: LoggedMeal | undefined;
    let at = -1;
    setMeals((prev) => {
      at = prev.findIndex((m) => m.id === id);
      removed = at >= 0 ? prev[at] : undefined;
      return prev.filter((m) => m.id !== id);
    });
    const { error } = await supabase.from('meals').delete().eq('id', id);
    if (error && removed) {
      const meal = removed;
      const index = at;
      setMeals((prev) => {
        const next = [...prev];
        next.splice(Math.min(Math.max(index, 0), next.length), 0, meal);
        return next;
      });
      throw new Error('Could not remove the meal. Check your connection and try again.');
    }
  }, []);

  // Edit a logged meal's title and/or totals (to correct an AI estimate).
  const updateMeal = useCallback(
    async (id: string, patch: { title: string; total: FoodTotals }) => {
      let previous: LoggedMeal | undefined;
      setMeals((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          previous = m;
          return { ...m, title: patch.title, total: patch.total };
        })
      );
      const { error } = await supabase
        .from('meals')
        .update({
          title: patch.title,
          calories: patch.total.calories,
          protein_g: patch.total.protein_g,
          carbs_g: patch.total.carbs_g,
          fat_g: patch.total.fat_g,
        })
        .eq('id', id);
      if (error && previous) {
        const prevMeal = previous;
        setMeals((prev) => prev.map((m) => (m.id === id ? prevMeal : m)));
        throw new Error('Could not save your changes. Check your connection and try again.');
      }
    },
    []
  );

  const saveProfile = useCallback(
    async (next: UserProfile) => {
      if (!user) return;
      const previous = profile;
      setProfile(next); // optimistic
      const { error } = await supabase.from('profiles').upsert({
        user_id: user.id,
        sex: next.sex,
        age: next.age,
        height_cm: next.heightCm,
        weight_kg: next.weightKg,
        goal: next.goal,
        activity: next.activity,
      });
      if (error) {
        setProfile(previous); // roll back so the UI doesn't lie
        throw new Error('Could not save your profile. Check your connection and try again.');
      }
    },
    [user, profile]
  );

  // Log (or overwrite) today's weight. Also updates the profile's current
  // weight so calorie targets stay accurate as the user's weight changes.
  const logWeight = useCallback(
    async (weightKg: number) => {
      if (!user || !Number.isFinite(weightKg) || weightKg <= 0) return;
      const day = dayKey();
      const previousWeights = weights;
      const previousProfile = profile;
      // Optimistic: upsert today's entry into the sorted-by-day list.
      setWeights((prev) => {
        const rest = prev.filter((w) => w.date !== day);
        return [...rest, { date: day, weightKg }].sort((a, b) => a.date.localeCompare(b.date));
      });
      if (profile) setProfile({ ...profile, weightKg });

      const weightRes = await supabase
        .from('weights')
        .upsert({ user_id: user.id, day, weight_kg: weightKg }, { onConflict: 'user_id,day' });
      const profileRes = profile
        ? await supabase.from('profiles').update({ weight_kg: weightKg }).eq('user_id', user.id)
        : { error: null };

      if (weightRes.error || profileRes.error) {
        setWeights(previousWeights);
        setProfile(previousProfile);
        throw new Error('Could not save your weight. Check your connection and try again.');
      }
    },
    [user, weights, profile]
  );

  // Set today's water glass count (clamped to >= 0), upserting the daily row.
  const setWater = useCallback(
    async (glasses: number) => {
      if (!user) return;
      const next = Math.max(0, Math.round(glasses));
      const previous = waterToday;
      setWaterToday(next); // optimistic
      const { error } = await supabase
        .from('water')
        .upsert({ user_id: user.id, day: dayKey(), glasses: next }, { onConflict: 'user_id,day' });
      if (error) {
        setWaterToday(previous);
        // Water is low-stakes; swallow the error rather than interrupting.
      }
    },
    [user, waterToday]
  );

  // Log a workout for today (adds its calories back to today's budget).
  const addExercise = useCallback(
    async (name: string, caloriesBurned: number) => {
      if (!user) return;
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          user_id: user.id,
          day: dayKey(),
          name,
          calories_burned: Math.max(0, Math.round(caloriesBurned)),
        })
        .select()
        .single();
      if (error || !data) {
        throw new Error('Could not save your workout. Check your connection and try again.');
      }
      setExercises((prev) => [rowToExercise(data), ...prev]);
    },
    [user]
  );

  const removeExercise = useCallback(async (id: string) => {
    let removed: ExerciseEntry | undefined;
    setExercises((prev) => {
      removed = prev.find((e) => e.id === id);
      return prev.filter((e) => e.id !== id);
    });
    const { error } = await supabase.from('exercises').delete().eq('id', id);
    if (error && removed) {
      const back = removed;
      setExercises((prev) => [back, ...prev]);
      throw new Error('Could not remove the workout. Check your connection and try again.');
    }
  }, []);

  // Change the daily water goal (persisted on the profile).
  const setWaterGoal = useCallback(
    async (goal: number) => {
      if (!user || !profile) return;
      const clamped = Math.min(20, Math.max(1, Math.round(goal)));
      const previous = profile;
      setProfile({ ...profile, waterGoal: clamped });
      const { error } = await supabase
        .from('profiles')
        .update({ water_goal: clamped })
        .eq('user_id', user.id);
      if (error) setProfile(previous);
    },
    [user, profile]
  );

  const value = useMemo<MealsContextValue>(() => {
    const todayMeals = meals.filter((m) => m.date === today);
    const todayExercises = exercises.filter((e) => e.date === today);
    const burnedToday = todayExercises.reduce((a, e) => a + e.caloriesBurned, 0);
    return {
      loaded,
      loadError,
      retryLoad,
      refresh,
      meals,
      weights,
      latestWeight: weights.length > 0 ? weights[weights.length - 1].weightKg : null,
      waterToday,
      waterGoal: profile?.waterGoal ?? WATER_GOAL,
      setWater,
      setWaterGoal,
      todayExercises,
      burnedToday,
      addExercise,
      removeExercise,
      profile,
      hasProfile: profile !== null,
      targets: profile ? computeTargets(profile) : DEFAULT_TARGETS,
      todayMeals,
      todayTotals: sumTotals(todayMeals),
      streak: computeStreak(meals),
      addMeal,
      removeMeal,
      updateMeal,
      saveProfile,
      logWeight,
    };
  }, [meals, weights, waterToday, setWater, setWaterGoal, exercises, addExercise, removeExercise, profile, loaded, loadError, retryLoad, refresh, today, addMeal, removeMeal, updateMeal, saveProfile, logWeight]);

  // Keep the Android home-screen widget in sync with today's numbers.
  const eaten = Math.round(value.todayTotals.calories);
  const budget = Math.round(value.targets.calories) + value.burnedToday;
  useEffect(() => {
    if (!loaded) return;
    syncWidget({
      left: budget - eaten,
      eaten,
      budget,
      water: value.waterToday,
      waterGoal: value.waterGoal,
    });
  }, [loaded, eaten, budget, value.waterToday, value.waterGoal]);

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

export function useMeals(): MealsContextValue {
  const ctx = useContext(MealsContext);
  if (!ctx) {
    throw new Error('useMeals must be used inside a <MealsProvider>');
  }
  return ctx;
}
