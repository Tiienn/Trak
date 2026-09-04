import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DumbbellIcon, DropletIcon, PillIcon, PlateIcon, TrophyIcon } from '@/components/icons';
import { Brand, Colors, MacroColors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { buildDailyHistory, dailyHistoryFor, personalRecords } from '@/lib/history';
import { dayKey, useMeals } from '@/lib/store';
import { useSupplements } from '@/lib/supplements';
import { useAppScheme } from '@/lib/theme';
import { workoutFocusLabel } from '@/lib/training-catalog';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function localDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function monthCells(month: Date): (string | null)[] {
  const year = month.getFullYear();
  const index = month.getMonth();
  const cells: (string | null)[] = Array(new Date(year, index, 1).getDay()).fill(null);
  const count = new Date(year, index + 1, 0).getDate();
  for (let day = 1; day <= count; day += 1) cells.push(dayKey(new Date(year, index, day)));
  while (cells.length % 7) cells.push(null);
  return cells;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function HistoryScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { meals, exercises, waterHistory, waterGoal, targets, refresh } = useMeals();
  const { supplements, checks } = useSupplements();
  const today = dayKey();
  const params = useLocalSearchParams<{ date?: string | string[] }>();
  const requestedDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const initialDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : today;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = localDate(initialDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [refreshing, setRefreshing] = useState(false);

  const input = useMemo(
    () => ({ meals, exercises, water: waterHistory, supplements, supplementChecks: checks, targets, waterGoal }),
    [meals, exercises, waterHistory, supplements, checks, targets, waterGoal]
  );
  const days = useMemo(() => buildDailyHistory(input), [input]);
  const byDate = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const selected = byDate.get(selectedDate) ?? dailyHistoryFor(selectedDate, input);
  const records = useMemo(() => personalRecords(days), [days]);
  const cells = useMemo(() => monthCells(visibleMonth), [visibleMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  function moveMonth(amount: number) {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
    setVisibleMonth(next);
    setSelectedDate(dayKey(next));
  }

  const workoutEntries = [...selected.exercises].sort((a, b) => b.createdAt - a.createdAt);
  const mealEntries = [...selected.meals].sort((a, b) => b.createdAt - a.createdAt);
  const workoutMinutes = selected.exercises.reduce((sum, exercise) => sum + Math.max(0, exercise.durationMinutes || 0), 0);
  const dateLabel = localDate(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>YOUR TIMELINE</Text>
            <Text style={[styles.title, { color: colors.text }]}>History</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close history" onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.green} colors={[Brand.green]} />}>
          <View style={[styles.calendarCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.monthRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} hitSlop={10}>
                <Text style={[styles.monthArrow, { color: colors.text }]}>‹</Text>
              </Pressable>
              <Text style={[styles.monthTitle, { color: colors.text }]}>
                {visibleMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => moveMonth(1)} hitSlop={10}>
                <Text style={[styles.monthArrow, { color: colors.text }]}>›</Text>
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {WEEKDAYS.map((label, index) => (
                <Text key={`${label}-${index}`} style={[styles.weekday, { color: colors.textSecondary }]}>{label}</Text>
              ))}
              {cells.map((date, index) => {
                if (!date) return <View key={`blank-${index}`} style={styles.dayCell} />;
                const active = date === selectedDate;
                const tracked = byDate.get(date)?.hasActivity ?? false;
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={localDate(date).toLocaleDateString()}
                    accessibilityState={{ selected: active }}
                    onPress={() => setSelectedDate(date)}
                    style={styles.dayCell}>
                    <View style={[styles.dayCircle, active && { backgroundColor: Brand.green }]}>
                      <Text style={[styles.dayNumber, { color: active ? '#FFFFFF' : colors.text }]}>{localDate(date).getDate()}</Text>
                    </View>
                    <View style={[styles.activityDot, tracked && { backgroundColor: active ? Brand.green : MacroColors.protein }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.dateTitle, { color: colors.text }]}>{dateLabel}</Text>
            {selectedDate === today ? <Text style={[styles.todayBadge, { color: colors.accentStrong, backgroundColor: colors.greenTint }]}>TODAY</Text> : null}
          </View>

          <View style={styles.scoreCard}>
            <View>
              <Text style={styles.scoreLabel}>TRAK SCORE</Text>
              <Text style={styles.scoreValue}>{selected.hasActivity ? selected.score : '—'}</Text>
            </View>
            <View style={styles.calorieBlock}>
              <Text style={styles.calorieValue}>{Math.round(selected.totals.calories).toLocaleString()}</Text>
              <Text style={styles.calorieLabel}>of {Math.round(selected.calorieBudget).toLocaleString()} kcal</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            {[
              { label: 'Protein', value: selected.totals.protein_g, color: MacroColors.protein },
              { label: 'Carbs', value: selected.totals.carbs_g, color: MacroColors.carbs },
              { label: 'Fat', value: selected.totals.fat_g, color: MacroColors.fat },
            ].map((macro) => (
              <View key={macro.label} style={[styles.macroCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                <Text style={[styles.macroValue, { color: colors.text }]}>{Math.round(macro.value)}g</Text>
                <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{macro.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.habitsCard, { backgroundColor: colors.backgroundElement }]}>
            <Habit icon={<DropletIcon size={20} color={colors.accent} />} value={`${selected.waterGlasses}/${selected.waterGoal}`} label="water" colors={colors} />
            <View style={[styles.habitDivider, { backgroundColor: colors.backgroundSelected }]} />
            <Habit icon={<PillIcon size={20} color={colors.accent} />} value={`${selected.supplementsTaken.length}/${selected.supplementsPlanned}`} label="supplements" colors={colors} />
            <View style={[styles.habitDivider, { backgroundColor: colors.backgroundSelected }]} />
            <Habit icon={<DumbbellIcon size={20} color={colors.accent} />} value={`${workoutMinutes}`} label="workout min" colors={colors} />
          </View>
          {selected.supplementsTaken.length > 0 ? (
            <Text style={[styles.supplementNames, { color: colors.textSecondary }]}>Taken: {selected.supplementsTaken.map((item) => item.name).join(' · ')}</Text>
          ) : null}

          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Workouts</Text>
            {workoutEntries.length > 0 ? (
              <Text style={[styles.sectionSummary, { color: colors.textSecondary }]}>
                {workoutEntries.length} logged · {workoutMinutes} min · {Math.round(selected.caloriesBurned)} kcal
              </Text>
            ) : null}
          </View>
          {workoutEntries.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <DumbbellIcon size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No workout logged on this day.</Text>
            </View>
          ) : (
            <View style={[styles.logCard, { backgroundColor: colors.backgroundElement }]}>
              {workoutEntries.map((exercise, index) => {
                const border = index < workoutEntries.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundSelected } : undefined;
                const focuses = [...new Set(exercise.workoutSplits.map(workoutFocusLabel))].join(' · ');
                return (
                  <View key={`exercise-${exercise.id}`} style={[styles.logRow, border]}>
                    <DumbbellIcon size={20} color={colors.accent} />
                    <View style={styles.logInfo}>
                      <Text style={[styles.logTitle, { color: colors.text }]} numberOfLines={1}>{exercise.name}</Text>
                      <Text style={[styles.logMeta, { color: colors.textSecondary }]}>{formatTime(exercise.createdAt)} · {exercise.durationMinutes} min{focuses ? ` · ${focuses}` : ''}</Text>
                    </View>
                    <Text style={[styles.logValue, { color: colors.accent }]}>{Math.round(exercise.caloriesBurned)} kcal</Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Meals</Text>
          {mealEntries.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <PlateIcon size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No meals logged on this day.</Text>
            </View>
          ) : (
            <View style={[styles.logCard, { backgroundColor: colors.backgroundElement }]}>
              {mealEntries.map((meal, index) => {
                const border = index < mealEntries.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.backgroundSelected } : undefined;
                return (
                  <Pressable key={`meal-${meal.id}`} onPress={() => router.push(`/meal/${meal.id}`)} style={({ pressed }) => [styles.logRow, border, pressed && { backgroundColor: colors.backgroundSelected }]}>
                    <PlateIcon size={20} color={colors.textSecondary} />
                    <View style={styles.logInfo}>
                      <Text style={[styles.logTitle, { color: colors.text }]} numberOfLines={1}>{meal.title}</Text>
                      <Text style={[styles.logMeta, { color: colors.textSecondary }]}>{formatTime(meal.createdAt)} · {Math.round(meal.total.protein_g)}g protein</Text>
                    </View>
                    <Text style={[styles.logValue, { color: colors.text }]}>{Math.round(meal.total.calories)}</Text>
                    <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {records.length > 0 ? (
            <>
              <View style={styles.recordsTitleRow}>
                <TrophyIcon size={19} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal records</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recordsRow}>
                {records.map((record) => (
                  <View key={record.key} style={[styles.recordCard, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.recordLabel, { color: colors.textSecondary }]}>{record.label}</Text>
                    <Text style={[styles.recordValue, { color: colors.text }]}>{record.value.toLocaleString()} <Text style={styles.recordUnit}>{record.unit}</Text></Text>
                    <Text style={[styles.recordDate, { color: colors.accent }]}>{localDate(record.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Habit({ icon, value, label, colors }: { icon: ReactNode; value: string; label: string; colors: ThemeColors }) {
  return <View style={styles.habitItem}>{icon}<Text style={[styles.habitValue, { color: colors.text }]}>{value}</Text><Text style={[styles.habitLabel, { color: colors.textSecondary }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safe: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { fontFamily: Type.display, fontSize: 35, fontWeight: '700', letterSpacing: -0.8 }, closeText: { fontSize: 20, fontWeight: '600' },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  calendarCard: { borderRadius: 24, padding: Spacing.three }, monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  monthArrow: { fontSize: 30, lineHeight: 32, paddingHorizontal: Spacing.two }, monthTitle: { fontSize: 17, fontWeight: '800' }, calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', fontSize: 11, fontWeight: '800', paddingVertical: Spacing.one }, dayCell: { width: '14.2857%', height: 45, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, dayNumber: { fontSize: 14, fontWeight: '700' }, activityDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one }, dateTitle: { fontFamily: Type.display, fontSize: 24, fontWeight: '700', flex: 1 },
  todayBadge: { fontSize: 10, fontWeight: '900', letterSpacing: 1, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  scoreCard: { backgroundColor: Brand.greenDark, borderRadius: 24, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLabel: { color: '#D8E8DC', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, scoreValue: { color: '#FFFFFF', fontFamily: Type.display, fontSize: 48, lineHeight: 54, fontWeight: '700' },
  calorieBlock: { alignItems: 'flex-end' }, calorieValue: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' }, calorieLabel: { color: '#D8E8DC', fontSize: 12, marginTop: 2 },
  macroRow: { flexDirection: 'row', gap: Spacing.two }, macroCard: { flex: 1, borderRadius: 18, padding: Spacing.three }, macroDot: { width: 7, height: 7, borderRadius: 4, marginBottom: Spacing.two },
  macroValue: { fontSize: 19, fontWeight: '800' }, macroLabel: { fontSize: 11, marginTop: 2 }, habitsCard: { borderRadius: 20, paddingVertical: Spacing.three, flexDirection: 'row', alignItems: 'stretch' },
  habitItem: { flex: 1, alignItems: 'center', gap: 3 }, habitDivider: { width: StyleSheet.hairlineWidth }, habitValue: { fontSize: 15, fontWeight: '800' }, habitLabel: { fontSize: 10, textAlign: 'center' },
  supplementNames: { fontSize: 12, lineHeight: 18, marginTop: -Spacing.two }, sectionTitleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two }, sectionTitle: { fontSize: 18, fontWeight: '800' }, sectionSummary: { flexShrink: 1, fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'right' }, empty: { borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: Spacing.two }, emptyText: { fontSize: 13, textAlign: 'center' },
  logCard: { borderRadius: 20, paddingHorizontal: Spacing.three, overflow: 'hidden' }, logRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, logInfo: { flex: 1 }, logTitle: { fontSize: 14, fontWeight: '700' }, logMeta: { fontSize: 11, marginTop: 3 }, logValue: { fontSize: 15, fontWeight: '800' }, chevron: { fontSize: 20 },
  recordsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two }, recordsRow: { gap: Spacing.two, paddingRight: Spacing.four }, recordCard: { width: 166, minHeight: 112, borderRadius: 18, padding: Spacing.three, justifyContent: 'space-between' },
  recordLabel: { fontSize: 11, fontWeight: '700' }, recordValue: { fontSize: 20, fontWeight: '900' }, recordUnit: { fontSize: 10, fontWeight: '600' }, recordDate: { fontSize: 11, fontWeight: '700' },
});
