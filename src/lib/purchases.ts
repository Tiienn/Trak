import { useEffect, useState } from 'react';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

/**
 * Trak Pro (optional supporter subscription) via RevenueCat + Google Play.
 * Everything in Trak stays free — Pro exists to support development.
 */

const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

/** True once a RevenueCat API key is configured in .env. */
export const purchasesConfigured = Boolean(apiKey);

let initialized = false;

/** Safe to call many times; no-ops until the API key exists. */
export function initPurchases(): void {
  if (!apiKey || initialized) return;
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  initialized = true;
}

function hasPro(info: CustomerInfo): boolean {
  return info.entitlements.active['pro'] != null;
}

/** Live "is this user a Pro supporter?" hook. */
export function usePro(): boolean {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    if (!purchasesConfigured) return;
    initPurchases();
    let active = true;
    Purchases.getCustomerInfo()
      .then((info) => active && setPro(hasPro(info)))
      .catch(() => {});
    const listener = (info: CustomerInfo) => setPro(hasPro(info));
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      active = false;
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);
  return pro;
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
    return hasPro(customerInfo);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw new Error(e?.message ?? 'Purchase failed. Please try again.');
  }
}

export async function restorePro(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return hasPro(info);
}
