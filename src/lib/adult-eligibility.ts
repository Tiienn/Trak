export const MINIMUM_TRAK_AGE = 18;
export const MAXIMUM_TRAK_AGE = 100;

export type AdultEligibility = 'adult' | 'underage' | 'unknown';

/**
 * Classify a persisted or user-entered age without coercing missing values to 0.
 * Keeping this pure lets onboarding, the global gate, and tests share one rule.
 */
export function adultEligibilityForAge(value: unknown): AdultEligibility {
  const age = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(age) || age < 1 || age > MAXIMUM_TRAK_AGE) return 'unknown';
  return age >= MINIMUM_TRAK_AGE ? 'adult' : 'underage';
}

