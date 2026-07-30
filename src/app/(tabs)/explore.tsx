import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useAppScheme, useThemeMode, type ThemeMode } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import {
  disableHealthSync,
  enableHealthSync,
  healthAvailable,
  healthSyncEnabled,
  openHealthSettings,
} from '@/lib/health';
import { useSubscription } from '@/lib/purchases';
import { useMeals } from '@/lib/store';

type HealthState = 'hidden' | 'off' | 'on';

/** Summary of the user's body-stat profile, tap to view/edit. */
function ProfileCard({ colors }: { colors: ThemeColors }) {
  const { profile, targets } = useMeals();
  if (!profile) return null;
  const activityLabel: Record<string, string> = {
    sedentary: 'Sedentary',
    light: 'Lightly active',
    moderate: 'Moderately active',
    active: 'Very active',
    very_active: 'Extra active',
  };
  const goalLabel: Record<string, string> = {
    lose: 'Losing weight',
    maintain: 'Maintaining',
    gain: 'Gaining muscle',
  };
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/profile')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Your profile</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          {goalLabel[profile.goal]} · {Math.round(profile.weightKg)}kg ·{' '}
          {activityLabel[profile.activity]} · {targets.calories.toLocaleString()} kcal target
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Tappable card that opens the weekly insights screen. */
function InsightsCard({ colors }: { colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/insights')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Insights</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          Your last 7 days at a glance.
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Tappable card that opens the full day-by-day meal and workout history. */
function HistoryCard({ colors }: { colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/history')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>History</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          Every meal and workout you’ve logged, by day.
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Tappable card that opens the achievements/streak screen. */
function AchievementsCard({ colors }: { colors: ThemeColors }) {
  const { streak } = useMeals();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/achievements')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Achievements</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          {streak > 0 ? `${streak}-day streak · see your badges` : 'Streaks and badges'}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Tappable card that opens the reminders settings screen. */
function RemindersCard({ colors }: { colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/reminders')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Reminders</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          Daily nudges for meals, water, and weigh-ins.
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Small card offering to mirror logged meals and workouts into Health Connect. */
function HealthCard({ colors }: { colors: ThemeColors }) {
  const [state, setState] = useState<HealthState>('hidden');
  const [healthBusy, setHealthBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await healthAvailable())) return; // stays hidden (iOS / Expo Go / no HC)
      const enabled = await healthSyncEnabled();
      if (active) setState(enabled ? 'on' : 'off');
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === 'hidden') return null;

  return (
    <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Health Connect</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          {state === 'on'
            ? 'New meals and workouts sync automatically.'
            : 'Mirror meals and workouts into Android Health.'}
        </Text>
      </View>
      {state === 'on' ? (
        <Pressable
          style={[styles.healthBtn, healthBusy && { opacity: 0.55 }]}
          disabled={healthBusy}
          onPress={() =>
            Alert.alert(
              'Disconnect Health Connect?',
              'Trak will stop syncing new meals and workouts. Records already written stay in Health Connect unless you delete them there.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Disconnect',
                  style: 'destructive',
                  onPress: async () => {
                    setHealthBusy(true);
                    const ok = await disableHealthSync();
                    setHealthBusy(false);
                    setState(ok ? 'off' : 'on');
                    if (!ok) {
                      Alert.alert(
                        'Open Health Connect',
                        'Trak could not revoke access automatically. Remove Trak under App permissions in Health Connect.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open settings', onPress: openHealthSettings },
                        ]
                      );
                    }
                  },
                },
              ]
            )
          }>
          <Text style={styles.healthBtnText}>Disconnect</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.healthBtn, healthBusy && { opacity: 0.55 }]}
          disabled={healthBusy}
          onPress={async () => {
            setHealthBusy(true);
            const ok = await enableHealthSync().catch(() => false);
            setHealthBusy(false);
            setState(ok ? 'on' : 'off');
            if (!ok) {
              Alert.alert('Health Connect', 'Permission was not granted.');
            }
          }}>
          <Text style={styles.healthBtnText}>Connect</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Subscription status and management entry point. */
function ProCard({ colors }: { colors: ThemeColors }) {
  const { isPro, testerAccess, inTrial, trialDaysLeft } = useSubscription();
  const hasProAccess = isPro || testerAccess;
  // Name only what a subscription actually unlocks. Insights, games, and the
  // rest are free, and implying otherwise invites refund requests.
  const body = testerAccess && !isPro
    ? 'Full access is enabled for this testing build.'
    : isPro
      ? 'Your subscription is active.'
      : inTrial
        ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial.`
        : 'Subscribe to unlock AI photo scan and Chat.';
  return (
    <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Trak Pro</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>{body}</Text>
      </View>
      {hasProAccess ? (
        <Pressable style={styles.healthBtn} onPress={() => router.push('/paywall')}>
          <Text style={styles.healthBtnText}>{testerAccess && !isPro ? 'Tester' : 'Manage'}</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.healthBtn} onPress={() => router.push('/paywall')}>
          <Text style={styles.healthBtnText}>View plans</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Theme switcher — System follows the phone; Light/Dark force a look. */
function AppearanceCard({ colors }: { colors: ThemeColors }) {
  const { mode, setMode } = useThemeMode();
  const options: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
  return (
    <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Appearance</Text>
      </View>
      <View style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setMode(o.value)}
            style={[
              styles.segment,
              mode === o.value && { backgroundColor: colors.greenTint },
            ]}>
            <Text
              style={[
                styles.segmentText,
                { color: mode === o.value ? Brand.greenDark : colors.textSecondary },
              ]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { signOut } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <Pressable
            onPress={() =>
              Alert.alert('Sign out?', 'You can sign back in anytime.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
              ])
            }
            hitSlop={8}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ProfileCard colors={colors} />
          <InsightsCard colors={colors} />
          <HistoryCard colors={colors} />
          <AchievementsCard colors={colors} />
          <RemindersCard colors={colors} />
          <HealthCard colors={colors} />
          <ProCard colors={colors} />
          <AppearanceCard colors={colors} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  signOut: { color: '#EF4444', fontSize: 15, fontWeight: '600' },

  scroll: { paddingBottom: 100 },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  healthInfo: { flex: 1 },
  healthTitle: { fontSize: 15, fontWeight: '700' },
  healthBody: { fontSize: 13, marginTop: 2 },
  healthOn: { color: Brand.green, fontSize: 15, fontWeight: '700' },
  healthBtn: {
    backgroundColor: Brand.green,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  healthBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  segmentWrap: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  segment: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9 },
  segmentText: { fontSize: 13, fontWeight: '700' },
  chevron: { fontSize: 20, fontWeight: '600', marginLeft: 2 },
});
