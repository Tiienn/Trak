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

const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product';

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
      `${OFF_URL}/${encodeURIComponent(code)}?fields=product_name,brands,serving_size,nutriments`,
      { headers: { 'User-Agent': 'Trak/1.0 (personal food tracker)' } }
    );
  } catch {
    throw new Error('Could not reach the food database. Check your connection and try again.');
  }
  if (!res.ok) {
    throw new Error('Could not look up that barcode. Please try again.');
  }

  const json = await res.json();
  if (json?.status !== 1 || !json?.product) {
    return null; // not in the database
  }

  const p = json.product;
  const n = p.nutriments ?? {};
  const hasServing = n['energy-kcal_serving'] != null;

  const perLabel = hasServing
    ? `per serving${p.serving_size ? ` (${p.serving_size})` : ''}`
    : 'per 100 g';
  const pick = (base: string) => (hasServing ? num(n[`${base}_serving`]) : num(n[`${base}_100g`]));
  const calories = hasServing ? num(n['energy-kcal_serving']) : num(n['energy-kcal_100g']);

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
    items: [{ name: p.name, quantity: `${servings} × ${p.perLabel}`, ...total }],
    total,
    confidence: 0.95,
    notes: `From barcode ${p.code}`,
  };
}
