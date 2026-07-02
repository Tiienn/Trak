import { Redirect, router } from 'expo-router';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useMeals } from '@/lib/store';
import { LoggedMeal } from '@/lib/types';

export const Brand = { green: '#22C55E', greenDark: '#16A34A', over: '#F97316' } as const;

/** Structural shape shared by the light and dark color palettes. */
type ThemeColors = {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function MacroBar({
  label,
  consumed,
  target,
  colors,
}: {
  label: string;
  consumed: number;
  target: number;
  colors: ThemeColors;
}) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const over = consumed > target;
  return (
    <View style={styles.macroBarRow}>
      <View style={styles.macroBarHeader}>
        <Text style={[styles.macroLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.macroValue, { color: colors.textSecondary }]}>
          {consumed} / {target} g
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
        <View
          style={[
            styles.fill,
            { width: `${pct * 100}%`, backgroundColor: over ? Brand.over : Brand.green },
          ]}
        />
      </View>
    </View>
  );
}

function MealRow({
  meal,
  colors,
  onDelete,
}: {
  meal: LoggedMeal;
  colors: ThemeColors;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.mealRow, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.mealInfo}>
        <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={1}>
          {meal.title}
        </Text>
        <Text style={[styles.mealMeta, { color: colors.textSecondary }]}>
          {formatTime(meal.createdAt)} · {meal.total.protein_g}p · {meal.total.carbs_g}c ·{' '}
          {meal.total.fat_g}f
        </Text>
      </View>
      <Text style={[styles.mealCals, { color: colors.text }]}>{meal.total.calories}</Text>
      <Pressable style={styles.deleteBtn} onPress={onDelete} hitSlop={8}>
        <Text style={[styles.deleteBtnText, { color: colors.textSecondary }]}>✕</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { user, authLoading } = useAuth();
  const {
    todayMeals,
    todayTotals,
    targets,
    removeMeal,
    loaded,
    loadError,
    retryLoad,
    hasProfile,
    streak,
  } = useMeals();

  // Route based on auth + onboarding state.
  if (authLoading) return null;
  if (!user) return <Redirect href="/auth" />;
  if (!loaded) return null;
  if (loadError) {
    // The cloud load failed (e.g. offline). Never fall through to the
    // onboarding redirect here — the user may well have a profile.
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={[styles.safe, styles.loadErrorWrap]}>
          <Text style={styles.loadErrorEmoji}>📡</Text>
          <Text style={[styles.loadErrorTitle, { color: colors.text }]}>
            Couldn&apos;t load your data
          </Text>
          <Text style={[styles.loadErrorBody, { color: colors.textSecondary }]}>
            Check your internet connection and try again.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: pressed ? Brand.greenDark : Brand.green },
            ]}
            onPress={retryLoad}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }
  if (!hasProfile) return <Redirect href="/onboarding" />;

  const remaining = targets.calories - todayTotals.calories;
  const over = remaining < 0;
  const calPct = targets.calories > 0 ? Math.min(todayTotals.calories / targets.calories, 1) : 0;

  function confirmDelete(meal: LoggedMeal) {
    Alert.alert('Remove meal?', `Remove "${meal.title}" from today?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeMeal(meal.id) },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={[styles.logoDot, { backgroundColor: Brand.green }]} />
              <Text style={[styles.wordmark, { color: colors.text }]}>Trak</Text>
            </View>
            {streak > 0 ? (
              <View style={[styles.streakPill, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.streakText, { color: colors.text }]}>
                  🔥 {streak} day{streak > 1 ? 's' : ''}
                </Text>
              </View>
            ) : (
              <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>Today</Text>
            )}
          </View>

          {/* Calories card */}
          <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
              {over ? 'Calories over today' : 'Calories left today'}
            </Text>
            <Text style={[styles.calories, { color: over ? Brand.over : colors.text }]}>
              {Math.abs(remaining).toLocaleString()}
            </Text>
            <View style={[styles.track, styles.calTrack, { backgroundColor: colors.backgroundSelected }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${calPct * 100}%`, backgroundColor: over ? Brand.over : Brand.green },
                ]}
              />
            </View>
            <Text style={[styles.calSub, { color: colors.textSecondary }]}>
              {todayTotals.calories.toLocaleString()} / {targets.calories.toLocaleString()} kcal
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />

            <MacroBar label="Protein" consumed={todayTotals.protein_g} target={targets.protein_g} colors={colors} />
            <MacroBar label="Carbs" consumed={todayTotals.carbs_g} target={targets.carbs_g} colors={colors} />
            <MacroBar label="Fat" consumed={todayTotals.fat_g} target={targets.fat_g} colors={colors} />
          </View>

          {/* Today's meals */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s meals</Text>
          {todayMeals.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No meals logged yet.{'\n'}Tap “Scan a meal” to add your first one.
              </Text>
            </View>
          ) : (
            <View style={styles.mealsList}>
              {todayMeals.map((meal) => (
                <MealRow
                  key={meal.id}
                  meal={meal}
                  colors={colors}
                  onDelete={() => confirmDelete(meal)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Scan actions */}
        <View style={styles.bottomBar}>
          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              { backgroundColor: pressed ? Brand.greenDark : Brand.green },
            ]}
            onPress={() => router.push('/scan')}>
            <Text style={styles.scanButtonText}>＋   Scan a meal</Text>
          </Pressable>
          <Pressable style={styles.barcodeLink} onPress={() => router.push('/barcode')}>
            <Text style={[styles.barcodeLinkText, { color: colors.textSecondary }]}>
              ▊▊▊  Scan a barcode
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  scroll: { paddingBottom: 140, gap: Spacing.four },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logoDot: { width: 16, height: 16, borderRadius: 8 },
  wordmark: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  todayLabel: { fontSize: 15, fontWeight: '600' },
  streakPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  streakText: { fontSize: 14, fontWeight: '700' },

  card: { borderRadius: 24, padding: Spacing.four, gap: Spacing.two },
  cardLabel: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  calories: { fontSize: 52, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
  calTrack: { marginTop: Spacing.two },
  calSub: { fontSize: 13, textAlign: 'center', marginTop: Spacing.one },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.three },

  macroBarRow: { gap: 6, marginBottom: Spacing.two },
  macroBarHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  macroLabel: { fontSize: 14, fontWeight: '600' },
  macroValue: { fontSize: 13 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '700' },
  mealsList: { gap: Spacing.two },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  mealInfo: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: '700' },
  mealMeta: { fontSize: 12, marginTop: 2 },
  mealCals: { fontSize: 16, fontWeight: '800' },
  deleteBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  deleteBtnText: { fontSize: 16, fontWeight: '600' },

  loadErrorWrap: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  loadErrorEmoji: { fontSize: 40 },
  loadErrorTitle: { fontSize: 20, fontWeight: '800' },
  loadErrorBody: { fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.two,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  retryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyEmoji: { fontSize: 34 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  bottomBar: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: Spacing.four,
    gap: Spacing.one,
  },
  scanButton: {
    borderRadius: 18,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  barcodeLink: { alignItems: 'center', paddingVertical: Spacing.two },
  barcodeLinkText: { fontSize: 14, fontWeight: '600' },
  scanButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
});
