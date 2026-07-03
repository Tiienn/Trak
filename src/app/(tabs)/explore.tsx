import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useAppScheme, useThemeMode, type ThemeMode } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import { enableHealthSync, healthAvailable, healthSyncEnabled } from '@/lib/health';
import { usePro } from '@/lib/purchases';
import { dayKey, sumTotals, useMeals } from '@/lib/store';
import { LoggedMeal } from '@/lib/types';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = dayKey();
  const yesterday = (() => {
    const t = new Date();
    t.setDate(t.getDate() - 1);
    return dayKey(t);
  })();
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

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

/** Small card offering to mirror logged meals into Android Health Connect. */
function HealthCard({ colors }: { colors: ThemeColors }) {
  const [state, setState] = useState<HealthState>('hidden');

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
            ? 'New meals sync automatically.'
            : 'Mirror your meals into Android Health.'}
        </Text>
      </View>
      {state === 'on' ? (
        <Text style={styles.healthOn}>✓ On</Text>
      ) : (
        <Pressable
          style={styles.healthBtn}
          onPress={async () => {
            const ok = await enableHealthSync().catch(() => false);
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

/** Supporter card — Trak stays free; Pro exists to support development. */
function ProCard({ colors }: { colors: ThemeColors }) {
  const isPro = usePro();
  return (
    <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Trak Pro</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          {isPro ? 'You’re a supporter — thank you! 💚' : 'Enjoying Trak? Support its development.'}
        </Text>
      </View>
      {isPro ? (
        <Text style={styles.healthOn}>💚 Pro</Text>
      ) : (
        <Pressable style={styles.healthBtn} onPress={() => router.push('/paywall')}>
          <Text style={styles.healthBtnText}>Support</Text>
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

/** Group meals (already newest-first) into ordered day buckets. */
function groupByDay(meals: LoggedMeal[]): { date: string; meals: LoggedMeal[] }[] {
  const order: string[] = [];
  const map: Record<string, LoggedMeal[]> = {};
  for (const meal of meals) {
    if (!map[meal.date]) {
      map[meal.date] = [];
      order.push(meal.date);
    }
    map[meal.date].push(meal);
  }
  return order.map((date) => ({ date, meals: map[date] }));
}

export default function HistoryScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { meals, refresh } = useMeals();
  const { signOut } = useAuth();
  const days = groupByDay(meals);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>History</Text>
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
        <ProfileCard colors={colors} />
        <HealthCard colors={colors} />
        <ProCard colors={colors} />
        <AppearanceCard colors={colors} />
        {days.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your logged meals will show up here.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Brand.green}
                colors={[Brand.green]}
              />
            }>
            {days.map((day) => {
              const totals = sumTotals(day.meals);
              return (
                <View key={day.date} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={[styles.dayLabel, { color: colors.text }]}>
                      {formatDateLabel(day.date)}
                    </Text>
                    <Text style={[styles.dayTotal, { color: colors.textSecondary }]}>
                      {totals.calories.toLocaleString()} kcal
                    </Text>
                  </View>
                  <View style={[styles.dayCard, { backgroundColor: colors.backgroundElement }]}>
                    {day.meals.map((meal, i) => (
                      <Pressable
                        key={meal.id}
                        onPress={() => router.push(`/meal/${meal.id}`)}
                        style={({ pressed }) => [
                          styles.mealRow,
                          pressed && { backgroundColor: colors.backgroundSelected },
                          i < day.meals.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.backgroundSelected,
                          },
                        ]}>
                        <View style={styles.mealInfo}>
                          <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={1}>
                            {meal.title}
                          </Text>
                          <Text style={[styles.mealMeta, { color: colors.textSecondary }]}>
                            {formatTime(meal.createdAt)} · {meal.total.protein_g}p ·{' '}
                            {meal.total.carbs_g}c · {meal.total.fat_g}f
                          </Text>
                        </View>
                        <Text style={[styles.mealCals, { color: colors.text }]}>
                          {meal.total.calories}
                        </Text>
                        <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
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
  title: { fontSize: 30, fontWeight: '800' },
  signOut: { color: '#EF4444', fontSize: 15, fontWeight: '600' },

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
  scroll: { paddingBottom: 100, gap: Spacing.four },
  dayGroup: { gap: Spacing.two },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dayLabel: { fontSize: 17, fontWeight: '700' },
  dayTotal: { fontSize: 14, fontWeight: '600' },
  dayCard: { borderRadius: 16, paddingHorizontal: Spacing.three },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.two },
  mealInfo: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: '700' },
  mealMeta: { fontSize: 12, marginTop: 2 },
  mealCals: { fontSize: 16, fontWeight: '800' },
  chevron: { fontSize: 20, fontWeight: '600', marginLeft: 2 },
  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four },
  emptyEmoji: { fontSize: 34 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
