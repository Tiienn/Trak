export type FoodItem = {
  name: string;
  quantity: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type FoodTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type FoodAnalysis = {
  /** false when the photo has no recognizable food. */
  isFood: boolean;
  /** Short human label for the meal, e.g. "Grilled chicken salad". */
  title: string;
  items: FoodItem[];
  total: FoodTotals;
  /** 0..1 — how confident the AI is. */
  confidence: number;
  /** One short sentence about assumptions the AI made. */
  notes?: string;
};

export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

/** The user's profile, collected during onboarding, used to compute daily targets. */
export type UserProfile = {
  sex: Sex;
  age: number; // years
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activity: ActivityLevel;
  createdAt: number;
};

/** A meal saved to the daily log. */
export type LoggedMeal = {
  id: string;
  /** Local calendar day, formatted YYYY-MM-DD. */
  date: string;
  /** When it was logged (epoch milliseconds). */
  createdAt: number;
  title: string;
  total: FoodTotals;
  items: FoodItem[];
  confidence: number;
  /** Local URI of the scanned photo, if available. */
  photoUri?: string;
};
