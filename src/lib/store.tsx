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
import { calorieBudgetForDay, creditedExerciseCalories } from './exercise';
import { prepareMealNutrition } from './food-servings';
import {
  removeExerciseFromHealth,
  removeMealFromHealth,
  writeExerciseToHealth,
  writeMealToHealth,
} from './health';
import { computeTargets } from './nutrition';
import { supabase } from './supabase';
import { syncWidget } from './widget-sync';
import {
  ExerciseEntry,
  ExerciseDetails,
  FoodAnalysis,
  FoodItem,
  FoodTotals,
  LoggedMeal,
  SavedMeal,
  UserProfile,
  WaterEntry,
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
 * Diet style was originally device-only. Keep the per-user cache as an offline
 * fallback and legacy bridge; current accounts also sync it through profiles.
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
    diet: isDiet(r.diet) ? r.diet : undefined,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    waterGoal: r.water_goal != null ? Number(r.water_goal) : undefined,
    calorieBias: r.calorie_bias != null ? Number(r.calorie_bias) : undefined,
  };
}

function rowToExercise(r: any): ExerciseEntry {
  const validSplits = new Set([
    'upper_body',
    'lower_body',
    'push',
    'pull',
    'chest',
    'legs',
    'back',
    'arms',
    'shoulders',
    'abs',
    'glutes',
    'other',
    'full_body',
    'cardio',
  ]);
  return {
    id: r.id,
    date: r.day,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    name: r.name,
    caloriesBurned: r.calories_burned ?? 0,
    durationMinutes: Math.max(1, Number(r.duration_minutes) || 30),
    workoutSplits: Array.isArray(r.workout_splits)
      ? r.workout_splits.filter((value: unknown) => typeof value === 'string' && validSplits.has(value))
      : [],
    muscleSets: {
      chest: Math.max(0, Number(r.chest_sets) || 0),
      legs: Math.max(0, Number(r.leg_sets) || 0),
      back: Math.max(0, Number(r.back_sets) || 0),
      arms: Math.max(0, Number(r.arm_sets) || 0),
      shoulders: Math.max(0, Number(r.shoulder_sets) || 0),
      abs: Math.max(0, Number(r.ab_sets) || 0),
      glutes: Math.max(0, Number(r.glute_sets) || 0),
      other: Math.max(0, Number(r.other_sets) || 0),
    },
  };
}

function rowToWeight(r: any): WeightEntry {
  return { date: r.day, weightKg: Number(r.weight_kg) };
}

function rowToWater(r: any): WaterEntry {
  return { date: r.day, glasses: Math.max(0, Number(r.glasses) || 0) };
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
    analysisMeta: r.analysis_meta ?? undefined,
  };
}

type MealsContextValue = {
  /** Local calendar day, refreshed on foreground and across midnight. */
  today: string;
  loaded: boolean;
  /** True when the cloud load failed (e.g. offline) — show a retry, never onboarding. */
  loadError: boolean;
  retryLoad: () => void;
  /** Silent re-fetch for pull-to-refresh (never blanks the screen). */
  refresh: () => Promise<void>;
  meals: LoggedMeal[];
  /** All workouts for the signed-in user, newest first. */
  exercises: ExerciseEntry[];
  /** Weight history, oldest first. */
  weights: WeightEntry[];
  /** Most recent logged weight in kg, or null if none. */
  latestWeight: number | null;
  /** Glasses of water logged today. */
  waterToday: number;
  /** Daily water history, newest first. */
  waterHistory: WaterEntry[];
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
  /** Conservative portion of today's exercise burn added to the food budget. */
  exerciseCreditToday: number;
  /** Today's base calorie target plus exercise credit. */
  calorieBudget: number;
  /** Log a workout for today. */
  addExercise: (
    name: string,
    caloriesBurned: number,
    durationMinutes?: number,
    details?: ExerciseDetails
  ) => Promise<void>;
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
  /** Edit a logged meal's title, serving amounts and/or nutrition totals. */
  updateMeal: (id: string, patch: { title: string; total: FoodTotals; items?: FoodItem[] }) => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  /** Log (or overwrite) a day's weight; the newest entry also updates the profile weight. */
  logWeight: (weightKg: number, date?: string) => Promise<void>;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function MealsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  /** Glasses of water logged today. */
  const [waterToday, setWaterToday] = useState(0);
  const [waterHistory, setWaterHistory] = useState<WaterEntry[]>([]);
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
    supabase
      .from('water')
      .select('glasses')
      .eq('user_id', user.id)
      .eq('day', today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) {
          const glasses = error || !data ? 0 : (data.glasses ?? 0);
          setWaterToday(glasses);
          setWaterHistory((rows) => [
            { date: today, glasses },
            ...rows.filter((row) => row.date !== today),
          ]);
        }
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
      Promise.resolve().then(() => {
        if (!active) return;
        setMeals([]);
        setSavedMeals([]);
        setWeights([]);
        setWaterToday(0);
        setWaterHistory([]);
        setExercises([]);
        setProfile(null);
        setLoadError(false);
        setLoaded(true);
      });
      return () => {
        active = false;
      };
    }
    (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoaded(false);
      setLoadError(false);
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
              .select('day, glasses')
              .eq('user_id', user.id)
              .order('day', { ascending: false }),
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
        const waterRows = waterRes.error ? [] : (waterRes.data ?? []).map(rowToWater);
        setWaterHistory(waterRows);
        setWaterToday(waterRows.find((row) => row.date === dayKey())?.glasses ?? 0);
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
          .select('day, glasses')
          .eq('user_id', user.id)
          .order('day', { ascending: false }),
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
      if (!waterRes.error) {
        const rows = (waterRes.data ?? []).map(rowToWater);
        setWaterHistory(rows);
        setWaterToday(rows.find((row) => row.date === dayKey())?.glasses ?? 0);
      }
      if (!exerciseRes.error) setExercises((exerciseRes.data ?? []).map(rowToExercise));
      setLoadError(false);
    } catch {
      // Offline pull-to-refresh: keep current data, no error state.
    }
  }, [user]);

  const addMeal = useCallback(
    async (analysis: FoodAnalysis, photoUri?: string) => {
      if (!user) return;
      const nutrition = prepareMealNutrition(analysis.items, analysis.total);
      const { data, error } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          day: dayKey(),
          title: analysis.title,
          calories: nutrition.total.calories,
          protein_g: nutrition.total.protein_g,
          carbs_g: nutrition.total.carbs_g,
          fat_g: nutrition.total.fat_g,
          items: nutrition.items,
          confidence: analysis.confidence,
          notes: analysis.notes ?? null,
          photo_uri: photoUri ?? null,
          analysis_meta: analysis.analysisMeta ?? null,
        })
        .select()
        .single();
      if (error || !data) {
        // Surface the failure — callers show it and keep the user on the
        // result screen instead of silently losing the meal.
        throw new Error('Could not save your meal. Check your connection and try again.');
      }
      const meal = rowToMeal(data);
      setMeals((prev) => [meal, ...prev]);
      // Best-effort mirror to Android Health Connect (no-op unless enabled).
      writeMealToHealth(meal.id, meal.title, meal.total, meal.createdAt);
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
        analysisMeta: { inputSource: 'quick_log' },
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
    if (!error) removeMealFromHealth(id);
  }, []);

  // Edit a logged meal's title and/or totals (to correct an AI estimate).
  // The item breakdown is scaled proportionally so it can't contradict the
  // edited totals (an 800-kcal item list under a 500-kcal total).
  const updateMeal = useCallback(
    async (id: string, patch: { title: string; total: FoodTotals; items?: FoodItem[] }) => {
      const previous = meals.find((meal) => meal.id === id);
      if (!user || !previous) throw new Error('This meal is no longer available. Please refresh your log.');
      // Prepare the full update BEFORE setState: React may defer or replay its
      // updater. Never rely on that updater to populate a database payload.
      const { items: scaledItems, total } = prepareMealNutrition(patch.items ?? previous.items, patch.total);
      setMeals((prev) =>
        prev.map((m) => m.id === id ? { ...m, title: patch.title, total, items: scaledItems } : m)
      );
      const update: Record<string, unknown> = {
        title: patch.title,
        calories: total.calories,
        protein_g: total.protein_g,
        carbs_g: total.carbs_g,
        fat_g: total.fat_g,
        items: scaledItems,
      };
      try {
        const { error } = await supabase.from('meals').update(update)
          .eq('id', id).eq('user_id', user.id).select('id').single();
        if (error) throw error;
      } catch {
        setMeals((prev) => prev.map((m) => (m.id === id ? previous : m)));
        throw new Error('Could not save your changes. Check your connection and try again.');
      }
      // A successful user correction is valuable evaluation ground truth.
      // Store only before/after totals and version metadata—never photos,
      // meal names, chat text, or profile fields. Failure is non-blocking so a
      // missing/new migration never makes the user's edit appear unsuccessful.
      if (user) {
        const before = previous.total;
        const calorieDeltaPct =
          before.calories > 0
            ? ((total.calories - before.calories) / before.calories) * 100
            : null;
        supabase
          .from('meal_corrections')
          .insert({
            user_id: user.id,
            meal_id: id,
            before_totals: before,
            after_totals: total,
            calorie_delta_pct: calorieDeltaPct,
            analysis_meta: previous.analysisMeta ?? null,
          })
          .then(() => {});

        // Re-inserting with the same client ID and a higher version updates
        // the existing Health Connect record instead of creating a duplicate.
        writeMealToHealth(
          previous.id,
          patch.title,
          total,
          previous.createdAt,
          Date.now()
        );
      }
    },
    [user, meals]
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
        diet: next.diet ?? 'balanced',
      });
      if (error) {
        setProfile(previous); // roll back so the UI doesn't lie
        throw new Error('Could not save your profile. Check your connection and try again.');
      }
    },
    [user, profile]
  );

  // Log (or overwrite) a weight entry. Only the newest dated entry updates the
  // profile's current weight so back-filling history cannot rewind targets.
  const logWeight = useCallback(
    async (weightKg: number, date = dayKey()) => {
      if (!user) throw new Error('Please sign in again before saving your weight.');
      if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) {
        throw new Error('Enter a weight between 20 and 400 kg.');
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > dayKey()) {
        throw new Error('Choose today or an earlier date.');
      }
      const day = date;
      const currentLatestDay = weights.at(-1)?.date;
      const updatesCurrentWeight = currentLatestDay == null || day >= currentLatestDay;
      const previousWeights = weights;
      const previousProfile = profile;
      // Optimistic: upsert today's entry into the sorted-by-day list.
      setWeights((prev) => {
        const rest = prev.filter((w) => w.date !== day);
        return [...rest, { date: day, weightKg }].sort((a, b) => a.date.localeCompare(b.date));
      });
      if (profile && updatesCurrentWeight) setProfile({ ...profile, weightKg });

      // Two independent writes → two independent rollbacks. A single
      // all-or-nothing rollback desynced the client from whichever write
      // actually landed on the server.
      const weightRes = await supabase
        .from('weights')
        .upsert({ user_id: user.id, day, weight_kg: weightKg }, { onConflict: 'user_id,day' })
        .select('weight_kg')
        .single();
      if (weightRes.error) {
        setWeights(previousWeights);
        setProfile(previousProfile);
        throw new Error('Could not save your weight. Check your connection and try again.');
      }
      if (profile && updatesCurrentWeight) {
        const profileRes = await supabase
          .from('profiles')
          .update({ weight_kg: weightKg })
          .eq('user_id', user.id)
          .select('weight_kg')
          .single();
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
      setWaterHistory((rows) => [
        { date: today, glasses: next },
        ...rows.filter((row) => row.date !== today),
      ]);
      const { error } = await supabase
        .from('water')
        .upsert({ user_id: user.id, day: dayKey(), glasses: next }, { onConflict: 'user_id,day' });
      if (error) {
        setWaterToday(previous);
        setWaterHistory((rows) => [
          { date: today, glasses: previous },
          ...rows.filter((row) => row.date !== today),
        ]);
        // Water is low-stakes; swallow the error rather than interrupting.
      }
    },
    [user, waterToday, today]
  );

  // Log a workout for today. A conservative portion is credited to the budget.
  const addExercise = useCallback(
    async (
      name: string,
      caloriesBurned: number,
      durationMinutes = 30,
      details?: ExerciseDetails
    ) => {
      if (!user) return;
      const safeDuration = Math.max(1, Math.min(24 * 60, Math.round(durationMinutes)));
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          user_id: user.id,
          day: dayKey(),
          name,
          calories_burned: Math.max(0, Math.round(caloriesBurned)),
          duration_minutes: safeDuration,
          workout_splits: details?.workoutSplits ?? [],
          chest_sets: Math.max(0, Math.round(details?.muscleSets.chest ?? 0)),
          leg_sets: Math.max(0, Math.round(details?.muscleSets.legs ?? 0)),
          back_sets: Math.max(0, Math.round(details?.muscleSets.back ?? 0)),
          arm_sets: Math.max(0, Math.round(details?.muscleSets.arms ?? 0)),
          shoulder_sets: Math.max(0, Math.round(details?.muscleSets.shoulders ?? 0)),
          ab_sets: Math.max(0, Math.round(details?.muscleSets.abs ?? 0)),
          glute_sets: Math.max(0, Math.round(details?.muscleSets.glutes ?? 0)),
          other_sets: Math.max(0, Math.round(details?.muscleSets.other ?? 0)),
        })
        .select()
        .single();
      if (error || !data) {
        throw new Error('Could not save your workout. Check your connection and try again.');
      }
      const exercise = rowToExercise(data);
      setExercises((prev) => [exercise, ...prev]);
      // Best-effort mirror to Android Health Connect (no-op unless enabled).
      writeExerciseToHealth(exercise);
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
    if (!error) removeExerciseFromHealth(id);
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
    const targets = profile ? computeTargets(profile) : DEFAULT_TARGETS;
    const exerciseCreditToday = creditedExerciseCalories(burnedToday);
    return {
      today,
      loaded,
      loadError,
      retryLoad,
      refresh,
      meals,
      exercises,
      weights,
      latestWeight: weights.length > 0 ? weights[weights.length - 1].weightKg : null,
      waterToday,
      waterHistory,
      waterGoal: profile?.waterGoal ?? WATER_GOAL,
      setWater,
      setWaterGoal,
      calorieBias: profile?.calorieBias ?? 0,
      setCalorieBias,
      todayExercises,
      burnedToday,
      exerciseCreditToday,
      calorieBudget: calorieBudgetForDay(targets.calories, burnedToday),
      addExercise,
      removeExercise,
      profile,
      hasProfile: profile !== null,
      targets,
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
  }, [meals, savedMeals, saveMeal, removeSavedMeal, quickLog, weights, waterToday, waterHistory, setWater, setWaterGoal, setCalorieBias, exercises, addExercise, removeExercise, profile, loaded, loadError, retryLoad, refresh, today, addMeal, removeMeal, updateMeal, saveProfile, logWeight]);

  // Keep the Android home-screen widget in sync with today's numbers.
  const eaten = Math.round(value.todayTotals.calories);
  const budget = value.calorieBudget;
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
