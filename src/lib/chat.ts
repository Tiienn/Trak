import { applyCalorieBias, extractError, normalizeFoodJson } from './analyzeFood';
import { supabase } from './supabase';
import { FoodAnalysis, FoodTotals } from './types';
import type { ChatMealContext } from './chat-context';

/** One bubble in the conversation (what we also send back as history). */
export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

/** What Trak answered: either plain text, or text plus a loggable meal. */
export type TrakReply =
  | { kind: 'answer'; reply: string }
  | { kind: 'meal'; reply: string; analysis: FoodAnalysis };

/**
 * Sends the conversation to the trak-chat edge function (Gemini server-side).
 * `history` should be the recent turns, oldest first, ending with the user's
 * newest message. Throws a friendly Error on failure.
 */
export async function askTrak(
  history: ChatTurn[],
  context: {
    targets: FoodTotals;
    eaten: FoodTotals;
    exercise?: { burned: number; credited: number };
    meals?: ChatMealContext[];
    recentDays?: string;
    personalRecords?: string;
  },
  biasPct = 0,
  signal?: AbortSignal,
): Promise<TrakReply> {
  const { data, error } = await supabase.functions.invoke('trak-chat', {
    body: { messages: history.slice(-10), context },
    signal,
  });

  if (error) {
    throw new Error(await extractError(error));
  }
  if (data?.error) {
    throw new Error(String(data.error));
  }

  const content: string | undefined = data?.content;
  if (!content) {
    throw new Error('Trak returned an empty answer. Please try again.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Could not read the answer. Please try again.');
  }
  if (data?.meta && typeof data.meta === 'object') {
    parsed.analysisMeta = { ...(parsed.pipeline ?? {}), ...data.meta };
  }

  const reply = String(parsed?.reply ?? '').trim();

  if (parsed?.kind === 'meal') {
    const analysis = applyCalorieBias(normalizeFoodJson({ ...parsed, isFood: true }), biasPct);
    analysis.analysisMeta = { ...analysis.analysisMeta, inputSource: 'text' };
    return {
      kind: 'meal',
      reply: reply || `About ${analysis.total.calories} calories.`,
      analysis,
    };
  }

  return { kind: 'answer', reply: reply || 'Sorry, I did not catch that — try again?' };
}
