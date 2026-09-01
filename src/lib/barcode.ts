import type { FoodAnalysis } from './types';

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
  nutritionNote?: string;
};

const OFF_URL = 'https://world.openfoodfacts.org/api/v3.6/product';
const OFF_FIELDS = [
  'product_name',
  'brands',
  'serving_size',
  'nutrition',
].join(',');

export const BARCODE_TIMEOUT_MS = 12_000;
type Macro = FoodAnalysis['total'];
type Unit = 'g' | 'ml';
const MACROS = ['calories', 'protein_g', 'carbs_g', 'fat_g'] as const;
const TRUSTED_SOURCES = new Set(['manufacturer', 'packaging']);

function object(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/** Missing, negative and malformed values are unknown, never zero. */
function num(value: unknown): number | null {
  if (typeof value === 'string') {
    if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
    value = Number(value.trim().replace(',', '.'));
  }
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function readMacros(set: Record<string, any>, aggregated = false): Macro | null {
  const nutrients = object(set.nutrients);
  const read = (key: string, unit: string) => {
    const entry = object(nutrients[key]);
    if (entry.unit != null && entry.unit !== unit) return null;
    if (aggregated && !TRUSTED_SOURCES.has(entry.source)) return null;
    return num(entry.value);
  };
  const kcal = read('energy-kcal', 'kcal');
  const kj = read('energy-kj', 'kJ') ?? read('energy', 'kJ');
  const calories = kcal ?? (kj === null ? null : kj / 4.184);
  const protein = read('proteins', 'g');
  const carbs = read('carbohydrates', 'g');
  const fat = read('fat', 'g');
  if (calories === null || protein === null || carbs === null || fat === null) return null;
  return { calories, protein_g: protein, carbs_g: carbs, fat_g: fat };
}

function servingMeasure(set: Record<string, any>, product: Record<string, any>) {
  const quantity = num(set.per_quantity);
  if (quantity && (set.per_unit === 'g' || set.per_unit === 'ml')) {
    return { quantity, unit: set.per_unit as Unit };
  }
  // Do not infer a unit from serving_quantity alone, or convert ml to g.
  const matches = String(product.serving_size ?? '').matchAll(/(\d+(?:[.,]\d+)?)\s*(ml|g)\b/gi);
  const sizes = Array.from(matches);
  if (sizes.length !== 1) return null;
  const size = num(sizes[0][1]);
  return size ? { quantity: size, unit: sizes[0][2].toLowerCase() as Unit } : null;
}

function scale(macro: Macro, factor: number): Macro {
  return {
    calories: macro.calories * factor,
    protein_g: macro.protein_g * factor,
    carbs_g: macro.carbs_g * factor,
    fat_g: macro.fat_g * factor,
  };
}

/** Parse only complete, non-estimated, as-sold nutrition with an explicit basis. */
export function parseBarcodeProduct(code: string, value: unknown): BarcodeProduct {
  const p = object(value);
  const nutrition = object(p.nutrition);
  const sets = (Array.isArray(nutrition.input_sets) ? nutrition.input_sets : [])
    .map(object)
    .filter((set) => TRUSTED_SOURCES.has(set.source) && (!set.preparation || set.preparation === 'as_sold'));
  const per100 = [...sets, object(nutrition.aggregated_set)]
    .flatMap((set) => {
      if (set.preparation && set.preparation !== 'as_sold') return [];
      if (set.per !== '100g' && set.per !== '100ml') return [];
      const aggregated = set === nutrition.aggregated_set;
      const macro = readMacros(set, aggregated);
      const unit: Unit = set.per === '100ml' ? 'ml' : 'g';
      // Some aggregate records relabel 100ml inputs as 100g without a density.
      // Prefer the explicit input set; never present a volume value as a weight.
      if (aggregated && Object.values(object(set.nutrients)).some((entry) => {
        const sourcePer = object(entry).source_per;
        return (sourcePer === '100ml' || sourcePer === '100g') && sourcePer !== set.per;
      })) return [];
      if (!macro || (set.per_quantity != null && num(set.per_quantity) !== 100)) return [];
      if (set.per_unit != null && set.per_unit !== unit) return [];
      // Broad physical bounds, not a 4/4/9 equality (fibre/polyols/alcohol differ).
      const massLimit = unit === 'g' ? 110 : 165;
      if (macro.calories > (unit === 'g' ? 1000 : 1500) ||
        macro.protein_g + macro.carbs_g + macro.fat_g > massLimit) return [];
      return [{ macro, unit }];
    });

  const servingSets = sets.filter((set) => set.per === 'serving');
  let macro: Macro | null = null;
  let perLabel = '';
  let nutritionNote: string | undefined;
  // A measured serving can be derived even if its own nutrient fields are absent.
  for (const set of [...servingSets, {}]) {
    const measure = servingMeasure(set, p);
    const base = measure && per100.find((candidate) => candidate.unit === measure.unit);
    if (!measure || !base || measure.quantity > 5000) continue;
    macro = scale(base.macro, measure.quantity / 100);
    perLabel = `per serving (${measure.quantity} ${measure.unit})`;
    const declared = readMacros(set);
    if (declared && MACROS.some((key) => Math.abs(declared[key] - macro![key]) >
      Math.max(key === 'calories' ? 5 : 1, macro![key] * 0.2))) {
      nutritionNote = 'Conflicting serving values were recalculated from the per-100 nutrition and serving size.';
    }
    break;
  }
  if (!macro && per100.length) {
    macro = per100[0].macro;
    perLabel = `per 100 ${per100[0].unit}`;
  }
  if (!macro) {
    for (const set of servingSets) {
      const candidate = readMacros(set);
      const measure = servingMeasure(set, p);
      if (!candidate || !measure || measure.quantity > 5000) continue;
      const normalized = scale(candidate, 100 / measure.quantity);
      if (normalized.calories > (measure.unit === 'g' ? 1000 : 1500) ||
        normalized.protein_g + normalized.carbs_g + normalized.fat_g > (measure.unit === 'g' ? 110 : 165)) continue;
      macro = candidate;
      perLabel = `per serving (${measure.quantity} ${measure.unit})`;
      break;
    }
  }
  if (!macro) {
    throw new BarcodeLookupError('This product’s nutrition is incomplete or inconsistent. Check the package label or log it manually.');
  }
  return {
    code,
    name: String(p.product_name || 'Unknown product'),
    brand: p.brands ? String(p.brands).split(',')[0].trim() : undefined,
    perLabel,
    // Keep decimals until display/logging, so multiple servings don't compound rounding.
    ...macro,
    nutritionNote,
  };
}

class BarcodeLookupError extends Error {}

/**
 * Look up a barcode in the free Open Food Facts database.
 * Returns null if the product isn't found; throws on network errors.
 */
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<BarcodeProduct | null> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, BARCODE_TIMEOUT_MS);
  try {
    if (controller.signal.aborted) throw new Error('Aborted');
    const res = await fetch(
      `${OFF_URL}/${encodeURIComponent(code)}?product_type=food&cc=mu&lc=en&fields=${encodeURIComponent(OFF_FIELDS)}`,
      { signal: controller.signal, headers: { 'User-Agent': 'Trak (https://trak.fit)' } }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new BarcodeLookupError('Could not look up that barcode. Please try again.');
    const json = await res.json().catch(() => {
      throw new BarcodeLookupError('The food database returned an unreadable response. Please try again.');
    });
    if (json?.result?.id === 'product_not_found') return null;
    if (json?.status !== 'success' || json?.result?.id !== 'product_found' || !json?.product) {
      throw new BarcodeLookupError('The food database returned an unexpected response. Please try again.');
    }
    return parseBarcodeProduct(code, json.product);
  } catch (error) {
    if (signal?.aborted) {
      const aborted = new Error('Barcode lookup cancelled.');
      aborted.name = 'AbortError';
      throw aborted;
    }
    if (controller.signal.aborted) throw new Error('The food database took too long to respond. Please try again.');
    if (error instanceof BarcodeLookupError) throw error;
    throw new Error('Could not reach the food database. Check your connection and try again.');
  } finally {
    // Keep the deadline active through JSON body consumption, not just headers.
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

/** Convert a looked-up product (× servings) into a loggable meal. */
export function barcodeToAnalysis(p: BarcodeProduct, servings: number): FoodAnalysis {
  if (!Number.isFinite(servings) || servings <= 0 || MACROS.some((key) =>
    !Number.isFinite(p[key]) || p[key] < 0 || !Number.isFinite(p[key] * servings))) {
    throw new Error('Please enter a valid serving amount and complete nutrition.');
  }
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
    notes: [`From barcode ${p.code}`, p.nutritionNote].filter(Boolean).join('. '),
    analysisMeta: {
      model: 'none',
      promptVersion: 'none',
      pipelineVersion: 'open-food-facts-v3.6-validation-v2',
      inputSource: 'barcode',
    },
  };
}
