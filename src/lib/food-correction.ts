import type { FoodAnalysis, FoodItem, FoodTotals } from './types';

function sumItems(items: FoodItem[]): FoodTotals {
  return items.reduce<FoodTotals>(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein_g: total.protein_g + item.protein_g,
      carbs_g: total.carbs_g + item.carbs_g,
      fat_g: total.fat_g + item.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

function sourceSummary(items: FoodItem[]): string {
  const sources = new Set(items.map((item) => item.nutritionSource).filter(Boolean));
  const labels: string[] = [];
  if (sources.has('usda_fdc')) labels.push('USDA FoodData Central');
  if (sources.has('open_food_facts')) labels.push('Open Food Facts');
  if (sources.has('web')) labels.push('web nutrition references');
  if (sources.has('model')) labels.push('an AI estimate');
  return labels.length ? labels.join(' and ') : 'the nutrition database';
}

function correctedTitle(title: string, oldItem: FoodItem, replacements: FoodItem[]): string {
  const oldLead = oldItem.name.split(',')[0]?.trim();
  const newLead = replacements[0]?.name.split(',')[0]?.trim();
  if (!oldLead || !newLead) return title;

  // Meal titles are often shorter than item labels ("Chicken with rice" vs
  // "chicken breast, cooked"), so try the full label and then its lead word.
  const candidates = [oldLead, oldLead.split(/\s+/)[0]].filter(
    (value, index, all): value is string => Boolean(value) && all.indexOf(value) === index,
  );
  for (const candidate of candidates) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(`\\b${escaped}\\b`, 'i');
    if (matcher.test(title)) return title.replace(matcher, newLead);
  }
  return title;
}

/** Replace one detected scan item and rebuild every derived meal value. */
export function replaceFoodItem(
  analysis: FoodAnalysis,
  index: number,
  replacements: FoodItem[],
): FoodAnalysis {
  if (index < 0 || index >= analysis.items.length || replacements.length === 0) return analysis;

  const oldItem = analysis.items[index];
  const items = [
    ...analysis.items.slice(0, index),
    ...replacements,
    ...analysis.items.slice(index + 1),
  ];
  const replacementNames = replacements.map((item) => item.name).join(', ');

  return {
    ...analysis,
    title: correctedTitle(analysis.title, oldItem, replacements),
    items,
    total: sumItems(items),
    notes: `Updated ${oldItem.name} to ${replacementNames} from your correction. Nutrition was refreshed using ${sourceSummary(replacements)}; unchanged foods keep their original scan estimates.`,
  };
}

/** Remove one mistaken scan item and rebuild the meal nutrition immediately. */
export function removeFoodItem(analysis: FoodAnalysis, index: number): FoodAnalysis {
  if (index < 0 || index >= analysis.items.length || analysis.items.length <= 1) return analysis;
  const removed = analysis.items[index];
  const items = analysis.items.filter((_, itemIndex) => itemIndex !== index);
  return {
    ...analysis,
    items,
    total: sumItems(items),
    notes: `Removed ${removed.name} from the scan. Nutrition now reflects the remaining foods.`,
  };
}

/** Make the correction unambiguously a food-log request for Trak's nutrition pipeline. */
export function foodCorrectionPrompt(name: string, quantity: string, fallbackGrams?: number): string {
  const serving = quantity.trim() || (fallbackGrams ? `${fallbackGrams} g` : '1 serving');
  return `I ate ${serving} of ${name.trim()}`;
}
