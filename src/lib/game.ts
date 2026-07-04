import AsyncStorage from '@react-native-async-storage/async-storage';

import { dayKey } from './store';

/**
 * The calorie target challenge — a built-in game that trains calorie
 * estimation. All nutrition data is local (no AI calls): instant, free,
 * offline, and consistent, which a scoring game needs.
 */

export type Ingredient = {
  id: string;
  name: string;
  emoji: string;
  /** Human portion, e.g. "1 cup cooked". */
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type IngredientCategory = {
  key: string;
  label: string;
  emoji: string;
  items: Ingredient[];
};

export const CATEGORIES: IngredientCategory[] = [
  {
    key: 'carbs',
    label: 'Carbs',
    emoji: '🍚',
    items: [
      { id: 'rice', name: 'White rice', emoji: '🍚', portion: '1 cup cooked', calories: 205, protein_g: 4, carbs_g: 45, fat_g: 0 },
      { id: 'fried-rice', name: 'Fried rice', emoji: '🍛', portion: '1 cup', calories: 240, protein_g: 6, carbs_g: 34, fat_g: 9 },
      { id: 'noodles', name: 'Egg noodles', emoji: '🍜', portion: '1 cup cooked', calories: 220, protein_g: 7, carbs_g: 40, fat_g: 3 },
      { id: 'instant-noodles', name: 'Instant noodles', emoji: '🥡', portion: '1 pack', calories: 380, protein_g: 8, carbs_g: 54, fat_g: 14 },
      { id: 'bread', name: 'White bread', emoji: '🍞', portion: '1 slice', calories: 80, protein_g: 3, carbs_g: 15, fat_g: 1 },
      { id: 'pasta', name: 'Pasta', emoji: '🍝', portion: '1 cup cooked', calories: 220, protein_g: 8, carbs_g: 43, fat_g: 1 },
      { id: 'potato', name: 'Potato', emoji: '🥔', portion: '1 medium', calories: 160, protein_g: 4, carbs_g: 37, fat_g: 0 },
      { id: 'sweet-potato', name: 'Sweet potato', emoji: '🍠', portion: '1 medium', calories: 110, protein_g: 2, carbs_g: 26, fat_g: 0 },
      { id: 'tortilla', name: 'Flour tortilla', emoji: '🫓', portion: '1 large', calories: 140, protein_g: 4, carbs_g: 24, fat_g: 3 },
      { id: 'oats', name: 'Oatmeal', emoji: '🥣', portion: '1 cup cooked', calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3 },
      { id: 'baguette', name: 'Baguette', emoji: '🥖', portion: '1/3 loaf', calories: 180, protein_g: 6, carbs_g: 36, fat_g: 1 },
      { id: 'fries', name: 'French fries', emoji: '🍟', portion: '1 medium', calories: 340, protein_g: 4, carbs_g: 44, fat_g: 16 },
    ],
  },
  {
    key: 'protein',
    label: 'Protein',
    emoji: '🍗',
    items: [
      { id: 'chicken-breast', name: 'Chicken breast', emoji: '🐔', portion: '150 g grilled', calories: 250, protein_g: 46, carbs_g: 0, fat_g: 5 },
      { id: 'chicken-thigh', name: 'Chicken thigh', emoji: '🍗', portion: '150 g roasted', calories: 320, protein_g: 38, carbs_g: 0, fat_g: 18 },
      { id: 'steak', name: 'Beef steak', emoji: '🥩', portion: '150 g', calories: 330, protein_g: 42, carbs_g: 0, fat_g: 18 },
      { id: 'ground-beef', name: 'Ground beef', emoji: '🍖', portion: '100 g cooked', calories: 250, protein_g: 26, carbs_g: 0, fat_g: 16 },
      { id: 'pork-chop', name: 'Pork chop', emoji: '🐖', portion: '150 g', calories: 290, protein_g: 39, carbs_g: 0, fat_g: 14 },
      { id: 'bacon', name: 'Bacon', emoji: '🥓', portion: '3 strips', calories: 130, protein_g: 9, carbs_g: 0, fat_g: 10 },
      { id: 'salmon', name: 'Salmon', emoji: '🐟', portion: '150 g', calories: 310, protein_g: 34, carbs_g: 0, fat_g: 19 },
      { id: 'white-fish', name: 'White fish', emoji: '🐠', portion: '150 g', calories: 150, protein_g: 32, carbs_g: 0, fat_g: 2 },
      { id: 'shrimp', name: 'Shrimp', emoji: '🦐', portion: '100 g', calories: 100, protein_g: 20, carbs_g: 1, fat_g: 1 },
      { id: 'tuna', name: 'Canned tuna', emoji: '🥫', portion: '1 can', calories: 120, protein_g: 26, carbs_g: 0, fat_g: 1 },
      { id: 'eggs', name: 'Eggs', emoji: '🥚', portion: '2 large', calories: 140, protein_g: 12, carbs_g: 1, fat_g: 10 },
      { id: 'tofu', name: 'Tofu', emoji: '🍲', portion: '150 g firm', calories: 110, protein_g: 12, carbs_g: 3, fat_g: 6 },
    ],
  },
  {
    key: 'veggies',
    label: 'Veggies',
    emoji: '🥦',
    items: [
      { id: 'broccoli', name: 'Broccoli', emoji: '🥦', portion: '1 cup', calories: 55, protein_g: 4, carbs_g: 11, fat_g: 0 },
      { id: 'salad', name: 'Side salad', emoji: '🥗', portion: '1 bowl', calories: 35, protein_g: 2, carbs_g: 7, fat_g: 0 },
      { id: 'spinach', name: 'Spinach', emoji: '🥬', portion: '1 cup cooked', calories: 40, protein_g: 5, carbs_g: 7, fat_g: 0 },
      { id: 'carrot', name: 'Carrot', emoji: '🥕', portion: '1 medium', calories: 25, protein_g: 1, carbs_g: 6, fat_g: 0 },
      { id: 'corn', name: 'Corn', emoji: '🌽', portion: '1 cup', calories: 130, protein_g: 5, carbs_g: 29, fat_g: 2 },
      { id: 'mushrooms', name: 'Mushrooms', emoji: '🍄', portion: '1 cup', calories: 20, protein_g: 3, carbs_g: 3, fat_g: 0 },
      { id: 'tomato', name: 'Tomato', emoji: '🍅', portion: '1 medium', calories: 22, protein_g: 1, carbs_g: 5, fat_g: 0 },
    ],
  },
  {
    key: 'fruits',
    label: 'Fruits',
    emoji: '🍌',
    items: [
      { id: 'banana', name: 'Banana', emoji: '🍌', portion: '1 medium', calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0 },
      { id: 'apple', name: 'Apple', emoji: '🍎', portion: '1 medium', calories: 95, protein_g: 0, carbs_g: 25, fat_g: 0 },
      { id: 'orange', name: 'Orange', emoji: '🍊', portion: '1 medium', calories: 60, protein_g: 1, carbs_g: 15, fat_g: 0 },
      { id: 'mango', name: 'Mango', emoji: '🥭', portion: '1 cup', calories: 100, protein_g: 1, carbs_g: 25, fat_g: 0 },
      { id: 'grapes', name: 'Grapes', emoji: '🍇', portion: '1 cup', calories: 60, protein_g: 1, carbs_g: 16, fat_g: 0 },
      { id: 'berries', name: 'Blueberries', emoji: '🫐', portion: '1 cup', calories: 85, protein_g: 1, carbs_g: 21, fat_g: 0 },
      { id: 'avocado', name: 'Avocado', emoji: '🥑', portion: '1/2 fruit', calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15 },
    ],
  },
  {
    key: 'dairy',
    label: 'Dairy',
    emoji: '🧀',
    items: [
      { id: 'milk', name: 'Milk', emoji: '🥛', portion: '1 glass', calories: 120, protein_g: 8, carbs_g: 12, fat_g: 5 },
      { id: 'greek-yogurt', name: 'Greek yogurt', emoji: '🍶', portion: '1 cup nonfat', calories: 130, protein_g: 23, carbs_g: 9, fat_g: 0 },
      { id: 'cheese', name: 'Cheese', emoji: '🧀', portion: '1 slice', calories: 110, protein_g: 7, carbs_g: 0, fat_g: 9 },
    ],
  },
  {
    key: 'fats',
    label: 'Fats & sauces',
    emoji: '🫒',
    items: [
      { id: 'olive-oil', name: 'Olive oil', emoji: '🫒', portion: '1 tbsp', calories: 120, protein_g: 0, carbs_g: 0, fat_g: 14 },
      { id: 'butter', name: 'Butter', emoji: '🧈', portion: '1 tbsp', calories: 100, protein_g: 0, carbs_g: 0, fat_g: 11 },
      { id: 'mayo', name: 'Mayonnaise', emoji: '🫙', portion: '1 tbsp', calories: 90, protein_g: 0, carbs_g: 0, fat_g: 10 },
      { id: 'peanut-butter', name: 'Peanut butter', emoji: '🥜', portion: '1 tbsp', calories: 95, protein_g: 4, carbs_g: 3, fat_g: 8 },
      { id: 'ketchup', name: 'Ketchup', emoji: '🥄', portion: '1 tbsp', calories: 20, protein_g: 0, carbs_g: 5, fat_g: 0 },
      { id: 'soy-sauce', name: 'Soy sauce', emoji: '🍾', portion: '1 tbsp', calories: 10, protein_g: 1, carbs_g: 1, fat_g: 0 },
      { id: 'honey', name: 'Honey', emoji: '🍯', portion: '1 tbsp', calories: 65, protein_g: 0, carbs_g: 17, fat_g: 0 },
    ],
  },
  {
    key: 'drinks',
    label: 'Drinks',
    emoji: '🥤',
    items: [
      { id: 'cola', name: 'Cola', emoji: '🥤', portion: '1 can', calories: 140, protein_g: 0, carbs_g: 39, fat_g: 0 },
      { id: 'orange-juice', name: 'Orange juice', emoji: '🧃', portion: '1 glass', calories: 110, protein_g: 2, carbs_g: 26, fat_g: 0 },
      { id: 'latte', name: 'Latte', emoji: '☕', portion: '1 cup', calories: 120, protein_g: 6, carbs_g: 10, fat_g: 6 },
      { id: 'beer', name: 'Beer', emoji: '🍺', portion: '1 pint', calories: 150, protein_g: 2, carbs_g: 13, fat_g: 0 },
      { id: 'boba', name: 'Bubble tea', emoji: '🧋', portion: '1 medium', calories: 350, protein_g: 4, carbs_g: 54, fat_g: 12 },
      { id: 'protein-shake', name: 'Protein shake', emoji: '🫗', portion: '1 shake', calories: 160, protein_g: 25, carbs_g: 9, fat_g: 3 },
    ],
  },
  {
    key: 'snacks',
    label: 'Fast food & snacks',
    emoji: '🍔',
    items: [
      { id: 'burger', name: 'Big burger', emoji: '🍔', portion: '1 burger', calories: 560, protein_g: 26, carbs_g: 45, fat_g: 30 },
      { id: 'pizza', name: 'Pizza', emoji: '🍕', portion: '1 slice', calories: 285, protein_g: 12, carbs_g: 36, fat_g: 10 },
      { id: 'fried-chicken', name: 'Fried chicken', emoji: '🍗', portion: '1 piece', calories: 320, protein_g: 19, carbs_g: 12, fat_g: 21 },
      { id: 'hot-dog', name: 'Hot dog', emoji: '🌭', portion: '1', calories: 300, protein_g: 10, carbs_g: 24, fat_g: 18 },
      { id: 'spring-roll', name: 'Spring roll', emoji: '🥟', portion: '1 roll', calories: 110, protein_g: 2, carbs_g: 12, fat_g: 6 },
      { id: 'donut', name: 'Donut', emoji: '🍩', portion: '1', calories: 250, protein_g: 3, carbs_g: 31, fat_g: 12 },
      { id: 'chocolate', name: 'Chocolate', emoji: '🍫', portion: '1 bar', calories: 230, protein_g: 3, carbs_g: 26, fat_g: 13 },
      { id: 'cookie', name: 'Cookie', emoji: '🍪', portion: '1 large', calories: 160, protein_g: 2, carbs_g: 21, fat_g: 8 },
      { id: 'ice-cream', name: 'Ice cream', emoji: '🍨', portion: '1 scoop', calories: 140, protein_g: 2, carbs_g: 17, fat_g: 7 },
    ],
  },
];

/** Flat id → ingredient lookup. */
export const INGREDIENT_BY_ID: Record<string, Ingredient> = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.items).map((i) => [i.id, i])
);

export type Challenge = {
  targetCalories: number;
  minProtein: number;
};

const CAL_TARGETS = [450, 500, 550, 600, 650, 700, 750, 800];
const PROTEIN_MINS = [25, 30, 35, 40, 45];

/** Tiny deterministic PRNG so the daily challenge is the same all day. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Today's challenge — seeded by the calendar day, same for everyone. */
export function dailyChallenge(day: string = dayKey()): Challenge {
  const rand = mulberry32(parseInt(day.replace(/-/g, ''), 10));
  return {
    targetCalories: CAL_TARGETS[Math.floor(rand() * CAL_TARGETS.length)],
    minProtein: PROTEIN_MINS[Math.floor(rand() * PROTEIN_MINS.length)],
  };
}

/** A fresh random challenge for free play. */
export function randomChallenge(): Challenge {
  return {
    targetCalories: CAL_TARGETS[Math.floor(Math.random() * CAL_TARGETS.length)],
    minProtein: PROTEIN_MINS[Math.floor(Math.random() * PROTEIN_MINS.length)],
  };
}

export type PlateTotals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function plateTotals(plate: Record<string, number>): PlateTotals {
  const t: PlateTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const [id, qty] of Object.entries(plate)) {
    const ing = INGREDIENT_BY_ID[id];
    if (!ing || qty <= 0) continue;
    t.calories += ing.calories * qty;
    t.protein_g += ing.protein_g * qty;
    t.carbs_g += ing.carbs_g * qty;
    t.fat_g += ing.fat_g * qty;
  }
  return t;
}

export type RoundResult = {
  stars: 0 | 1 | 2 | 3;
  diffPct: number;
  proteinMet: boolean;
  headline: string;
};

export function scoreRound(totals: PlateTotals, challenge: Challenge): RoundResult {
  const diffPct = Math.round(
    (Math.abs(totals.calories - challenge.targetCalories) / challenge.targetCalories) * 100
  );
  const proteinMet = totals.protein_g >= challenge.minProtein;
  let stars: RoundResult['stars'] = 0;
  if (diffPct <= 5 && proteinMet) stars = 3;
  else if (diffPct <= 12 && proteinMet) stars = 2;
  else if (diffPct <= 20) stars = 1;
  const headline =
    stars === 3
      ? 'Nailed it! 🎯'
      : stars === 2
        ? 'So close!'
        : stars === 1
          ? 'Not bad!'
          : totals.calories > challenge.targetCalories
            ? 'Whoa, that plate is heavy!'
            : 'That plate is a bit light.';
  return { stars, diffPct, proteinMet, headline };
}

/** Lifetime game stats, device-local. */
export type GameStats = {
  played: number;
  threeStar: number;
  /** Consecutive days the daily challenge was completed. */
  dailyStreak: number;
  lastDailyDay: string | null;
  /** Best (lowest) calorie miss in percent. */
  bestDiffPct: number | null;
  /** Higher-or-Lower: best run and total rounds answered. */
  hlBest: number;
  hlRounds: number;
  /** Scan guesses: how many made, and the summed |error %| for an average. */
  guessCount: number;
  guessErrSum: number;
};

const STATS_KEY = 'trak.game.v1';

export const EMPTY_STATS: GameStats = {
  played: 0,
  threeStar: 0,
  dailyStreak: 0,
  lastDailyDay: null,
  bestDiffPct: null,
  hlBest: 0,
  hlRounds: 0,
  guessCount: 0,
  guessErrSum: 0,
};

export async function loadGameStats(): Promise<GameStats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) return { ...EMPTY_STATS, ...JSON.parse(raw) };
  } catch {
    // Fall through to fresh stats.
  }
  return EMPTY_STATS;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Record a finished round and return the updated stats. */
export async function recordRound(
  result: RoundResult,
  isDaily: boolean,
  stats: GameStats
): Promise<GameStats> {
  const today = dayKey();
  const next: GameStats = {
    ...stats,
    played: stats.played + 1,
    threeStar: stats.threeStar + (result.stars === 3 ? 1 : 0),
    bestDiffPct:
      stats.bestDiffPct === null ? result.diffPct : Math.min(stats.bestDiffPct, result.diffPct),
  };
  // The daily streak counts the first completion of each day's challenge.
  if (isDaily && stats.lastDailyDay !== today) {
    next.dailyStreak = stats.lastDailyDay === yesterdayKey() ? stats.dailyStreak + 1 : 1;
    next.lastDailyDay = today;
  }
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
  } catch {
    // Non-critical; stats just won't persist.
  }
  return next;
}

async function saveStats(next: GameStats): Promise<GameStats> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(next));
  } catch {
    // Non-critical; stats just won't persist.
  }
  return next;
}

/** Record a finished Higher-or-Lower run. */
export async function recordHigherLower(run: number, stats: GameStats): Promise<GameStats> {
  return saveStats({
    ...stats,
    hlRounds: stats.hlRounds + run,
    hlBest: Math.max(stats.hlBest, run),
  });
}

/** Record a guess-before-you-scan miss (absolute percent error). */
export async function recordScanGuess(errPct: number, stats: GameStats): Promise<GameStats> {
  return saveStats({
    ...stats,
    guessCount: stats.guessCount + 1,
    guessErrSum: stats.guessErrSum + Math.max(0, Math.round(errPct)),
  });
}

/**
 * A random ingredient for Higher-or-Lower. When `differentFrom` is given the
 * result has a different id AND different calories (so there's always a
 * right answer).
 */
export function randomFood(differentFrom?: Ingredient): Ingredient {
  const all = CATEGORIES.flatMap((c) => c.items);
  for (;;) {
    const i = all[Math.floor(Math.random() * all.length)];
    if (!differentFrom) return i;
    if (i.id !== differentFrom.id && i.calories !== differentFrom.calories) return i;
  }
}
