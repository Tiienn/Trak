import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from './auth';
import { computeTargets } from './nutrition';
import { supabase } from './supabase';
import { FoodAnalysis, FoodTotals, LoggedMeal, UserProfile } from './types';

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
  };
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
  meals: LoggedMeal[];
  profile: UserProfile | null;
  hasProfile: boolean;
  targets: FoodTotals;
  todayMeals: LoggedMeal[];
  todayTotals: FoodTotals;
  streak: number;
  addMeal: (analysis: FoodAnalysis, photoUri?: string) => Promise<void>;
  removeMeal: (id: string) => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
};

const MealsContext = createContext<MealsContextValue | null>(null);

export function MealsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load the signed-in user's data from Supabase whenever the user changes.
  useEffect(() => {
    let active = true;
    if (!user) {
      setMeals([]);
      setProfile(null);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    (async () => {
      const [profileRes, mealRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('meals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      setProfile(profileRes.data ? rowToProfile(profileRes.data) : null);
      setMeals((mealRes.data ?? []).map(rowToMeal));
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
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
      if (!error && data) {
        setMeals((prev) => [rowToMeal(data), ...prev]);
      }
    },
    [user]
  );

  const removeMeal = useCallback(async (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id)); // optimistic
    await supabase.from('meals').delete().eq('id', id);
  }, []);

  const saveProfile = useCallback(
    async (next: UserProfile) => {
      if (!user) return;
      setProfile(next); // optimistic
      await supabase.from('profiles').upsert({
        user_id: user.id,
        sex: next.sex,
        age: next.age,
        height_cm: next.heightCm,
        weight_kg: next.weightKg,
        goal: next.goal,
        activity: next.activity,
      });
    },
    [user]
  );

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
