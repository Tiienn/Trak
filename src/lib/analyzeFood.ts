import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';
import type { MealMemoryHint } from './meal-memory';
import { FoodAnalysis } from './types';

/** Resize + compress the photo, then return it as a base64 JPEG string. */
async function toBase64Jpeg(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1024 });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    compress: 0.6,
    base64: true,
    format: SaveFormat.JPEG,
  });
  if (!result.base64) {
    throw new Error('Could not process the photo. Please try again.');
  }
  return result.base64;
}

function toNumber(v: unknown): number {
  // Models sometimes return numbers as strings (e.g. "520" or "30 g"); coerce them.
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : 0;
}

/** Pull a readable message out of a Supabase Functions error. */
export async function extractError(error: any): Promise<string> {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    }
  } catch {
    // ignore
  }
  return error?.message ?? 'Could not reach the food analyzer. Check your connection and try again.';
}

/**
 * Turn the AI's (loosely-typed) JSON into a well-formed FoodAnalysis.
 * Shared by the photo scanner and the Trak chat.
 */
export function normalizeFoodJson(parsed: any): FoodAnalysis {
  const items: FoodAnalysis['items'] = Array.isArray(parsed.items)
    ? parsed.items.map((it: any) => ({
        name: String(it?.name ?? 'Item'),
        quantity: String(it?.quantity ?? ''),
        grams: toNumber(it?.grams) || undefined,
        calories: toNumber(it?.calories),
        protein_g: toNumber(it?.protein_g),
        carbs_g: toNumber(it?.carbs_g),
        fat_g: toNumber(it?.fat_g),
        nutritionSource: ['usda_fdc', 'open_food_facts', 'web', 'model'].includes(
          it?.nutrition_source
        )
          ? it.nutrition_source
          : undefined,
        sourceId: it?.source_id ? String(it.source_id) : undefined,
        sourceLabel: it?.source_label ? String(it.source_label) : undefined,
      }))
    : [];

  const sum = (key: keyof FoodAnalysis['total']) =>
    items.reduce((acc, it) => acc + (it[key as keyof typeof it] as number), 0);

  // Use the model's total when it's a valid number (including a legitimate 0);
  // only fall back to summing the items when the field is missing/unparseable.
  const pickTotal = (v: unknown, key: keyof FoodAnalysis['total']) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : sum(key);
  };

  const t = parsed.total ?? {};
  const isFood = typeof parsed.isFood === 'boolean' ? parsed.isFood : items.length > 0;
  const rawMeta = parsed.analysisMeta ?? parsed.pipeline;
  const rawInputSource = rawMeta?.inputSource ?? rawMeta?.input_source;
  const inputSource = ['text', 'photo', 'barcode', 'quick_log'].includes(rawInputSource)
    ? rawInputSource
    : undefined;
  const analysisMeta = rawMeta
    ? {
        requestId: typeof rawMeta.requestId === 'string' ? rawMeta.requestId : undefined,
        model: typeof rawMeta.model === 'string' ? rawMeta.model : undefined,
        promptVersion:
          typeof (rawMeta.promptVersion ?? rawMeta.prompt_version) === 'string'
            ? (rawMeta.promptVersion ?? rawMeta.prompt_version)
            : undefined,
        pipelineVersion:
          typeof (rawMeta.pipelineVersion ?? rawMeta.pipeline_version) === 'string'
            ? (rawMeta.pipelineVersion ?? rawMeta.pipeline_version)
            : undefined,
        inputSource,
      }
    : undefined;

  return {
    isFood,
    title: String(parsed.title ?? (isFood ? 'Meal' : 'No food detected')),
    items,
    total: {
      calories: pickTotal(t.calories, 'calories'),
      protein_g: pickTotal(t.protein_g, 'protein_g'),
      carbs_g: pickTotal(t.carbs_g, 'carbs_g'),
      fat_g: pickTotal(t.fat_g, 'fat_g'),
    },
    confidence:
      typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
    notes: parsed.notes ? String(parsed.notes) : undefined,
    analysisMeta,
  };
}

/**
 * Nudge an AI estimate up or down by a percentage to correct systematic
 * over/under-estimation for a given user. Scales calories AND macros (total
 * and every item) so the breakdown stays coherent. A bias of 0 is a no-op.
 */
export function applyCalorieBias(a: FoodAnalysis, biasPct: number): FoodAnalysis {
  if (!biasPct || !Number.isFinite(biasPct)) return a;
  const factor = 1 + biasPct / 100;
  const scale = (n: number) => Math.max(0, Math.round(n * factor));
  return {
    ...a,
    items: a.items.map((it) => ({
      ...it,
      calories: scale(it.calories),
      protein_g: scale(it.protein_g),
      carbs_g: scale(it.carbs_g),
      fat_g: scale(it.fat_g),
    })),
    total: {
      calories: scale(a.total.calories),
      protein_g: scale(a.total.protein_g),
      carbs_g: scale(a.total.carbs_g),
      fat_g: scale(a.total.fat_g),
    },
  };
}

/**
 * Sends a food photo to the Trak edge function (which calls Gemini server-side)
 * and returns a structured nutrition estimate. Throws a friendly Error on failure.
 * `biasPct` nudges the estimate to match the user's calibration.
 */
export async function analyzeFood(
  uri: string,
  biasPct = 0,
  mealMemory: MealMemoryHint[] = [],
  signal?: AbortSignal,
): Promise<FoodAnalysis> {
  const base64 = await toBase64Jpeg(uri);

  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { imageBase64: base64, mealMemory: mealMemory.slice(0, 8) },
    signal,
  });

  if (error) {
    throw new Error(await extractError(error));
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }

  const content: string | undefined = data?.content;
  if (!content) {
    throw new Error('The server returned an empty answer. Please try again.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Could not read the AI answer. Please try another photo.');
  }
  if (data?.meta && typeof data.meta === 'object') {
    parsed.analysisMeta = { ...(parsed.pipeline ?? {}), ...data.meta };
  }

  const normalized = normalizeFoodJson(parsed);
  normalized.analysisMeta = { ...normalized.analysisMeta, inputSource: 'photo' };
  return applyCalorieBias(normalized, biasPct);
}
