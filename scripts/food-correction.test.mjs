import assert from 'node:assert/strict';
import test from 'node:test';

import { foodCorrectionPrompt, replaceFoodItem } from '../src/lib/food-correction.ts';

const scan = {
  isFood: true,
  title: 'Chicken with rice',
  items: [
    {
      name: 'white rice, cooked',
      quantity: '1 cup',
      grams: 158,
      calories: 205,
      protein_g: 4,
      carbs_g: 45,
      fat_g: 0,
      nutritionSource: 'usda_fdc',
    },
    {
      name: 'chicken breast, cooked',
      quantity: '100 g',
      grams: 100,
      calories: 165,
      protein_g: 31,
      carbs_g: 0,
      fat_g: 4,
      nutritionSource: 'usda_fdc',
    },
  ],
  total: { calories: 370, protein_g: 35, carbs_g: 45, fat_g: 4 },
  confidence: 0.8,
  notes: 'Original scan note about chicken.',
};

test('replaces a detected food and recalculates the meal totals and title', () => {
  const corrected = replaceFoodItem(scan, 1, [
    {
      name: 'fish, cooked',
      quantity: '100 g',
      grams: 100,
      calories: 206,
      protein_g: 22,
      carbs_g: 0,
      fat_g: 12,
      nutritionSource: 'usda_fdc',
    },
  ]);

  assert.equal(corrected.title, 'fish with rice');
  assert.equal(corrected.items[1].name, 'fish, cooked');
  assert.deepEqual(corrected.total, { calories: 411, protein_g: 26, carbs_g: 45, fat_g: 12 });
  assert.match(corrected.notes, /USDA FoodData Central/);
  assert.doesNotMatch(corrected.notes, /Original scan note/);
});

test('uses the scanned gram estimate when the serving field is empty', () => {
  assert.equal(foodCorrectionPrompt('fish', '', 100), 'I ate 100 g of fish');
});
