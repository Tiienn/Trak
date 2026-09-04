import AsyncStorage from '@react-native-async-storage/async-storage';

import { higherLowerAnsweredRounds } from './game-rules';
import { dayKey } from './store';
import { supabase } from './supabase';

/**
 * The calorie target challenge — a built-in game that trains calorie
 * estimation. All nutrition data is local (no AI calls): instant, free,
 * offline, and consistent, which a scoring game needs.
 */

export type Ingredient = {
  id: string;
  name: string;
  emoji: string;
  /** Human portion, e.g. "1 cup cooked". */
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type IngredientCategory = {
  key: string;
  label: string;
  emoji: string;
  items: Ingredient[];
};

export const CATEGORIES: IngredientCategory[] = [
  {
    key: 'carbs',
    label: 'Carbs',
    emoji: '🍚',
    items: [
      { id: 'rice', name: 'White rice', emoji: '🍚', portion: '1 cup cooked', calories: 205, protein_g: 4, carbs_g: 45, fat_g: 0 },
      { id: 'fried-rice', name: 'Fried rice', emoji: '🍛', portion: '1 cup', calories: 240, protein_g: 6, carbs_g: 34, fat_g: 9 },
      { id: 'noodles', name: 'Egg noodles', emoji: '🍜', portion: '1 cup cooked', calories: 220, protein_g: 7, carbs_g: 40, fat_g: 3 },
      { id: 'instant-noodles', name: 'Instant noodles', emoji: '🥡', portion: '1 pack', calories: 380, protein_g: 8, carbs_g: 54, fat_g: 14 },
      { id: 'bread', name: 'White bread', emoji: '🍞', portion: '1 slice', calories: 80, protein_g: 3, carbs_g: 15, fat_g: 1 },
      { id: 'pasta', name: 'Pasta', emoji: '🍝', portion: '1 cup cooked', calories: 220, protein_g: 8, carbs_g: 43, fat_g: 1 },
      { id: 'potato', name: 'Potato', emoji: '🥔', portion: '1 medium', calories: 160, protein_g: 4, carbs_g: 37, fat_g: 0 },
      { id: 'sweet-potato', name: 'Sweet potato', emoji: '🍠', portion: '1 medium', calories: 110, protein_g: 2, carbs_g: 26, fat_g: 0 },
      { id: 'tortilla', name: 'Flour tortilla', emoji: '🫓', portion: '1 large', calories: 140, protein_g: 4, carbs_g: 24, fat_g: 3 },
      { id: 'oats', name: 'Oatmeal', emoji: '🥣', portion: '1 cup cooked', calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3 },
      { id: 'baguette', name: 'Baguette', emoji: '🥖', portion: '1/3 loaf', calories: 180, protein_g: 6, carbs_g: 36, fat_g: 1 },
      { id: 'fries', name: 'French fries', emoji: '🍟', portion: '1 medium', calories: 340, protein_g: 4, carbs_g: 44, fat_g: 16 },
    ],
  },
  {
    key: 'protein',
    label: 'Protein',
    emoji: '🍗',
    items: [
      { id: 'chicken-breast', name: 'Chicken breast', emoji: '🐔', portion: '150 g grilled', calories: 250, protein_g: 46, carbs_g: 0, fat_g: 5 },
      { id: 'chicken-thigh', name: 'Chicken thigh', emoji: '🍗', portion: '150 g roasted', calories: 320, protein_g: 38, carbs_g: 0, fat_g: 18 },
      { id: 'steak', name: 'Beef steak', emoji: '🥩', portion: '150 g', calories: 330, protein_g: 42, carbs_g: 0, fat_g: 18 },
      { id: 'ground-beef', name: 'Ground beef', emoji: '🍖', portion: '100 g cooked', calories: 250, protein_g: 26, carbs_g: 0, fat_g: 16 },
      { id: 'pork-chop', name: 'Pork chop', emoji: '🐖', portion: '150 g', calories: 290, protein_g: 39, carbs_g: 0, fat_g: 14 },
      { id: 'bacon', name: 'Bacon', emoji: '🥓', portion: '3 strips', calories: 130, protein_g: 9, carbs_g: 0, fat_g: 10 },
      { id: 'salmon', name: 'Salmon', emoji: '🐟', portion: '150 g', calories: 310, protein_g: 34, carbs_g: 0, fat_g: 19 },
      { id: 'white-fish', name: 'White fish', emoji: '🐠', portion: '150 g', calories: 150, protein_g: 32, carbs_g: 0, fat_g: 2 },
      { id: 'shrimp', name: 'Shrimp', emoji: '🦐', portion: '100 g', calories: 100, protein_g: 20, carbs_g: 1, fat_g: 1 },
      { id: 'tuna', name: 'Canned tuna', emoji: '🥫', portion: '1 can', calories: 120, protein_g: 26, carbs_g: 0, fat_g: 1 },
      { id: 'eggs', name: 'Eggs', emoji: '🥚', portion: '2 large', calories: 140, protein_g: 12, carbs_g: 1, fat_g: 10 },
      { id: 'tofu', name: 'Tofu', emoji: '🍲', portion: '150 g firm', calories: 110, protein_g: 12, carbs_g: 3, fat_g: 6 },
    ],
  },
  {
    key: 'veggies',
    label: 'Veggies',
    emoji: '🥦',
    items: [
      { id: 'broccoli', name: 'Broccoli', emoji: '🥦', portion: '1 cup', calories: 55, protein_g: 4, carbs_g: 11, fat_g: 0 },
      { id: 'salad', name: 'Side salad', emoji: '🥗', portion: '1 bowl', calories: 35, protein_g: 2, carbs_g: 7, fat_g: 0 },
      { id: 'spinach', name: 'Spinach', emoji: '🥬', portion: '1 cup cooked', calories: 40, protein_g: 5, carbs_g: 7, fat_g: 0 },
      { id: 'carrot', name: 'Carrot', emoji: '🥕', portion: '1 medium', calories: 25, protein_g: 1, carbs_g: 6, fat_g: 0 },
      { id: 'corn', name: 'Corn', emoji: '🌽', portion: '1 cup', calories: 130, protein_g: 5, carbs_g: 29, fat_g: 2 },
      { id: 'mushrooms', name: 'Mushrooms', emoji: '🍄', portion: '1 cup', calories: 20, protein_g: 3, carbs_g: 3, fat_g: 0 },
      { id: 'tomato', name: 'Tomato', emoji: '🍅', portion: '1 medium', calories: 22, protein_g: 1, carbs_g: 5, fat_g: 0 },
    ],
  },
  {
    key: 'fruits',
    label: 'Fruits',
    emoji: '🍌',
    items: [
      { id: 'banana', name: 'Banana', emoji: '🍌', portion: '1 medium', calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0 },
      { id: 'apple', name: 'Apple', emoji: '🍎', portion: '1 medium', calories: 95, protein_g: 0, carbs_g: 25, fat_g: 0 },
      { id: 'orange', name: 'Orange', emoji: '🍊', portion: '1 medium', calories: 60, protein_g: 1, carbs_g: 15, fat_g: 0 },
      { id: 'mango', name: 'Mango', emoji: '🥭', portion: '1 cup', calories: 100, protein_g: 1, carbs_g: 25, fat_g: 0 },
      { id: 'grapes', name: 'Grapes', emoji: '🍇', portion: '1 cup', calories: 60, protein_g: 1, carbs_g: 16, fat_g: 0 },
      { id: 'berries', name: 'Blueberries', emoji: '🫐', portion: '1 cup', calories: 85, protein_g: 1, carbs_g: 21, fat_g: 0 },
      { id: 'avocado', name: 'Avocado', emoji: '🥑', portion: '1/2 fruit', calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15 },
    ],
  },
  {
    key: 'dairy',
    label: 'Dairy',
    emoji: '🧀',
    items: [
      { id: 'milk', name: 'Milk', emoji: '🥛', portion: '1 glass', calories: 120, protein_g: 8, carbs_g: 12, fat_g: 5 },
      { id: 'greek-yogurt', name: 'Greek yogurt', emoji: '🍶', portion: '1 cup nonfat', calories: 130, protein_g: 23, carbs_g: 9, fat_g: 0 },
      { id: 'cheese', name: 'Cheese', emoji: '🧀', portion: '1 slice', calories: 110, protein_g: 7, carbs_g: 0, fat_g: 9 },
    ],
  },
  {
    key: 'fats',
    label: 'Fats & sauces',
    emoji: '🫒',
    items: [
      { id: 'olive-oil', name: 'Olive oil', emoji: '🫒', portion: '1 tbsp', calories: 120, protein_g: 0, carbs_g: 0, fat_g: 14 },
      { id: 'butter', name: 'Butter', emoji: '🧈', portion: '1 tbsp', calories: 100, protein_g: 0, carbs_g: 0, fat_g: 11 },
      { id: 'mayo', name: 'Mayonnaise', emoji: '🫙', portion: '1 tbsp', calories: 90, protein_g: 0, carbs_g: 0, fat_g: 10 },
      { id: 'peanut-butter', name: 'Peanut butter', emoji: '🥜', portion: '1 tbsp', calories: 95, protein_g: 4, carbs_g: 3, fat_g: 8 },
      { id: 'ketchup', name: 'Ketchup', emoji: '🥄', portion: '1 tbsp', calories: 20, protein_g: 0, carbs_g: 5, fat_g: 0 },
      { id: 'soy-sauce', name: 'Soy sauce', emoji: '🍾', portion: '1 tbsp', calories: 10, protein_g: 1, carbs_g: 1, fat_g: 0 },
      { id: 'honey', name: 'Honey', emoji: '🍯', portion: '1 tbsp', calories: 65, protein_g: 0, carbs_g: 17, fat_g: 0 },
    ],
  },
  {
    key: 'drinks',
    label: 'Drinks',
    emoji: '🥤',
    items: [
      { id: 'cola', name: 'Cola', emoji: '🥤', portion: '1 can', calories: 140, protein_g: 0, carbs_g: 39, fat_g: 0 },
      { id: 'orange-juice', name: 'Orange juice', emoji: '🧃', portion: '1 glass', calories: 110, protein_g: 2, carbs_g: 26, fat_g: 0 },
      { id: 'latte', name: 'Latte', emoji: '☕', portion: '1 cup', calories: 120, protein_g: 6, carbs_g: 10, fat_g: 6 },
      { id: 'beer', name: 'Beer', emoji: '🍺', portion: '1 pint', calories: 150, protein_g: 2, carbs_g: 13, fat_g: 0 },
      { id: 'boba', name: 'Bubble tea', emoji: '🧋', portion: '1 medium', calories: 350, protein_g: 4, carbs_g: 54, fat_g: 12 },
      { id: 'protein-shake', name: 'Protein shake', emoji: '🫗', portion: '1 shake', calories: 160, protein_g: 25, carbs_g: 9, fat_g: 3 },
    ],
  },
  {
    key: 'snacks',
    label: 'Fast food & snacks',
    emoji: '🍔',
    items: [
      { id: 'burger', name: 'Big burger', emoji: '🍔', portion: '1 burger', calories: 560, protein_g: 26, carbs_g: 45, fat_g: 30 },
      { id: 'pizza', name: 'Pizza', emoji: '🍕', portion: '1 slice', calories: 285, protein_g: 12, carbs_g: 36, fat_g: 10 },
      { id: 'fried-chicken', name: 'Fried chicken', emoji: '🍗', portion: '1 piece', calories: 320, protein_g: 19, carbs_g: 12, fat_g: 21 },
      { id: 'hot-dog', name: 'Hot dog', emoji: '🌭', portion: '1', calories: 300, protein_g: 10, carbs_g: 24, fat_g: 18 },
      { id: 'spring-roll', name: 'Spring roll', emoji: '🥟', portion: '1 roll', calories: 110, protein_g: 2, carbs_g: 12, fat_g: 6 },
      { id: 'donut', name: 'Donut', emoji: '🍩', portion: '1', calories: 250, protein_g: 3, carbs_g: 31, fat_g: 12 },
      { id: 'chocolate', name: 'Chocolate', emoji: '🍫', portion: '1 bar', calories: 230, protein_g: 3, carbs_g: 26, fat_g: 13 },
      { id: 'cookie', name: 'Cookie', emoji: '🍪', portion: '1 large', calories: 160, protein_g: 2, carbs_g: 21, fat_g: 8 },
      { id: 'ice-cream', name: 'Ice cream', emoji: '🍨', portion: '1 scoop', calories: 140, protein_g: 2, carbs_g: 17, fat_g: 7 },
    ],
  },
  {
    key: 'plant-protein',
    label: 'Plant protein',
    emoji: '🫘',
    items: [
      { id: 'lentils', name: 'Lentils', emoji: '🫘', portion: '1 cup cooked', calories: 230, protein_g: 18, carbs_g: 40, fat_g: 1 },
      { id: 'chickpeas', name: 'Chickpeas', emoji: '🫘', portion: '1 cup cooked', calories: 270, protein_g: 15, carbs_g: 45, fat_g: 4 },
      { id: 'black-beans', name: 'Black beans', emoji: '🫘', portion: '1 cup cooked', calories: 225, protein_g: 15, carbs_g: 41, fat_g: 1 },
      { id: 'kidney-beans', name: 'Kidney beans', emoji: '🫘', portion: '1 cup cooked', calories: 225, protein_g: 15, carbs_g: 40, fat_g: 1 },
      { id: 'tempeh', name: 'Tempeh', emoji: '🌱', portion: '100 g', calories: 195, protein_g: 20, carbs_g: 8, fat_g: 11 },
      { id: 'edamame', name: 'Edamame', emoji: '🫛', portion: '1 cup', calories: 190, protein_g: 18, carbs_g: 14, fat_g: 8 },
      { id: 'hummus', name: 'Hummus', emoji: '🥣', portion: '1/4 cup', calories: 165, protein_g: 5, carbs_g: 14, fat_g: 10 },
      { id: 'falafel', name: 'Falafel', emoji: '🧆', portion: '3 pieces', calories: 250, protein_g: 10, carbs_g: 28, fat_g: 12 },
    ],
  },
  {
    key: 'breakfast',
    label: 'Breakfast',
    emoji: '🥞',
    items: [
      { id: 'granola', name: 'Granola', emoji: '🥣', portion: '1/2 cup', calories: 220, protein_g: 5, carbs_g: 36, fat_g: 7 },
      { id: 'bagel', name: 'Bagel', emoji: '🥯', portion: '1 medium', calories: 280, protein_g: 10, carbs_g: 56, fat_g: 2 },
      { id: 'pancakes', name: 'Pancakes', emoji: '🥞', portion: '2 medium', calories: 350, protein_g: 8, carbs_g: 52, fat_g: 12 },
      { id: 'breakfast-cereal', name: 'Breakfast cereal', emoji: '🥣', portion: '1 bowl with milk', calories: 240, protein_g: 8, carbs_g: 43, fat_g: 5 },
      { id: 'yogurt-parfait', name: 'Yogurt parfait', emoji: '🍓', portion: '1 cup', calories: 260, protein_g: 14, carbs_g: 42, fat_g: 5 },
      { id: 'avocado-toast', name: 'Avocado toast', emoji: '🥑', portion: '1 slice', calories: 260, protein_g: 7, carbs_g: 29, fat_g: 14 },
      { id: 'croissant', name: 'Croissant', emoji: '🥐', portion: '1 medium', calories: 230, protein_g: 5, carbs_g: 26, fat_g: 12 },
      { id: 'breakfast-sandwich', name: 'Breakfast sandwich', emoji: '🥪', portion: '1 sandwich', calories: 430, protein_g: 22, carbs_g: 34, fat_g: 23 },
    ],
  },
  {
    key: 'world-meals',
    label: 'World meals',
    emoji: '🍽️',
    items: [
      { id: 'chicken-curry', name: 'Chicken curry', emoji: '🍛', portion: '1 bowl', calories: 420, protein_g: 32, carbs_g: 24, fat_g: 22 },
      { id: 'biryani', name: 'Biryani', emoji: '🍛', portion: '1 plate', calories: 550, protein_g: 24, carbs_g: 72, fat_g: 18 },
      { id: 'sushi-roll', name: 'Sushi roll', emoji: '🍣', portion: '8 pieces', calories: 330, protein_g: 14, carbs_g: 52, fat_g: 8 },
      { id: 'ramen-bowl', name: 'Ramen bowl', emoji: '🍜', portion: '1 bowl', calories: 500, protein_g: 22, carbs_g: 66, fat_g: 18 },
      { id: 'tacos', name: 'Tacos', emoji: '🌮', portion: '3 tacos', calories: 480, protein_g: 24, carbs_g: 48, fat_g: 22 },
      { id: 'burrito-bowl', name: 'Burrito bowl', emoji: '🥙', portion: '1 bowl', calories: 620, protein_g: 32, carbs_g: 78, fat_g: 22 },
      { id: 'pad-thai', name: 'Pad Thai', emoji: '🍜', portion: '1 plate', calories: 650, protein_g: 24, carbs_g: 88, fat_g: 22 },
      { id: 'couscous-bowl', name: 'Couscous bowl', emoji: '🥣', portion: '1 bowl', calories: 430, protein_g: 16, carbs_g: 68, fat_g: 12 },
      { id: 'poke-bowl', name: 'Poke bowl', emoji: '🥗', portion: '1 bowl', calories: 520, protein_g: 30, carbs_g: 65, fat_g: 16 },
      { id: 'dholl-puri', name: 'Dholl puri', emoji: '🫓', portion: '2 filled flatbreads', calories: 430, protein_g: 16, carbs_g: 72, fat_g: 9 },
      { id: 'shakshuka', name: 'Shakshuka', emoji: '🍳', portion: '1 skillet serving', calories: 330, protein_g: 18, carbs_g: 22, fat_g: 20 },
      { id: 'lasagna', name: 'Lasagna', emoji: '🍝', portion: '1 slice', calories: 450, protein_g: 26, carbs_g: 38, fat_g: 22 },
    ],
  },
  {
    key: 'desserts',
    label: 'Desserts',
    emoji: '🍰',
    items: [
      { id: 'cheesecake', name: 'Cheesecake', emoji: '🍰', portion: '1 slice', calories: 400, protein_g: 7, carbs_g: 32, fat_g: 28 },
      { id: 'brownie', name: 'Brownie', emoji: '🍫', portion: '1 square', calories: 240, protein_g: 3, carbs_g: 36, fat_g: 10 },
      { id: 'muffin', name: 'Muffin', emoji: '🧁', portion: '1 medium', calories: 340, protein_g: 5, carbs_g: 48, fat_g: 14 },
      { id: 'custard', name: 'Custard', emoji: '🍮', portion: '1/2 cup', calories: 170, protein_g: 5, carbs_g: 24, fat_g: 6 },
      { id: 'rice-pudding', name: 'Rice pudding', emoji: '🍚', portion: '1 cup', calories: 300, protein_g: 8, carbs_g: 54, fat_g: 6 },
      { id: 'mochi', name: 'Mochi', emoji: '🍡', portion: '2 pieces', calories: 190, protein_g: 2, carbs_g: 40, fat_g: 3 },
      { id: 'churros', name: 'Churros', emoji: '🥨', portion: '3 pieces', calories: 350, protein_g: 5, carbs_g: 46, fat_g: 17 },
      { id: 'fruit-sorbet', name: 'Fruit sorbet', emoji: '🍧', portion: '1 cup', calories: 220, protein_g: 1, carbs_g: 52, fat_g: 0 },
    ],
  },
];

/** Flat id → ingredient lookup. */
export const INGREDIENT_BY_ID: Record<string, Ingredient> = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.items).map((i) => [i.id, i])
);

export const ALL_INGREDIENTS = CATEGORIES.flatMap((category) => category.items);

export type DeckGroup = 'food' | 'meal' | 'cuisine';

export type GameDeck = {
  key: string;
  group: DeckGroup;
  label: string;
  description: string;
};

export const GAME_DECKS: GameDeck[] = [
  { key: 'personal', group: 'food', label: 'From your recent meals', description: 'A varied deck shaped by foods you log.' },
  { key: 'everyday', group: 'food', label: 'Everyday meals', description: 'Staples, produce, dairy, and mixed plates.' },
  { key: 'restaurant', group: 'food', label: 'Restaurant & takeaway', description: 'Common meals when eating out.' },
  { key: 'drinks-snacks', group: 'food', label: 'Drinks & snacks', description: 'Small portions with a wide calorie range.' },
  { key: 'protein-foods', group: 'food', label: 'Protein foods', description: 'Animal, plant, and dairy protein.' },
  { key: 'sauces-extras', group: 'food', label: 'Sauces & extras', description: 'The add-ons that are easy to overlook.' },
  { key: 'breakfast-meal', group: 'meal', label: 'Breakfast', description: 'Morning meals and drinks.' },
  { key: 'lunch-dinner', group: 'meal', label: 'Lunch & dinner', description: 'Complete meals from around the world.' },
  { key: 'light-meals', group: 'meal', label: 'Light meals', description: 'Salads, soups, fruit, and smaller plates.' },
  { key: 'snack-time', group: 'meal', label: 'Snack time', description: 'Sweet, savoury, and drink choices.' },
  { key: 'global-basics', group: 'cuisine', label: 'Global basics', description: 'Familiar foods across regions.' },
  { key: 'mediterranean', group: 'cuisine', label: 'Mediterranean', description: 'Grains, seafood, vegetables, and olive oil.' },
  { key: 'south-asian', group: 'cuisine', label: 'South Asian', description: 'Rice, lentils, flatbreads, and curries.' },
  { key: 'east-asian', group: 'cuisine', label: 'East Asian', description: 'Rice, noodles, tofu, seafood, and soups.' },
  { key: 'african-indian-ocean', group: 'cuisine', label: 'African & Indian Ocean', description: 'Staples and mixed meals from the region.' },
  { key: 'middle-eastern', group: 'cuisine', label: 'Middle Eastern', description: 'Legumes, grains, sauces, and grilled foods.' },
  { key: 'latin-american', group: 'cuisine', label: 'Latin American', description: 'Tortillas, beans, rice, and mixed bowls.' },
];

const idsForCategories = (...keys: string[]) =>
  CATEGORIES.filter((category) => keys.includes(category.key)).flatMap((category) =>
    category.items.map((food) => food.id)
  );

export const GLOBAL_STARTER_IDS = [
  'rice', 'pasta', 'chicken-breast', 'salmon', 'tofu', 'lentils', 'broccoli', 'banana',
  'greek-yogurt', 'olive-oil', 'latte', 'burger', 'chicken-curry', 'sushi-roll', 'tacos',
  'couscous-bowl', 'hummus', 'fruit-sorbet',
];

const DECK_IDS: Record<string, string[]> = {
  personal: GLOBAL_STARTER_IDS,
  everyday: idsForCategories('carbs', 'protein', 'veggies', 'fruits', 'dairy', 'plant-protein', 'breakfast', 'world-meals'),
  restaurant: [
    ...idsForCategories('world-meals', 'snacks'),
    'fried-rice', 'instant-noodles', 'fries', 'boba', 'latte', 'beer', 'cheesecake', 'brownie',
  ],
  'drinks-snacks': idsForCategories('drinks', 'snacks', 'desserts', 'fruits'),
  'protein-foods': idsForCategories('protein', 'plant-protein', 'dairy'),
  'sauces-extras': [...idsForCategories('fats'), 'hummus'],
  'breakfast-meal': [
    ...idsForCategories('breakfast'),
    'oats', 'bread', 'eggs', 'milk', 'greek-yogurt', 'banana', 'berries', 'orange-juice', 'latte',
  ],
  'lunch-dinner': idsForCategories('carbs', 'protein', 'veggies', 'plant-protein', 'world-meals'),
  'light-meals': ['salad', 'spinach', 'tomato', 'mushrooms', 'white-fish', 'shrimp', 'tofu', 'hummus', 'greek-yogurt', 'apple', 'orange', 'berries', 'couscous-bowl', 'poke-bowl', 'shakshuka'],
  'snack-time': idsForCategories('fruits', 'drinks', 'desserts'),
  'global-basics': GLOBAL_STARTER_IDS,
  mediterranean: ['pasta', 'baguette', 'salmon', 'white-fish', 'shrimp', 'tomato', 'spinach', 'salad', 'olive-oil', 'greek-yogurt', 'cheese', 'hummus', 'falafel', 'couscous-bowl', 'shakshuka'],
  'south-asian': ['rice', 'lentils', 'chickpeas', 'tofu', 'mango', 'yogurt-parfait', 'chicken-curry', 'biryani', 'dholl-puri', 'honey'],
  'east-asian': ['rice', 'fried-rice', 'noodles', 'instant-noodles', 'tofu', 'tempeh', 'edamame', 'soy-sauce', 'salmon', 'shrimp', 'sushi-roll', 'ramen-bowl', 'pad-thai', 'poke-bowl', 'mochi'],
  'african-indian-ocean': ['rice', 'sweet-potato', 'lentils', 'chickpeas', 'kidney-beans', 'white-fish', 'tuna', 'mango', 'chicken-curry', 'biryani', 'dholl-puri', 'couscous-bowl'],
  'middle-eastern': ['rice', 'chickpeas', 'lentils', 'hummus', 'falafel', 'olive-oil', 'greek-yogurt', 'couscous-bowl', 'shakshuka'],
  'latin-american': ['rice', 'tortilla', 'corn', 'black-beans', 'kidney-beans', 'avocado', 'tomato', 'ground-beef', 'tacos', 'burrito-bowl'],
};

export function decksForGroup(group: DeckGroup): GameDeck[] {
  return GAME_DECKS.filter((deck) => deck.group === group);
}

export function foodsForDeck(deckKey?: string, customIds?: string[]): Ingredient[] {
  const ids = deckKey === 'personal' && customIds?.length ? customIds : DECK_IDS[deckKey ?? ''] ?? [];
  const foods = ids.map((id) => INGREDIENT_BY_ID[id]).filter((food): food is Ingredient => Boolean(food));
  return foods.length >= 2 ? Array.from(new Map(foods.map((food) => [food.id, food])).values()) : ALL_INGREDIENTS;
}

export function categoriesForFoods(foods: Ingredient[]): IngredientCategory[] {
  const allowed = new Set(foods.map((food) => food.id));
  return CATEGORIES.map((category) => ({
    ...category,
    items: category.items.filter((food) => allowed.has(food.id)),
  })).filter((category) => category.items.length > 0);
}

function normalizeFoodName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Build a small personalized deck from recent camera, barcode, and chat meal names. */
export function personalizedFoodIds(names: string[], limit = 18): string[] {
  const matched: string[] = [];
  for (const rawName of names) {
    const name = normalizeFoodName(rawName);
    if (!name) continue;
    const food = ALL_INGREDIENTS.find((candidate) => {
      const candidateName = normalizeFoodName(candidate.name);
      return name.includes(candidateName) || candidateName.includes(name);
    });
    if (food && !matched.includes(food.id)) matched.push(food.id);
    if (matched.length >= limit) break;
  }
  for (const id of GLOBAL_STARTER_IDS) {
    if (!matched.includes(id)) matched.push(id);
    if (matched.length >= limit) break;
  }
  return matched;
}

export type Challenge = {
  targetCalories: number;
  minProtein: number;
};

const CAL_TARGETS = [450, 500, 550, 600, 650, 700, 750, 800];
const PROTEIN_MINS = [25, 30, 35, 40, 45];

/** Tiny deterministic PRNG so the daily challenge is the same all day. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Today's challenge — seeded by the calendar day, same for everyone. */
export function dailyChallenge(day: string = dayKey()): Challenge {
  const rand = mulberry32(parseInt(day.replace(/-/g, ''), 10));
  return {
    targetCalories: CAL_TARGETS[Math.floor(rand() * CAL_TARGETS.length)],
    minProtein: PROTEIN_MINS[Math.floor(rand() * PROTEIN_MINS.length)],
  };
}

/** A fresh random challenge for free play. */
export function randomChallenge(): Challenge {
  return {
    targetCalories: CAL_TARGETS[Math.floor(Math.random() * CAL_TARGETS.length)],
    minProtein: PROTEIN_MINS[Math.floor(Math.random() * PROTEIN_MINS.length)],
  };
}

export type PlateTotals = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function plateTotals(plate: Record<string, number>): PlateTotals {
  const t: PlateTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  for (const [id, qty] of Object.entries(plate)) {
    const ing = INGREDIENT_BY_ID[id];
    if (!ing || qty <= 0) continue;
    t.calories += ing.calories * qty;
    t.protein_g += ing.protein_g * qty;
    t.carbs_g += ing.carbs_g * qty;
    t.fat_g += ing.fat_g * qty;
  }
  return t;
}

export type RoundResult = {
  stars: 0 | 1 | 2 | 3;
  diffPct: number;
  proteinMet: boolean;
  headline: string;
};

export function scoreRound(totals: PlateTotals, challenge: Challenge): RoundResult {
  const diffPct = Math.round(
    (Math.abs(totals.calories - challenge.targetCalories) / challenge.targetCalories) * 100
  );
  const proteinMet = totals.protein_g >= challenge.minProtein;
  let stars: RoundResult['stars'] = 0;
  if (diffPct <= 5 && proteinMet) stars = 3;
  else if (diffPct <= 12 && proteinMet) stars = 2;
  else if (diffPct <= 20) stars = 1;
  const headline =
    stars === 3
      ? 'Nailed it!'
      : stars === 2
        ? 'So close!'
        : stars === 1
          ? 'Not bad!'
          : totals.calories > challenge.targetCalories
            ? 'Whoa, that plate is heavy!'
            : 'That plate is a bit light.';
  return { stars, diffPct, proteinMet, headline };
}

/** Lifetime game stats, cached locally and synced to the signed-in account. */
export type GameStats = {
  played: number;
  threeStar: number;
  /** Consecutive days the daily challenge was completed. */
  dailyStreak: number;
  lastDailyDay: string | null;
  /** Best (lowest) calorie miss in percent. */
  bestDiffPct: number | null;
  /** Higher-or-Lower: best run and total rounds answered. */
  hlBest: number;
  hlRounds: number;
  /** Scan guesses: how many made, and the summed |error %| for an average. */
  guessCount: number;
  guessErrSum: number;
  /** Portion game accuracy. */
  portionRounds: number;
  portionCorrect: number;
  /** Per-food learning progress; two successful encounters counts as mastered. */
  foodMastery: Record<string, number>;
};

const STATS_KEY = 'trak.game.v1';

export function gameStatsStorageKey(userId?: string | null): string {
  return userId ? `${STATS_KEY}.${userId}` : STATS_KEY;
}

export const EMPTY_STATS: GameStats = {
  played: 0,
  threeStar: 0,
  dailyStreak: 0,
  lastDailyDay: null,
  bestDiffPct: null,
  hlBest: 0,
  hlRounds: 0,
  guessCount: 0,
  guessErrSum: 0,
  portionRounds: 0,
  portionCorrect: 0,
  foodMastery: {},
};

function normalizeGameStats(value: unknown): GameStats {
  const parsed = value && typeof value === 'object' ? value as Partial<GameStats> : {};
  const count = (candidate: unknown) => Math.max(0, Math.floor(Number(candidate) || 0));
  return {
    ...EMPTY_STATS,
    played: count(parsed.played),
    threeStar: count(parsed.threeStar),
    dailyStreak: count(parsed.dailyStreak),
    lastDailyDay: typeof parsed.lastDailyDay === 'string' ? parsed.lastDailyDay : null,
    bestDiffPct: parsed.bestDiffPct == null ? null : count(parsed.bestDiffPct),
    hlBest: count(parsed.hlBest),
    hlRounds: count(parsed.hlRounds),
    guessCount: count(parsed.guessCount),
    guessErrSum: count(parsed.guessErrSum),
    portionRounds: count(parsed.portionRounds),
    portionCorrect: count(parsed.portionCorrect),
    foodMastery: parsed.foodMastery && typeof parsed.foodMastery === 'object'
      ? Object.fromEntries(Object.entries(parsed.foodMastery).map(([key, amount]) => [key, count(amount)]))
      : {},
  };
}

async function loadLocalStats(userId?: string | null): Promise<GameStats> {
  try {
    if (userId) {
      const scoped = await AsyncStorage.getItem(gameStatsStorageKey(userId));
      if (scoped) return normalizeGameStats(JSON.parse(scoped));
      // Claim the old unscoped cache once, then remove it so a second account
      // on the same phone can never inherit the first player's progress.
      const legacy = await AsyncStorage.getItem(STATS_KEY);
      if (legacy) {
        const migrated = normalizeGameStats(JSON.parse(legacy));
        await AsyncStorage.setItem(gameStatsStorageKey(userId), JSON.stringify(migrated));
        await AsyncStorage.removeItem(STATS_KEY);
        return migrated;
      }
    } else {
      const raw = await AsyncStorage.getItem(STATS_KEY);
      if (raw) return normalizeGameStats(JSON.parse(raw));
    }
  } catch {
    // Fall through to fresh stats.
  }
  return EMPTY_STATS;
}

export async function loadGameStats(userId?: string | null): Promise<GameStats> {
  const local = await loadLocalStats(userId);
  if (!userId) return local;
  try {
    const { data, error } = await supabase.from('game_stats').select('stats').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    const next = data?.stats ? normalizeGameStats(data.stats) : local;
    await AsyncStorage.setItem(gameStatsStorageKey(userId), JSON.stringify(next));
    if (!data) {
      await supabase.from('game_stats').upsert({ user_id: userId, stats: next, updated_at: new Date().toISOString() });
    }
    return next;
  } catch {
    // Older/offline backends keep games fully usable from the account-scoped cache.
    return local;
  }
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** Record a finished round and return the updated stats. */
export async function recordRound(
  result: RoundResult,
  isDaily: boolean,
  stats: GameStats,
  foodIds: string[] = [],
  userId?: string | null,
): Promise<GameStats> {
  const today = dayKey();
  const next: GameStats = {
    ...stats,
    played: stats.played + 1,
    threeStar: stats.threeStar + (result.stars === 3 ? 1 : 0),
    bestDiffPct:
      stats.bestDiffPct === null ? result.diffPct : Math.min(stats.bestDiffPct, result.diffPct),
    foodMastery:
      result.stars >= 2 ? addFoodMastery(stats.foodMastery, foodIds) : stats.foodMastery,
  };
  // The daily streak counts the first completion of each day's challenge.
  if (isDaily && stats.lastDailyDay !== today) {
    next.dailyStreak = stats.lastDailyDay === yesterdayKey() ? stats.dailyStreak + 1 : 1;
    next.lastDailyDay = today;
  }
  return saveStats(next, userId);
}

function addFoodMastery(current: Record<string, number>, foodIds: string[]): Record<string, number> {
  const next = { ...current };
  for (const id of new Set(foodIds)) next[id] = Math.min(3, (next[id] ?? 0) + 1);
  return next;
}

export function masteredFoodCount(foods: Ingredient[], stats: GameStats): number {
  return foods.filter((food) => (stats.foodMastery[food.id] ?? 0) >= 2).length;
}

async function saveStats(next: GameStats, userId?: string | null): Promise<GameStats> {
  try {
    await AsyncStorage.setItem(gameStatsStorageKey(userId), JSON.stringify(next));
  } catch {
    // Non-critical; stats just won't persist.
  }
  if (userId) {
    try {
      await supabase.from('game_stats').upsert({
        user_id: userId,
        stats: next,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // The local account-scoped cache remains the offline fallback.
    }
  }
  return next;
}

/** Record a finished Higher-or-Lower run. */
export async function recordHigherLower(
  run: number,
  stats: GameStats,
  correctFoodIds: string[] = [],
  userId?: string | null,
): Promise<GameStats> {
  return saveStats({
    ...stats,
    hlRounds: stats.hlRounds + higherLowerAnsweredRounds(run),
    hlBest: Math.max(stats.hlBest, run),
    foodMastery: addFoodMastery(stats.foodMastery, correctFoodIds),
  }, userId);
}

/** Record one answer in the portion-estimation game. */
export async function recordPortionGuess(
  correct: boolean,
  foodId: string,
  stats: GameStats,
  userId?: string | null,
): Promise<GameStats> {
  return saveStats({
    ...stats,
    portionRounds: stats.portionRounds + 1,
    portionCorrect: stats.portionCorrect + (correct ? 1 : 0),
    foodMastery: correct ? addFoodMastery(stats.foodMastery, [foodId]) : stats.foodMastery,
  }, userId);
}

/** Record a guess-before-you-scan miss (absolute percent error). */
export async function recordScanGuess(errPct: number, stats: GameStats, userId?: string | null): Promise<GameStats> {
  return saveStats({
    ...stats,
    guessCount: stats.guessCount + 1,
    guessErrSum: stats.guessErrSum + Math.max(0, Math.round(errPct)),
  }, userId);
}

/** The nutrient Higher-or-Lower compares in a given round. */
export type MetricKey = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g';

export const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];

/**
 * A random ingredient for Higher-or-Lower. When `differentFrom` is given the
 * result has a different id AND a different value for `metric` (so there's
 * always a right answer for the nutrient being compared).
 */
export function randomFood(
  differentFrom?: Ingredient,
  metric: MetricKey = 'calories',
  pool: Ingredient[] = ALL_INGREDIENTS
): Ingredient {
  const choices = pool.length >= 2 ? pool : ALL_INGREDIENTS;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const i = choices[Math.floor(Math.random() * choices.length)];
    if (!differentFrom) return i;
    if (i.id !== differentFrom.id && i[metric] !== differentFrom[metric]) return i;
  }
  return choices.find((food) => food.id !== differentFrom?.id) ?? choices[0];
}
