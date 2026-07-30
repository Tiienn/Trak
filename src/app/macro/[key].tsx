import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, MacroColors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { LoggedMeal } from '@/lib/types';

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';

const CONFIG: Record<
  MacroKey,
  { label: string; unit: string; color: string; totalsKey: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' }
> = {
  calories: { label: 'Calories', unit: ' kcal', color: Brand.green, totalsKey: 'calories' },
  protein: { label: 'Protein', unit: 'g', color: MacroColors.protein, totalsKey: 'protein_g' },
  carbs: { label: 'Carbs', unit: 'g', color: MacroColors.carbs, totalsKey: 'carbs_g' },
  fat: { label: 'Fat', unit: 'g', color: MacroColors.fat, totalsKey: 'fat_g' },
};

/** A per-macro suggestion for closing the day's gap. */
const GAP_IDEAS: Record<MacroKey, string> = {
  calories: 'Plan the rest of the day around what you have left.',
  protein: 'Greek yogurt, eggs, tuna, or a handful of nuts close it easily.',
  carbs: 'Rice, oats, potatoes, or fruit top this up fast.',
  fat: 'Avocado, olive oil, or nuts round it out.',
};

function insight(
  key: MacroKey,
  consumed: number,
  target: number,
  topFood: string | null
): string {
  const cfg = CONFIG[key];
  const left = Math.max(0, target - consumed);
  if (consumed <= 0) {
    return `Nothing logged yet today. As you log meals, your ${cfg.label.toLowerCase()} will build up here.`;
  }
  if (consumed > target) {
    return key === 'calories'
      ? `You're ${consumed - target}${cfg.unit} over today's budget. A walk helps — and tomorrow resets.`
      : `You're past today's ${cfg.label.toLowerCase()} target — not a problem on its own; tomorrow resets.`;
  }
  const from = topFood ? ` Most of it came from ${topFood}.` : '';
  if (consumed / target < 0.55) {
    return `You've taken in ${consumed}${cfg.unit} of your ${target}${cfg.unit} goal.${from} ${GAP_IDEAS[key]}`;
  }
  return `Nice pace — ${left}${cfg.unit} to go.${from}`;
}

function MacroChip({
  color,
  value,
  colors,
}: {
  color: string;
  value: number;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, { color: colors.textSecondary }]}>{value}</Text>
    </View>
  );
}

function FoodRow({ meal, colors }: { meal: LoggedMeal; colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.foodRow,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push(`/meal/${meal.id}`)}>
      <View style={styles.foodInfo}>
        <Text style={[styles.foodTitle, { color: colors.text }]} numberOfLines={1}>
          {meal.title}
        </Text>
        <View style={styles.foodMeta}>
          <Text style={[styles.foodCals, { color: colors.textSecondary }]}>
            {meal.total.calories} cal
          </Text>
          <MacroChip color={MacroColors.protein} value={meal.total.protein_g} colors={colors} />
          <MacroChip color={MacroColors.carbs} value={meal.total.carbs_g} colors={colors} />
          <MacroChip color={MacroColors.fat} value={meal.total.fat_g} colors={colors} />
        </View>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

export default function MacroDetailScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const params = useLocalSearchParams<{ key?: string }>();
  const key: MacroKey = (['calories', 'protein', 'carbs', 'fat'] as const).includes(
    params.key as MacroKey
  )
    ? (params.key as MacroKey)
    : 'calories';
  const cfg = CONFIG[key];

  const { todayMeals, todayTotals, targets, calorieBudget } = useMeals();
  const target = key === 'calories' ? calorieBudget : targets[cfg.totalsKey];
  const consumed = todayTotals[cfg.totalsKey];
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;

  const contributors = [...todayMeals]
    .filter((m) => m.total[cfg.totalsKey] > 0)
    .sort((a, b) => b.total[cfg.totalsKey] - a.total[cfg.totalsKey]);
  const topFood = contributors.length > 0 ? contributors[0].title : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <View style={[styles.titleDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.title, { color: colors.text }]}>{cfg.label}</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* The fill circle — fills bottom-up toward the day's target. */}
          <View style={styles.circleWrap}>
            <View style={[styles.circle, { backgroundColor: `${cfg.color}26` }]}>
              <View
                style={[
                  styles.circleFill,
                  { height: `${Math.round(pct * 100)}%`, backgroundColor: cfg.color },
                ]}
              />
              <View style={styles.circleCenter}>
                <Text
                  style={[
                    styles.circleValue,
                    { color: pct > 0.62 ? '#ffffff' : colors.text },
                  ]}>
                  {consumed}
                  <Text style={styles.circleUnit}>{cfg.unit.trim() === 'kcal' ? '' : 'g'}</Text>
                </Text>
                <Text
                  style={[
                    styles.circleTarget,
                    { color: pct > 0.45 ? 'rgba(255,255,255,0.85)' : colors.textSecondary },
                  ]}>
                  of {target}
                </Text>
              </View>
            </View>
          </View>

          {/* Insight card */}
          <View style={[styles.insightCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.insightText, { color: colors.text }]}>
              {insight(key, consumed, target, topFood)}
            </Text>
          </View>

          {/* Contributing foods */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Contributing foods</Text>
          {contributors.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Meals you log today will show up here with their {cfg.label.toLowerCase()}.
              </Text>
            </View>
          ) : (
            <View style={styles.foodList}>
              {contributors.map((m) => (
                <FoodRow key={m.id} meal={m} colors={colors} />
              ))}
            </View>
          )}
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
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleDot: { width: 12, height: 12, borderRadius: 6 },
  title: { fontSize: 26, fontFamily: Type.display, fontWeight: '700' },
  closeText: { fontSize: 20, fontWeight: '600' },

  scroll: { paddingBottom: Spacing.five, gap: Spacing.four },
  circleWrap: { alignItems: 'center', marginTop: Spacing.two },
  circle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  circleFill: { width: '100%' },
  circleCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleValue: { fontSize: 46, fontFamily: Type.display, fontWeight: '700', letterSpacing: -1 },
  circleUnit: { fontSize: 22 },
  circleTarget: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  insightCard: { borderRadius: 20, padding: Spacing.four },
  insightText: { fontSize: 15, lineHeight: 23 },

  sectionTitle: { fontSize: 19, fontFamily: Type.display, fontWeight: '700' },
  foodList: { gap: Spacing.two },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  foodInfo: { flex: 1, gap: 5 },
  foodTitle: { fontSize: 15, fontWeight: '700' },
  foodMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  foodCals: { fontSize: 13, fontWeight: '600' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipDot: { width: 9, height: 9, borderRadius: 5 },
  chipText: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 20, fontWeight: '600' },

  empty: { borderRadius: 16, padding: Spacing.four },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
