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
