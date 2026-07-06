// Trak — server-side chat assistant.
// Runs on Supabase Edge Functions (Deno). Calls Gemini via its OpenAI-compatible
// endpoint (GEMINI_API_KEY). When the user describes food, we improve the model's
// estimate with real data, cheapest source first:
//   1. Open Food Facts (free) — great for packaged/branded foods.
//   2. For foods OFF doesn't have, Exa (EXA_API_KEY) searches the web for the
//      nutrition facts and Gemini scales them to the portion.
// Every layer fails safe: no match / service down / no key → we keep the model's
// own estimate, so the chat never regresses. Exa is optional — without its key
// the function simply runs OFF + the model estimate.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Override with the GEMINI_MODEL secret to move to a newer Flash (e.g. gemini-3.5-flash).
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';
const EXA_URL = 'https://api.exa.ai/answer';

const SYSTEM_PROMPT = `You are "Trak", the friendly assistant inside the Trak calorie-tracking app.
Respond with ONLY a raw JSON object (no markdown fences) in ONE of these two shapes:

1) When the user's LAST message describes food or drink they ate or want to log
   (e.g. "1 big mac, 1 french fries, 1 coke zero"):
{
  "kind": "meal",
  "title": string,               // short label, e.g. "Big Mac meal"
  "items": [ { "name": string, "quantity": string, "grams": number, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number } ],
  "total": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "confidence": number,          // 0..1
  "notes": string,               // 1-2 sentences on HOW you estimated it. Max ~35 words, written to the user.
  "reply": string                // ONE short friendly sentence summarizing the estimate
}

2) For anything else (questions, greetings, advice):
{
  "kind": "answer",
  "reply": string                // friendly, concise (max ~3 sentences). Use the user's daily context numbers when relevant.
}

Rules:
- Use typical portion sizes and well-known brand nutrition when the user names brands.
- "name" must be a clean, searchable food name (e.g. "Greek yogurt", "Big Mac"), no counts inside it.
- "grams" is your best estimate of the TOTAL edible weight of that item's portion in grams (e.g. 3 pieces of a small snack might be ~90). Always include it for every item.
- The calories/macros you give are a fallback estimate; the server may refine them with real data.
- All nutrient values are plain whole numbers, no units.
- "quantity" is a short human portion, e.g. "1 sandwich", "1 medium", "330 ml can".
- Never invent that something was logged — the app handles logging after the user taps Add.
- Stay on nutrition/food/health topics; politely decline anything unrelated.
- Keep replies short and warm. No markdown formatting in "reply".`;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** Gemini sometimes wraps JSON in ```json fences despite instructions; strip them. */
function stripFences(s: string): string {
  const t = s.trim();
  if (t.startsWith('```')) {
    return t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return t;
}

type Macro = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

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
    const parsed = JSON.parse(stripFences(content));
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
 * Refine a parsed meal's numbers: Open Food Facts first (free), then Exa + Gemini
 * for whatever OFF didn't cover, then recompute totals. Every step fails safe.
 */
async function enrichMeal(apiKey: string, meal: any): Promise<any> {
  const items: any[] = Array.isArray(meal?.items) ? meal.items : [];
  if (items.length === 0) return meal;
  const originalTotal = num(meal?.total?.calories) ?? 0;

  // 1) Free Open Food Facts pass (parallel, one lookup per item).
  const offHits = await Promise.all(
    items.map((it) => offLookup(String(it?.name ?? ''), num(it?.grams) ?? 0)),
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
    if (drift > 0.15) {
      const via = webSourced.length ? 'web nutrition data' : 'Open Food Facts';
      meal.reply = `About ${total.calories} calories, based on ${via}.`;
    }
  }
  return meal;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Require a real signed-in user (the public anon key is also a valid JWT).
    let apiKey: string;
    try {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      if (payload?.role !== 'authenticated') {
        return json({ error: 'Please sign in to chat.' }, 401);
      }
    } catch {
      return json({ error: 'Please sign in to chat.' }, 401);
    }

    apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    if (!apiKey) {
      return json({ error: 'Server is missing its Gemini key.' }, 500);
    }

    const { messages, context } = await req.json().catch(() => ({}));
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'No message provided.' }, 400);
    }

    // Abuse guards: bound history length and message size.
    const history = messages.slice(-10).map((m: any) => ({
      role: m?.role === 'assistant' ? 'assistant' : 'user',
      content: String(m?.content ?? '').slice(0, 1_000),
    }));

    // Give the model the user's day so it can answer "how much protein left?".
    // The remaining amounts are PRE-COMPUTED here — language models are
    // unreliable at arithmetic, so never make it subtract.
    let contextNote = '';
    if (context && typeof context === 'object') {
      const t = (context as any).targets ?? {};
      const e = (context as any).eaten ?? {};
      const line = (label: string, target: unknown, eaten: unknown, unit: string) => {
        const tv = num(target);
        const ev = num(eaten);
        if (tv === null || ev === null) return '';
        const left = Math.round(tv - ev);
        const status = left >= 0 ? `${left}${unit} remaining` : `exceeded by ${-left}${unit}`;
        return `${label}: ate ${Math.round(ev)}${unit} of ${Math.round(tv)}${unit} target — ${status}.`;
      };
      contextNote = [
        "User's day so far (use these EXACT numbers; do not recalculate):",
        line('Calories', t.calories, e.calories, ' kcal'),
        line('Protein', t.protein_g, e.protein_g, 'g'),
        line('Carbs', t.carbs_g, e.carbs_g, 'g'),
        line('Fat', t.fat_g, e.fat_g, 'g'),
      ]
        .filter(Boolean)
        .join('\n');
    }

    const body = {
      model: MODEL,
      temperature: 0.3,
      max_tokens: 700, // bounds the cost of each call
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...(contextNote ? [{ role: 'system', content: contextNote }] : []),
        ...history,
      ],
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.json())?.error?.message ?? '';
      } catch {
        // ignore
      }
      if (res.status === 401) return json({ error: 'The server Gemini key was rejected.' }, 502);
      if (res.status === 429) {
        return json({ error: 'Gemini: rate limited or out of quota. Try again shortly.' }, 502);
      }
      return json({ error: `Gemini error ${res.status}${detail ? `: ${detail}` : ''}` }, 502);
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      return json({ error: 'Gemini returned an empty answer.' }, 502);
    }

    // Enrich meals (OFF → Exa+Gemini); pass non-meals and anything unparseable
    // straight through so a bad parse never breaks the chat.
    const clean = stripFences(content);
    let out = clean;
    try {
      const parsed = JSON.parse(clean);
      if (parsed?.kind === 'meal') {
        out = JSON.stringify(await enrichMeal(apiKey, parsed));
      }
    } catch {
      out = clean;
    }

    return json({ content: out }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected server error.' }, 500);
  }
});
