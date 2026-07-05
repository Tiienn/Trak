import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlateIcon } from '@/components/icons';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { dayKey, sumTotals, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
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
  const days = groupByDay(meals);
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
  closeText: { fontSize: 20, fontWeight: '600' },

  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
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
  emptyText: { fontSize: 14, textAlign: 'center' },
});
