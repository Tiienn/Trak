export const ACCOUNT_TRIAL_DAYS = 7;

export type AiCapability = 'nutrition' | 'coach' | 'body_analysis';

export type AiAccessResult =
  | { allowed: true; source: 'trial' | 'subscription' | 'tester' }
  | { allowed: false; reason: 'adult_required' | 'pro_required' | 'unavailable' };

type RevenueCatEntitlement = {
  expires_date?: string | null;
  expiresDate?: string | null;
};

type RevenueCatEntitlements = Record<string, RevenueCatEntitlement | null | undefined>;

const DAY_MS = 24 * 60 * 60 * 1000;

export function isAdultAge(value: unknown): boolean {
  const age = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(age) && age >= 18 && age <= 100;
}

export function accountTrialIsActive(
  createdAt: string | number | Date | null | undefined,
  now = Date.now(),
): boolean {
  if (createdAt == null) return false;
  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  return Number.isFinite(created) && now < created + ACCOUNT_TRIAL_DAYS * DAY_MS;
}
export function revenueCatEntitlementIsActive(
  entitlement: RevenueCatEntitlement | null | undefined,
  now = Date.now(),
): boolean {
  if (!entitlement || typeof entitlement !== 'object') return false;
  const expiresAt = entitlement.expires_date ?? entitlement.expiresDate;
  if (expiresAt == null) return true;
  const expiry = Date.parse(expiresAt);
  return Number.isFinite(expiry) && expiry > now;
}

export function revenueCatGrantsCapability(
  entitlements: RevenueCatEntitlements | null | undefined,
  capability: AiCapability,
  now = Date.now(),
): boolean {
  if (!entitlements) return false;
  const accepted = capability === 'nutrition'
    ? ['pro', 'complete', 'nutrition']
    : ['pro', 'complete', 'coach'];
  return accepted.some((id) => revenueCatEntitlementIsActive(entitlements[id], now));
}

function testerIds(): Set<string> {
  return new Set(
    (Deno.env.get('TRAK_TESTER_USER_IDS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function trustedTester(user: any, userId: string): boolean {
  return Deno.env.get('TRAK_TESTER_ACCESS') === 'true'
    || testerIds().has(userId)
    || user?.app_metadata?.trak_tester === true;
}

async function fetchRevenueCatSubscriber(userId: string, apiKey: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);
  try {
    return await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Server-authoritative access check for every paid AI endpoint.
 *
 * Client capability flags are presentation only and are intentionally ignored.
 * The account trial comes from the server profile, tester access comes from
 * trusted Auth metadata/server secrets, and paid access comes directly from
 * RevenueCat using the Supabase user id as the App User ID.
 */
export async function authorizeAiAccess(
  userId: string,
  capability: AiCapability,
): Promise<AiAccessResult> {
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey || !userId) return { allowed: false, reason: 'unavailable' };

  try {
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const [{ data: userData, error: userError }, { data: profile, error: profileError }] =
      await Promise.all([
        admin.auth.admin.getUserById(userId),
        admin.from('profiles').select('created_at, age').eq('user_id', userId).maybeSingle(),
      ]);

    if (userError || !userData?.user || profileError) {
      return { allowed: false, reason: 'unavailable' };
    }
    // Eligibility is checked before tester, trial, or subscription access so
    // no entitlement can bypass the adult-only product boundary.
    if (!isAdultAge(profile?.age)) return { allowed: false, reason: 'adult_required' };
    if (trustedTester(userData.user, userId)) return { allowed: true, source: 'tester' };

    const createdAt = profile?.created_at ?? userData.user.created_at;
    if (accountTrialIsActive(createdAt)) return { allowed: true, source: 'trial' };

    const revenueCatKey =
      Deno.env.get('REVENUECAT_SECRET_API_KEY') ?? Deno.env.get('REVENUECAT_API_KEY') ?? '';
    if (!revenueCatKey) return { allowed: false, reason: 'unavailable' };

    const response = await fetchRevenueCatSubscriber(userId, revenueCatKey);
    if (response.status === 404) return { allowed: false, reason: 'pro_required' };
    if (!response.ok) return { allowed: false, reason: 'unavailable' };

    const body = await response.json().catch(() => null);
    const entitlements = body?.subscriber?.entitlements as RevenueCatEntitlements | undefined;
    return revenueCatGrantsCapability(entitlements, capability)
      ? { allowed: true, source: 'subscription' }
      : { allowed: false, reason: 'pro_required' };
  } catch {
    return { allowed: false, reason: 'unavailable' };
  }
}
