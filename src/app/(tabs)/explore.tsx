import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
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
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { meals } = useMeals();
  const days = groupByDay(meals);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={[styles.title, { color: colors.text }]}>History</Text>
        {days.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Your logged meals will show up here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                      <View
                        key={meal.id}
                        style={[
                          styles.mealRow,
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
                      </View>
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
  title: { fontSize: 30, fontWeight: '800', paddingTop: Spacing.two, marginBottom: Spacing.three },
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
  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four },
  emptyEmoji: { fontSize: 34 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
