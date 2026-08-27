import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import {
  BarcodeIcon,
  CameraIcon,
  CheckIcon,
  PlateIcon,
  ScaleIcon,
  SparklesIcon,
  TrendUpIcon,
} from '@/components/icons';
import { RingMark, TrakWordmark } from '@/components/logo';
import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import { useAppScheme } from '@/lib/theme';
import {
  getProPackages,
  purchasePro,
  purchasesConfigured,
  restorePro,
  TRIAL_DAYS,
  useSubscription,
} from '@/lib/purchases';

type IconCmp = (props: { size?: number; color?: string }) => React.JSX.Element;

/** What money actually buys — the features that cost per use to run. */
const PERKS: [IconCmp, string, string][] = [
  [CameraIcon, 'AI photo scan', 'Snap a plate and get calories and macros back in seconds.'],
  [SparklesIcon, 'Chat and Ask', 'Nutrition answers, meal ideas, and coaching whenever you want it.'],
  [TrendUpIcon, 'Body Analysis', 'Private progress-photo check-ins with focused training and nutrition next steps.'],
];

/** Everything below stays free with or without a subscription. */
const FREE: [IconCmp, string][] = [
  [BarcodeIcon, 'Barcode scan and quick-add'],
  [PlateIcon, 'Manual and text meal logging'],
  [ScaleIcon, 'Water, weight, exercise, and supplements'],
  [TrendUpIcon, 'History, insights, reminders, and games'],
];

function labelFor(
  pkg: PurchasesPackage,
  all: PurchasesPackage[]
): { title: string; sub: string; badge?: string } {
  const price = pkg.product.priceString;
  if (pkg.packageType === 'ANNUAL') {
    // Compute the real saving vs 12x monthly — a hardcoded number goes stale
    // the moment either price changes in Play Console.
    const monthly = all.find((p) => p.packageType === 'MONTHLY')?.product.price ?? 0;
    const annual = pkg.product.price;
    const pct = monthly > 0 && annual > 0 ? Math.round((1 - annual / (monthly * 12)) * 100) : 0;
    return { title: `${price} / year`, sub: 'Best value', badge: pct >= 5 ? `SAVE ${pct}%` : undefined };
  }
  if (pkg.packageType === 'MONTHLY') {
    return { title: `${price} / month`, sub: 'Cancel anytime' };
  }
  return { title: price, sub: pkg.product.title };
}

/** Header copy differs per state — subscribed, mid-trial, or trial over. */
function headerFor(isPro: boolean, inTrial: boolean, daysLeft: number) {
  if (isPro) {
    return {
      title: 'Your subscription is active',
      body: 'AI photo scan, Chat, and Body Analysis are unlocked on this account. Thank you for paying for the parts that cost real money to run.',
    };
  }
  if (inTrial) {
    const title =
      daysLeft <= 0
        ? 'Last day of your free trial'
        : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial`;
    return {
      title,
      body: 'You have full access right now. Subscribe before the trial ends to keep AI photo scan, Chat, and Body Analysis without a break.',
    };
  }
  return {
    title: 'Unlock AI logging',
    body: `Your ${TRIAL_DAYS}-day free trial has ended. A subscription brings back AI photo scan, Chat, and Body Analysis. Barcode scan, quick-add, and manual logging stay free forever.`,
  };
}

export default function PaywallScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { isPro, inTrial, trialDaysLeft, hasAccess, refresh } = useSubscription();

  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  // State commits async — a fast double-tap could start two purchase flows and
  // pop an error alert over the live Play sheet. A ref flips synchronously.
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    getProPackages()
      .then((pkgs) => {
        if (!active) return;
        // Show annual first — it's the hero deal.
        const sorted = [...pkgs].sort((a) => (a.packageType === 'ANNUAL' ? -1 : 1));
        setPackages(sorted);
      })
      .catch(() => active && setPackages([]));
    return () => {
      active = false;
    };
  }, []);

  // The free features never disappear, so this screen must always be escapable
  // even when there's nothing in the history stack to go back to.
  function onClose() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  async function onSubscribe() {
    if (!packages || !packages[selected] || busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const ok = await purchasePro(packages[selected]);
      if (ok) {
        await refresh();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('You’re all set', 'Your subscription is active. AI photo scan, Chat, and Body Analysis are unlocked.', [
          { text: 'Done', onPress: () => router.replace('/(tabs)') },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function onRestore() {
    if (busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const ok = await restorePro();
      if (ok) await refresh();
      Alert.alert(
        ok ? 'Restored' : 'Nothing to restore',
        ok
          ? 'Your subscription is active again.'
          : 'No previous purchase was found for this account.'
      );
      if (ok) router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Please try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const header = headerFor(isPro, inTrial, trialDaysLeft);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Text style={[styles.closeTxt, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Same lockup as every tab header: ring + the editorial wordmark
              face, so "Trak Pro" reads as the product, not a different brand. */}
          <View style={styles.brandLockup}>
            <RingMark size={30} />
            <TrakWordmark color={colors.text} size={28} />
            <Text style={[styles.brandSuffix, { color: Brand.green }]}>Pro</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{header.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{header.body}</Text>

          {/* Plans sit directly under the headline: the price is the decision,
              and burying it under explainer cards pushed it off-screen. */}
          {isPro ? (
            <View style={[styles.proBox, { backgroundColor: colors.backgroundElement }]}>
              <CheckIcon size={18} color={Brand.green} />
              <Text style={[styles.proBoxText, { color: colors.text }]}>
                {Platform.OS === 'ios'
                  ? 'Subscribed. Manage or cancel any time in Settings › Apple Account › Subscriptions.'
                  : 'Subscribed. Manage or cancel any time in Play Store › Subscriptions.'}
              </Text>
            </View>
          ) : packages === null ? (
            <ActivityIndicator style={styles.loader} color={Brand.green} />
          ) : packages.length === 0 ? (
            <View style={[styles.proBox, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.proBoxText, { color: colors.textSecondary }]}>
                {purchasesConfigured
                  ? 'Subscriptions aren’t available right now. Please try again later — the free features all still work.'
                  : 'Subscriptions aren’t available in this build yet. The free features all still work.'}
              </Text>
            </View>
          ) : (
            <>
              {packages.map((pkg, i) => {
                const { title, sub, badge } = labelFor(pkg, packages);
                const active = i === selected;
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => setSelected(i)}
                    style={[
                      styles.pkg,
                      { backgroundColor: colors.backgroundElement, borderColor: 'transparent' },
                      active && { borderColor: Brand.green, backgroundColor: `${Brand.green}22` },
                    ]}>
                    <View style={styles.pkgInfo}>
                      <Text style={[styles.pkgTitle, { color: colors.text }]}>{title}</Text>
                      <Text style={[styles.pkgSub, { color: colors.textSecondary }]}>{sub}</Text>
                    </View>
                    {!!badge && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}

              <Pressable
                style={[styles.cta, busy && { opacity: 0.7 }]}
                onPress={onSubscribe}
                disabled={busy}>
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.ctaText}>
                    {inTrial ? 'Keep full access' : 'Unlock AI features'}
                  </Text>
                )}
              </Pressable>
            </>
          )}

          {!isPro && (
            <Pressable style={styles.secondary} onPress={onClose}>
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
                {inTrial ? 'Not now' : 'Keep using the free features'}
              </Text>
            </Pressable>
          )}

          {/* Detail below the fold — it reassures after the price, and the
              free list is what stops the change reading as a bait-and-switch. */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {isPro ? 'Included in your subscription' : 'What a subscription unlocks'}
            </Text>
            {PERKS.map(([Icon, name, detail]) => (
              <View key={name} style={styles.perkRow}>
                <View style={[styles.perkIcon, { backgroundColor: colors.greenTint }]}>
                  <Icon size={18} color={Brand.green} />
                </View>
                <View style={styles.perkInfo}>
                  <Text style={[styles.perkName, { color: colors.text }]}>{name}</Text>
                  <Text style={[styles.perkDetail, { color: colors.textSecondary }]}>{detail}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Free forever, no subscription</Text>
            {FREE.map(([Icon, text]) => (
              <View key={text} style={styles.freeRow}>
                <Icon size={16} color={colors.textSecondary} />
                <Text style={[styles.freeText, { color: colors.text }]}>{text}</Text>
                <CheckIcon size={14} color={Brand.green} />
              </View>
            ))}
          </View>

          {purchasesConfigured && (
            <>
              <Pressable style={styles.secondary} onPress={onRestore} disabled={busy}>
                <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
                  Restore purchases
                </Text>
              </Pressable>

              <Text style={[styles.fine, { color: colors.textSecondary }]}>
                {`Trak’s ${TRIAL_DAYS}-day free trial starts when you create your account and needs no payment details. `}
                {Platform.OS === 'ios'
                  ? 'Any eligible store trial and the exact renewal price are shown by Apple before you confirm. Subscriptions renew automatically until cancelled; cancel any time in Settings › Apple Account › Subscriptions.'
                  : 'Any eligible store trial and the exact renewal price are shown by Google Play before you confirm. Subscriptions renew automatically until cancelled; cancel any time in Play Store › Subscriptions.'}
              </Text>
            </>
          )}

          {!hasAccess && (
            <Pressable style={styles.secondary} onPress={() => router.push('/profile')}>
              <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
                Account settings
              </Text>
            </Pressable>
          )}

          <View style={styles.legalRow}>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  'https://tqhgdnmzhuczuyyrmvzx.supabase.co/functions/v1/privacy'
                )
              }>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Privacy Policy</Text>
            </Pressable>
            <Text style={[styles.legalDot, { color: colors.textSecondary }]}>·</Text>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
                )
              }>
              <Text style={[styles.legalLink, { color: colors.textSecondary }]}>Terms of Use</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  closeBtn: { alignSelf: 'flex-end', padding: Spacing.two },
  closeTxt: { fontSize: 20, fontWeight: '700' },
  scroll: { alignItems: 'center', paddingBottom: Spacing.six },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.two },
  legalLink: { fontSize: 12, textDecorationLine: 'underline' },
  legalDot: { fontSize: 12 },

  brandLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  // "Pro" rides alongside the wordmark in the same editorial face, a size down
  // so the Trak mark still leads.
  brandSuffix: {
    fontFamily: Type.brand,
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: Type.display,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: Spacing.one,
  },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: Spacing.two, lineHeight: 21 },

  card: {
    alignSelf: 'stretch',
    borderRadius: 18,
    padding: Spacing.four,
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  cardTitle: { fontSize: 17, fontFamily: Type.display, fontWeight: '700' },
  perkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  perkIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perkInfo: { flex: 1, gap: 2 },
  perkName: { fontSize: 15, fontWeight: '700' },
  perkDetail: { fontSize: 13, lineHeight: 18 },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  freeText: { fontSize: 14, fontWeight: '600', flex: 1 },

  loader: { marginTop: Spacing.five },

  proBox: {
    alignSelf: 'stretch',
    borderRadius: 18,
    padding: Spacing.four,
    marginTop: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  proBoxText: { fontSize: 14, textAlign: 'center', lineHeight: 20, flexShrink: 1 },

  pkg: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    padding: Spacing.four,
    marginTop: Spacing.three,
  },
  pkgInfo: { flex: 1 },
  pkgTitle: { fontSize: 18, fontWeight: '800' },
  pkgSub: { fontSize: 13, marginTop: 2 },
  badge: { backgroundColor: Brand.green, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },

  cta: {
    alignSelf: 'stretch',
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.four,
    minHeight: 54,
    justifyContent: 'center',
  },
  ctaText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },

  secondary: { paddingVertical: Spacing.three },
  secondaryText: { fontSize: 14, fontWeight: '600' },
  fine: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
