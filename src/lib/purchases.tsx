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

/**
 * Trak Pro via RevenueCat.
 *
 * Production access requires the `pro` entitlement. Development builds and
 * builds made with EXPO_PUBLIC_TESTER_ACCESS=true bypass the paywall so store
 * review and closed-test cohorts can exercise every feature.
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

type SubscriptionContextValue = {
  isPro: boolean;
  hasAccess: boolean;
  loading: boolean;
  testerAccess: boolean;
  refresh: () => Promise<boolean>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

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

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      isPro,
      hasAccess: isPro || testerAccessEnabled,
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

export function useSubscription(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used inside PurchasesProvider');
  return context;
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
