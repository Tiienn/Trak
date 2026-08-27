import { Brand, MacroColors } from '@/constants/theme';

import type { MuscleGroup, WorkoutSplit } from './types';

export const MUSCLE_GROUPS: { key: MuscleGroup; label: string; color: string }[] = [
  { key: 'chest', label: 'Chest', color: Brand.green },
  { key: 'legs', label: 'Legs', color: MacroColors.protein },
  { key: 'back', label: 'Back', color: MacroColors.carbs },
  { key: 'arms', label: 'Arms', color: MacroColors.fat },
  { key: 'shoulders', label: 'Shoulders', color: '#5C7FA3' },
  { key: 'abs', label: 'Abs', color: '#B36B8C' },
  { key: 'glutes', label: 'Glutes', color: '#8F6EAA' },
  { key: 'other', label: 'Other', color: '#739A91' },
];

export const ALL_MUSCLE_GROUPS = MUSCLE_GROUPS.map((item) => item.key);

export type WorkoutFocus = {
  key: WorkoutSplit;
  label: string;
  description: string;
  muscles: MuscleGroup[];
};

/** Fast, familiar workout patterns shown before the individual muscle list. */
export const WORKOUT_PRESETS: WorkoutFocus[] = [
  {
    key: 'upper_body',
    label: 'Upper body',
    description: 'Chest, back, arms, shoulders',
    muscles: ['chest', 'back', 'arms', 'shoulders'],
  },
  {
    key: 'lower_body',
    label: 'Lower body',
    description: 'Legs and glutes',
    muscles: ['legs', 'glutes'],
  },
  {
    key: 'push',
    label: 'Push',
    description: 'Chest, shoulders, triceps',
    muscles: ['chest', 'shoulders', 'arms'],
  },
  {
    key: 'pull',
    label: 'Pull',
    description: 'Back and biceps',
    muscles: ['back', 'arms'],
  },
  {
    key: 'full_body',
    label: 'Full body',
    description: 'All strength areas',
    muscles: ALL_MUSCLE_GROUPS,
  },
  { key: 'cardio', label: 'Cardio', description: 'Time and calorie burn', muscles: [] },
];

export const MUSCLE_FOCUSES: WorkoutFocus[] = MUSCLE_GROUPS.map((item) => ({
    key: item.key as WorkoutSplit,
    label: item.label,
    description: item.key === 'other' ? 'Any other strength work' : `${item.label} training`,
    muscles: [item.key],
  }));

export const WORKOUT_FOCUSES: WorkoutFocus[] = [...WORKOUT_PRESETS, ...MUSCLE_FOCUSES];

export function muscleLabel(group: MuscleGroup | null): string {
  if (!group) return 'Cardio';
  return MUSCLE_GROUPS.find((item) => item.key === group)?.label ?? 'Other';
}

export function workoutFocusLabel(focus: WorkoutSplit): string {
  return WORKOUT_FOCUSES.find((item) => item.key === focus)?.label ?? focus.replaceAll('_', ' ');
}
