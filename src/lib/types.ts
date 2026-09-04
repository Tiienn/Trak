export type FoodItem = {
  name: string;
  quantity: string;
  /** Estimated edible portion used for database scaling. */
  grams?: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  /** Where the final nutrient values came from. */
  nutritionSource?: 'usda_fdc' | 'open_food_facts' | 'web' | 'model';
  /** Provider-specific record ID, such as an FDC ID or barcode. */
  sourceId?: string;
  /** Human-readable matched record or fallback label. */
  sourceLabel?: string;
};

export type FoodTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MealInputSource = 'text' | 'photo' | 'barcode' | 'quick_log' | 'manual';

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
  /** Non-sensitive version metadata used to attribute later corrections. */
  analysisMeta?: {
    requestId?: string;
    model?: string;
    promptVersion?: string;
    pipelineVersion?: string;
    /** How this meal entered Trak; used for per-user meal memory. */
    inputSource?: MealInputSource;
  };
};

export type Sex = 'male' | 'female';
export type Goal = 'lose' | 'maintain' | 'gain';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
/** How the user prefers to balance macros within their calorie target. */
export type DietStyle = 'balanced' | 'high_protein' | 'low_carb';

/** The user's profile, collected during onboarding, used to compute daily targets. */
export type UserProfile = {
  sex: Sex;
  age: number; // years
  heightCm: number;
  weightKg: number;
  goal: Goal;
  activity: ActivityLevel;
  /** Macro-split preference; undefined behaves as 'balanced'. */
  diet?: DietStyle;
  createdAt: number;
  /** Daily water goal in glasses; undefined falls back to the app default. */
  waterGoal?: number;
  /** Percent nudge applied to AI calorie estimates (e.g. 10 = +10%). Default 0. */
  calorieBias?: number;
};

/** A single weight measurement, one per day. */
export type WeightEntry = {
  /** Local calendar day, formatted YYYY-MM-DD. */
  date: string;
  weightKg: number;
};

/** Water logged on one local calendar day. */
export type WaterEntry = {
  /** Local calendar day, formatted YYYY-MM-DD. */
  date: string;
  glasses: number;
};

export type MuscleGroup =
  | 'chest'
  | 'legs'
  | 'back'
  | 'arms'
  | 'shoulders'
  | 'abs'
  | 'glutes'
  | 'other';

/**
 * Workout focus selections. The first four values are retained for previously
 * saved workouts; the logger now exposes individual muscles, full body, and cardio.
 */
export type WorkoutSplit =
  | 'upper_body'
  | 'lower_body'
  | 'push'
  | 'pull'
  | MuscleGroup
  | 'full_body'
  | 'cardio';
export type MuscleSetCounts = Record<MuscleGroup, number>;
export type TrainingActivityType = 'strength' | 'cardio';
export type CardioIntensity = 'light' | 'moderate' | 'vigorous';
export type LoadUnit = 'kg' | 'lb';

export type ExerciseDetails = {
  workoutSplits: WorkoutSplit[];
  muscleSets: MuscleSetCounts;
  cardioIntensity?: CardioIntensity | null;
  /** Custom plan item completed by this workout, when applicable. */
  trainingPlanItemId?: string | null;
};

/** A logged workout; a conservative portion of its burn is credited to the daily budget. */
export type ExerciseEntry = {
  id: string;
  /** Local calendar day, formatted YYYY-MM-DD. */
  date: string;
  createdAt: number;
  name: string;
  caloriesBurned: number;
  /** User-entered workout duration. Older rows default to 30 minutes. */
  durationMinutes: number;
  /** Multiple training splits may describe the same completed workout. */
  workoutSplits: WorkoutSplit[];
  /** Null for strength-only work; legacy cardio is interpreted as moderate. */
  cardioIntensity: CardioIntensity | null;
  /** Custom plan item completed by this workout, when applicable. */
  trainingPlanItemId: string | null;
  /** One completed set equals one weekly Progress point for that muscle. */
  muscleSets: MuscleSetCounts;
};

/** A reusable meal template the user can re-log with one tap. */
export type SavedMeal = {
  id: string;
  createdAt: number;
  title: string;
  total: FoodTotals;
  items: FoodItem[];
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
  /** The AI's short explanation of how it estimated this meal. */
  notes?: string;
  /** Local URI of the scanned photo, if available. */
  photoUri?: string;
  /** Model/data-pipeline provenance captured when this meal was estimated. */
  analysisMeta?: FoodAnalysis['analysisMeta'];
};
