import assert from 'node:assert/strict';
import test from 'node:test';

import { dailyMealSuggestions, photoMealMemory } from '../src/lib/meal-memory.ts';

function meal(title, createdAt, inputSource, photoUri) {
  return {
    id: `${title}-${createdAt}`,
    date: '2026-07-27',
    createdAt,
    title,
    total: { calories: 100, protein_g: 1, carbs_g: 1, fat_g: 1 },
    items: [],
    confidence: 1,
    photoUri,
    analysisMeta: inputSource ? { inputSource } : undefined,
  };
}

test('daily meals rank frequent text logs first and always return five options', () => {
  const meals = [
    meal('Latte', 6, 'text'),
    meal('Cappuccino', 5, 'text'),
    meal('Cappuccino', 4, 'text'),
    meal('Cappuccino', 3, 'text'),
    meal('Latte', 2, 'text'),
    meal('Protein bar', 1, 'barcode'),
    {
      ...meal('Legacy barcode', 0),
      notes: 'From barcode 1234',
      analysisMeta: { pipelineVersion: 'open-food-facts-v3.6' },
    },
  ];

  const suggestions = dailyMealSuggestions(meals);
  assert.equal(suggestions.length, 5);
  assert.deepEqual(
    suggestions.slice(0, 2).map(({ label, logCount }) => ({ label, logCount })),
    [
      { label: 'Cappuccino', logCount: 3 },
      { label: 'Latte', logCount: 2 },
    ],
  );
  assert.ok(!suggestions.some((item) => item.label === 'Protein bar'));
  assert.ok(!suggestions.some((item) => item.label === 'Legacy barcode'));
});

test('legacy logs seed memory without confusing photos and text', () => {
  const suggestions = dailyMealSuggestions([
    meal('Legacy text meal', 2),
    meal('Legacy photo meal', 1, undefined, 'file:///meal.jpg'),
  ]);

  assert.equal(suggestions[0].label, 'Legacy text meal');
  assert.ok(!suggestions.some((item) => item.label === 'Legacy photo meal'));
});

test('photo memory uses both sources and weighs repeated scans more strongly', () => {
  const hints = photoMealMemory([
    meal('Cappuccino', 5, 'text'),
    meal('Cappuccino', 4, 'photo'),
    meal('Cappuccino', 3, 'photo'),
    meal('Latte', 2, 'text'),
    meal('Latte', 1, 'text'),
    meal('Saved breakfast', 0, 'quick_log'),
  ]);

  assert.deepEqual(hints.slice(0, 2), [
    { title: 'Cappuccino', textCount: 1, photoCount: 2 },
    { title: 'Latte', textCount: 2, photoCount: 0 },
  ]);
  assert.ok(!hints.some((hint) => hint.title === 'Saved breakfast'));
});
