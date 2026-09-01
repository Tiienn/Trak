import type { FoodTotals, Goal } from './types';

export const DAILY_MISSION_POINTS = 20;
export const DAILY_MISSION_COUNT = 5;
export const DAILY_SCORE_MAX = DAILY_MISSION_POINTS * DAILY_MISSION_COUNT;

export type DailyMissionKey = 'meals' | 'protein' | 'calories' | 'water' | 'workout';

export type DailyMission = {
  key: DailyMissionKey;
  title: string;
  detail: string;
  current: number;
  target: number;
  unit: string;
  complete: boolean;
  points: typeof DAILY_MISSION_POINTS;
  route: '/scan' | '/macro/protein' | '/macro/calories' | '/exercise' | null;
};

function whole(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function calorieTitle(goal?: Goal): string {
  if (goal === 'lose') return 'Fuel your cut';
  if (goal === 'gain') return 'Fuel your growth';
  return 'Fuel your day';
}

/**
 * The five transparent daily missions shared by Home and Progress. Missions
 * are monotonic: once a target is reached, later logging cannot take it away.
 */
export function buildDailyMissions(input: {
  totals: FoodTotals;
  targets: FoodTotals;
  calorieBudget: number;
  mealsLogged: number;
  waterToday: number;
  waterGoal: number;
  workoutMinutes: number;
  goal?: Goal;
}): DailyMission[] {
  const calorieTarget = Math.max(1, Math.round(input.calorieBudget * 0.8));
  const proteinTarget = Math.max(1, whole(input.targets.protein_g));
  const waterTarget = Math.max(1, whole(input.waterGoal));
  const workoutTarget = 30;
  const mealsTarget = 3;
  const meals = whole(input.mealsLogged);
  const calories = whole(input.totals.calories);
  const protein = whole(input.totals.protein_g);
  const water = whole(input.waterToday);
  const workoutMinutes = whole(input.workoutMinutes);

  return [
    {
      key: 'meals',
      title: 'Log your meals',
      detail: `${Math.min(meals, mealsTarget)} of ${mealsTarget} meals`,
      current: meals,
      target: mealsTarget,
      unit: 'meals',
      complete: meals >= mealsTarget,
      points: DAILY_MISSION_POINTS,
      route: '/scan',
    },
    {
      key: 'protein',
      title: 'Reach your protein',
      detail: `${Math.min(protein, proteinTarget)} of ${proteinTarget} g`,
      current: protein,
      target: proteinTarget,
      unit: 'g',
      complete: protein >= proteinTarget,
      points: DAILY_MISSION_POINTS,
      route: '/macro/protein',
    },
    {
      key: 'calories',
      title: calorieTitle(input.goal),
      detail: `${Math.min(calories, calorieTarget).toLocaleString()} of ${calorieTarget.toLocaleString()} kcal`,
      current: calories,
      target: calorieTarget,
      unit: 'kcal',
      complete: meals >= mealsTarget && calories >= calorieTarget,
      points: DAILY_MISSION_POINTS,
      route: '/macro/calories',
    },
    {
      key: 'water',
      title: 'Hit your water goal',
      detail: `${Math.min(water, waterTarget)} of ${waterTarget} glasses`,
      current: water,
      target: waterTarget,
      unit: 'glasses',
      complete: water >= waterTarget,
      points: DAILY_MISSION_POINTS,
      route: null,
    },
    {
      key: 'workout',
      title: 'Complete your training',
      detail: `${Math.min(workoutMinutes, workoutTarget)} of ${workoutTarget} min`,
      current: workoutMinutes,
      target: workoutTarget,
      unit: 'min',
      complete: workoutMinutes >= workoutTarget,
      points: DAILY_MISSION_POINTS,
      route: '/exercise',
    },
  ];
}

export function missionScore(missions: DailyMission[]): number {
  return missions.reduce((total, mission) => total + (mission.complete ? mission.points : 0), 0);
}
