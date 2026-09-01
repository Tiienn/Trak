import { buildDailyMissions, missionScore } from './missions.ts';
import type { FoodTotals, Goal } from './types';

/**
 * The Trak Score is now the user's five Daily Missions: 20 points each, with
 * no hidden base score. Weekly muscle points are calculated elsewhere.
 */

export type ScorePart = {
  key: string;
  label: string;
  /** Short explanation of how to earn the full amount. */
  hint: string;
  earned: number;
  max: number;
};

export type TrakScore = {
  value: number;
  parts: ScorePart[];
};

export function computeScore(input: {
  totals: FoodTotals;
  targets: FoodTotals;
  /** Calories target adjusted for exercise. */
  calorieBudget: number;
  mealsLogged: number;
  waterToday: number;
  waterGoal: number;
  streak: number;
  workoutMinutes?: number;
  goal?: Goal;
}): TrakScore {
  const missions = buildDailyMissions({
    totals: input.totals,
    targets: input.targets,
    calorieBudget: input.calorieBudget,
    mealsLogged: input.mealsLogged,
    waterToday: input.waterToday,
    waterGoal: input.waterGoal,
    workoutMinutes: input.workoutMinutes ?? 0,
    goal: input.goal,
  });
  const parts: ScorePart[] = missions.map((mission) => ({
    key: mission.key,
    label: mission.title,
    hint: mission.complete ? 'Mission complete. 20 Trak Points earned once.' : mission.detail,
    earned: mission.complete ? mission.points : 0,
    max: mission.points,
  }));
  const value = missionScore(missions);
  return { value, parts };
}

/** One-line encouragement matched to the score band. */
export function scoreCaption(value: number): string {
  if (value >= 100) return 'All five missions complete. Perfect day.';
  if (value >= 80) return 'Four down — one mission left.';
  if (value >= 60) return 'Strong progress. Keep the rhythm going.';
  if (value >= 20) return 'You’re on the board. Build from here.';
  return 'Complete a daily mission to earn your first 20 points.';
}
