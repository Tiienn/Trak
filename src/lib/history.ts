import { calorieBudgetForDay, creditedExerciseCalories } from './exercise.ts';
import { computeScore } from './score.ts';
import { buildDailyMissions, type DailyMission } from './missions.ts';
import type { Supplement, SupplementCheck } from './supplements';
import type { ExerciseEntry, FoodTotals, Goal, LoggedMeal, WaterEntry } from './types';

export type DailyHistory = {
  date: string;
  meals: LoggedMeal[];
  exercises: ExerciseEntry[];
  totals: FoodTotals;
  caloriesBurned: number;
  exerciseCredit: number;
  calorieBudget: number;
  waterGlasses: number;
  waterGoal: number;
  supplementsTaken: Supplement[];
  supplementsPlanned: number;
  loggingStreak: number;
  score: number;
  missions: DailyMission[];
  hasActivity: boolean;
};

export type PersonalRecord = {
  key: 'score' | 'calories' | 'protein' | 'fat' | 'water' | 'exercise' | 'streak';
  label: string;
  value: number;
  unit: string;
  date: string;
};

type HistoryInput = {
  meals: LoggedMeal[];
  exercises: ExerciseEntry[];
  water: WaterEntry[];
  supplements: Supplement[];
  supplementChecks: SupplementCheck[];
  targets: FoodTotals;
  waterGoal: number;
  goal?: Goal;
};

function sumTotals(meals: LoggedMeal[]): FoodTotals {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.total.calories,
      protein_g: totals.protein_g + meal.total.protein_g,
      carbs_g: totals.carbs_g + meal.total.carbs_g,
      fat_g: totals.fat_g + meal.total.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

function previousDay(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  value.setDate(value.getDate() - 1);
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Logging streak as it stood on a historical date. */
export function loggingStreakOn(date: string, mealDays: ReadonlySet<string>): number {
  if (!mealDays.has(date)) return 0;
  let streak = 0;
  let cursor = date;
  while (mealDays.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}

function createdDay(supplement: Supplement): string {
  const date = new Date(supplement.createdAt);
  if (Number.isNaN(date.getTime())) return '0000-00-00';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Build one complete day from the user's durable source logs. */
export function dailyHistoryFor(date: string, input: HistoryInput): DailyHistory {
  const meals = input.meals.filter((meal) => meal.date === date);
  const exercises = input.exercises.filter((exercise) => exercise.date === date);
  const totals = sumTotals(meals);
  const caloriesBurned = exercises.reduce((sum, item) => sum + item.caloriesBurned, 0);
  const waterGlasses = input.water.find((entry) => entry.date === date)?.glasses ?? 0;
  const eligibleSupplements = input.supplements.filter((item) => createdDay(item) <= date);
  const checkedIds = new Set(
    input.supplementChecks
      .filter((check) => check.day === date)
      .map((check) => check.supplementId)
  );
  const supplementsTaken = eligibleSupplements.filter((item) => checkedIds.has(item.id));
  const mealDays = new Set(input.meals.map((meal) => meal.date));
  const loggingStreak = loggingStreakOn(date, mealDays);
  const calorieBudget = calorieBudgetForDay(input.targets.calories, caloriesBurned);
  const workoutMinutes = exercises.reduce((sum, item) => sum + Math.max(0, item.durationMinutes || 0), 0);
  const missions = buildDailyMissions({
    totals,
    targets: input.targets,
    calorieBudget,
    mealsLogged: meals.length,
    waterToday: waterGlasses,
    waterGoal: input.waterGoal,
    workoutMinutes,
    goal: input.goal,
  });
  const score = computeScore({
    totals,
    targets: input.targets,
    calorieBudget,
    mealsLogged: meals.length,
    waterToday: waterGlasses,
    waterGoal: input.waterGoal,
    streak: loggingStreak,
    workoutMinutes,
    goal: input.goal,
  }).value;

  return {
    date,
    meals,
    exercises,
    totals,
    caloriesBurned,
    exerciseCredit: creditedExerciseCalories(caloriesBurned),
    calorieBudget,
    waterGlasses,
    waterGoal: input.waterGoal,
    supplementsTaken,
    supplementsPlanned: eligibleSupplements.length,
    loggingStreak,
    score,
    missions,
    hasActivity:
      meals.length > 0 ||
      exercises.length > 0 ||
      waterGlasses > 0 ||
      supplementsTaken.length > 0,
  };
}

/** All days with at least one saved tracking event, newest first. */
export function buildDailyHistory(input: HistoryInput): DailyHistory[] {
  const dates = new Set<string>();
  input.meals.forEach((item) => dates.add(item.date));
  input.exercises.forEach((item) => dates.add(item.date));
  input.water.forEach((item) => dates.add(item.date));
  input.supplementChecks.forEach((item) => dates.add(item.day));
  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => dailyHistoryFor(date, input));
}

function best(
  days: DailyHistory[],
  key: PersonalRecord['key'],
  label: string,
  unit: string,
  value: (day: DailyHistory) => number
): PersonalRecord | null {
  if (!days.length) return null;
  const winner = days.reduce((current, day) => (value(day) > value(current) ? day : current));
  return { key, label, unit, value: Math.round(value(winner) * 10) / 10, date: winner.date };
}

export function personalRecords(days: DailyHistory[]): PersonalRecord[] {
  const tracked = days.filter((day) => day.hasActivity);
  return [
    best(tracked, 'score', 'Best Trak score', 'points', (day) => day.score),
    best(tracked, 'protein', 'Most protein', 'g', (day) => day.totals.protein_g),
    best(tracked, 'calories', 'Most calories logged', 'kcal', (day) => day.totals.calories),
    best(tracked, 'fat', 'Most fat logged', 'g', (day) => day.totals.fat_g),
    best(tracked, 'water', 'Most water', 'glasses', (day) => day.waterGlasses),
    best(tracked, 'exercise', 'Most exercise', 'kcal burned', (day) => day.caloriesBurned),
    best(tracked, 'streak', 'Longest logging streak', 'days', (day) => day.loggingStreak),
  ].filter((record): record is PersonalRecord => record !== null);
}

/** Compact, pre-computed background for Ask; no IDs, photos, notes, or item names. */
export function askHistoryContext(days: DailyHistory[], records: PersonalRecord[]): {
  recentDays: string;
  personalRecords: string;
} {
  const recentDays = days
    .filter((day) => day.hasActivity)
    .slice(0, 30)
    .map((day) => {
      const workoutMinutes = day.exercises.reduce(
        (sum, exercise) => sum + Math.max(0, exercise.durationMinutes || 0),
        0,
      );
      const focuses = [...new Set(day.exercises.flatMap((exercise) => exercise.workoutSplits ?? []))]
        .slice(0, 10)
        .map((focus) => focus.replace(/_/g, ' '));
      const muscleGroups = ['chest', 'legs', 'back', 'arms', 'shoulders', 'abs', 'glutes', 'other'] as const;
      const muscleSets = muscleGroups
        .map((group) => ({
          group,
          sets: day.exercises.reduce(
            (sum, exercise) => sum + Math.max(0, exercise.muscleSets?.[group] || 0),
            0,
          ),
        }))
        .filter((entry) => entry.sets > 0)
        .map((entry) => `${entry.group} ${entry.sets}`)
        .join(', ');
      return (
        `${day.date}: score ${day.score}/100; ${Math.round(day.totals.calories)}/${Math.round(day.calorieBudget)} kcal; ` +
        `${Math.round(day.totals.protein_g)}g protein, ${Math.round(day.totals.carbs_g)}g carbs, ${Math.round(day.totals.fat_g)}g fat; ` +
        `water ${day.waterGlasses}/${day.waterGoal}; supplements ${day.supplementsTaken.length}/${day.supplementsPlanned}` +
        (day.supplementsTaken.length
          ? ` (${day.supplementsTaken
              .slice(0, 8)
              .map((item) => item.name.trim().replace(/[\r\n\t]+/g, ' ').slice(0, 40))
              .join(', ')})`
          : '') +
        '; ' +
        `exercise ${workoutMinutes} min, ${Math.round(day.caloriesBurned)} kcal` +
        (focuses.length ? `; focus ${focuses.join(', ')}` : '') +
        (muscleSets ? `; completed sets ${muscleSets}` : '')
      );
    })
    .join('\n');
  const personalRecords = records
    .map((record) => `${record.label}: ${record.value} ${record.unit} on ${record.date}`)
    .join('\n');
  return { recentDays, personalRecords };
}
