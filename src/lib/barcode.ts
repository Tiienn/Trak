import { FoodAnalysis } from './types';

/** Nutrition for a packaged product, looked up from Open Food Facts. */
export type BarcodeProduct = {
  code: string;
  name: string;
  brand?: string;
  /** e.g. "per serving (30 g)" or "per 100 g" — what the numbers below describe. */
  perLabel: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const OFF_URL = 'https://world.openfoodfacts.org/api/v3.6/product';
const OFF_FIELDS = [
  'product_name',
  'brands',
  'serving_size',
  'serving_quantity',
  'nutriments.energy-kcal_100g',
  'nutriments.proteins_100g',
  'nutriments.carbohydrates_100g',
  'nutriments.fat_100g',
  'nutriments.energy-kcal_serving',
  'nutriments.proteins_serving',
  'nutriments.carbohydrates_serving',
  'nutriments.fat_serving',
].join(',');

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

/**
 * Look up a barcode in the free Open Food Facts database.
 * Returns null if the product isn't found; throws on network errors.
 */
export async function lookupBarcode(code: string): Promise<BarcodeProduct | null> {
  let res: Response;
  try {
    res = await fetch(
      `${OFF_URL}/${encodeURIComponent(code)}?product_type=food&cc=mu&lc=en&fields=${encodeURIComponent(OFF_FIELDS)}`,
      { headers: { 'User-Agent': 'Trak/1.1.6 (https://trak.fit)' } }
    );
  } catch {
    throw new Error('Could not reach the food database. Check your connection and try again.');
  }
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error('Could not look up that barcode. Please try again.');
  }

  const json = await res.json();
  if (json?.status !== 'success' || json?.result?.id !== 'product_found' || !json?.product) {
    return null; // not in the database
  }

  const p = json.product;
  const inputSets: any[] = Array.isArray(p?.nutrition?.input_sets)
    ? p.nutrition.input_sets
    : [];
  const preferredSet = (per: 'serving' | '100g') =>
    inputSets.find(
      (set) =>
        set?.per === per &&
        (set?.source === 'manufacturer' || set?.source === 'packaging') &&
        set?.nutrients?.['energy-kcal']?.value != null
    );
  const servingSet = preferredSet('serving');
  const per100Set =
    preferredSet('100g') ??
    (p?.nutrition?.aggregated_set?.per === '100g' ? p.nutrition.aggregated_set : undefined);
  const chosen = servingSet ?? per100Set;
  if (!chosen) return null;

  const servingDescription =
    p.serving_size ??
    (servingSet?.per_quantity
      ? `${servingSet.per_quantity} ${servingSet.per_unit ?? 'g'}`
      : '');
  const perLabel = servingSet
    ? `per serving${servingDescription ? ` (${servingDescription})` : ''}`
    : 'per 100 g';
  const pick = (base: string) => num(chosen?.nutrients?.[base]?.value);
  const calories = pick('energy-kcal');

  return {
    code,
    name: String(p.product_name || 'Unknown product'),
    brand: p.brands ? String(p.brands).split(',')[0].trim() : undefined,
    perLabel,
    calories: Math.round(calories),
    protein_g: Math.round(pick('proteins')),
    carbs_g: Math.round(pick('carbohydrates')),
    fat_g: Math.round(pick('fat')),
  };
}

/** Convert a looked-up product (× servings) into a loggable meal. */
export function barcodeToAnalysis(p: BarcodeProduct, servings: number): FoodAnalysis {
  const total = {
    calories: Math.round(p.calories * servings),
    protein_g: Math.round(p.protein_g * servings),
    carbs_g: Math.round(p.carbs_g * servings),
    fat_g: Math.round(p.fat_g * servings),
  };
  return {
    isFood: true,
    title: p.brand ? `${p.name} · ${p.brand}` : p.name,
    items: [
      {
        name: p.name,
        quantity: `${servings} × ${p.perLabel}`,
        ...total,
        nutritionSource: 'open_food_facts',
        sourceId: p.code,
        sourceLabel: p.brand ? `${p.name} · ${p.brand}` : p.name,
      },
    ],
    total,
    confidence: 0.95,
    notes: `From barcode ${p.code}`,
    analysisMeta: {
      model: 'none',
      promptVersion: 'none',
      pipelineVersion: 'open-food-facts-v3.6',
      inputSource: 'barcode',
    },
  };
}
