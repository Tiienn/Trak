// Trak — server-side chat assistant.
// Runs on Supabase Edge Functions (Deno) and holds the Gemini key as a server
// secret (GEMINI_API_KEY). We call Gemini through its OpenAI-compatible endpoint.
// The app sends a short chat history plus the user's daily numbers; the model
// replies as "Trak" and, when the user describes food, returns a structured meal
// estimate. Before returning a meal we enrich each item against Open Food Facts:
// the model gives a gram estimate per item, and when OFF has that food we scale
// its real per-100 g nutrition to those grams. OFF is additive — if it has no
// match (or is unreachable) we keep the model's estimate, so nothing regresses.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Override with the GEMINI_MODEL secret to move to a newer Flash (e.g. gemini-3.5-flash).
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';

const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl';

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
  "notes": string,               // 1-2 sentences on HOW you estimated it: portions assumed, brand nutrition used, any hidden ingredients. Max ~35 words, written to the user.
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
 * Look a food name up in Open Food Facts and scale its per-100 g nutrition to
 * `grams`. Returns null when there's no confident match, OFF is unreachable, or
 * the grams estimate is out of a sane range — the caller then keeps the model's
 * own estimate. Never throws.
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
    // Require lexical overlap with the query so we don't grab an unrelated product.
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
    return null; // network error / abort / bad JSON — fall back to the estimate.
  }
}

/**
 * Replace each item's macros with Open Food Facts data where a confident match
 * exists, recompute the totals, and note which items came from OFF. Mutates and
 * returns the parsed meal object. Safe to call on any parsed meal.
 */
async function enrichWithOFF(meal: any): Promise<any> {
  const items: any[] = Array.isArray(meal?.items) ? meal.items : [];
  if (items.length === 0) return meal;

  const originalTotal = num(meal?.total?.calories) ?? 0;
  const hits = await Promise.all(
    items.map((it) => offLookup(String(it?.name ?? ''), num(it?.grams) ?? 0))
  );

  const sourced: string[] = [];
  items.forEach((it, i) => {
    const hit = hits[i];
    if (!hit) return;
    it.calories = hit.calories;
    it.protein_g = hit.protein_g;
    it.carbs_g = hit.carbs_g;
    it.fat_g = hit.fat_g;
    sourced.push(String(it?.name ?? '').trim());
  });

  // Recompute totals from the (possibly OFF-corrected) items.
  const total: Macro = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const it of items) {
    total.calories += num(it?.calories) ?? 0;
    total.protein_g += num(it?.protein_g) ?? 0;
    total.carbs_g += num(it?.carbs_g) ?? 0;
    total.fat_g += num(it?.fat_g) ?? 0;
  }
  meal.total = total;

  if (sourced.length > 0) {
    meal.confidence = Math.max(num(meal?.confidence) ?? 0, 0.85);
    const note = `Nutrition for ${sourced.join(', ')} came from Open Food Facts.`;
    meal.notes = meal?.notes ? `${String(meal.notes).trim()} ${note}` : note;
    // If OFF moved the total a lot, the model's reply sentence is stale — replace
    // it with an accurate one so the bubble and the card agree.
    const drift = originalTotal > 0 ? Math.abs(total.calories - originalTotal) / originalTotal : 0;
    if (drift > 0.15) {
      meal.reply = `About ${total.calories} calories, using Open Food Facts data.`;
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
    try {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      if (payload?.role !== 'authenticated') {
        return json({ error: 'Please sign in to chat.' }, 401);
      }
    } catch {
      return json({ error: 'Please sign in to chat.' }, 401);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
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

    // Enrich meals with Open Food Facts; pass non-meals (and anything unpar. able)
    // straight through so a bad parse never breaks the chat.
    const clean = stripFences(content);
    let out = clean;
    try {
      const parsed = JSON.parse(clean);
      if (parsed?.kind === 'meal') {
        out = JSON.stringify(await enrichWithOFF(parsed));
      }
    } catch {
      out = clean;
    }

    return json({ content: out }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected server error.' }, 500);
  }
});
