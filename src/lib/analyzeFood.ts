import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';
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
  // GPT-4o sometimes returns numbers as strings (e.g. "520" or "30 g"); coerce them.
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
        calories: toNumber(it?.calories),
        protein_g: toNumber(it?.protein_g),
        carbs_g: toNumber(it?.carbs_g),
        fat_g: toNumber(it?.fat_g),
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
  };
}

/**
 * Sends a food photo to the Trak edge function (which calls GPT-4o server-side)
 * and returns a structured nutrition estimate. Throws a friendly Error on failure.
 */
export async function analyzeFood(uri: string): Promise<FoodAnalysis> {
  const base64 = await toBase64Jpeg(uri);

  const { data, error } = await supabase.functions.invoke('analyze-food', {
    body: { imageBase64: base64 },
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

  return normalizeFoodJson(parsed);
}
