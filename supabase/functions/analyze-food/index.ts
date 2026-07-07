// Trak — server-side food analysis.
// This runs on Supabase Edge Functions (Deno). It holds the Gemini key as a
// server secret (GEMINI_API_KEY) so the key is never shipped inside the app.
// Gemini Flash reads the photo and estimates each item's nutrition; the shared
// pipeline (../_shared/nutrition.ts) then refines those numbers with real data —
// Open Food Facts for foods the model knows, Exa web search for dishes it
// flagged unfamiliar. Every refinement fails safe back to the model's estimate.

import {
  corsHeaders,
  enrichMeal,
  fetchWithTimeout,
  GEMINI_URL,
  json,
  jwtPayload,
  MODEL,
  parseLoose,
  stripFences,
} from '../_shared/nutrition.ts';

const SYSTEM_PROMPT = `You are a nutrition estimation assistant for a calorie-tracking app called Trak.
Look at the photo and estimate the food's nutrition. Use common sense and typical portion sizes when unsure.
Respond with ONLY a raw JSON object (no markdown code fences) with exactly this shape:
{
  "isFood": boolean,
  "title": string,
  "items": [ { "name": string, "quantity": string, "grams": number, "familiar": boolean, "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number } ],
  "total": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number },
  "confidence": number,
  "notes": string
}
Rules:
- If the image does NOT contain food, set "isFood" to false, "title" to "No food detected", "items" to [], all totals to 0, and "confidence" to 0.
- "name" is a clean, searchable food name. If you recognize a specific dish (including regional dishes), use its proper name — the server can look its real nutrition up.
- "familiar": true ONLY if you genuinely know this specific food's real nutrition; false if you are guessing or unsure. Be honest — false makes the server look the food up on the web instead of trusting your guess.
- "grams" is your best estimate of the TOTAL edible weight of that item's visible portion in grams. Always include it for every item.
- "quantity" is a short human portion, e.g. "1 cup", "2 slices", "approx 150 g".
- All nutrient values are plain numbers with no units. Round to whole numbers.
- "confidence" is a number between 0 and 1.
- "notes" explains HOW you estimated this, in 1-2 short sentences (max ~35 words): the portion size you assumed, the cooking method, and any hidden ingredients like oil, butter, or sugar. Write it directly to the user, e.g. "I assumed a grilled 150 g chicken breast with about 1 tbsp of oil, and a cup of cooked rice."`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase's verify_jwt has already checked the token SIGNATURE, but the
    // public anon key is itself a valid JWT (role "anon"). Require a real
    // signed-in user so strangers can't spend the API credit.
    try {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      const payload = jwtPayload(token);
      if (payload?.role !== 'authenticated') {
        return json({ error: 'Please sign in to scan meals.' }, 401);
      }
    } catch {
      return json({ error: 'Please sign in to scan meals.' }, 401);
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    if (!apiKey) {
      return json({ error: 'Server is missing its Gemini key.' }, 500);
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
      // Bounds cost, but must fit a multi-item plate's full JSON — a 700-token
      // cap truncated 4+ item analyses mid-object, which no repair can fix.
      max_tokens: 2048,
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

    // Call Gemini, retrying once if the reply won't parse. Flash occasionally
    // emits a malformed JSON object (a stray missing comma); parseLoose repairs
    // the common case and a second try covers the rest.
    let parsed: any = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      const res = await fetchWithTimeout(
        GEMINI_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
        },
        60_000, // vision requests are slower than text
      );

      if (!res.ok) {
        // Log the upstream detail server-side; never echo internals to clients.
        try {
          console.error('gemini error', res.status, (await res.json())?.error?.message ?? '');
        } catch {
          // ignore
        }
        if (res.status === 401) return json({ error: 'The server Gemini key was rejected.' }, 502);
        if (res.status === 429) {
          return json({ error: 'The analyzer is busy right now. Try again shortly.' }, 502);
        }
        return json({ error: 'The analyzer hit a snag. Please try again.' }, 502);
      }

      const data = await res.json();
      const content: string | undefined = data?.choices?.[0]?.message?.content;
      if (!content) continue;
      parsed = parseLoose(stripFences(content));
    }

    if (!parsed) {
      return json({ error: 'Could not read the analysis. Please try scanning again.' }, 502);
    }

    // Refine the estimate with real data (OFF → Exa) when the photo contains food,
    // then re-serialize so the app always receives valid JSON.
    if (parsed?.isFood && Array.isArray(parsed?.items) && parsed.items.length > 0) {
      parsed = await enrichMeal(apiKey, parsed);
    }
    return json({ content: JSON.stringify(parsed) }, 200);
  } catch (e) {
    console.error('analyze-food error', (e as Error)?.message);
    return json({ error: 'Unexpected server error. Please try again.' }, 500);
  }
});
