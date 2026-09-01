import type { FoodAnalysis, FoodItem, FoodTotals } from './types';

const nutrients = ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const;
const round = (value: number, precision = 10) => Math.round(value * precision) / precision;

/** Keep an empty/unfinished input as a draft, never silently restore it to 1. */
export function parseServingAmount(value: string): number | null {
  const text = value.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) && amount > 0 && amount <= 10000 ? amount : null;
}

type Serving = { amount: number; unit: string };

export function parseServingQuantity(quantity: string): Serving | null {
  const text = quantity.trim().replace(/^(?:about\s+|approximately\s+|approx\.?\s*|~\s*)/i, '')
    .replace(/(\d)\s*([½¼¾])/g, '$1 $2')
    .replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4');
  const match = text.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[.,]\d+)\s*(.*)$/);
  if (!match) return null;
  const parts = match[1].split(/\s+/);
  const last = parts.pop()!;
  const fraction = last.split('/').map(Number);
  const amount = (parts.length ? Number(parts[0]) : 0) +
    (fraction.length === 2 ? fraction[0] / fraction[1] : Number(last.replace(',', '.')));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) return null;
  // A range is not a reliable baseline. Numeric parenthetical annotations are
  // omitted rather than leaving stale weights/counts beside a resized portion.
  if (/^[-–/\d]/.test(match[2])) return null;
  const unit = match[2].replace(/\([^)]*\d[^)]*\)/g, '').trim() || 'serving';
  return { amount, unit };
}

export function foodServing(item: FoodItem): Serving {
  return parseServingQuantity(item.quantity) ?? {
    amount: 1,
    unit: item.quantity.trim() ? `× ${item.quantity.trim()}` : 'serving',
  };
}

export function formatServingQuantity(amount: number, unit: string): string {
  const label = unit.trim().replace(/\b(slices?|pieces?|servings?|cups?|bowls?|portions?|scoops?|bottles?|cans?)\b/gi,
    (word) => `${word.replace(/s$/i, '')}${amount === 1 ? '' : 's'}`);
  return `${amount.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 9 })} ${label || (amount === 1 ? 'serving' : 'servings')}`;
}

/** Always scale from the original item for an edit, so typing 4 → 1 is reversible. */
export function scaleFoodServing(item: FoodItem, amount: number): FoodItem {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) throw new Error('Enter a serving amount greater than 0.');
  const serving = foodServing(item);
  if (amount === serving.amount) return item;
  const factor = amount / serving.amount;
  return {
    ...item,
    quantity: formatServingQuantity(amount, serving.unit),
    ...(item.grams == null ? {} : { grams: round(item.grams * factor) }),
    calories: round(item.calories * factor, 1),
    protein_g: round(item.protein_g * factor),
    carbs_g: round(item.carbs_g * factor),
    fat_g: round(item.fat_g * factor),
  };
}

function comparableUnit(unit: string): string {
  return formatServingQuantity(1, unit).slice(2).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** A quantity-only correction needs arithmetic, not a new AI estimate. */
export function correctFoodServing(
  analysis: FoodAnalysis, index: number, name: string, quantity: string,
): FoodAnalysis | null {
  const item = analysis.items[index];
  const next = parseServingQuantity(quantity);
  if (!item || !next || name.trim().toLowerCase() !== item.name.trim().toLowerCase()) return null;
  if (comparableUnit(foodServing(item).unit) !== comparableUnit(next.unit)) return null;
  const resized = scaleFoodServing(item, next.amount);
  if (resized === item) return analysis;
  const items = analysis.items.map((old, i) => i === index ? resized : old);
  return {
    ...analysis,
    items,
    total: servingAdjustedTotals(analysis.total, item, resized),
    notes: `Serving updated to ${resized.quantity} of ${item.name}. Nutrition was scaled from the original estimate; other foods are unchanged.`,
  };
}

/** Preserve manual total corrections while adjusting just the resized food. */
export function servingAdjustedTotals(total: FoodTotals, before: FoodItem, after: FoodItem): FoodTotals {
  return Object.fromEntries(nutrients.map((key) => [
    key, round(Math.max(0, total[key] + after[key] - before[key]), key === 'calories' ? 1 : 10),
  ])) as FoodTotals;
}

/** Reconcile manual nutrition edits without scaling an already-resized serving twice. */
export function reconcileFoodItems(items: FoodItem[], total: FoodTotals): FoodItem[] {
  if (!items.length) return items;
  const next = items.map((item) => ({ ...item }));
  for (const key of nutrients) {
    const precision = key === 'calories' ? 1 : 10;
    const sum = items.reduce((acc, item) => acc + item[key], 0);
    if (Math.abs(sum - total[key]) < 0.000001) continue;
    const target = Math.round(total[key] * precision);
    const shares = items.map((item) => target * (sum > 0 ? item[key] / sum : 1 / items.length));
    const allocations = shares.map(Math.floor);
    let remaining = target - allocations.reduce((acc, n) => acc + n, 0);
    const order = shares.map((share, index) => ({ index, remainder: share - allocations[index] }))
      .sort((a, b) => b.remainder - a.remainder);
    for (const { index } of order) {
      if (remaining-- <= 0) break;
      allocations[index] += 1;
    }
    next.forEach((item, index) => { item[key] = allocations[index] / precision; });
  }
  return next;
}

/** Existing meal columns store whole kcal/grams; JSON item details retain precision. */
export function prepareMealNutrition(items: FoodItem[], total: FoodTotals) {
  const rounded = Object.fromEntries(nutrients.map((key) => [key, Math.round(total[key])])) as FoodTotals;
  for (const key of nutrients) {
    if (!Number.isFinite(rounded[key]) || rounded[key] < 0 || rounded[key] > 2147483647) {
      throw new Error('Please check the serving amount and nutrition values.');
    }
  }
  return { total: rounded, items: reconcileFoodItems(items, rounded) };
}
