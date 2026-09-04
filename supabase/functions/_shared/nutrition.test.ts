import { assertEquals } from 'jsr:@std/assert@1';

import { dailyAiUsageDecision, enrichMeal, nutritionCandidateIssue, type Macro } from './nutrition.ts';

const issue = (macro: Macro, grams: number, baseline?: number) =>
  nutritionCandidateIssue(macro, grams, baseline);

Deno.test('accepts plausible nutrition across foods and drinks', () => {
  assertEquals(issue({ calories: 52, protein_g: 0, carbs_g: 14, fat_g: 0 }, 100, 55), null);
  assertEquals(issue({ calories: 119, protein_g: 0, carbs_g: 0, fat_g: 14 }, 14, 120), null);
  assertEquals(issue({ calories: 125, protein_g: 0, carbs_g: 4, fat_g: 0 }, 150, 120), null);
  assertEquals(issue({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }, 250, 0), null);
  assertEquals(issue({ calories: 620, protein_g: 35, carbs_g: 75, fat_g: 20 }, 420, 600), null);
});

Deno.test('rejects the reported mocha frappe regression', () => {
  assertEquals(
    issue({ calories: 2835, protein_g: 77, carbs_g: 1035, fat_g: 63 }, 700, 370),
    'macros_exceed_portion',
  );
});

Deno.test('rejects invalid values and impossible serving density', () => {
  assertEquals(issue({ calories: -1, protein_g: 0, carbs_g: 0, fat_g: 0 }, 100), 'invalid_value');
  assertEquals(issue({ calories: 100, protein_g: 0, carbs_g: 0, fat_g: 0 }, 0), 'invalid_portion');
  assertEquals(
    issue({ calories: 600, protein_g: 0, carbs_g: 0, fat_g: 0 }, 50),
    'energy_exceeds_portion',
  );
});

Deno.test('rejects calorie/macro contradictions while allowing alcohol energy', () => {
  assertEquals(
    issue({ calories: 250, protein_g: 30, carbs_g: 100, fat_g: 20 }, 300),
    'calorie_macro_mismatch',
  );
  assertEquals(issue({ calories: 125, protein_g: 0, carbs_g: 4, fat_g: 0 }, 150), null);
});

Deno.test('rejects source matches more than threefold from a meaningful estimate', () => {
  const candidate = { calories: 1000, protein_g: 20, carbs_g: 100, fat_g: 50 };
  assertEquals(issue(candidate, 500, 300), 'diverges_from_estimate');
  assertEquals(issue(candidate, 500, 0), null);
});

Deno.test('AI usage accounting fails closed on errors or malformed RPC output', () => {
  assertEquals(dailyAiUsageDecision(true, null), 'allowed');
  assertEquals(dailyAiUsageDecision(false, null), 'limited');
  assertEquals(dailyAiUsageDecision(null, null), 'unavailable');
  assertEquals(dailyAiUsageDecision(true, { code: 'database_error' }), 'unavailable');
});

Deno.test('web enrichment rejects a broken item without discarding a valid food', async () => {
  const originalFetch = globalThis.fetch;
  const originalExaKey = Deno.env.get('EXA_API_KEY');
  Deno.env.set('EXA_API_KEY', 'test-key');
  globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('api.nal.usda.gov')) {
      return Response.json({ foods: [] });
    }
    if (url.includes('api.exa.ai')) {
      return Response.json({ answer: 'Mock nutrition reference' });
    }
    if (url.includes('generativelanguage.googleapis.com')) {
      return Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              items: [
                { index: 0, calories: 2835, protein_g: 77, carbs_g: 1035, fat_g: 63 },
                { index: 1, calories: 320, protein_g: 12, carbs_g: 50, fat_g: 8 },
              ],
            }),
          },
        }],
      });
    }
    throw new Error(`Unexpected test URL: ${url}`);
  };

  try {
    const result = await enrichMeal('test-gemini-key', {
      kind: 'meal',
      items: [
        {
          name: 'Mocha frappe', quantity: '1 medium', grams: 700, source_hint: 'unknown',
          calories: 370, protein_g: 6, carbs_g: 55, fat_g: 12,
        },
        {
          name: 'Dholl puri', quantity: '2 pieces', grams: 240, source_hint: 'local',
          calories: 300, protein_g: 10, carbs_g: 48, fat_g: 8,
        },
      ],
      total: { calories: 670, protein_g: 16, carbs_g: 103, fat_g: 20 },
      reply: 'About 670 calories.',
    });

    assertEquals(result.items[0].calories, 370);
    assertEquals(result.items[0].nutrition_source, 'model');
    assertEquals(result.items[1].calories, 320);
    assertEquals(result.items[1].nutrition_source, 'web');
    assertEquals(result.total, { calories: 690, protein_g: 18, carbs_g: 105, fat_g: 20 });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalExaKey === undefined) Deno.env.delete('EXA_API_KEY');
    else Deno.env.set('EXA_API_KEY', originalExaKey);
  }
});
