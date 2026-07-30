import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DumbbellIcon, PlateIcon } from '@/components/icons';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { calorieBudgetForDay, creditedExerciseCalories } from '@/lib/exercise';
import { dayKey, sumTotals, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import type { ExerciseEntry, LoggedMeal } from '@/lib/types';

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

type DayBucket = { date: string; meals: LoggedMeal[]; exercises: ExerciseEntry[] };

/** Group meals and workouts into newest-first day buckets. */
function groupByDay(meals: LoggedMeal[], exercises: ExerciseEntry[]): DayBucket[] {
  const dates = new Set<string>();
  const mealMap: Record<string, LoggedMeal[]> = {};
  const exerciseMap: Record<string, ExerciseEntry[]> = {};
  for (const meal of meals) {
    dates.add(meal.date);
    (mealMap[meal.date] ??= []).push(meal);
  }
  for (const exercise of exercises) {
    dates.add(exercise.date);
    (exerciseMap[exercise.date] ??= []).push(exercise);
  }
  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, meals: mealMap[date] ?? [], exercises: exerciseMap[date] ?? [] }));
}

export default function HistoryScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { meals, exercises, targets, refresh } = useMeals();
  const days = groupByDay(meals, exercises);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>History</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        {days.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
            <PlateIcon size={30} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your logged meals and workouts will show up here.
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
              const burned = day.exercises.reduce(
                (total, exercise) => total + exercise.caloriesBurned,
                0
              );
              const credit = creditedExerciseCalories(burned);
              const budget = calorieBudgetForDay(targets.calories, burned);
              const entries = [
                ...day.meals.map((meal) => ({ kind: 'meal' as const, at: meal.createdAt, meal })),
                ...day.exercises.map((exercise) => ({
                  kind: 'exercise' as const,
                  at: exercise.createdAt,
                  exercise,
                })),
              ].sort((a, b) => b.at - a.at);
              return (
                <View key={day.date} style={styles.dayGroup}>
                  <View style={styles.dayHeader}>
                    <Text style={[styles.dayLabel, { color: colors.text }]}>
                      {formatDateLabel(day.date)}
                    </Text>
                    <View style={styles.daySummary}>
                      <Text style={[styles.dayTotal, { color: colors.textSecondary }]}>
                        {totals.calories.toLocaleString()} / {budget.toLocaleString()} kcal
                      </Text>
                      {burned > 0 ? (
                        <Text style={[styles.dayExercise, { color: Brand.greenDark }]}>
                          {burned} burned · +{credit} credit
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={[styles.dayCard, { backgroundColor: colors.backgroundElement }]}>
                    {entries.map((entry, index) => {
                      const border =
                        index < entries.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.backgroundSelected,
                        };
                      if (entry.kind === 'exercise') {
                        return (
                          <View key={`exercise-${entry.exercise.id}`} style={[styles.mealRow, border]}>
                            <DumbbellIcon size={20} color={Brand.greenDark} />
                            <View style={styles.mealInfo}>
                              <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={1}>
                                {entry.exercise.name}
                              </Text>
                              <Text style={[styles.mealMeta, { color: colors.textSecondary }]}>
                                {formatTime(entry.exercise.createdAt)} · workout
                              </Text>
                            </View>
                            <Text style={[styles.mealCals, { color: Brand.greenDark }]}>
                              +{entry.exercise.caloriesBurned}
                            </Text>
                          </View>
                        );
                      }
                      const meal = entry.meal;
                      return (
                        <Pressable
                          key={`meal-${meal.id}`}
                          onPress={() => router.push(`/meal/${meal.id}`)}
                          style={({ pressed }) => [
                            styles.mealRow,
                            pressed && { backgroundColor: colors.backgroundSelected },
                            border,
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
                      );
                    })}
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
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },

  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
  dayGroup: { gap: Spacing.two },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  dayLabel: { fontSize: 17, fontWeight: '700' },
  daySummary: { alignItems: 'flex-end', gap: 2 },
  dayTotal: { fontSize: 14, fontWeight: '600' },
  dayExercise: { fontSize: 11, fontWeight: '600' },
  dayCard: { borderRadius: 16, paddingHorizontal: Spacing.three },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.two },
  mealInfo: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: '700' },
  mealMeta: { fontSize: 12, marginTop: 2 },
  mealCals: { fontSize: 16, fontWeight: '800' },
  chevron: { fontSize: 20, fontWeight: '600', marginLeft: 2 },
  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
