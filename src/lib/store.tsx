import AsyncStorage from '@react-native-async-storage/async-storage';
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
  FoodItem,
  FoodTotals,
  LoggedMeal,
  SavedMeal,
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

/**
 * Diet style lives on-device (like the water unit) rather than in the profiles
 * table, so no DB migration is needed. Keyed BY USER so a shared device never
 * leaks one account's macro split into another. Merged into the profile after
 * load (the un-namespaced v1 key is read once as a legacy fallback).
 */
const dietKey = (userId: string) => `trak.dietStyle.v1.${userId}`;
const LEGACY_DIET_KEY = 'trak.dietStyle.v1';

function isDiet(v: string | null): v is 'balanced' | 'high_protein' | 'low_carb' {
  return v === 'balanced' || v === 'high_protein' || v === 'low_carb';
}

async function mergeLocalDiet(p: UserProfile, userId: string): Promise<UserProfile> {
  try {
    const scoped = await AsyncStorage.getItem(dietKey(userId));
    if (isDiet(scoped)) return { ...p, diet: scoped };
    const legacy = await AsyncStorage.getItem(LEGACY_DIET_KEY);
    if (isDiet(legacy)) {
      // Migrate the pre-namespacing value to this user, then retire it.
      AsyncStorage.setItem(dietKey(userId), legacy).catch(() => {});
      AsyncStorage.removeItem(LEGACY_DIET_KEY).catch(() => {});
      return { ...p, diet: legacy };
    }
  } catch {
    // Missing/broken cache just means the default diet.
  }
  return p;
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
    calorieBias: r.calorie_bias != null ? Number(r.calorie_bias) : undefined,
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

function rowToSavedMeal(r: any): SavedMeal {
  return {
    id: r.id,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    title: r.title,
    total: {
      calories: r.calories,
      protein_g: r.protein_g,
      carbs_g: r.carbs_g,
      fat_g: r.fat_g,
    },
    items: Array.isArray(r.items) ? r.items : [],
  };
}

/** Most recent meals with a unique title, newest first — for quick re-logging. */
function recentUniqueMeals(meals: LoggedMeal[], limit = 12): LoggedMeal[] {
  const seen = new Set<string>();
  const out: LoggedMeal[] = [];
  for (const m of meals) {
    // `meals` is already ordered newest-first from the query.
    const key = m.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= limit) break;
  }
  return out;
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
    notes: r.notes ?? undefined,
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
  /** Percent nudge applied to AI calorie estimates (0 by default). */
  calorieBias: number;
  /** Change the AI estimate bias (persisted on the profile). */
  setCalorieBias: (pct: number) => Promise<void>;
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
  /** Meals the user starred as reusable templates, newest first. */
  savedMeals: SavedMeal[];
  /** Recent distinct meals (from the log) for one-tap re-logging. */
  recentMeals: LoggedMeal[];
  /** Star a meal as a reusable template. */
  saveMeal: (meal: { title: string; total: FoodTotals; items: FoodItem[] }) => Promise<void>;
  /** Remove a saved-meal template. */
  removeSavedMeal: (id: string) => Promise<void>;
  /** Log a saved/recent meal to today with one tap. */
  quickLog: (meal: { title: string; total: FoodTotals; items: FoodItem[] }) => Promise<void>;
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
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
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

  // When the calendar day rolls over, water must reset with it — it's a plain
  // counter loaded for the launch day, unlike meals/exercises which re-filter
  // by date. Without this, yesterday's glasses display against the new day and
  // the next tap writes that stale count into the new day's row.
  useEffect(() => {
    if (!user || !loaded) return;
    let active = true;
    setWaterToday(0);
    supabase
      .from('water')
      .select('glasses')
      .eq('user_id', user.id)
      .eq('day', today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active && !error && data) setWaterToday(data.glasses ?? 0);
      });
    return () => {
      active = false;
    };
    // Intentionally only on day change — the initial load already fetched water.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  // Load the signed-in user's data from Supabase whenever the user changes
  // (or a retry is requested).
  useEffect(() => {
    let active = true;
    if (!user) {
      setMeals([]);
      setSavedMeals([]);
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
        const [profileRes, mealRes, weightRes, waterRes, exerciseRes, savedRes] =
          await Promise.all([
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
            supabase
              .from('saved_meals')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),
          ]);
        if (!active) return;
        // Weights, water, exercises + saved meals are non-critical: a missing
        // table or error just means empty state, never a hard load failure.
        setWeights(weightRes.error ? [] : (weightRes.data ?? []).map(rowToWeight));
        setWaterToday(waterRes.error || !waterRes.data ? 0 : (waterRes.data.glasses ?? 0));
        setExercises(exerciseRes.error ? [] : (exerciseRes.data ?? []).map(rowToExercise));
        setSavedMeals(savedRes.error ? [] : (savedRes.data ?? []).map(rowToSavedMeal));
        if (profileRes.error || mealRes.error) {
          // A failed load must NOT look like "new user" — that would bounce
          // the user into onboarding and overwrite their real profile.
          setLoadError(true);
          setLoaded(true);
          return;
        }
        setProfile(profileRes.data ? await mergeLocalDiet(rowToProfile(profileRes.data), user.id) : null);
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
      const [profileRes, mealRes, savedRes, weightRes, waterRes, exerciseRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('saved_meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('weights').select('*').eq('user_id', user.id).order('day', { ascending: true }),
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
      if (profileRes.error || mealRes.error) return; // keep showing current data
      setProfile(profileRes.data ? await mergeLocalDiet(rowToProfile(profileRes.data), user.id) : null);
      setMeals((mealRes.data ?? []).map(rowToMeal));
      if (!savedRes.error) setSavedMeals((savedRes.data ?? []).map(rowToSavedMeal));
      if (!weightRes.error) setWeights((weightRes.data ?? []).map(rowToWeight));
      if (!waterRes.error) setWaterToday(waterRes.data?.glasses ?? 0);
      if (!exerciseRes.error) setExercises((exerciseRes.data ?? []).map(rowToExercise));
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
          notes: analysis.notes ?? null,
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

  // Star a meal as a reusable template. Guards against exact-title duplicates.
  const saveMeal = useCallback(
    async (meal: { title: string; total: FoodTotals; items: FoodItem[] }) => {
      if (!user) return;
      const title = meal.title.trim();
      if (!title) return;
      if (savedMeals.some((s) => s.title.trim().toLowerCase() === title.toLowerCase())) return;
      const { data, error } = await supabase
        .from('saved_meals')
        .insert({
          user_id: user.id,
          title,
          calories: meal.total.calories,
          protein_g: meal.total.protein_g,
          carbs_g: meal.total.carbs_g,
          fat_g: meal.total.fat_g,
          items: meal.items,
        })
        .select()
        .single();
      if (error || !data) {
        throw new Error('Could not save this meal. Check your connection and try again.');
      }
      setSavedMeals((prev) => [rowToSavedMeal(data), ...prev]);
    },
    [user, savedMeals]
  );

  const removeSavedMeal = useCallback(async (id: string) => {
    let removed: SavedMeal | undefined;
    setSavedMeals((prev) => {
      removed = prev.find((s) => s.id === id);
      return prev.filter((s) => s.id !== id);
    });
    const { error } = await supabase.from('saved_meals').delete().eq('id', id);
    if (error && removed) {
      const back = removed;
      setSavedMeals((prev) => [back, ...prev]);
      throw new Error('Could not remove this saved meal. Check your connection and try again.');
    }
  }, []);

  // Log a saved/recent meal to today with one tap (reuses the meal insert path).
  const quickLog = useCallback(
    async (meal: { title: string; total: FoodTotals; items: FoodItem[] }) => {
      await addMeal({
        isFood: true,
        title: meal.title,
        items: meal.items,
        total: meal.total,
        confidence: 1,
      });
    },
    [addMeal]
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
  // The item breakdown is scaled proportionally so it can't contradict the
  // edited totals (an 800-kcal item list under a 500-kcal total).
  const updateMeal = useCallback(
    async (id: string, patch: { title: string; total: FoodTotals }) => {
      let previous: LoggedMeal | undefined;
      let scaledItems: FoodItem[] | undefined;
      setMeals((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m;
          previous = m;
          const factor = (oldTotal: number, newTotal: number) =>
            oldTotal > 0 ? newTotal / oldTotal : 1;
          const fCal = factor(m.total.calories, patch.total.calories);
          const fPro = factor(m.total.protein_g, patch.total.protein_g);
          const fCarb = factor(m.total.carbs_g, patch.total.carbs_g);
          const fFat = factor(m.total.fat_g, patch.total.fat_g);
          scaledItems = m.items.map((it) => ({
            ...it,
            calories: Math.round(it.calories * fCal),
            protein_g: Math.round(it.protein_g * fPro),
            carbs_g: Math.round(it.carbs_g * fCarb),
            fat_g: Math.round(it.fat_g * fFat),
          }));
          return { ...m, title: patch.title, total: patch.total, items: scaledItems };
        })
      );
      const update: Record<string, unknown> = {
        title: patch.title,
        calories: patch.total.calories,
        protein_g: patch.total.protein_g,
        carbs_g: patch.total.carbs_g,
        fat_g: patch.total.fat_g,
      };
      if (scaledItems) update.items = scaledItems;
      const { error } = await supabase.from('meals').update(update).eq('id', id);
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
      // Merge over the existing profile so device-local extras that aren't in
      // this form (waterGoal, calorieBias) survive an optimistic body-stat save.
      setProfile({ ...(profile ?? {}), ...next });
      // Diet style is device-local (no DB column) — persist it separately.
      if (next.diet) AsyncStorage.setItem(dietKey(user.id), next.diet).catch(() => {});
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

      // Two independent writes → two independent rollbacks. A single
      // all-or-nothing rollback desynced the client from whichever write
      // actually landed on the server.
      const weightRes = await supabase
        .from('weights')
        .upsert({ user_id: user.id, day, weight_kg: weightKg }, { onConflict: 'user_id,day' });
      if (weightRes.error) {
        setWeights(previousWeights);
        setProfile(previousProfile);
        throw new Error('Could not save your weight. Check your connection and try again.');
      }
      if (profile) {
        const profileRes = await supabase
          .from('profiles')
          .update({ weight_kg: weightKg })
          .eq('user_id', user.id);
        if (profileRes.error) {
          // The weight entry IS saved — only the profile mirror failed.
          setProfile(previousProfile);
          throw new Error(
            'Weight saved, but your calorie targets could not update. Pull to refresh.'
          );
        }
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
      if (error) {
        setProfile(previous);
        throw new Error('Could not save your water goal. Check your connection and try again.');
      }
    },
    [user, profile]
  );

  // Nudge AI calorie estimates up/down (percent, snapped to 5, clamped ±25).
  const setCalorieBias = useCallback(
    async (pct: number) => {
      if (!user || !profile) return;
      const clamped = Math.max(-25, Math.min(25, Math.round(pct / 5) * 5));
      const previous = profile;
      setProfile({ ...profile, calorieBias: clamped });
      const { error } = await supabase
        .from('profiles')
        .update({ calorie_bias: clamped })
        .eq('user_id', user.id);
      if (error) {
        setProfile(previous);
        throw new Error('Could not save the adjustment. Check your connection and try again.');
      }
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
      calorieBias: profile?.calorieBias ?? 0,
      setCalorieBias,
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
      savedMeals,
      recentMeals: recentUniqueMeals(meals, 30),
      saveMeal,
      removeSavedMeal,
      quickLog,
      removeMeal,
      updateMeal,
      saveProfile,
      logWeight,
    };
  }, [meals, savedMeals, saveMeal, removeSavedMeal, quickLog, weights, waterToday, setWater, setWaterGoal, setCalorieBias, exercises, addExercise, removeExercise, profile, loaded, loadError, retryLoad, refresh, today, addMeal, removeMeal, updateMeal, saveProfile, logWeight]);

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
