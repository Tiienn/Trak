import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { FoodAnalysis } from './types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `You are a nutrition estimation assistant for a calorie-tracking app called Trak.
Look at the photo and estimate the food's nutrition. Use common sense and typical portion sizes when unsure.
Respond with ONLY a raw JSON object (no markdown code fences) with exactly this shape:
{
  "isFood": boolean,
  "title": string,
  "items": [ { "name": string, "quantity": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number } ],
  "total": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "confidence": number,
  "notes": string
}
Rules:
- If the image does NOT contain food, set "isFood" to false, "title" to "No food detected", "items" to [], all totals to 0, and "confidence" to 0.
- "quantity" is a short human portion, e.g. "1 cup", "2 slices", "approx 150 g".
- All nutrient values are plain numbers with no units. Round to whole numbers.
- "confidence" is a number between 0 and 1.
- "notes" is ONE short sentence about assumptions you made (max ~15 words).`;

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

/**
 * Sends a food photo to GPT-4o and returns a structured nutrition estimate.
 * Throws an Error with a friendly, user-facing message on any failure.
 */
export async function analyzeFood(uri: string): Promise<FoodAnalysis> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'No OpenAI key found. Open the .env file, paste your key after EXPO_PUBLIC_OPENAI_API_KEY=, then fully restart the app.'
    );
  }

  const base64 = await toBase64Jpeg(uri);

  const body = {
    model: MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Estimate the nutrition of this meal.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach OpenAI. Check your internet connection and try again.');
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message ?? '';
    } catch {
      // ignore parse errors
    }
    if (res.status === 401) {
      throw new Error('Your OpenAI key was rejected. Double-check it in the .env file.');
    }
    if (res.status === 429) {
      throw new Error(
        'OpenAI: rate limited or out of credit. Add a little credit to your OpenAI account and try again.'
      );
    }
    throw new Error(`OpenAI error ${res.status}${detail ? `: ${detail}` : ''}`);
  }

  const json = await res.json();
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty answer. Please try again.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Could not read the AI answer. Please try another photo.');
  }

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
  // Trust the model's explicit boolean; only guess from item count when it's absent.
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
