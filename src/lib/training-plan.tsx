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
import { supabase } from './supabase';
import type { LoadUnit, MuscleGroup, TrainingActivityType } from './types';

export type TrainingPlanItem = {
  id: string;
  name: string;
  activityType: TrainingActivityType;
  muscleGroup: MuscleGroup | null;
  sets: number;
  reps: string;
  loadValue: number | null;
  loadUnit: LoadUnit;
  durationTargetMinutes: number | null;
  calorieTarget: number | null;
  position: number;
};

export type TrainingLoadEntry = {
  id: string;
  trainingPlanItemId: string;
  loadValue: number;
  loadUnit: LoadUnit;
  createdAt: number;
};

export type NewTrainingPlanItem = Omit<TrainingPlanItem, 'id' | 'position'>;
export type TrainingPlanPatch = Partial<Omit<TrainingPlanItem, 'id' | 'position'>>;

type TrainingPlanContextValue = {
  loaded: boolean;
  items: TrainingPlanItem[];
  loadHistory: TrainingLoadEntry[];
  addItem: (item: NewTrainingPlanItem) => Promise<void>;
  updateItem: (id: string, patch: TrainingPlanPatch) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
};

function rowToItem(row: any): TrainingPlanItem {
  return {
    id: row.id,
    name: row.name,
    activityType: row.activity_type === 'cardio' ? 'cardio' : 'strength',
    muscleGroup: row.muscle_group ?? null,
    sets: Math.max(1, Number(row.sets) || 1),
    reps: row.reps || '8–12',
    loadValue: row.load_value == null ? null : Math.max(0, Number(row.load_value) || 0),
    loadUnit: row.load_unit === 'lb' ? 'lb' : 'kg',
    durationTargetMinutes: row.duration_target_minutes == null ? null : Math.max(1, Number(row.duration_target_minutes) || 1),
    calorieTarget: row.calorie_target == null ? null : Math.max(0, Number(row.calorie_target) || 0),
    position: Math.max(0, Number(row.position) || 0),
  };
}

function rowToLoad(row: any): TrainingLoadEntry {
  return {
    id: row.id,
    trainingPlanItemId: row.training_plan_item_id,
    loadValue: Math.max(0, Number(row.load_value) || 0),
    loadUnit: row.load_unit === 'lb' ? 'lb' : 'kg',
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function cleanName(value: string): string {
  const clean = value.trim();
  if (clean.length < 1 || clean.length > 60) throw new Error('Use an exercise name between 1 and 60 characters.');
  return clean;
}

function cleanReps(value: string): string {
  const clean = value.trim();
  if (clean.length < 1 || clean.length > 20) throw new Error('Use a rep range between 1 and 20 characters.');
  return clean;
}

function cleanLoad(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(2000, Math.round(value * 100) / 100));
}

const TrainingPlanContext = createContext<TrainingPlanContextValue | null>(null);

export function TrainingPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<TrainingPlanItem[]>([]);
  const [loadHistory, setLoadHistory] = useState<TrainingLoadEntry[]>([]);

  useEffect(() => {
    let active = true;
    if (!user) {
      Promise.resolve().then(() => {
        if (!active) return;
        setItems([]);
        setLoadHistory([]);
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
      const [planResult, historyResult] = await Promise.all([
        supabase
          .from('training_plan_items')
          .select('*')
          .eq('user_id', user.id)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('training_load_history')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      setItems(planResult.error ? [] : (planResult.data ?? []).map(rowToItem));
      setLoadHistory(historyResult.error ? [] : (historyResult.data ?? []).map(rowToLoad));
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const addItem = useCallback(
    async (item: NewTrainingPlanItem) => {
      if (!user) throw new Error('Please sign in again before saving your plan.');
      const { data, error } = await supabase
        .from('training_plan_items')
        .insert({
          user_id: user.id,
          name: cleanName(item.name),
          activity_type: item.activityType,
          muscle_group: item.activityType === 'cardio' ? null : item.muscleGroup,
          sets: Math.max(1, Math.min(20, Math.round(item.sets))),
          reps: cleanReps(item.reps),
          load_value: item.activityType === 'strength' ? cleanLoad(item.loadValue) : null,
          load_unit: item.loadUnit,
          duration_target_minutes: item.activityType === 'cardio'
            ? Math.max(1, Math.min(1440, Math.round(item.durationTargetMinutes ?? 30)))
            : null,
          calorie_target: item.activityType === 'cardio'
            ? Math.max(0, Math.min(10000, Math.round(item.calorieTarget ?? 200)))
            : null,
          position: items.length,
        })
        .select()
        .single();
      if (error || !data) throw new Error('Could not add that exercise. Check your connection and try again.');
      const saved = rowToItem(data);
      if (saved.activityType === 'strength' && saved.loadValue != null) {
        const { data: loadData, error: loadError } = await supabase
          .from('training_load_history')
          .insert({
            user_id: user.id,
            training_plan_item_id: saved.id,
            load_value: saved.loadValue,
            load_unit: saved.loadUnit,
          })
          .select()
          .single();
        if (loadError || !loadData) {
          await supabase.from('training_plan_items').delete().eq('id', saved.id);
          throw new Error('Could not start load tracking. Check your connection and try again.');
        }
        setLoadHistory((previous) => [rowToLoad(loadData), ...previous]);
      }
      setItems((previous) => [...previous, saved]);
    },
    [items.length, user]
  );

  const updateItem = useCallback(async (id: string, patch: TrainingPlanPatch) => {
    const currentItem = items.find((item) => item.id === id);
    if (!currentItem || !user) throw new Error('That exercise is no longer available.');
    const payload: Record<string, string | number | null> = {};
    if (patch.name != null) payload.name = cleanName(patch.name);
    if (patch.activityType != null) payload.activity_type = patch.activityType;
    if (patch.muscleGroup !== undefined) payload.muscle_group = patch.muscleGroup;
    if (patch.sets != null) payload.sets = Math.max(1, Math.min(20, Math.round(patch.sets)));
    if (patch.reps != null) payload.reps = cleanReps(patch.reps);
    if (patch.loadValue !== undefined) payload.load_value = cleanLoad(patch.loadValue);
    if (patch.loadUnit != null) payload.load_unit = patch.loadUnit;
    if (patch.durationTargetMinutes !== undefined) payload.duration_target_minutes = patch.durationTargetMinutes == null
      ? null
      : Math.max(1, Math.min(1440, Math.round(patch.durationTargetMinutes)));
    if (patch.calorieTarget !== undefined) payload.calorie_target = patch.calorieTarget == null
      ? null
      : Math.max(0, Math.min(10000, Math.round(patch.calorieTarget)));

    const nextLoad = patch.loadValue === undefined ? currentItem.loadValue : cleanLoad(patch.loadValue);
    const nextUnit = patch.loadUnit ?? currentItem.loadUnit;
    const loadChanged = nextLoad != null && (
      nextLoad !== currentItem.loadValue || nextUnit !== currentItem.loadUnit
    );
    let insertedLoad: TrainingLoadEntry | null = null;
    if (loadChanged) {
      const { data, error } = await supabase
        .from('training_load_history')
        .insert({
          user_id: user.id,
          training_plan_item_id: id,
          load_value: nextLoad,
          load_unit: nextUnit,
        })
        .select()
        .single();
      if (error || !data) throw new Error('Could not record that load. Check your connection and try again.');
      insertedLoad = rowToLoad(data);
    }
    const previous = items;
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              sets: typeof payload.sets === 'number' ? payload.sets : item.sets,
              loadValue: payload.load_value === undefined ? item.loadValue : payload.load_value as number | null,
              durationTargetMinutes: payload.duration_target_minutes === undefined
                ? item.durationTargetMinutes
                : payload.duration_target_minutes as number | null,
              calorieTarget: payload.calorie_target === undefined
                ? item.calorieTarget
                : payload.calorie_target as number | null,
            }
          : item
      )
    );
    const { error } = await supabase.from('training_plan_items').update(payload).eq('id', id);
    if (error) {
      setItems(previous);
      if (insertedLoad) await supabase.from('training_load_history').delete().eq('id', insertedLoad.id);
      throw new Error('Could not update that exercise. Check your connection and try again.');
    }
    if (insertedLoad) setLoadHistory((current) => [insertedLoad, ...current]);
  }, [items, user]);

  const removeItem = useCallback(async (id: string) => {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    const { error } = await supabase.from('training_plan_items').delete().eq('id', id);
    if (error) {
      setItems(previous);
      throw new Error('Could not remove that exercise. Check your connection and try again.');
    }
    setLoadHistory((current) => current.filter((entry) => entry.trainingPlanItemId !== id));
  }, [items]);

  const value = useMemo(
    () => ({ loaded, items, loadHistory, addItem, updateItem, removeItem }),
    [loaded, items, loadHistory, addItem, updateItem, removeItem]
  );
  return <TrainingPlanContext.Provider value={value}>{children}</TrainingPlanContext.Provider>;
}

export function useTrainingPlan(): TrainingPlanContextValue {
  const value = useContext(TrainingPlanContext);
  if (!value) throw new Error('useTrainingPlan must be used inside TrainingPlanProvider');
  return value;
}
