import type { Goal, WeightEntry } from './types';
import type { FatLossSettings } from './fat-loss-settings';

export type FatLossSessionKind = 'strength' | 'cardio' | 'mixed';

export type FatLossWeekSession = {
  index: number;
  kind: FatLossSessionKind;
  cardioMinutes: number;
};

export function buildFatLossWeek(settings: FatLossSettings, availableDays: number): FatLossWeekSession[] {
  const days = Math.max(2, Math.min(6, Math.round(availableDays)));
  const cardioDays = Math.min(
    days,
    settings.activityBaseline === 'inactive' ? 3 : settings.activityBaseline === 'some' ? 4 : 5,
  );
  const scheduledDays = Math.max(2, cardioDays);
  const strengthIndexes = new Set([0, scheduledDays - 1]);
  const cardioIndexes = new Set<number>();
  for (let index = 0; index < cardioDays; index += 1) {
    cardioIndexes.add(Math.round(index * (scheduledDays - 1) / Math.max(1, cardioDays - 1)));
  }
  return Array.from({ length: scheduledDays }, (_, index) => {
    const strength = strengthIndexes.has(index);
    const cardio = cardioIndexes.has(index);
    return {
      index: index + 1,
      kind: strength && cardio ? 'mixed' : strength ? 'strength' : 'cardio',
      cardioMinutes: cardio ? settings.comfortableCardioMinutes : 0,
    };
  });
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function weightTrendGuidance(weights: WeightEntry[], goal: Goal, selectedDate: string): string | null {
  if (goal === 'gain') return null;
  const eligible = weights
    .filter((entry) => entry.date <= selectedDate)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (eligible.length < 6) return null;
  const end = new Date(`${selectedDate}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - 20);
  const startKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const window = eligible.filter((entry) => entry.date >= startKey);
  const observedSpanDays = Math.floor((end.getTime() - new Date(`${window[0]?.date}T12:00:00`).getTime()) / 86_400_000);
  if (window.length < 6 || observedSpanDays < 18) return null;
  const firstCutoff = new Date(start);
  firstCutoff.setDate(firstCutoff.getDate() + 6);
  const firstCutoffKey = `${firstCutoff.getFullYear()}-${String(firstCutoff.getMonth() + 1).padStart(2, '0')}-${String(firstCutoff.getDate()).padStart(2, '0')}`;
  const lastStart = new Date(end);
  lastStart.setDate(lastStart.getDate() - 6);
  const lastStartKey = `${lastStart.getFullYear()}-${String(lastStart.getMonth() + 1).padStart(2, '0')}-${String(lastStart.getDate()).padStart(2, '0')}`;
  const first = window.filter((entry) => entry.date <= firstCutoffKey).map((entry) => entry.weightKg);
  const last = window.filter((entry) => entry.date >= lastStartKey).map((entry) => entry.weightKg);
  if (first.length < 2 || last.length < 2) return null;
  const firstMean = mean(first);
  const change = mean(last) - firstMean;
  if (goal === 'maintain' && Math.abs(change) <= firstMean * 0.01) {
    return 'Your three-week trend is within a steady maintenance range. Keep the strength and cardio habits you can sustain.';
  }
  const meaningfulLoss = Math.max(0.3, firstMean * 0.005);
  if (goal === 'lose' && change > -meaningfulLoss) {
    return 'Your three-week trend looks steady. Before adding exercise, review plan completion, food logging, sleep, and recovery; change only one small lever at a time.';
  }
  return null;
}
