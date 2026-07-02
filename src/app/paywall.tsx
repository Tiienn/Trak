import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';

import { Brand, Colors, Spacing } from '@/constants/theme';
import {
  getProPackages,
  purchasePro,
  purchasesConfigured,
  restorePro,
  usePro,
} from '@/lib/purchases';

const PERKS = [
  ['💚', 'Support Trak’s development'],
  ['🚀', 'Help fund better AI food recognition'],
  ['🏅', 'Pro supporter badge'],
] as const;

function labelFor(pkg: PurchasesPackage): { title: string; sub: string; badge?: string } {
  const price = pkg.product.priceString;
  if (pkg.packageType === 'ANNUAL') {
    return { title: `${price} / year`, sub: 'Best value', badge: 'SAVE 66%' };
  }
  if (pkg.packageType === 'MONTHLY') {
    return { title: `${price} / month`, sub: 'Cancel anytime' };
  }
  return { title: price, sub: pkg.product.title };
}

export default function PaywallScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const isPro = usePro();

  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);

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

  async function onSubscribe() {
    if (!packages || !packages[selected] || busy) return;
    setBusy(true);
    try {
      const ok = await purchasePro(packages[selected]);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert('Thank you! 💚', 'You are now a Trak Pro supporter.', [
          { text: 'Done', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Purchase failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await restorePro();
      Alert.alert(
        ok ? 'Restored 💚' : 'Nothing to restore',
        ok ? 'Welcome back, Pro supporter.' : 'No previous purchase was found for this account.'
      );
      if (ok) router.back();
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.closeTxt, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.logoDot, { backgroundColor: Brand.green }]} />
          <Text style={[styles.title, { color: colors.text }]}>Trak Pro</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Trak is free to use. Pro is for people who want to support it.
          </Text>

          <View style={[styles.perks, { backgroundColor: colors.backgroundElement }]}>
            {PERKS.map(([emoji, text]) => (
              <View key={text} style={styles.perkRow}>
                <Text style={styles.perkEmoji}>{emoji}</Text>
                <Text style={[styles.perkText, { color: colors.text }]}>{text}</Text>
              </View>
            ))}
          </View>

          {isPro ? (
            <View style={[styles.proBox, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.proBoxText, { color: colors.text }]}>
                💚 You’re a Pro supporter — thank you!
              </Text>
            </View>
          ) : packages === null ? (
            <ActivityIndicator style={styles.loader} color={Brand.green} />
          ) : packages.length === 0 ? (
            <View style={[styles.proBox, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.proBoxText, { color: colors.textSecondary }]}>
                {purchasesConfigured
                  ? 'Subscriptions aren’t available right now. Please try again later.'
                  : 'The store isn’t connected yet — subscriptions will appear here once Google Play setup is complete.'}
              </Text>
            </View>
          ) : (
            <>
              {packages.map((pkg, i) => {
                const { title, sub, badge } = labelFor(pkg);
                const active = i === selected;
                return (
                  <Pressable
                    key={pkg.identifier}
                    onPress={() => setSelected(i)}
                    style={[
                      styles.pkg,
                      { backgroundColor: colors.backgroundElement, borderColor: 'transparent' },
                      active && { borderColor: Brand.green, backgroundColor: '#22C55E22' },
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
                  <Text style={styles.ctaText}>Become a supporter</Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable style={styles.restore} onPress={onRestore} disabled={busy}>
            <Text style={[styles.restoreText, { color: colors.textSecondary }]}>
              Restore purchases
            </Text>
          </Pressable>

          <Text style={[styles.fine, { color: colors.textSecondary }]}>
            Billed through Google Play. Renews automatically until cancelled — cancel anytime in
            Play Store → Subscriptions.
          </Text>
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
  logoDot: { width: 40, height: 40, borderRadius: 20, marginTop: Spacing.two },
  title: { fontSize: 34, fontWeight: '800', marginTop: Spacing.three },
  subtitle: { fontSize: 15, textAlign: 'center', marginTop: Spacing.two, lineHeight: 21 },

  perks: {
    alignSelf: 'stretch',
    borderRadius: 18,
    padding: Spacing.four,
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  perkEmoji: { fontSize: 20 },
  perkText: { fontSize: 15, fontWeight: '600', flex: 1 },

  loader: { marginTop: Spacing.five },

  proBox: { alignSelf: 'stretch', borderRadius: 18, padding: Spacing.four, marginTop: Spacing.four },
  proBoxText: { fontSize: 15, textAlign: 'center', lineHeight: 21 },

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

  restore: { paddingVertical: Spacing.three },
  restoreText: { fontSize: 14, fontWeight: '600' },
  fine: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
