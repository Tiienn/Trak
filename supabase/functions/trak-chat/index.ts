// Trak — server-side chat assistant.
// Runs on Supabase Edge Functions (Deno). Calls Gemini via its OpenAI-compatible
// endpoint (GEMINI_API_KEY). When the user describes food, we improve the model's
// estimate with real data, cheapest source first:
//   1. Open Food Facts (free) — great for packaged/branded foods.
//   2. For foods OFF doesn't have, Exa (EXA_API_KEY) searches the web for the
//      nutrition facts and Gemini scales them to the portion.
// Every layer fails safe: no match / service down / no key → we keep the model's
// own estimate, so the chat never regresses. The pipeline itself lives in
// ../_shared/nutrition.ts and is shared with analyze-food.

import {
  enrichMeal,
  GEMINI_URL,
  json,
  MODEL,
  num,
  parseLoose,
  stripFences,
  corsHeaders,
} from '../_shared/nutrition.ts';

const SYSTEM_PROMPT = `You are "Trak", the friendly assistant inside the Trak calorie-tracking app.
Respond with ONLY a raw JSON object (no markdown fences) in ONE of these two shapes:

1) When the user's LAST message describes food or drink they ate or want to log
   (e.g. "1 big mac, 1 french fries, 1 coke zero"):
{
  "kind": "meal",
  "title": string,               // short label, e.g. "Big Mac meal"
  "items": [ { "name": string, "quantity": string, "grams": number, "familiar": boolean, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number } ],
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
- "name" is a clean, searchable food name (e.g. "Greek yogurt", "Big Mac"), no counts inside it. If you do NOT recognize a dish (e.g. a regional or homemade dish like "niouk yen"), KEEP the user's exact term — NEVER swap in a different food you think it resembles.
- "familiar": true ONLY if you genuinely know this specific food's real nutrition; false if you are guessing or unsure. Be honest — false makes the server look the food up on the web instead of trusting your guess.
- "grams" is your best estimate of the TOTAL edible weight of that item's portion in grams (e.g. 3 pieces of a small snack might be ~90). Always include it for every item.
- The calories/macros you give are a fallback estimate; the server may refine them with real data.
- All nutrient values are plain whole numbers, no units.
- "quantity" is a short human portion, e.g. "1 sandwich", "1 medium", "330 ml can".
- Never invent that something was logged — the app handles logging after the user taps Add.
- Stay on nutrition/food/health topics; politely decline anything unrelated.
- Keep replies short and warm. No markdown formatting in "reply".
- Your ENTIRE response must be exactly ONE of the two JSON shapes above (with a top-level "kind" of "meal" or "answer") — never any other structure, and never echo the BACKGROUND numbers.`;

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

    const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
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
        line('Calories', t.calories, e.calories, ' kcal'),
        line('Protein', t.protein_g, e.protein_g, 'g'),
        line('Carbs', t.carbs_g, e.carbs_g, 'g'),
        line('Fat', t.fat_g, e.fat_g, 'g'),
      ]
        .filter(Boolean)
        .join('\n');
      // A one-line-per-day digest of the last week, for trend questions.
      const week = (context as any).week;
      if (typeof week === 'string' && week.trim()) {
        contextNote += `\nLast 7 days (newest first):\n${week.slice(0, 700)}`;
      }
    }

    // Merge everything into ONE system message. Gemini (unlike GPT-4o) latches
    // onto a second system message and echoes it, so the day's numbers go in as
    // clearly-labelled background the model must never output as its response.
    const systemContent =
      SYSTEM_PROMPT +
      (contextNote
        ? `\n\n---\nBACKGROUND — the user's day so far. Use these EXACT numbers ONLY to answer questions like "how much protein do I have left"; NEVER output this block as your response:\n${contextNote}`
        : '');

    const body = {
      model: MODEL,
      temperature: 0.3,
      // Bounds cost, but must fit a multi-item meal's full JSON — a 700-token cap
      // truncated 4+ item meals mid-object, which no repair can fix.
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: systemContent }, ...history],
    };

    // Call Gemini, retrying once if the reply won't parse. Flash occasionally
    // emits a malformed JSON object (a stray missing comma); parseLoose repairs
    // the common case and a second try covers the rest.
    let parsed: any = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
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
      if (!content) continue;
      parsed = parseLoose(stripFences(content));
    }

    // Both attempts unparseable — degrade to a friendly nudge, not a hard error.
    if (!parsed) {
      return json(
        {
          content: JSON.stringify({
            kind: 'answer',
            reply: 'Sorry, I had trouble reading that — mind rephrasing?',
          }),
        },
        200,
      );
    }

    // Re-serialize the parsed object so the app always receives valid JSON (the
    // raw text may have needed a repair). Meals also get OFF → Exa enrichment.
    const out =
      parsed?.kind === 'meal'
        ? JSON.stringify(await enrichMeal(apiKey, parsed))
        : JSON.stringify(parsed);
    return json({ content: out }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected server error.' }, 500);
  }
});
