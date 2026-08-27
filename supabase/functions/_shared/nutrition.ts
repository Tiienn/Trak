// Trak — shared nutrition plumbing for the edge functions.
// Both trak-chat and analyze-food import from here so the Gemini endpoint
// handling, the JSON repair for Flash's occasional malformed output, and the
// USDA FoodData Central → Open Food Facts → Exa enrichment pipeline live in
// exactly one place.

export const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Keep the production model explicit and benchmark changes with the eval suite.
export const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';
export const PROMPT_VERSION = '2026-07-30.1';
export const PIPELINE_VERSION = 'fdc-off3-exa-v1';

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const FDC_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';
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

export type AiRunInput = {
  requestId: string;
  feature: 'photo_scan' | 'chat' | 'nutrition_enrichment' | 'body_analysis';
  userId: string;
  status: 'success' | 'degraded' | 'error';
  errorCode?: string;
  latencyMs: number;
  attempts: number;
  inputKind: string;
  sourceCounts?: Record<string, number>;
  promptTokens?: number;
  completionTokens?: number;
  /** Override when a feature has its own independently versioned prompt. */
  promptVersion?: string;
};

async function pseudonymousUserHash(userId: string): Promise<string | null> {
  const salt = Deno.env.get('AI_TELEMETRY_SALT');
  if (!salt || !userId) return null;
  const bytes = new TextEncoder().encode(`${salt}:${userId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Best-effort operational telemetry. It intentionally stores no image, prompt,
 * chat text, meal name, nutrition totals, email, or profile fields.
 */
export async function recordAiRun(run: AiRunInput): Promise<void> {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const admin = createClient(url, key);
    const { error } = await admin.from('ai_runs').insert({
      request_id: run.requestId,
      feature: run.feature,
      user_hash: await pseudonymousUserHash(run.userId),
      model: MODEL,
      prompt_version: run.promptVersion ?? PROMPT_VERSION,
      pipeline_version: PIPELINE_VERSION,
      status: run.status,
      error_code: run.errorCode ?? null,
      latency_ms: Math.max(0, Math.round(run.latencyMs)),
      attempts: run.attempts,
      input_kind: run.inputKind,
      source_counts: run.sourceCounts ?? {},
      prompt_tokens: run.promptTokens ?? null,
      completion_tokens: run.completionTokens ?? null,
    });
    if (error) console.warn('ai_runs insert failed', error.code);
  } catch (error) {
    console.warn('ai_runs insert failed', (error as Error)?.message ?? 'unknown');
  }
}

/**
 * Decode a JWT's payload segment. JWT uses base64url; plain `atob` throws on
 * its `-`/`_` characters, which locked out any user whose token payload
 * happened to encode with them. Throws on malformed input — callers catch.
 */
export function jwtPayload(token: string): any {
  const seg = (token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = seg + '='.repeat((4 - (seg.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

/**
 * Per-user daily request cap on the paid AI endpoints. Counts one unit per
 * client request in the `ai_usage` table (service role only; no RLS policies).
 * FAILS OPEN: if the table is missing or the write errors, the request is
 * allowed — the limiter is cost protection, not an availability risk.
 */
export async function underDailyLimit(userId: string, limit = 150): Promise<boolean> {
  try {
    if (!userId) return true;
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return true;
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const admin = createClient(url, key);
    const day = new Date().toISOString().slice(0, 10);
    const { data } = await admin
      .from('ai_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('day', day)
      .maybeSingle();
    const current = data?.count ?? 0;
    if (current >= limit) return false;
    await admin
      .from('ai_usage')
      .upsert({ user_id: userId, day, count: current + 1 }, { onConflict: 'user_id,day' });
    return true;
  } catch {
    return true;
  }
}

/** fetch() with a hard timeout so a hung upstream can't eat the whole function. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
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
export type NutritionProvider = 'usda_fdc' | 'open_food_facts' | 'web' | 'model';
type NutritionHit = {
  macro: Macro;
  provider: Exclude<NutritionProvider, 'web' | 'model'>;
  sourceId: string;
  sourceLabel: string;
};

function scaleMacro(per100g: Macro, grams: number): Macro {
  const scale = grams / 100;
  return {
    calories: Math.round(per100g.calories * scale),
    protein_g: Math.round(per100g.protein_g * scale),
    carbs_g: Math.round(per100g.carbs_g * scale),
    fat_g: Math.round(per100g.fat_g * scale),
  };
}

function foodTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

/**
 * Look up generic foods in USDA FoodData Central (FNDDS / Foundation / SR).
 * The API key stays server-side. Missing configuration simply skips this layer.
 */
async function fdcLookup(name: string, grams: number): Promise<NutritionHit | null> {
  // DEMO_KEY keeps the current small closed test functional; it is limited to
  // 30 requests/hour and 50/day, so set FDC_API_KEY before public launch.
  const apiKey = Deno.env.get('FDC_API_KEY') ?? 'DEMO_KEY';
  if (!name || !(grams > 0) || grams > 5000) return null;
  try {
    const res = await fetchWithTimeout(
      `${FDC_SEARCH}?api_key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: name,
          dataType: ['Survey (FNDDS)', 'Foundation', 'SR Legacy'],
          pageSize: 8,
        }),
      },
      4500,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const foods: any[] = Array.isArray(data?.foods) ? data.foods : [];
    const queryTokens = foodTokens(name);
    const ranked = foods
      .map((food) => {
        const description = String(food?.description ?? '');
        const candidateTokens = foodTokens(description);
        const overlap = queryTokens.filter((token) => candidateTokens.includes(token)).length;
        const coverage = queryTokens.length ? overlap / queryTokens.length : 0;
        const precision = candidateTokens.length ? overlap / candidateTokens.length : 0;
        return { food, description, score: coverage * 0.75 + precision * 0.25 };
      })
      .filter((candidate) => candidate.score >= 0.55)
      .sort((a, b) => b.score - a.score);

    for (const candidate of ranked) {
      const nutrients: any[] = Array.isArray(candidate.food?.foodNutrients)
        ? candidate.food.foodNutrients
        : [];
      const nutrient = (id: number) =>
        num(nutrients.find((entry) => Number(entry?.nutrientId) === id)?.value);
      const calories = nutrient(1008);
      if (calories === null) continue;
      return {
        macro: scaleMacro(
          {
            calories,
            protein_g: nutrient(1003) ?? 0,
            carbs_g: nutrient(1005) ?? 0,
            fat_g: nutrient(1004) ?? 0,
          },
          grams,
        ),
        provider: 'usda_fdc',
        sourceId: String(candidate.food?.fdcId ?? ''),
        sourceLabel: candidate.description,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Free Open Food Facts pass: scale a matched product's per-100 g nutrition to
 * `grams`. Returns null when there's no confident match / OFF is unreachable /
 * grams is out of range — the caller keeps the model's estimate. Never throws.
 */
async function offLookup(name: string, grams: number): Promise<NutritionHit | null> {
  if (!name || !(grams > 0) || grams > 5000) return null;
  try {
    const url =
      `${OFF_SEARCH}?search_terms=${encodeURIComponent(name)}` +
      `&search_simple=1&action=process&json=1&page_size=5` +
      `&fields=code,product_name,nutriments`;
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
      // Require EVERY query word — a single shared word matched "chicken curry"
      // to "chicken broth" and served wildly wrong nutrition with confidence.
      if (words.length && !words.every((w) => pname.includes(w))) continue;
      const n = p?.nutriments ?? {};
      const kcal100 = num(n['energy-kcal_100g']);
      if (kcal100 === null) continue;
      return {
        macro: scaleMacro(
          {
            calories: kcal100,
            protein_g: num(n['proteins_100g']) ?? 0,
            carbs_g: num(n['carbohydrates_100g']) ?? 0,
            fat_g: num(n['fat_100g']) ?? 0,
          },
          grams,
        ),
        provider: 'open_food_facts',
        sourceId: String(p?.code ?? ''),
        sourceLabel: String(p?.product_name ?? name),
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
    const res = await fetchWithTimeout(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 1000,
        // Thinking tokens count against max_tokens on the OpenAI-compat
        // endpoint and can starve the JSON entirely; this is pure arithmetic,
        // so spend the whole budget on output.
        reasoning_effort: 'none',
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
    }, 45_000);
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
 * Refine a parsed meal's numbers: USDA for generic foods, Open Food Facts for
 * branded products, then Exa + Gemini for the rest, then recompute totals.
 * Works for both chat meals and photo analyses (any object with an items array).
 * Every step fails safe — worst case the model's own estimate is kept.
 */
export async function enrichMeal(apiKey: string, meal: any): Promise<any> {
  const items: any[] = Array.isArray(meal?.items) ? meal.items : [];
  if (items.length === 0) return meal;
  const originalTotal = num(meal?.total?.calories) ?? 0;

  // 1) Structured data pass. Generic foods go to USDA FDC; branded products go
  //    to Open Food Facts. OFF is not used for home-cooked meals because its
  //    crowd-sourced product search can return a similarly named packaged food.
  const rawHits = await Promise.all(
    items.map(async (it): Promise<NutritionHit | null> => {
      const name = String(it?.name ?? '');
      const grams = num(it?.grams) ?? 0;
      const hint = String(it?.source_hint ?? 'unknown');
      if (hint === 'branded') return offLookup(name, grams);
      return fdcLookup(name, grams);
    }),
  );
  // Sanity gate: a database match whose calories diverge >3x from the model's
  // estimate is likely the wrong food or preparation — keep the estimate.
  const structuredHits = rawHits.map((hit, i) => {
    if (!hit) return null;
    const est = num(items[i]?.calories) ?? 0;
    if (
      est > 0 &&
      (hit.macro.calories > est * 3 || hit.macro.calories * 3 < est)
    ) {
      return null;
    }
    return hit;
  });
  const fdcSourced: string[] = [];
  const offSourced: string[] = [];
  items.forEach((it, i) => {
    const hit = structuredHits[i];
    if (!hit) return;
    it.calories = hit.macro.calories;
    it.protein_g = hit.macro.protein_g;
    it.carbs_g = hit.macro.carbs_g;
    it.fat_g = hit.macro.fat_g;
    it.nutrition_source = hit.provider;
    it.source_id = hit.sourceId;
    it.source_label = hit.sourceLabel;
    const displayName = String(it?.name ?? '').trim();
    if (hit.provider === 'usda_fdc') fdcSourced.push(displayName);
    if (hit.provider === 'open_food_facts') offSourced.push(displayName);
  });

  // 2) Web search (Exa) + Gemini scaling for foods structured sources missed.
  //    Items without a usable gram estimate stay on the model's numbers —
  //    scaling per-100g data to 0 g would zero them out.
  const missedIdx = items
    .map((_, i) => i)
    .filter((i) => !structuredHits[i] && (num(items[i]?.grams) ?? 0) > 0);
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
          it.nutrition_source = 'web';
          it.source_id = '';
          it.source_label = 'Web nutrition references';
          webSourced.push(String(it?.name ?? '').trim());
        });
      }
    }
  }

  // Explicitly mark model-only fallbacks so the client and telemetry can
  // distinguish grounded values from estimates.
  items.forEach((it) => {
    if (!it?.nutrition_source) {
      it.nutrition_source = 'model';
      it.source_id = '';
      it.source_label = 'AI estimate';
    }
  });

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
  if (fdcSourced.length) parts.push(`${fdcSourced.join(', ')} from USDA FoodData Central`);
  if (offSourced.length) parts.push(`${offSourced.join(', ')} from Open Food Facts`);
  if (webSourced.length) parts.push(`${webSourced.join(', ')} from a web search`);
  if (parts.length) {
    const note = `Nutrition sourced: ${parts.join('; ')}.`;
    meal.notes = meal?.notes ? `${String(meal.notes).trim()} ${note}` : note;
    const drift = originalTotal > 0 ? Math.abs(total.calories - originalTotal) / originalTotal : 0;
    // Only chat meals carry a "reply" sentence; keep it in sync when the numbers moved.
    if (drift > 0.15 && typeof meal.reply === 'string') {
      const via = webSourced.length
        ? 'web nutrition data'
        : fdcSourced.length
          ? 'USDA FoodData Central'
          : 'Open Food Facts';
      meal.reply = `About ${total.calories} calories, based on ${via}.`;
    }
  }
  meal.pipeline = {
    model: MODEL,
    prompt_version: PROMPT_VERSION,
    pipeline_version: PIPELINE_VERSION,
  };
  return meal;
}

export function nutritionSourceCounts(meal: any): Record<string, number> {
  const counts: Record<string, number> = {};
  const items: any[] = Array.isArray(meal?.items) ? meal.items : [];
  for (const item of items) {
    const source = String(item?.nutrition_source ?? 'model');
    counts[source] = (counts[source] ?? 0) + 1;
  }
  return counts;
}
