import { router } from 'expo-router';
import { useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Line, Rect } from 'react-native-svg';

import { TrendUpIcon } from '@/components/icons';
import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import {
  calorieBudgetForDay,
  caloriesBurnedForDay,
  EXERCISE_CALORIE_CREDIT_PERCENT,
} from '@/lib/exercise';
import { dayKey, sumTotals, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import type { ExerciseEntry, LoggedMeal } from '@/lib/types';

type DayStat = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  burned: number;
  budget: number;
  workoutMinutes: number;
  workoutCount: number;
};

/** Build stats for the last 7 calendar days, oldest first. */
function lastSevenDays(
  meals: LoggedMeal[],
  exercises: ExerciseEntry[],
  baseCalorieTarget: number
): DayStat[] {
  const byDay: Record<string, LoggedMeal[]> = {};
  const workoutsByDay: Record<string, ExerciseEntry[]> = {};
  for (const m of meals) (byDay[m.date] ??= []).push(m);
  for (const exercise of exercises) (workoutsByDay[exercise.date] ??= []).push(exercise);
  const out: DayStat[] = [];
  const cursor = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const totals = sumTotals(byDay[key] ?? []);
    const workouts = workoutsByDay[key] ?? [];
    const burned = caloriesBurnedForDay(exercises, key);
    out.push({
      date: key,
      label: d.toLocaleDateString([], { weekday: 'narrow' }),
      calories: totals.calories,
      protein: totals.protein_g,
      carbs: totals.carbs_g,
      fat: totals.fat_g,
      burned,
      budget: calorieBudgetForDay(baseCalorieTarget, burned),
      workoutMinutes: workouts.reduce((total, workout) => total + Math.max(0, workout.durationMinutes || 0), 0),
      workoutCount: workouts.length,
    });
  }
  return out;
}

/** Seven-day workout-duration chart, matching the calorie chart rhythm. */
function WorkoutBars({ stats, colors }: { stats: DayStat[]; colors: ThemeColors }) {
  const [width, setWidth] = useState(0);
  const height = 138;
  const top = 8;
  const bottom = 22;
  const innerHeight = height - top - bottom;
  const maximum = Math.max(...stats.map((stat) => stat.workoutMinutes), 30);
  const slot = width / stats.length;
  const barWidth = width > 0 ? slot * 0.5 : 0;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Workout minutes over the last seven days: ${stats.map((stat) => `${stat.label} ${stat.workoutMinutes}`).join(', ')}`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {stats.map((stat, index) => {
            const barHeight = (stat.workoutMinutes / maximum) * innerHeight;
            const centerX = slot * index + slot / 2;
            return (
              <Rect
                key={stat.date}
                x={centerX - barWidth / 2}
                y={top + innerHeight - barHeight}
                width={barWidth}
                height={Math.max(barHeight, stat.workoutCount > 0 ? 3 : 0)}
                rx={4}
                fill={colors.accent}
                opacity={stat.workoutCount > 0 ? 1 : 0.12}
              />
            );
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      <View style={styles.barLabels}>
        {stats.map((stat) => (
          <Text key={stat.date} style={[styles.barLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
        ))}
      </View>
    </View>
  );
}

/** 7-bar calorie chart with each day's exercise-adjusted budget marker. */
function CalorieBars({ stats, colors }: { stats: DayStat[]; colors: ThemeColors }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const H = 160;
  const top = 8;
  const bottom = 22;
  const innerH = H - top - bottom;
  const max = Math.max(...stats.flatMap((stat) => [stat.calories, stat.budget]), 1) * 1.1;
  const barW = width > 0 ? (width / stats.length) * 0.5 : 0;
  const slot = width / stats.length;
  const yFor = (v: number) => top + (1 - v / max) * innerH;

  return (
    <View onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={H}>
          {stats.map((s, i) => {
            const h = (s.calories / max) * innerH;
            const over = s.calories > s.budget;
            const cx = slot * i + slot / 2;
            return (
              <G key={s.date}>
                <Rect
                  x={cx - barW / 2}
                  y={top + innerH - h}
                  width={barW}
                  height={Math.max(h, s.calories > 0 ? 2 : 0)}
                  rx={4}
                  fill={over ? Brand.over : colors.accent}
                  opacity={s.calories > 0 ? 1 : 0.15}
                />
                <Line
                  x1={cx - slot * 0.36}
                  y1={yFor(s.budget)}
                  x2={cx + slot * 0.36}
                  y2={yFor(s.budget)}
                  stroke={colors.textSecondary}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0.65}
                />
              </G>
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
  const { meals, exercises, targets } = useMeals();

  const stats = lastSevenDays(meals, exercises, targets.calories);
  const loggedDays = stats.filter((s) => s.calories > 0);
  const exerciseDays = stats.filter((s) => s.workoutCount > 0);
  const avgCalories = loggedDays.length
    ? Math.round(loggedDays.reduce((a, s) => a + s.calories, 0) / loggedDays.length)
    : 0;
  // "On target" = within 15% of the daily calorie goal.
  const onTarget = loggedDays.filter((s) => Math.abs(s.calories - s.budget) <= s.budget * 0.15)
    .length;
  const avgProtein = loggedDays.length
    ? Math.round(loggedDays.reduce((a, s) => a + s.protein, 0) / loggedDays.length)
    : 0;
  const totalWorkoutMinutes = stats.reduce((total, stat) => total + stat.workoutMinutes, 0);
  const totalWorkouts = stats.reduce((total, stat) => total + stat.workoutCount, 0);
  const totalBurned = Math.round(stats.reduce((total, stat) => total + stat.burned, 0));

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
          {loggedDays.length === 0 && exerciseDays.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <TrendUpIcon size={30} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Log meals or workouts for a few days and your trends will show up here.
              </Text>
            </View>
          ) : (
            <>
              {loggedDays.length > 0 ? (
                <>
                  <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Calories per day</Text>
                    <CalorieBars stats={stats} colors={colors} />
                    <Text style={[styles.legend, { color: colors.textSecondary }]}>
                      Dashed markers = each day&apos;s budget, including{' '}
                      {EXERCISE_CALORIE_CREDIT_PERCENT}% exercise credit
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
              ) : null}

              {exerciseDays.length > 0 ? (
                <>
                  <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.cardTitleRow}>
                      <View style={styles.cardTitleCopy}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Workout activity</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Minutes logged each day</Text>
                      </View>
                      <Text style={[styles.cardTotal, { color: colors.accent }]}>{totalWorkoutMinutes} min</Text>
                    </View>
                    <WorkoutBars stats={stats} colors={colors} />
                  </View>
                  <View style={styles.statRow}>
                    <Stat value={`${totalWorkouts}`} label="workouts logged" colors={colors} />
                    <Stat value={`${exerciseDays.length}/7`} label="days trained" colors={colors} />
                  </View>
                  <View style={styles.statRow}>
                    <Stat value={`${totalWorkoutMinutes}`} label="total workout min" colors={colors} />
                    <Stat value={`${totalBurned}`} label="workout kcal" colors={colors} />
                  </View>
                </>
              ) : (
                <View style={[styles.workoutEmpty, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.cardTitleCopy}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Workout activity</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>No workouts logged in the last 7 days.</Text>
                  </View>
                </View>
              )}
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
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardTitleCopy: { flex: 1, gap: 2 },
  cardSubtitle: { fontSize: 12, lineHeight: 17 },
  cardTotal: { fontSize: 16, fontWeight: '900' },
  workoutEmpty: { minHeight: 88, borderRadius: 20, padding: Spacing.four, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
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
