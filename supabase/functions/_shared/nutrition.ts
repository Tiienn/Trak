// Trak — shared nutrition plumbing for the edge functions.
// Both trak-chat and analyze-food import from here so the Gemini endpoint
// handling, the JSON repair for Flash's occasional malformed output, and the
// Open Food Facts → Exa enrichment pipeline live in exactly one place.

export const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Override with the GEMINI_MODEL secret to move to a newer Flash (e.g. gemini-3.5-flash).
export const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const EXA_URL = 'https://api.exa.ai/answer';

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * Pull a clean JSON object string out of a model reply. Gemini doesn't reliably
 * honor response_format, so it may wrap the JSON in ```fences``` or add prose
 * around it. We unwrap fences, then fall back to the outermost {...} span.
 */
export function stripFences(s: string): string {
  let t = s.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) t = fenced[1].trim();
  try {
    JSON.parse(t);
    return t;
  } catch {
    // Not clean JSON yet — grab the first {...last } span and try that.
  }
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first >= 0 && last > first) return t.slice(first, last + 1);
  return t;
}

/**
 * Parse model JSON, tolerating the one malformation Gemini Flash actually emits:
 * a missing comma between two object properties. If a plain parse fails we insert
 * the comma (value immediately followed by a "key":) and drop any trailing comma,
 * then retry. Returns null if it still won't parse.
 */
export function parseLoose(s: string): any | null {
  try {
    return JSON.parse(s);
  } catch {
    const repaired = s
      .replace(
        /("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|\}|\]|true|false|null)(\s*)("(?:[^"\\]|\\.)*"\s*:)/g,
        '$1,$2$3',
      )
      .replace(/,(\s*[}\]])/g, '$1');
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

export type Macro = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

/**
 * Free Open Food Facts pass: scale a matched product's per-100 g nutrition to
 * `grams`. Returns null when there's no confident match / OFF is unreachable /
 * grams is out of range — the caller keeps the model's estimate. Never throws.
 */
async function offLookup(name: string, grams: number): Promise<Macro | null> {
  if (!name || !(grams > 0) || grams > 5000) return null;
  try {
    const url =
      `${OFF_SEARCH}?search_terms=${encodeURIComponent(name)}` +
      `&search_simple=1&action=process&json=1&page_size=5` +
      `&fields=product_name,nutriments`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    let res: Response;
    try {
      res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Trak/1.0 (personal food tracker)' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = await res.json();
    const products: any[] = Array.isArray(data?.products) ? data.products : [];
    const words = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    for (const p of products) {
      const pname = String(p?.product_name ?? '').toLowerCase();
      if (!pname) continue;
      if (words.length && !words.some((w) => pname.includes(w))) continue;
      const n = p?.nutriments ?? {};
      const kcal100 = num(n['energy-kcal_100g']);
      if (kcal100 === null) continue;
      const scale = grams / 100;
      return {
        calories: Math.round(kcal100 * scale),
        protein_g: Math.round((num(n['proteins_100g']) ?? 0) * scale),
        carbs_g: Math.round((num(n['carbohydrates_100g']) ?? 0) * scale),
        fat_g: Math.round((num(n['fat_100g']) ?? 0) * scale),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Exa web search: ask for the nutrition facts of the given foods and return a
 * text reference (synthesized answer + a little citation text) for Gemini to
 * read. Returns null when EXA_API_KEY is unset, Exa errors, or times out.
 */
async function exaSearch(query: string): Promise<string | null> {
  const key = Deno.env.get('EXA_API_KEY');
  if (!key) return null; // Exa fallback disabled — degrade to OFF + model estimate.
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    let res: Response;
    try {
      res = await fetch(EXA_URL, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, text: true }),
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = await res.json();
    const answer = typeof data?.answer === 'string' ? data.answer : '';
    const cites: any[] = Array.isArray(data?.citations) ? data.citations : [];
    const snippets = cites
      .slice(0, 3)
      .map((c) => (typeof c?.text === 'string' ? c.text.slice(0, 500) : ''))
      .filter(Boolean)
      .join('\n---\n');
    const combined = [answer, snippets].filter(Boolean).join('\n\nSources:\n');
    return combined || null;
  } catch {
    return null;
  }
}

/**
 * Gemini "calculation" pass: read the web reference's per-100 g (or per-serving)
 * values and scale them to each food's grams. Returns macros keyed by the item's
 * index in `items`, or null on any failure (caller keeps the model estimate).
 */
async function geminiScale(
  apiKey: string,
  reference: string,
  items: { name: string; grams: number }[],
): Promise<Record<number, Macro> | null> {
  const list = items.map((it, i) => `${i}: ${it.name} — ${it.grams} g`).join('\n');
  const prompt =
    `Web nutrition reference:\n${reference}\n\n` +
    `For each food below, read the reference's per-100 g (or per-serving) values ` +
    `and scale them to the given grams. If the reference doesn't cover a food, use ` +
    `your best general knowledge.\nFoods (index: name — grams):\n${list}\n\n` +
    `Respond ONLY JSON: {"items":[{"index":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number}]} with whole numbers.`;
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are a precise nutrition calculator. Scale per-100 g values to the requested grams. Output only the requested JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = parseLoose(stripFences(content));
    const arr: any[] = Array.isArray(parsed?.items) ? parsed.items : [];
    const out: Record<number, Macro> = {};
    for (const r of arr) {
      const idx = num(r?.index);
      if (idx === null) continue;
      out[idx] = {
        calories: Math.round(num(r?.calories) ?? 0),
        protein_g: Math.round(num(r?.protein_g) ?? 0),
        carbs_g: Math.round(num(r?.carbs_g) ?? 0),
        fat_g: Math.round(num(r?.fat_g) ?? 0),
      };
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/**
 * Refine a parsed meal's numbers: Open Food Facts first (free, only for foods the
 * model marked familiar), then Exa + Gemini for the rest, then recompute totals.
 * Works for both chat meals and photo analyses (any object with an items array).
 * Every step fails safe — worst case the model's own estimate is kept.
 */
export async function enrichMeal(apiKey: string, meal: any): Promise<any> {
  const items: any[] = Array.isArray(meal?.items) ? meal.items : [];
  if (items.length === 0) return meal;
  const originalTotal = num(meal?.total?.calories) ?? 0;

  // 1) Free Open Food Facts pass — but only for foods the model is confident it
  //    knows. Dishes it flagged unfamiliar (e.g. "niouk yen") skip OFF entirely
  //    so we don't accept a bad packaged-product match and can web-search the
  //    user's actual term instead.
  const offHits = await Promise.all(
    items.map((it) => {
      if (it?.familiar === false) return Promise.resolve<Macro | null>(null);
      return offLookup(String(it?.name ?? ''), num(it?.grams) ?? 0);
    }),
  );
  const offSourced: string[] = [];
  items.forEach((it, i) => {
    const hit = offHits[i];
    if (!hit) return;
    it.calories = hit.calories;
    it.protein_g = hit.protein_g;
    it.carbs_g = hit.carbs_g;
    it.fat_g = hit.fat_g;
    offSourced.push(String(it?.name ?? '').trim());
  });

  // 2) Web search (Exa) + Gemini scaling for the foods OFF didn't cover.
  const missedIdx = items.map((_, i) => i).filter((i) => !offHits[i]);
  const webSourced: string[] = [];
  if (missedIdx.length > 0) {
    const missed = missedIdx.map((i) => ({
      name: String(items[i]?.name ?? ''),
      grams: num(items[i]?.grams) ?? 0,
    }));
    const query =
      `Nutrition facts — calories, protein grams, carbohydrate grams, fat grams, ` +
      `per 100 grams — for each of: ${missed.map((m) => m.name).filter(Boolean).join('; ')}`;
    const reference = await exaSearch(query);
    if (reference) {
      const scaled = await geminiScale(apiKey, reference, missed);
      if (scaled) {
        missedIdx.forEach((itemIdx, localIdx) => {
          const m = scaled[localIdx];
          if (!m) return;
          const it = items[itemIdx];
          it.calories = m.calories;
          it.protein_g = m.protein_g;
          it.carbs_g = m.carbs_g;
          it.fat_g = m.fat_g;
          webSourced.push(String(it?.name ?? '').trim());
        });
      }
    }
  }

  // 3) Recompute totals from the (possibly corrected) items.
  const total: Macro = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const it of items) {
    total.calories += num(it?.calories) ?? 0;
    total.protein_g += num(it?.protein_g) ?? 0;
    total.carbs_g += num(it?.carbs_g) ?? 0;
    total.fat_g += num(it?.fat_g) ?? 0;
  }
  meal.total = total;

  // 4) Confidence, notes, and reply reflect where the numbers came from.
  const parts: string[] = [];
  if (offSourced.length) parts.push(`${offSourced.join(', ')} from Open Food Facts`);
  if (webSourced.length) parts.push(`${webSourced.join(', ')} from a web search`);
  if (parts.length) {
    meal.confidence = Math.max(num(meal?.confidence) ?? 0, 0.85);
    const note = `Nutrition sourced: ${parts.join('; ')}.`;
    meal.notes = meal?.notes ? `${String(meal.notes).trim()} ${note}` : note;
    const drift = originalTotal > 0 ? Math.abs(total.calories - originalTotal) / originalTotal : 0;
    // Only chat meals carry a "reply" sentence; keep it in sync when the numbers moved.
    if (drift > 0.15 && typeof meal.reply === 'string') {
      const via = webSourced.length ? 'web nutrition data' : 'Open Food Facts';
      meal.reply = `About ${total.calories} calories, based on ${via}.`;
    }
  }
  return meal;
}
