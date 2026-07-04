import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Rect } from 'react-native-svg';

import { TrendUpIcon } from '@/components/icons';
import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { dayKey, sumTotals, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { LoggedMeal } from '@/lib/types';

type DayStat = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Build stats for the last 7 calendar days, oldest first. */
function lastSevenDays(meals: LoggedMeal[]): DayStat[] {
  const byDay: Record<string, LoggedMeal[]> = {};
  for (const m of meals) (byDay[m.date] ??= []).push(m);
  const out: DayStat[] = [];
  const cursor = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const totals = sumTotals(byDay[key] ?? []);
    out.push({
      date: key,
      label: d.toLocaleDateString([], { weekday: 'narrow' }),
      calories: totals.calories,
      protein: totals.protein_g,
      carbs: totals.carbs_g,
      fat: totals.fat_g,
    });
  }
  return out;
}

/** 7-bar calorie chart with the target as a dashed reference line. */
function CalorieBars({
  stats,
  target,
  colors,
}: {
  stats: DayStat[];
  target: number;
  colors: ThemeColors;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const H = 160;
  const top = 8;
  const bottom = 22;
  const innerH = H - top - bottom;
  const max = Math.max(target, ...stats.map((s) => s.calories), 1) * 1.1;
  const barW = width > 0 ? (width / stats.length) * 0.5 : 0;
  const slot = width / stats.length;
  const yFor = (v: number) => top + (1 - v / max) * innerH;

  return (
    <View onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={H}>
          {/* target reference line */}
          <Line
            x1={0}
            y1={yFor(target)}
            x2={width}
            y2={yFor(target)}
            stroke={colors.textSecondary}
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          {stats.map((s, i) => {
            const h = (s.calories / max) * innerH;
            const over = s.calories > target;
            const cx = slot * i + slot / 2;
            return (
              <Rect
                key={s.date}
                x={cx - barW / 2}
                y={top + innerH - h}
                width={barW}
                height={Math.max(h, s.calories > 0 ? 2 : 0)}
                rx={4}
                fill={over ? Brand.over : Brand.green}
                opacity={s.calories > 0 ? 1 : 0.15}
              />
            );
          })}
        </Svg>
      ) : (
        <View style={{ height: H }} />
      )}
      <View style={styles.barLabels}>
        {stats.map((s, i) => (
          <Text key={i} style={[styles.barLabel, { color: colors.textSecondary }]}>
            {s.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Stat({ value, label, colors }: { value: string; label: string; colors: ThemeColors }) {
  return (
    <View style={[styles.statBox, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { meals, targets } = useMeals();

  const stats = lastSevenDays(meals);
  const loggedDays = stats.filter((s) => s.calories > 0);
  const avgCalories = loggedDays.length
    ? Math.round(loggedDays.reduce((a, s) => a + s.calories, 0) / loggedDays.length)
    : 0;
  // "On target" = within 15% of the daily calorie goal.
  const onTarget = loggedDays.filter(
    (s) => Math.abs(s.calories - targets.calories) <= targets.calories * 0.15
  ).length;
  const avgProtein = loggedDays.length
    ? Math.round(loggedDays.reduce((a, s) => a + s.protein, 0) / loggedDays.length)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Last 7 days</Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {loggedDays.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <TrendUpIcon size={30} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Log meals for a few days and your trends will show up here.
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Calories per day</Text>
                <CalorieBars stats={stats} target={targets.calories} colors={colors} />
                <Text style={[styles.legend, { color: colors.textSecondary }]}>
                  Dashed line = your {targets.calories.toLocaleString()} kcal target
                </Text>
              </View>

              <View style={styles.statRow}>
                <Stat value={avgCalories.toLocaleString()} label="avg kcal / day" colors={colors} />
                <Stat value={`${onTarget}/${loggedDays.length}`} label="days on target" colors={colors} />
              </View>
              <View style={styles.statRow}>
                <Stat value={`${avgProtein} g`} label="avg protein" colors={colors} />
                <Stat value={`${loggedDays.length}/7`} label="days logged" colors={colors} />
              </View>
            </>
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
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, marginTop: 2, marginBottom: Spacing.three },

  scroll: { gap: Spacing.three, paddingBottom: Spacing.four },

  chartCard: { borderRadius: 20, padding: Spacing.four, gap: Spacing.three },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  legend: { fontSize: 12, textAlign: 'center' },
  barLabels: { flexDirection: 'row', marginTop: 4 },
  barLabel: { flex: 1, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  statRow: { flexDirection: 'row', gap: Spacing.three },
  statBox: { flex: 1, borderRadius: 16, padding: Spacing.four, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontWeight: '600' },

  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
