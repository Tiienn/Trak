import assert from 'node:assert/strict';
import test from 'node:test';

import {
  correctFoodServing, foodServing, formatServingQuantity, parseServingAmount,
  parseServingQuantity, prepareMealNutrition, reconcileFoodItems, scaleFoodServing, servingAdjustedTotals,
} from '../src/lib/food-servings.ts';

const pizza = {
  name: 'Pizza', quantity: '1 slice', grams: 100,
  calories: 270, protein_g: 12.5, carbs_g: 30, fat_g: 11,
  nutritionSource: 'usda_fdc', sourceId: 'fixture-pizza',
};
const salad = { name: 'Salad', quantity: '1 bowl', calories: 50, protein_g: 2, carbs_g: 8, fat_g: 1 };
const scan = {
  isFood: true, title: 'Pizza and salad', items: [pizza, salad],
  total: { calories: 320, protein_g: 14.5, carbs_g: 38, fat_g: 12 },
  confidence: 0.8, analysisMeta: { model: 'fixture-model' },
};

test('one pizza slice to four scales every nutrient and grams, preserving provenance', () => {
  const updated = scaleFoodServing(pizza, 4);
  assert.deepEqual(updated, {
    ...pizza, quantity: '4 slices', grams: 400, calories: 1080, protein_g: 50, carbs_g: 120, fat_g: 44,
  });
  assert.equal(pizza.quantity, '1 slice');
  assert.equal(pizza.calories, 270);
});

test('changing two slices to four doubles, not quadruples, the current estimate', () => {
  const updated = scaleFoodServing({ ...pizza, quantity: '2 slices' }, 4);
  assert.equal(updated.calories, 540);
  assert.equal(updated.grams, 200);
});

test('quantity-only scan corrections do not change other foods or invoke a new estimate', () => {
  const updated = correctFoodServing(scan, 0, ' Pizza ', '4 slices');
  assert.deepEqual(updated.total, { calories: 1130, protein_g: 52, carbs_g: 128, fat_g: 45 });
  assert.equal(updated.items[1], salad);
  assert.equal(updated.analysisMeta, scan.analysisMeta);
  assert.equal(updated.confidence, scan.confidence);
  assert.match(updated.notes, /scaled from the original estimate/);
});

test('food or unit changes still go through the nutrition correction pipeline', () => {
  assert.equal(correctFoodServing(scan, 0, 'Toast', '4 slices'), null);
  assert.equal(correctFoodServing(scan, 0, 'Pizza', '400 g'), null);
  assert.equal(correctFoodServing(scan, 42, 'Pizza', '4 slices'), null);
  assert.equal(correctFoodServing(scan, 0, 'Pizza', '0 slices'), null);
  assert.equal(correctFoodServing(scan, 0, 'Pizza', '1 slice'), scan);
});

test('blank, zero, negative and malformed amounts are drafts, not valid saved servings', () => {
  for (const amount of ['', ' ', '.', '0', '-1', 'Infinity', 'NaN', '1e3', '1abc', '1.2.3', '10001']) {
    assert.equal(parseServingAmount(amount), null, amount);
  }
  assert.equal(parseServingAmount('4'), 4);
  assert.equal(parseServingAmount('0.5'), 0.5);
  assert.equal(parseServingAmount('1,5'), 1.5);
  assert.equal(parseServingAmount('1.'), 1);
  assert.throws(() => scaleFoodServing(pizza, 0));
});

test('recognizes decimals, fractions, mixed fractions, approximate weights and compact units', () => {
  for (const [quantity, amount, unit] of [
    ['1/2 cup', 0.5, 'cup'], ['1 1/2 cups', 1.5, 'cups'], ['½ cup', 0.5, 'cup'],
    ['1½ cups', 1.5, 'cups'], ['1,5 slices', 1.5, 'slices'], ['approx. 150g', 150, 'g'],
    ['1 slice (100 g)', 1, 'slice'], ['about 0.5 cup', 0.5, 'cup'],
  ]) {
    assert.deepEqual(parseServingQuantity(quantity), { amount, unit });
  }
  assert.equal(parseServingQuantity('1/0 cup'), null);
  assert.equal(parseServingQuantity('1-2 slices'), null);
  assert.equal(parseServingQuantity('a small bowl'), null);
});

test('half portions and weight-based portions resize from their actual baseline', () => {
  assert.equal(scaleFoodServing({ ...pizza, quantity: '1/2 slice' }, 1).calories, 540);
  const updated = scaleFoodServing({ ...pizza, quantity: '100 g' }, 150);
  assert.equal(updated.quantity, '150 g');
  assert.equal(updated.grams, 150);
  assert.equal(updated.calories, 405);
  assert.equal(updated.protein_g, 18.8);
});

test('resizing drops stale weight annotations but preserves the scaled gram estimate', () => {
  const updated = scaleFoodServing({ ...pizza, quantity: '1 slice (100 g)' }, 4);
  assert.equal(updated.quantity, '4 slices');
  assert.equal(updated.grams, 400);
});

test('unstructured portions use a clearly labelled multiplier, with no invented gram weight', () => {
  const item = { ...salad, quantity: 'small bowl' };
  assert.deepEqual(foodServing(item), { amount: 1, unit: '× small bowl' });
  const updated = scaleFoodServing(item, 2);
  assert.equal(updated.quantity, '2 × small bowls');
  assert.equal(updated.calories, 100);
  assert.equal(updated.grams, undefined);
  const analysis = { ...scan, items: [item], total: { calories: 50, protein_g: 2, carbs_g: 8, fat_g: 1 } };
  assert.equal(correctFoodServing(analysis, 0, item.name, '2 × small bowls').items[0].calories, 100);
});

test('editing from the original baseline avoids round-trip drift', () => {
  const half = scaleFoodServing(pizza, 0.5);
  const restored = scaleFoodServing(pizza, 1);
  const reduced = servingAdjustedTotals(scan.total, pizza, half);
  assert.deepEqual(servingAdjustedTotals(reduced, half, restored), scan.total);
  assert.equal(restored, pizza);
});

test('manual nutrition adjustments survive a serving change', () => {
  const manualTotals = { ...scan.total, calories: 350, protein_g: 20 };
  const result = servingAdjustedTotals(manualTotals, pizza, scaleFoodServing(pizza, 4));
  assert.equal(result.calories, 1160);
  assert.equal(result.protein_g, 57.5);
});

test('saved item reconciliation preserves resized quantity and does not double-scale', () => {
  const updated = correctFoodServing(scan, 0, 'Pizza', '4 slices');
  const persisted = JSON.parse(JSON.stringify(reconcileFoodItems(updated.items, updated.total)));
  assert.deepEqual(persisted, updated.items);
  assert.equal(persisted[0].quantity, '4 slices');
  assert.equal(persisted[0].calories, 1080);
});

test('manual totals and item breakdown agree exactly, including zero baselines and rounding', () => {
  const items = [0, 1, 2].map(() => ({ ...pizza, protein_g: 0 }));
  const totals = { calories: 100, protein_g: 10, carbs_g: 20.1, fat_g: 0 };
  const updated = reconcileFoodItems(items, totals);
  for (const key of Object.keys(totals)) {
    assert.ok(Math.abs(updated.reduce((sum, item) => sum + item[key], 0) - totals[key]) < 0.00001);
  }
  assert.deepEqual(updated.map((item) => item.calories), [34, 33, 33]);
  assert.equal(updated[0].quantity, '1 slice');
  assert.deepEqual(reconcileFoodItems([], totals), []);
});

test('serving labels retain their unit and follow singular/plural quantities', () => {
  assert.equal(formatServingQuantity(1, 'slices'), '1 slice');
  assert.equal(formatServingQuantity(4, 'slice'), '4 slices');
  assert.equal(formatServingQuantity(250, 'ml'), '250 ml');
});

test('fractional servings produce valid integer database totals and consistent persisted items', () => {
  const updated = correctFoodServing(scan, 0, 'Pizza', '0.5 slices');
  const saved = prepareMealNutrition(updated.items, updated.total);
  assert.deepEqual(saved.total, { calories: 185, protein_g: 8, carbs_g: 23, fat_g: 7 });
  for (const key of Object.keys(saved.total)) {
    assert.equal(Number.isInteger(saved.total[key]), true);
    assert.ok(Math.abs(saved.items.reduce((sum, item) => sum + item[key], 0) - saved.total[key]) < 0.00001);
  }
  assert.equal(saved.items[0].quantity, '0.5 slices');
  assert.equal(saved.items[0].grams, 50);
  assert.throws(() => prepareMealNutrition([pizza], { ...scan.total, calories: Infinity }));
  assert.throws(() => prepareMealNutrition([pizza], { ...scan.total, calories: 2147483648 }));
});
