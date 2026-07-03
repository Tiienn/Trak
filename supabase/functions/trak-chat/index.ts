// Trak — server-side chat assistant.
// Runs on Supabase Edge Functions (Deno) and holds the OpenAI key as a server
// secret (OPENAI_API_KEY), same as analyze-food. The app sends a short chat
// history plus the user's daily numbers; the model replies as "Trak" and, when
// the user describes food, returns a structured meal estimate the app can log.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o';

const SYSTEM_PROMPT = `You are "Trak", the friendly assistant inside the Trak calorie-tracking app.
Respond with ONLY a raw JSON object (no markdown fences) in ONE of these two shapes:

1) When the user's LAST message describes food or drink they ate or want to log
   (e.g. "1 big mac, 1 french fries, 1 coke zero"):
{
  "kind": "meal",
  "title": string,               // short label, e.g. "Big Mac meal"
  "items": [ { "name": string, "quantity": string, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number } ],
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

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'Server is missing its OpenAI key.' }, 500);
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
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
      const t = (context as any).targets ?? {};
      const e = (context as any).eaten ?? {};
      const line = (label: string, target: unknown, eaten: unknown, unit: string) => {
        const tv = num(target);
        const ev = num(eaten);
        if (tv === null || ev === null) return '';
        const left = tv - ev;
        const status = left >= 0 ? `${left}${unit} remaining` : `exceeded by ${-left}${unit}`;
        return `${label}: ate ${ev}${unit} of ${tv}${unit} target — ${status}.`;
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

    const res = await fetch(OPENAI_URL, {
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
      if (res.status === 401) return json({ error: 'The server OpenAI key was rejected.' }, 502);
      if (res.status === 429) {
        return json({ error: 'OpenAI: rate limited or out of credit. Add credit and try again.' }, 502);
      }
      return json({ error: `OpenAI error ${res.status}${detail ? `: ${detail}` : ''}` }, 502);
    }

    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) {
      return json({ error: 'OpenAI returned an empty answer.' }, 502);
    }

    // Return the raw JSON string; the app parses + normalizes it.
    return json({ content }, 200);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? 'Unexpected server error.' }, 500);
  }
});
