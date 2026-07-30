import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import { useAuth } from './auth';
import { useMeals } from './store';

/**
 * Trak Pro via RevenueCat.
 *
 * Only the AI features (photo scan, Chat/Ask) are paid — they're the ones that
 * cost real money per use. Everything else (barcode, quick-add, water, weight,
 * exercise, history, insights, games) is free forever.
 *
 * Access to the AI features comes from any of three places: the `pro`
 * entitlement, an unexpired 7-day trial that starts at account creation, or a
 * tester build (dev, or EXPO_PUBLIC_TESTER_ACCESS=true) so store review and
 * closed-test cohorts can exercise every feature.
 */

const apiKey =
  Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

export const purchasesConfigured = Boolean(apiKey);
export const testerAccessEnabled =
  __DEV__ || process.env.EXPO_PUBLIC_TESTER_ACCESS === 'true';

let initialized = false;

/** Safe to call many times; no-ops until the platform API key exists. */
export function initPurchases(): void {
  if (!apiKey || initialized) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  initialized = true;
}

function customerHasPro(info: CustomerInfo): boolean {
  return info.entitlements.active.pro != null;
}

/** Free trial length, counted from account creation. */
export const TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

type TrialState = { inTrial: boolean; trialDaysLeft: number };

/**
 * Pure trial math off the account-creation timestamp.
 *
 * The anchor is `profiles.created_at` from the server, so the trial survives a
 * reinstall and matches across devices — nothing about it is stored locally.
 *
 * A null `createdAt` (profile still loading, or not created yet) fails OPEN:
 * treating an unknown anchor as "expired" would flash a paywall at a paying or
 * trialling user on every cold start, which is far worse than a few seconds of
 * free AI for someone whose trial has actually run out. The real entitlement
 * check lands a moment later and closes the gate.
 */
export function trialStateFrom(createdAt: number | null): TrialState {
  if (createdAt == null) return { inTrial: true, trialDaysLeft: TRIAL_DAYS };
  const msLeft = createdAt + TRIAL_DAYS * DAY_MS - Date.now();
  if (msLeft <= 0) return { inTrial: false, trialDaysLeft: 0 };
  return { inTrial: true, trialDaysLeft: Math.ceil(msLeft / DAY_MS) };
}

type SubscriptionContextValue = {
  /** Real paid entitlement, or a store-managed trial tracked by RevenueCat. */
  isPro: boolean;
  /** Within the TRIAL_DAYS window from account creation. */
  inTrial: boolean;
  /** Whole days remaining (rounded up), 0 once the trial has expired. */
  trialDaysLeft: number;
  /** Gates the AI features only — never the rest of the app. */
  hasAccess: boolean;
  loading: boolean;
  testerAccess: boolean;
  refresh: () => Promise<boolean>;
};

/** What the provider itself can know without reading the meals store. */
type PurchasesState = Pick<
  SubscriptionContextValue,
  'isPro' | 'loading' | 'testerAccess' | 'refresh'
>;

const SubscriptionContext = createContext<PurchasesState | null>(null);

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth();
  const [isPro, setIsPro] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<string | null | undefined>(
    purchasesConfigured ? undefined : null
  );
  const identifiedRef = useRef(false);

  useEffect(() => {
    if (!purchasesConfigured) return;

    initPurchases();
    let active = true;
    const listener = (info: CustomerInfo) => {
      if (active) setIsPro(customerHasPro(info));
    };
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      active = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  useEffect(() => {
    if (!purchasesConfigured || authLoading) return;
    let active = true;
    const targetUserId = user?.id ?? null;

    const identify = async () => {
      try {
        if (user) {
          const { customerInfo } = await Purchases.logIn(user.id);
          identifiedRef.current = true;
          if (active) setIsPro(customerHasPro(customerInfo));
        } else if (identifiedRef.current) {
          const customerInfo = await Purchases.logOut();
          identifiedRef.current = false;
          if (active) setIsPro(customerHasPro(customerInfo));
        } else {
          const customerInfo = await Purchases.getCustomerInfo();
          if (active) setIsPro(customerHasPro(customerInfo));
        }
      } catch {
        if (active) setIsPro(false);
      } finally {
        if (active) setResolvedUserId(targetUserId);
      }
    };

    identify();
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!purchasesConfigured) return false;
    initPurchases();
    const info = await Purchases.getCustomerInfo();
    const active = customerHasPro(info);
    setIsPro(active);
    return active;
  }, []);

  const value = useMemo<PurchasesState>(
    () => ({
      isPro,
      loading:
        authLoading ||
        (purchasesConfigured && resolvedUserId !== (user?.id ?? null)),
      testerAccess: testerAccessEnabled,
      refresh,
    }),
    [authLoading, isPro, refresh, resolvedUserId, user?.id]
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

/**
 * The trial anchor lives in the meals store, but `MealsProvider` is mounted
 * *inside* `PurchasesProvider` — so the provider can't read it. Combining the
 * two here keeps the nesting untouched and keeps `purchases.tsx` free of any
 * import cycle (store.tsx does not import this module).
 */
export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used inside PurchasesProvider');
  const { profile } = useMeals();
  const { inTrial, trialDaysLeft } = trialStateFrom(profile?.createdAt ?? null);
  return {
    ...context,
    inTrial,
    trialDaysLeft,
    hasAccess: context.isPro || inTrial || context.testerAccess,
  };
}

/** Backward-compatible convenience hook for existing Pro UI. */
export function usePro(): boolean {
  return useSubscription().hasAccess;
}

/** The subscription options to show on the paywall (monthly + annual). */
export async function getProPackages(): Promise<PurchasesPackage[]> {
  if (!purchasesConfigured) return [];
  initPurchases();
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

/** Returns true if the purchase completed (false if the user cancelled). */
export async function purchasePro(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerHasPro(customerInfo);
  } catch (error: any) {
    if (error?.userCancelled) return false;
    throw new Error(error?.message ?? 'Purchase failed. Please try again.');
  }
}

export async function restorePro(): Promise<boolean> {
  if (!purchasesConfigured) return false;
  initPurchases();
  const info = await Purchases.restorePurchases();
  return customerHasPro(info);
}
