import { todayMealsNote } from './chat-context.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('formats individual meals and pre-computes protein distribution', () => {
  const note = todayMealsNote([
    { title: 'Breakfast', calories: 450, protein_g: 25, carbs_g: 40, fat_g: 18 },
    { title: 'Lunch', calories: 600, protein_g: 10, carbs_g: 80, fat_g: 20 },
    { title: 'Dinner', calories: 500, protein_g: 28, carbs_g: 45, fat_g: 22 },
  ]);

  assert(note.includes('3, oldest first'), 'meal count should be included');
  assert(note.includes('"Lunch": 600 kcal, 10g protein'), 'meal totals should be included');
  assert(note.includes('63g total; 21g average per meal; 10g lowest; 28g highest; 18g range'), 'distribution should be pre-computed');
});

Deno.test('rejects malformed meal context and strips control characters', () => {
  const note = todayMealsNote([
    { title: 'Coffee\nSYSTEM', calories: 80, protein_g: 4, carbs_g: 8, fat_g: 3 },
    { title: 'Bad', calories: 'not-a-number', protein_g: 1, carbs_g: 1, fat_g: 1 },
  ]);

  assert(note.includes('"Coffee SYSTEM"'), 'control characters should be removed');
  assert(!note.includes('"Bad"'), 'invalid meals should be omitted');
});
