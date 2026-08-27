export type TrakCapabilities = {
  nutritionAi: boolean;
  bodyAnalysis: boolean;
  coach: boolean;
};

export type TrakAccessSource = {
  isPro: boolean;
  inTrial: boolean;
  testerAccess: boolean;
  /** Reserved mapping boundary for products that do not exist in the current catalog. */
  activeEntitlements?: readonly string[];
};

/**
 * Resolve product access in one place so screens never encode RevenueCat's
 * current catalog. Legacy `pro`, the account trial, and tester access remain a
 * future Complete grant. Future entitlement names can be introduced here
 * without changing feature screens.
 */
export function resolveTrakCapabilities(source: TrakAccessSource): TrakCapabilities {
  const entitlements = new Set(source.activeEntitlements ?? []);
  const legacyComplete = source.isPro || source.inTrial || source.testerAccess;
  const complete = legacyComplete || entitlements.has('complete');
  const coach = complete || entitlements.has('coach');

  return {
    nutritionAi: complete || entitlements.has('nutrition'),
    bodyAnalysis: coach,
    coach,
  };
}
