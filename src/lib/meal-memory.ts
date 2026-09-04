import type { LoggedMeal } from './types';

export type MealMemoryHint = {
  title: string;
  textCount: number;
  photoCount: number;
};

export type DailyMealSuggestion = {
  label: string;
  prompt: string;
  logCount?: number;
};

const DEFAULT_DAILY_MEALS = [
  'Cappuccino',
  'Eggs and toast',
  'Chicken rice bowl',
  'Greek yogurt and berries',
  'Big Mac, fries and Coke Zero',
];

type MemoryEntry = MealMemoryHint & {
  key: string;
  lastLoggedAt: number;
};

function titleKey(title: string): string {
  return title
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sourceFor(meal: LoggedMeal): 'text' | 'photo' | 'other' {
  const source = meal.analysisMeta?.inputSource;
  if (source === 'text' || source === 'photo') return source;
  if (source === 'barcode' || source === 'quick_log' || source === 'manual') return 'other';
  if (
    meal.analysisMeta?.pipelineVersion?.startsWith('open-food-facts') ||
    meal.notes?.startsWith('From barcode ')
  ) {
    return 'other';
  }

  // Meals created before source tagging can still seed memory. A persisted
  // photo is a reliable scan signal; legacy non-photo meals are the best
  // available approximation for text logs.
  return meal.photoUri ? 'photo' : 'text';
}

function aggregateMealMemory(meals: LoggedMeal[]): MemoryEntry[] {
  const byTitle = new Map<string, MemoryEntry>();

  for (const meal of meals) {
    const title = meal.title.trim();
    const key = titleKey(title);
    const source = sourceFor(meal);
    if (!key || source === 'other') continue;

    const current = byTitle.get(key) ?? {
      key,
      title,
      textCount: 0,
      photoCount: 0,
      lastLoggedAt: 0,
    };
    if (source === 'text') current.textCount += 1;
    if (source === 'photo') current.photoCount += 1;
    if (meal.createdAt >= current.lastLoggedAt) {
      current.title = title;
      current.lastLoggedAt = meal.createdAt;
    }
    byTitle.set(key, current);
  }

  return [...byTitle.values()];
}

/** Five text-log shortcuts, with the most frequently logged meals first. */
export function dailyMealSuggestions(
  meals: LoggedMeal[],
  limit = 5,
): DailyMealSuggestion[] {
  const learned = aggregateMealMemory(meals)
    .filter((entry) => entry.textCount > 0)
    .sort(
      (a, b) =>
        b.textCount - a.textCount ||
        b.photoCount - a.photoCount ||
        b.lastLoggedAt - a.lastLoggedAt,
    )
    .map((entry) => ({
      label: entry.title,
      prompt: entry.title,
      logCount: entry.textCount,
    }));

  const used = new Set(learned.map((item) => titleKey(item.label)));
  const fallbacks = DEFAULT_DAILY_MEALS.filter((label) => !used.has(titleKey(label))).map(
    (label) => ({ label, prompt: label }),
  );

  return [...learned, ...fallbacks].slice(0, limit);
}

/**
 * A small, non-sensitive prior for photo recognition. Repeated photo matches
 * rank above text-only matches, while both can help disambiguate similar food.
 */
export function photoMealMemory(meals: LoggedMeal[], limit = 8): MealMemoryHint[] {
  return aggregateMealMemory(meals)
    .sort(
      (a, b) =>
        b.photoCount * 2 + b.textCount - (a.photoCount * 2 + a.textCount) ||
        b.photoCount - a.photoCount ||
        b.lastLoggedAt - a.lastLoggedAt,
    )
    .slice(0, limit)
    .map(({ title, textCount, photoCount }) => ({ title, textCount, photoCount }));
}
