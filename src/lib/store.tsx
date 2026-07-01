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

import { FoodAnalysis, FoodTotals, LoggedMeal } from './types';

const STORAGE_KEY = 'trak.meals.v1';

/** Default daily goals. Phase 4 will compute these from the user's profile. */
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

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

type MealsContextValue = {
  meals: LoggedMeal[];
  loaded: boolean;
  targets: FoodTotals;
  todayMeals: LoggedMeal[];
  todayTotals: FoodTotals;
  addMeal: (analysis: FoodAnalysis, photoUri?: string) => void;
  removeMeal: (id: string) => void;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function MealsProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load saved meals once on startup.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setMeals(parsed);
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

  // Persist whenever meals change (but not before the initial load).
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(meals)).catch(() => {});
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

  const value = useMemo<MealsContextValue>(() => {
    const today = dayKey();
    const todayMeals = meals.filter((m) => m.date === today);
    return {
      meals,
      loaded,
      targets: DEFAULT_TARGETS,
      todayMeals,
      todayTotals: sumTotals(todayMeals),
      addMeal,
      removeMeal,
    };
  }, [meals, loaded, addMeal, removeMeal]);

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
}

export function useMeals(): MealsContextValue {
  const ctx = useContext(MealsContext);
  if (!ctx) {
    throw new Error('useMeals must be used inside a <MealsProvider>');
  }
  return ctx;
}
