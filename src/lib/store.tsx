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

import { computeTargets } from './nutrition';
import { FoodAnalysis, FoodTotals, LoggedMeal, UserProfile } from './types';

const MEALS_KEY = 'trak.meals.v1';
const PROFILE_KEY = 'trak.profile.v1';

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
    // No meal today — a streak can still run through yesterday.
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

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

type MealsContextValue = {
  loaded: boolean;
  meals: LoggedMeal[];
  profile: UserProfile | null;
  hasProfile: boolean;
  targets: FoodTotals;
  todayMeals: LoggedMeal[];
  todayTotals: FoodTotals;
  streak: number;
  addMeal: (analysis: FoodAnalysis, photoUri?: string) => void;
  removeMeal: (id: string) => void;
  saveProfile: (profile: UserProfile) => void;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function MealsProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load saved data once on startup.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [mealsRaw, profileRaw] = await Promise.all([
          AsyncStorage.getItem(MEALS_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        if (active && mealsRaw) {
          const parsed = JSON.parse(mealsRaw);
          if (Array.isArray(parsed)) setMeals(parsed);
        }
        if (active && profileRaw) {
          setProfile(JSON.parse(profileRaw));
        }
      } catch {
        // corrupt/missing storage — start empty
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persist meals whenever they change (after the initial load).
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(MEALS_KEY, JSON.stringify(meals)).catch(() => {});
  }, [meals, loaded]);

  const addMeal = useCallback((analysis: FoodAnalysis, photoUri?: string) => {
    const meal: LoggedMeal = {
      id: makeId(),
      date: dayKey(),
      createdAt: Date.now(),
      title: analysis.title,
      total: analysis.total,
      items: analysis.items,
      confidence: analysis.confidence,
      photoUri,
    };
    setMeals((prev) => [meal, ...prev]);
  }, []);

  const removeMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const saveProfile = useCallback((next: UserProfile) => {
    setProfile(next);
    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const value = useMemo<MealsContextValue>(() => {
    const today = dayKey();
    const todayMeals = meals.filter((m) => m.date === today);
    return {
      loaded,
      meals,
      profile,
      hasProfile: profile !== null,
      targets: profile ? computeTargets(profile) : DEFAULT_TARGETS,
      todayMeals,
      todayTotals: sumTotals(todayMeals),
      streak: computeStreak(meals),
      addMeal,
      removeMeal,
      saveProfile,
    };
  }, [meals, profile, loaded, addMeal, removeMeal, saveProfile]);

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

export function useMeals(): MealsContextValue {
  const ctx = useContext(MealsContext);
  if (!ctx) {
    throw new Error('useMeals must be used inside a <MealsProvider>');
  }
  return ctx;
}
