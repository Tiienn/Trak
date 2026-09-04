import { assertEquals } from 'jsr:@std/assert@1';

import {
  accountTrialIsActive,
  isAdultAge,
  revenueCatEntitlementIsActive,
  revenueCatGrantsCapability,
} from './ai-access.ts';

Deno.test('AI access requires a confirmed adult profile', () => {
  assertEquals(isAdultAge(17), false);
  assertEquals(isAdultAge(18), true);
  assertEquals(isAdultAge(undefined), false);
  assertEquals(isAdultAge(null), false);
});

Deno.test('account trial is active for seven days and fails closed without a date', () => {
  const now = Date.parse('2026-09-04T12:00:00.000Z');
  assertEquals(accountTrialIsActive('2026-08-29T12:00:00.000Z', now), true);
  assertEquals(accountTrialIsActive('2026-08-28T12:00:00.000Z', now), false);
  assertEquals(accountTrialIsActive(null, now), false);
});

Deno.test('RevenueCat entitlement must be unexpired or lifetime', () => {
  const now = Date.parse('2026-09-04T12:00:00.000Z');
  assertEquals(revenueCatEntitlementIsActive({ expires_date: null }, now), true);
  assertEquals(revenueCatEntitlementIsActive({ expires_date: '2026-09-05T12:00:00Z' }, now), true);
  assertEquals(revenueCatEntitlementIsActive({ expires_date: '2026-09-03T12:00:00Z' }, now), false);
  assertEquals(revenueCatEntitlementIsActive(undefined, now), false);
});

Deno.test('legacy and future entitlement names stay isolated by capability', () => {
  const now = Date.parse('2026-09-04T12:00:00.000Z');
  const active = (expires_date: string | null = null) => ({ expires_date });

  assertEquals(revenueCatGrantsCapability({ pro: active() }, 'nutrition', now), true);
  assertEquals(revenueCatGrantsCapability({ pro: active() }, 'body_analysis', now), true);
  assertEquals(revenueCatGrantsCapability({ nutrition: active() }, 'nutrition', now), true);
  assertEquals(revenueCatGrantsCapability({ nutrition: active() }, 'coach', now), false);
  assertEquals(revenueCatGrantsCapability({ coach: active() }, 'body_analysis', now), true);
  assertEquals(revenueCatGrantsCapability({ coach: active() }, 'nutrition', now), false);
  assertEquals(revenueCatGrantsCapability({ complete: active() }, 'coach', now), true);
});
