// Trak — server-side food analysis.
// This runs on Supabase Edge Functions (Deno). It holds the OpenAI key as a
// server secret (OPENAI_API_KEY) so the key is never shipped inside the app.
// The app calls this with the user's login; Supabase rejects unauthenticated
// callers automatically (verify_jwt is on by default).

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
- "notes" explains HOW you estimated this, in 1-2 short sentences (max ~35 words): the portion size you assumed, the cooking method, and any hidden ingredients like oil, butter, or sugar. Write it directly to the user, e.g. "I assumed a grilled 150 g chicken breast with about 1 tbsp of oil, and a cup of cooked rice."`;

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
    // Supabase's verify_jwt has already checked the token SIGNATURE, but the
    // public anon key is itself a valid JWT (role "anon"). Require a real
    // signed-in user so strangers can't spend the OpenAI credit.
    try {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      if (payload?.role !== 'authenticated') {
        return json({ error: 'Please sign in to scan meals.' }, 401);
      }
    } catch {
      return json({ error: 'Please sign in to scan meals.' }, 401);
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'Server is missing its OpenAI key.' }, 500);
    }

    const { imageBase64 } = await req.json().catch(() => ({}));
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return json({ error: 'No image provided.' }, 400);
    }
    // The app sends ~100–300 KB images; anything huge is abuse or a bug.
    if (imageBase64.length > 3_000_000) {
      return json({ error: 'Image too large. Please try again.' }, 413);
    }

    const body = {
      model: MODEL,
      temperature: 0.2,
      max_tokens: 600, // bounds the cost of each call; plenty for the JSON answer
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Estimate the nutrition of this meal.' },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        },
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
