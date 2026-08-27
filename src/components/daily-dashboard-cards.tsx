import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { DropletIcon, SparklesIcon } from '@/components/icons';
import { Brand, Spacing, type ThemeColors } from '@/constants/theme';
import { dayKey, useMeals } from '@/lib/store';
import { useSupplements } from '@/lib/supplements';

export type DailyCoachTip = {
  title: string;
  body: string;
  destination: 'chat' | 'ask';
};

/** Choose the same daily coaching nudge everywhere the dashboard appears. */
export function pickDailyCoachTip(input: {
  mealsLogged: number;
  proteinPct: number;
  caloriePct: number;
  waterPct: number;
  streak: number;
}): DailyCoachTip {
  const { mealsLogged, proteinPct, caloriePct, waterPct, streak } = input;
  if (mealsLogged === 0) {
    return {
      title: 'Start the day',
      body: 'Log your first meal — a quick photo scan or a one-line message to Trak is enough.',
      destination: 'chat',
    };
  }
  if (proteinPct < 0.5 && caloriePct > 0.5) {
    return {
      title: 'Protein is lagging',
      body: 'Your calories are ahead of your protein. Lean on eggs, yogurt, or tuna next meal.',
      destination: 'ask',
    };
  }
  if (waterPct < 0.5) {
    return {
      title: 'Hydration check',
      body: 'You’re behind on water — a glass now beats a litre at night.',
      destination: 'ask',
    };
  }
  if (streak >= 3) {
    return {
      title: `Day ${streak} streak`,
      body: 'Consistency is doing the heavy lifting. One more log keeps it alive.',
      destination: 'ask',
    };
  }
  return {
    title: 'Looking steady',
    body: 'No gaps right now — ask Trak about your trends or what to eat next.',
    destination: 'ask',
  };
}

export function DailyCoachCard({ tip, colors }: { tip: DailyCoachTip; colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tipCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() =>
        router.push({ pathname: '/chat', params: { mode: tip.destination, t: String(Date.now()) } })
      }>
      <View style={[styles.tipIcon, { backgroundColor: colors.greenTint }]}>
        <SparklesIcon size={18} color={Brand.greenDark} />
      </View>
      <View style={styles.tipInfo}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
        <Text style={[styles.tipBody, { color: colors.textSecondary }]}>{tip.body}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

export function DailyWeightCard({
  colors,
  selectedDate,
  weight,
  weightChange,
}: {
  colors: ThemeColors;
  selectedDate: string;
  weight: number | null;
  weightChange: number | null;
}) {
  const viewingToday = selectedDate === dayKey();
  return (
    <Pressable
      disabled={!viewingToday}
      style={({ pressed }) => [
        styles.weightCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push({ pathname: '/weight', params: { date: selectedDate } })}>
      <View style={styles.weightInfo}>
        <Text style={[styles.weightLabel, { color: colors.textSecondary }]}>Weight</Text>
        {weight != null ? (
          <Text style={[styles.weightValue, { color: colors.text }]}>{Math.round(weight * 10) / 10} kg</Text>
        ) : (
          <Text style={[styles.weightPlaceholder, { color: colors.textSecondary }]}>
            {viewingToday ? 'Log it' : 'No weight logged'}
          </Text>
        )}
      </View>
      {weightChange != null && weightChange !== 0 ? (
        <Text style={[styles.weightChange, { color: Brand.greenDark }]}>
          {weightChange > 0 ? '▲' : '▼'} {Math.abs(Math.round(weightChange * 10) / 10)} kg
        </Text>
      ) : viewingToday ? (
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
      ) : null}
    </Pressable>
  );
}

const L_PER_GLASS = 0.25;
const WATER_UNIT_KEY = 'trak.waterUnit.v1';
type WaterUnit = 'glasses' | 'litres';

function litres(glasses: number): string {
  return `${(glasses * L_PER_GLASS).toFixed(2).replace(/\.00$/, '')} L`;
}

export function DailyWaterCard({
  colors,
  selectedDate,
  historicalWater,
}: {
  colors: ThemeColors;
  selectedDate: string;
  historicalWater: number;
}) {
  const { waterToday, waterGoal, setWater, setWaterGoal } = useMeals();
  const [editingGoal, setEditingGoal] = useState(false);
  const [unit, setUnit] = useState<WaterUnit>('glasses');
  const viewingToday = selectedDate === dayKey();
  const displayedWater = viewingToday ? waterToday : historicalWater;

  useEffect(() => {
    AsyncStorage.getItem(WATER_UNIT_KEY).then((value) => {
      if (value === 'litres' || value === 'glasses') setUnit(value);
    });
  }, []);

  function pickUnit(next: WaterUnit) {
    setUnit(next);
    AsyncStorage.setItem(WATER_UNIT_KEY, next).catch(() => {});
  }

  const goalLabel = unit === 'litres' ? litres(waterGoal) : `${waterGoal}`;
  const countLabel =
    unit === 'litres'
      ? `${litres(displayedWater)} / ${litres(waterGoal)}`
      : `${displayedWater} / ${waterGoal} glasses`;

  return (
    <View style={[styles.waterCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.waterHeader}>
        <View style={styles.waterTitleRow}>
          <DropletIcon size={18} color={Brand.green} filled />
          <Text style={[styles.waterTitle, { color: colors.text }]}>Water</Text>
        </View>
        <View style={[styles.unitToggle, { backgroundColor: colors.background }]}>
          {(['glasses', 'litres'] as const).map((next) => (
            <Pressable
              key={next}
              onPress={() => pickUnit(next)}
              style={[styles.unitBtn, unit === next && { backgroundColor: colors.greenTint }]}>
              <Text
                style={[
                  styles.unitBtnText,
                  { color: unit === next ? Brand.greenDark : colors.textSecondary },
                ]}>
                {next === 'glasses' ? 'Glasses' : 'Litres'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.waterReadout}>
        {editingGoal && viewingToday ? (
          <View style={styles.goalStepper}>
            <Text style={[styles.goalPrefix, { color: colors.textSecondary }]}>Goal</Text>
            <Pressable
              hitSlop={8}
              onPress={() =>
                setWaterGoal(Math.max(1, waterGoal - 1)).catch((error) =>
                  Alert.alert('Not saved', error?.message ?? 'Please try again.')
                )
              }
              style={[styles.stepBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.goalValue, { color: colors.text }]}>{goalLabel}</Text>
            <Pressable
              hitSlop={8}
              onPress={() =>
                setWaterGoal(waterGoal + 1).catch((error) =>
                  Alert.alert('Not saved', error?.message ?? 'Please try again.')
                )
              }
              style={[styles.stepBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.stepText, { color: colors.text }]}>+</Text>
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setEditingGoal(false)}>
              <Text style={[styles.goalDone, { color: Brand.greenDark }]}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable disabled={!viewingToday} onPress={() => setEditingGoal(true)} hitSlop={8}>
            <Text style={[styles.waterCount, { color: colors.textSecondary }]}>
              {countLabel}
              {viewingToday ? ' ✎' : ''}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.glassRow}>
        {Array.from({ length: waterGoal }).map((_, index) => {
          const filled = index < displayedWater;
          return (
            <Pressable
              key={index}
              hitSlop={4}
              disabled={!viewingToday}
              onPress={() => setWater(index + 1 === displayedWater ? index : index + 1)}
              style={styles.glassTap}>
              <DropletIcon size={26} color={filled ? Brand.green : colors.backgroundSelected} filled />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CheckCircle({ checked, colors }: { checked: boolean; colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.checkCircle,
        checked
          ? { backgroundColor: Brand.green, borderColor: Brand.green }
          : { borderColor: colors.backgroundSelected },
      ]}>
      {checked ? <Text style={styles.checkGlyph}>✓</Text> : null}
    </View>
  );
}

export function DailySupplementsCard({ colors, selectedDate }: { colors: ThemeColors; selectedDate: string }) {
  const { loaded, supplements, checks, checkedToday, takenCount, streak, toggleTaken } = useSupplements();
  const viewingToday = selectedDate === dayKey();
  const visibleSupplements = viewingToday
    ? supplements
    : supplements.filter((supplement) => {
        const created = new Date(supplement.createdAt);
        return Number.isNaN(created.getTime()) || dayKey(created) <= selectedDate;
      });
  const checkedForDay = viewingToday
    ? checkedToday
    : Object.fromEntries(
        checks.filter((check) => check.day === selectedDate).map((check) => [check.supplementId, true])
      );
  const displayedTakenCount = viewingToday
    ? takenCount
    : visibleSupplements.filter((supplement) => checkedForDay[supplement.id]).length;

  if (!loaded) return null;

  async function tap(id: string) {
    try {
      await toggleTaken(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (error: any) {
      Alert.alert('Not saved', error?.message ?? 'Please try again.');
    }
  }

  return (
    <View style={[styles.suppCard, { backgroundColor: colors.backgroundElement }]}>
      <Pressable style={styles.suppHeader} onPress={() => router.push('/supplements')} hitSlop={6}>
        <Text style={[styles.suppTitle, { color: colors.text }]}>Supplements</Text>
        <View style={styles.suppHeaderRight}>
          {viewingToday && streak > 0 ? (
            <Text style={[styles.suppStreak, { color: Brand.greenDark }]}>{streak}-day streak</Text>
          ) : null}
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
        </View>
      </Pressable>

      {visibleSupplements.length === 0 ? (
        <Pressable onPress={() => router.push('/supplements')} hitSlop={6}>
          <Text style={[styles.suppAddLine, { color: colors.textSecondary }]}>
            {viewingToday ? 'Add your vitamins and supplements ›' : 'No supplements planned on this day'}
          </Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.suppList}>
            {visibleSupplements.slice(0, 6).map((supplement) => (
              <Pressable
                key={supplement.id}
                style={styles.suppRow}
                disabled={!viewingToday}
                onPress={() => tap(supplement.id)}
                hitSlop={4}>
                <Text style={[styles.suppName, { color: colors.text }]} numberOfLines={1}>
                  {supplement.name}
                </Text>
                <CheckCircle checked={!!checkedForDay[supplement.id]} colors={colors} />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.suppCaption, { color: colors.textSecondary }]}>
            {displayedTakenCount} of {visibleSupplements.length} taken
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tipCard: { borderRadius: 20, padding: Spacing.three, flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  tipIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipInfo: { flex: 1, gap: 2 },
  tipTitle: { fontSize: 15, fontWeight: '700' },
  tipBody: { fontSize: 13, lineHeight: 19 },
  chevron: { fontSize: 20, fontWeight: '600', marginLeft: 2 },
  weightCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 20, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four },
  weightInfo: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  weightLabel: { fontSize: 14, fontWeight: '600' },
  weightValue: { fontSize: 20, fontWeight: '800' },
  weightPlaceholder: { fontSize: 15, fontWeight: '600' },
  weightChange: { fontSize: 14, fontWeight: '700' },
  waterCard: { borderRadius: 20, padding: Spacing.four, gap: Spacing.three },
  waterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waterTitle: { fontSize: 16, fontWeight: '700' },
  unitToggle: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  unitBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8 },
  unitBtnText: { fontSize: 12, fontWeight: '700' },
  waterReadout: { flexDirection: 'row' },
  goalPrefix: { fontSize: 13, fontWeight: '600', marginRight: 4, alignSelf: 'center' },
  waterCount: { fontSize: 13, fontWeight: '600' },
  glassRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  glassTap: { padding: 2 },
  goalStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontWeight: '800' },
  goalValue: { fontSize: 15, fontWeight: '800', minWidth: 52, textAlign: 'center' },
  goalDone: { fontSize: 13, fontWeight: '700', marginLeft: 2 },
  suppCard: { borderRadius: 20, padding: Spacing.four, gap: Spacing.three },
  suppHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suppTitle: { fontSize: 16, fontWeight: '700' },
  suppHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  suppStreak: { fontSize: 13, fontWeight: '700' },
  suppAddLine: { fontSize: 14, fontWeight: '600' },
  suppList: { gap: Spacing.two },
  suppRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  suppName: { flex: 1, fontSize: 15, fontWeight: '600' },
  suppCaption: { fontSize: 12, fontWeight: '600' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkGlyph: { color: '#ffffff', fontSize: 15, fontWeight: '800', lineHeight: 17 },
});
