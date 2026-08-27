import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  DailyCoachCard,
  DailySupplementsCard,
  DailyWaterCard,
  DailyWeightCard,
  pickDailyCoachTip,
} from '@/components/daily-dashboard-cards';
import { CheckIcon, DumbbellIcon } from '@/components/icons';
import { Brand, Spacing, Type, type ThemeColors } from '@/constants/theme';
import type { BodyScan } from '@/lib/body-analysis';
import { dailyHistoryFor } from '@/lib/history';
import { scoreCaption } from '@/lib/score';
import { dayKey, useMeals } from '@/lib/store';
import { useSupplements } from '@/lib/supplements';
import { MUSCLE_GROUPS } from '@/lib/training-catalog';
import { groupsForExercise, muscleScores, WEEKLY_SET_TARGET, workoutMinutesByDay } from '@/lib/training-progress';
import { useTrainingPlan } from '@/lib/training-plan';
import type { MuscleGroup, MuscleSetCounts, WorkoutSplit } from '@/lib/types';

const SCORE_SIZE = 116;
const SCORE_STROKE = 10;
const MINI_SIZE = 58;
const MINI_STROKE = 7;
const WORKOUT_GOAL = 30;

function localDate(value: string): Date {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

function ProgressRing({ value, size = MINI_SIZE, stroke = MINI_STROKE, ringColor = Brand.green, trackColor, colors }: {
  value: number;
  size?: number;
  stroke?: number;
  ringColor?: string;
  trackColor?: string;
  colors: ThemeColors;
}) {
  const radius = (size - stroke) / 2;
  const circumference = Math.PI * 2 * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor ?? colors.backgroundSelected} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={ringColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function HeaderRow({ title, subtitle, icon, colors }: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={[styles.cardIcon, { backgroundColor: colors.greenTint }]}>{icon}</View>
      <View style={styles.flex}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function ScoreCard({ score, caption, colors }: { score: number; caption: string; colors: ThemeColors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Trak Score ${score} out of 100`}
      onPress={() => router.push('/score')}
      style={({ pressed }) => [styles.scoreCard, { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement }]}>
      <View style={styles.scoreRing}>
        <ProgressRing value={score} size={SCORE_SIZE} stroke={SCORE_STROKE} colors={colors} />
        <View style={styles.scoreCenter}>
          <Text style={[styles.scoreValue, { color: colors.text }]}>{score}</Text>
          <Text style={[styles.scoreOutOf, { color: colors.textSecondary }]}>/100</Text>
        </View>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.scoreLabel, { color: colors.text }]}>Trak Score</Text>
        <Text style={[styles.scoreCaption, { color: colors.textSecondary }]}>{caption}</Text>
      </View>
    </Pressable>
  );
}

function MuscleBalance({ scores, colors }: { scores: ReturnType<typeof muscleScores>; colors: ThemeColors }) {
  const ringColors = Object.fromEntries(MUSCLE_GROUPS.map((item) => [item.key, item.color]));
  return (
    <View style={styles.section}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly muscle score</Text>
        <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Chest, legs, and back earn 2 points per set. Weekly target: {WEEKLY_SET_TARGET} points each.</Text>
      </View>
      <View style={[styles.muscleCard, { backgroundColor: colors.backgroundElement }]}>
        {scores.map((item) => (
          <View key={item.key} style={styles.muscleItem}>
            <View style={styles.miniRing}>
              <ProgressRing value={item.score} ringColor={ringColors[item.key]} trackColor={`${ringColors[item.key]}33`} colors={colors} />
              <Text style={[styles.miniValue, { color: colors.text }]}>{item.points}</Text>
            </View>
            <Text style={[styles.muscleLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.muscleTarget, { color: colors.textSecondary }]}>{item.sets} sets · of {WEEKLY_SET_TARGET}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type PlannedCompletion = {
  key: string;
  name: string;
  prescription: string;
  durationMinutes: number;
  calories: number;
  splits: WorkoutSplit[];
  muscleSets: MuscleSetCounts;
};

function emptyMuscleSets(): MuscleSetCounts {
  return { chest: 0, legs: 0, back: 0, arms: 0, shoulders: 0, abs: 0, glutes: 0, other: 0 };
}

function TodayTraining({ latestScan, weakest, selectedDate, colors }: { latestScan: BodyScan | null; weakest: string; selectedDate: string; colors: ThemeColors }) {
  const { loaded, items } = useTrainingPlan();
  const { exercises, addExercise } = useMeals();
  const [completingKey, setCompletingKey] = useState<string | null>(null);
  const training = latestScan?.result.training;
  const title = items.length > 0 ? 'Your training' : training?.weeklyFocus ?? `${weakest} focus`;
  const subtitle = items.length > 0
    ? `${items.length} exercise${items.length === 1 ? '' : 's'} · customised by you`
    : training
      ? `${training.daysPerWeek} days per week · from Body Analysis`
      : 'A simple suggestion from your weekly muscle score';
  const canComplete = selectedDate === dayKey();
  const completedNames = new Set(
    exercises
      .filter((exercise) => exercise.date === dayKey())
      .map((exercise) => exercise.name.trim().toLowerCase())
  );
  const planned: PlannedCompletion[] = items.length > 0
    ? items.slice(0, 5).map((exercise) => {
        const muscleSets = emptyMuscleSets();
        if (exercise.activityType === 'strength' && exercise.muscleGroup) muscleSets[exercise.muscleGroup] = exercise.sets;
        return {
          key: exercise.id,
          name: exercise.name,
          prescription: exercise.activityType === 'cardio'
            ? `${exercise.durationTargetMinutes ?? 0} min · ${exercise.calorieTarget ?? 0} kcal`
            : `${exercise.sets} × ${exercise.reps}${exercise.loadValue == null ? '' : ` · ${exercise.loadValue} ${exercise.loadUnit}`}`,
          durationMinutes: exercise.activityType === 'cardio'
            ? Math.max(1, exercise.durationTargetMinutes ?? 30)
            : Math.max(5, exercise.sets * 3),
          calories: exercise.activityType === 'cardio' ? Math.max(0, exercise.calorieTarget ?? 0) : 0,
          splits: exercise.activityType === 'cardio' ? ['cardio'] : [exercise.muscleGroup!],
          muscleSets,
        };
      })
    : (training?.exercises.slice(0, 3) ?? []).map((exercise, index) => {
        const groups = groupsForExercise(exercise.name);
        const muscles: MuscleGroup[] = groups.length > 0 ? groups : ['other'];
        const plannedSets = Math.max(1, Math.min(20, Number.parseInt(exercise.sets, 10) || 3));
        const muscleSets = emptyMuscleSets();
        muscles.forEach((muscle) => { muscleSets[muscle] = plannedSets; });
        return {
          key: `analysis-${index}-${exercise.name}`,
          name: exercise.name,
          prescription: `${exercise.sets} × ${exercise.reps}`,
          durationMinutes: Math.max(5, plannedSets * 3),
          calories: 0,
          splits: muscles,
          muscleSets,
        };
      });

  async function markComplete(exercise: PlannedCompletion) {
    if (!canComplete || completedNames.has(exercise.name.trim().toLowerCase()) || completingKey) return;
    setCompletingKey(exercise.key);
    try {
      await addExercise(exercise.name, exercise.calories, exercise.durationMinutes, {
        workoutSplits: exercise.splits,
        muscleSets: exercise.muscleSets,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Not completed', error?.message ?? 'Please try again.');
    } finally {
      setCompletingKey(null);
    }
  }

  function confirmComplete(exercise: PlannedCompletion) {
    if (!canComplete || completedNames.has(exercise.name.trim().toLowerCase())) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Mark training complete?',
      `${exercise.name} will be added to today’s workout log and update your weekly muscle score.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark complete', onPress: () => { void markComplete(exercise); } },
      ]
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s training</Text>
      <View style={[styles.standardCard, { backgroundColor: colors.backgroundElement }]}>
        <HeaderRow
          title={title}
          subtitle={subtitle}
          icon={<DumbbellIcon size={21} color={Brand.green} />}
          colors={colors}
        />
        {planned.map((exercise) => {
          const completed = completedNames.has(exercise.name.trim().toLowerCase());
          return (
            <Pressable
              key={exercise.key}
              accessibilityRole="button"
              accessibilityLabel={`${exercise.name}${completed ? ', completed' : ', hold to mark complete'}`}
              accessibilityState={{ disabled: !canComplete || completed }}
              delayLongPress={450}
              disabled={!canComplete || completed || completingKey != null}
              onLongPress={() => confirmComplete(exercise)}
              style={({ pressed }) => [styles.trainingRow, completed && { backgroundColor: colors.greenTint }, pressed && { opacity: 0.72 }]}>
              <View style={styles.flex}>
                <Text style={[styles.trainingName, { color: colors.text }]}>{exercise.name}</Text>
                {!completed ? <Text style={[styles.holdHint, { color: colors.textSecondary }]}>{canComplete ? 'Hold to mark complete' : 'Open today to complete'}</Text> : null}
              </View>
              <Text style={[styles.trainingPrescription, { color: completed ? Brand.green : Brand.greenDark }]}>{completed ? 'Complete' : exercise.prescription}</Text>
              {completed ? <View style={styles.completedIcon}><CheckIcon size={14} color="#ffffff" /></View> : null}
            </Pressable>
          );
        })}
        {loaded && items.length === 0 && !training ? <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>Build a focused {weakest.toLowerCase()} session, or add your own exercises.</Text> : null}
        <Pressable style={styles.tonalButton} onPress={() => router.push('/training-plan' as never)}>
          <Text style={styles.tonalButtonText}>Customise training</Text>
        </Pressable>
      </View>
    </View>
  );
}

function WorkoutTime({ data, selectedDate, colors }: { data: ReturnType<typeof workoutMinutesByDay>; selectedDate: string; colors: ThemeColors }) {
  const selected = data.find((item) => item.date === selectedDate)?.minutes ?? 0;
  const average = Math.round(data.reduce((sum, item) => sum + item.minutes, 0) / Math.max(1, data.length));
  return (
    <View style={[styles.standardCard, { backgroundColor: colors.backgroundElement }]}>
      <HeaderRow title="Workout Time" subtitle={`${selected}/${WORKOUT_GOAL} minutes`} icon={<DumbbellIcon size={21} color={Brand.green} />} colors={colors} />
      <View style={styles.weekChart}>
        {data.map((item) => {
          const ratio = Math.min(1, item.minutes / WORKOUT_GOAL);
          const date = localDate(item.date);
          return (
            <View key={item.date} style={styles.dayColumn}>
              <View style={[styles.rail, { backgroundColor: colors.backgroundSelected }]}>
                <View style={[styles.railFill, { height: `${Math.max(8, ratio * 100)}%` }]} />
              </View>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{item.date === dayKey() ? 'TODAY' : date.toLocaleDateString([], { weekday: 'narrow' })}</Text>
            </View>
          );
        })}
        <View style={styles.goalLabel}>
          <Text style={[styles.goalSmall, { color: colors.textSecondary }]}>Goal</Text>
          <Text style={[styles.goalValue, { color: colors.text }]}>{WORKOUT_GOAL}</Text>
          <Text style={[styles.goalSmall, { color: colors.textSecondary }]}>min</Text>
        </View>
      </View>
      <View style={[styles.averageRow, { borderTopColor: colors.backgroundSelected }]}>
        <Text style={[styles.averageLabel, { color: colors.textSecondary }]}>Weekly Average</Text>
        <Text style={[styles.averageValue, { color: colors.text }]}>{average} min</Text>
      </View>
      <Pressable style={[styles.addActivity, { backgroundColor: colors.backgroundSelected }]} onPress={() => router.push('/exercise')}>
        <Text style={[styles.addActivityText, { color: colors.text }]}>LOG A WORKOUT</Text>
      </Pressable>
    </View>
  );
}

export function ProgressOverview({ colors, selectedDate, latestScan }: {
  colors: ThemeColors;
  selectedDate: string;
  latestScan: BodyScan | null;
}) {
  const { meals, exercises, waterHistory, waterGoal, targets, weights } = useMeals();
  const { supplements, checks } = useSupplements();
  const day = useMemo(() => dailyHistoryFor(selectedDate, { meals, exercises, water: waterHistory, supplements, supplementChecks: checks, targets, waterGoal }), [selectedDate, meals, exercises, waterHistory, supplements, checks, targets, waterGoal]);
  const balance = useMemo(() => muscleScores(exercises, selectedDate), [exercises, selectedDate]);
  const workoutWeek = useMemo(() => workoutMinutesByDay(exercises, selectedDate), [exercises, selectedDate]);
  const weightsThroughSelected = weights.filter((entry) => entry.date <= selectedDate);
  const selectedWeight = weightsThroughSelected.at(-1)?.weightKg ?? null;
  const weightChange = weightsThroughSelected.length >= 2
    ? weightsThroughSelected[weightsThroughSelected.length - 1].weightKg - weightsThroughSelected[0].weightKg
    : null;
  const weakest = [...balance].sort((a, b) => a.score - b.score)[0]?.label ?? 'Full body';
  const tip = pickDailyCoachTip({
    mealsLogged: day.meals.length,
    proteinPct: targets.protein_g > 0 ? day.totals.protein_g / targets.protein_g : 0,
    caloriePct: day.calorieBudget > 0 ? day.totals.calories / day.calorieBudget : 0,
    waterPct: waterGoal > 0 ? day.waterGlasses / waterGoal : 0,
    streak: day.loggingStreak,
  });

  return (
    <View style={styles.content}>
      <ScoreCard score={day.score} caption={scoreCaption(day.score)} colors={colors} />
      <DailyCoachCard tip={tip} colors={colors} />
      <MuscleBalance scores={balance} colors={colors} />
      <TodayTraining latestScan={latestScan} weakest={weakest} selectedDate={selectedDate} colors={colors} />
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Daily logs</Text>
        <WorkoutTime data={workoutWeek} selectedDate={selectedDate} colors={colors} />
        <DailyWeightCard selectedDate={selectedDate} weight={selectedWeight} weightChange={weightChange} colors={colors} />
        <DailyWaterCard key={selectedDate} selectedDate={selectedDate} historicalWater={day.waterGlasses} colors={colors} />
        <DailySupplementsCard selectedDate={selectedDate} colors={colors} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.four },
  section: { gap: Spacing.three },
  sectionTitle: { fontFamily: Type.display, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  sectionCaption: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  scoreCard: { minHeight: 154, borderRadius: 24, padding: Spacing.four, flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  scoreRing: { width: SCORE_SIZE, height: SCORE_SIZE, alignItems: 'center', justifyContent: 'center' },
  scoreCenter: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontFamily: Type.display, fontSize: 38, lineHeight: 42, fontWeight: '700' },
  scoreOutOf: { fontSize: 11, fontWeight: '700' },
  scoreLabel: { fontFamily: Type.display, fontSize: 24, lineHeight: 29, fontWeight: '700' },
  scoreCaption: { marginTop: Spacing.two, fontSize: 13, lineHeight: 19 },
  muscleCard: { borderRadius: 20, paddingVertical: Spacing.three, paddingHorizontal: Spacing.two, flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.four },
  muscleItem: { width: '25%', alignItems: 'center', gap: Spacing.two },
  miniRing: { width: MINI_SIZE, height: MINI_SIZE, alignItems: 'center', justifyContent: 'center' },
  miniValue: { position: 'absolute', fontSize: 14, fontWeight: '900' },
  muscleLabel: { fontSize: 12, fontWeight: '800' },
  muscleTarget: { marginTop: -Spacing.two, fontSize: 9, fontWeight: '700' },
  standardCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  cardSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17 },
  trainingRow: { minHeight: 54, borderRadius: 14, paddingHorizontal: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  trainingName: { flex: 1, fontSize: 14, fontWeight: '700' },
  trainingPrescription: { fontSize: 12, fontWeight: '900' },
  holdHint: { marginTop: 2, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  completedIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 19 },
  tonalButton: { minHeight: 48, borderRadius: 15, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  tonalButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  weekChart: { minHeight: 156, paddingTop: Spacing.two, flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  dayColumn: { flex: 1, height: 142, alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.two },
  rail: { width: 13, height: 105, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  railFill: { width: '100%', minHeight: 8, borderRadius: 7, backgroundColor: Brand.green },
  dayLabel: { minHeight: 17, fontSize: 9, fontWeight: '800' },
  goalLabel: { width: 38, height: 142, justifyContent: 'center', alignItems: 'center' },
  goalSmall: { fontSize: 10, fontWeight: '700' },
  goalValue: { fontSize: 16, fontWeight: '900' },
  averageRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three, flexDirection: 'row', justifyContent: 'space-between' },
  averageLabel: { fontSize: 13 },
  averageValue: { fontSize: 14, fontWeight: '800' },
  addActivity: { minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  addActivityText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },
});
