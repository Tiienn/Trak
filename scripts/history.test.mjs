import assert from 'node:assert/strict';
import test from 'node:test';

import {
  askHistoryContext,
  buildDailyHistory,
  loggingStreakOn,
  personalRecords,
} from '../src/lib/history.ts';

const totals = (calories, protein_g, carbs_g, fat_g) => ({ calories, protein_g, carbs_g, fat_g });
const meal = (id, date, total) => ({
  id,
  date,
  createdAt: new Date(`${date}T12:00:00`).getTime(),
  title: `Meal ${id}`,
  total,
  items: [],
  confidence: 1,
});

const input = {
  meals: [
    meal('a', '2026-08-18', totals(900, 70, 100, 30)),
    meal('b', '2026-08-19', totals(1_500, 120, 160, 45)),
  ],
  exercises: [{ id: 'run', date: '2026-08-19', createdAt: 1, name: 'Run', caloriesBurned: 400, durationMinutes: 30 }],
  water: [{ date: '2026-08-19', glasses: 9 }],
  supplements: [{ id: 'vitamin', name: 'Vitamin D', createdAt: '2026-08-01T08:00:00Z' }],
  supplementChecks: [{ supplementId: 'vitamin', day: '2026-08-19' }],
  targets: totals(2_000, 130, 200, 60),
  waterGoal: 8,
};

test('daily history combines nutrition, exercise, water, supplements, streak and score', () => {
  const days = buildDailyHistory(input);
  assert.deepEqual(days.map((day) => day.date), ['2026-08-19', '2026-08-18']);
  assert.equal(days[0].waterGlasses, 9);
  assert.equal(days[0].supplementsTaken[0].name, 'Vitamin D');
  assert.equal(days[0].caloriesBurned, 400);
  assert.equal(days[0].loggingStreak, 2);
  assert.ok(days[0].score > days[1].score);
});

test('historical logging streak stops at gaps', () => {
  assert.equal(loggingStreakOn('2026-08-19', new Set(['2026-08-17', '2026-08-19'])), 1);
  assert.equal(loggingStreakOn('2026-08-18', new Set(['2026-08-17', '2026-08-19'])), 0);
});

test('personal record context is compact and contains no raw meal labels', () => {
  const days = buildDailyHistory(input);
  const records = personalRecords(days);
  const context = askHistoryContext(days, records);
  assert.match(context.personalRecords, /Best Trak score/);
  assert.match(context.recentDays, /supplements 1\/1/);
  assert.doesNotMatch(context.recentDays, /Meal a|Meal b/);
});
