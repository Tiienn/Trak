export type WidgetData = {
  left: number;
  eaten: number;
  budget: number;
  /** Optional water progress for the second line. */
  water?: number;
  waterGoal?: number;
};
