import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BicepsFlexed } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { CheckIcon, ChevronRightIcon, DumbbellIcon } from '@/components/icons';
import { Brand, Spacing, Type, type ThemeColors } from '@/constants/theme';
import type { BodyAnalysisPreferences, BodyScan } from '@/lib/body-analysis';
import { useExerciseResponsePreferences } from '@/lib/exercise-response-preferences';
import type { ExerciseResponse } from '@/lib/exercise-response-settings';
import { useFatLossPreferences } from '@/lib/fat-loss-preferences';
import { weightTrendGuidance } from '@/lib/fat-loss-plan';
import { cardioTargetForSettings, preferredCardioCatalogIds, type FatLossSettings } from '@/lib/fat-loss-settings';
import { dayKey, useMeals } from '@/lib/store';
import { useMuscleScorePreferences } from '@/lib/muscle-score-preferences';
import { muscleScoreScheduleLabel } from '@/lib/muscle-score-settings';
import { MUSCLE_GROUPS, muscleLabel } from '@/lib/training-catalog';
import { FAT_LOSS_CARDIO_BASELINE, FAT_LOSS_CARDIO_MILESTONES, muscleScores, muscleScoreWindow, RECOVERY_CHECK_SET_THRESHOLD, trainingDayKeys, weeklyActivitySummary, WEEKLY_SET_TARGET, workoutMinutesByDay } from '@/lib/training-progress';
import { useTrainingPlan } from '@/lib/training-plan';
import type { CardioIntensity, Goal, MuscleSetCounts, WeightEntry, WorkoutSplit } from '@/lib/types';
import { recommendWorkout, workoutCatalogIdForName, type WorkoutRecommendation } from '@/lib/workout-catalog';
import { useWorkoutCoachPreferences } from '@/lib/workout-coach-preferences';
import { equipmentForWorkoutSettings, nextRoutineSession } from '@/lib/workout-coach-settings';
import { useWorkoutFocusPreferences } from '@/lib/workout-focus-preferences';
import { workoutFocusWeek } from '@/lib/workout-focus-settings';

const MINI_SIZE = 58;
const MINI_STROKE = 7;
const WORKOUT_GOAL = 30;
const WEIGHT_CHART_HEIGHT = 226;

type WeightRange = '7d' | '1m' | '2m' | '3m' | '4m' | '5m' | '6m' | '1y' | 'all';

type WeightRangeOption = { key: WeightRange; label: string; days?: number; months?: number };

const WEIGHT_RANGES: WeightRangeOption[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '1m', label: '1M', months: 1 },
  { key: '2m', label: '2M', months: 2 },
  { key: '3m', label: '3M', months: 3 },
  { key: '4m', label: '4M', months: 4 },
  { key: '5m', label: '5M', months: 5 },
  { key: '6m', label: '6M', months: 6 },
  { key: '1y', label: '1Y', months: 12 },
  { key: 'all', label: 'ALL' },
];

function localDate(value: string): Date {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

function ProgressRing({ value, size = MINI_SIZE, stroke = MINI_STROKE, ringColor, trackColor, colors }: {
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
        stroke={ringColor ?? colors.accent}
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

export function MuscleBalance({ scores, selectedDate, colors }: { scores: ReturnType<typeof muscleScores>; selectedDate: string; colors: ThemeColors }) {
  const { fontScale } = useWindowDimensions();
  const { settings, loaded, error, retry } = useMuscleScorePreferences();
  const window = muscleScoreWindow(selectedDate, settings);
  const period = window.manualReset
    ? `Since manual reset · ${localDate(window.manualReset.day).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
    : muscleScoreScheduleLabel(settings);
  const ringColors = Object.fromEntries(MUSCLE_GROUPS.map((item) => [item.key, item.color]));
  return (
    <View style={styles.section}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly muscle score</Text>
        <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>{period}. One working set earns 1 point. {WEEKLY_SET_TARGET} points means target met, not maximum possible growth.</Text>
      </View>
      <View style={[styles.muscleCard, { backgroundColor: colors.backgroundElement }]}>
        {!loaded || error ? <Pressable accessibilityRole={error ? 'button' : undefined} accessibilityLabel={error ? 'Retry loading muscle score settings' : undefined} disabled={!error} onPress={retry}><Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>{error ? 'Could not load muscle score settings. Tap to retry.' : 'Loading muscle scores…'}</Text></Pressable> : scores.map((item) => (
          <View
            key={item.key}
            accessibilityRole="progressbar"
            accessibilityLabel={`${item.label} weekly muscle score`}
            accessibilityValue={{ min: 0, max: WEEKLY_SET_TARGET, now: Math.min(item.points, WEEKLY_SET_TARGET), text: `${item.sets} sets. ${item.guidance}` }}
            style={[styles.muscleItem, fontScale >= 1.35 && styles.muscleItemLargeText]}>
            <View style={styles.miniRing}>
              <ProgressRing value={item.score} ringColor={ringColors[item.key]} trackColor={`${ringColors[item.key]}33`} colors={colors} />
              <Text style={[styles.miniValue, { color: colors.text }]}>{item.points}</Text>
            </View>
            <Text style={[styles.muscleLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.muscleTarget, { color: colors.textSecondary }]}>
              {item.sets} sets{`\n`}{item.guidance}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function WeeklyCardio({
  activity,
  settings,
  targetMinutes,
  showStrengthSupport,
  colors,
}: {
  activity: ReturnType<typeof weeklyActivitySummary>;
  settings: FatLossSettings;
  targetMinutes?: number;
  showStrengthSupport: boolean;
  colors: ThemeColors;
}) {
  const strengthTarget = 2;
  const cardioTarget = targetMinutes ?? cardioTargetForSettings(settings);
  const cardioProgress = Math.min(100, Math.round((activity.cardioEquivalentMinutes / cardioTarget) * 100));
  const strengthProgress = Math.min(100, Math.round((activity.strengthSessions / strengthTarget) * 100));
  const nextMilestone = [...new Set([...FAT_LOSS_CARDIO_MILESTONES, cardioTarget])]
    .sort((a, b) => a - b)
    .filter((milestone) => milestone <= cardioTarget)
    .find((milestone) => activity.cardioEquivalentMinutes < milestone) ?? null;
  const cardioHeadline = nextMilestone == null
    ? 'Staged target reached'
    : activity.cardioEquivalentMinutes === 0
      ? `First milestone: ${nextMilestone} min`
      : `${nextMilestone - activity.cardioEquivalentMinutes} min to ${nextMilestone}`;
  const cardioPrompt = activity.cardioEquivalentMinutes === 0
    ? `Start with a comfortable ${settings.comfortableCardioMinutes}-minute session.`
    : nextMilestone == null
      ? cardioTarget < FAT_LOSS_CARDIO_BASELINE
        ? 'Repeat this level comfortably before increasing your activity baseline.'
        : settings.phase === 'maintenance'
          ? 'Keep the activities you can sustain; more is optional and individual.'
          : 'The 150-minute baseline is met; additional cardio is optional.'
      : 'Build gradually with sessions you can recover from.';

  return (
    <View style={styles.section}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly cardio</Text>
        <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Last 7 days · moderate minutes plus double vigorous minutes. Light activity is tracked separately.</Text>
      </View>
      <View style={[styles.cardioCard, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.cardioHero}>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`Cardio, ${activity.cardioEquivalentMinutes} of ${cardioTarget} moderate-equivalent minutes`}
            accessibilityValue={{ min: 0, max: cardioTarget, now: Math.min(cardioTarget, activity.cardioEquivalentMinutes) }}
            style={styles.cardioRing}>
            <ProgressRing value={cardioProgress} size={96} stroke={8} colors={colors} />
            <View style={styles.cardioRingValue}>
              <Text selectable style={[styles.cardioMinutes, { color: colors.text }]}>{activity.cardioEquivalentMinutes}</Text>
              <Text style={[styles.cardioUnit, { color: colors.textSecondary }]}>MIN</Text>
            </View>
          </View>
          <View style={styles.cardioCopy}>
            <Text style={[styles.cardioEyebrow, { color: colors.accentStrong }]}>CARDIO TARGET</Text>
            <Text style={[styles.cardioHeadline, { color: colors.text }]}>{cardioHeadline}</Text>
            <Text selectable style={[styles.cardioSummary, { color: colors.textSecondary }]}>{activity.cardioMinutes} actual min · {activity.cardioSessions} session{activity.cardioSessions === 1 ? '' : 's'}{activity.lightCardioMinutes > 0 ? ` · ${activity.lightCardioMinutes} light` : ''}</Text>
            <Text style={[styles.cardioPrompt, { color: colors.accentStrong }]}>{cardioPrompt}</Text>
          </View>
        </View>
        {showStrengthSupport ? (
          <View style={[styles.strengthSupport, { borderTopColor: colors.backgroundSelected }]}>
            <View style={styles.strengthSupportCopy}>
              <View style={styles.strengthSupportTitleRow}>
                <DumbbellIcon size={18} color={Brand.over} />
                <Text style={[styles.strengthSupportTitle, { color: colors.text }]}>Strength support</Text>
              </View>
              <Text style={[styles.strengthSupportBody, { color: colors.textSecondary }]}>Helps retain muscle while losing weight.</Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={`Strength, ${activity.strengthSessions} of ${strengthTarget} sessions`}
              accessibilityValue={{ min: 0, max: strengthTarget, now: Math.min(strengthTarget, activity.strengthSessions) }}
              style={styles.strengthRing}>
              <ProgressRing value={strengthProgress} size={58} stroke={7} ringColor={Brand.over} trackColor={`${Brand.over}33`} colors={colors} />
              <Text style={[styles.strengthRingValue, { color: colors.text }]}>{activity.strengthSessions}/{strengthTarget}</Text>
            </View>
          </View>
        ) : null}
        {showStrengthSupport ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/fat-loss-settings')} style={[styles.cardioSettingsButton, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={[styles.cardioSettingsText, { color: colors.text }]}>Adjust activity starting point</Text>
            <ChevronRightIcon size={15} color={colors.textSecondary} />
          </Pressable>
        ) : null}
        {showStrengthSupport && settings.movementBreaks ? <Text style={[styles.movementBreak, { color: colors.textSecondary }]}>Optional today: take a short comfortable movement break during a long sitting period. It is not a workout and does not add points.</Text> : null}
      </View>
    </View>
  );
}

function roundedWeight(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

function weightRangeStart(selectedDate: string, range: WeightRangeOption): string | null {
  const start = localDate(selectedDate);
  if (range.days != null) {
    start.setDate(start.getDate() - range.days + 1);
    return dayKey(start);
  }
  if (range.months == null) return null;
  const selectedDay = start.getDate();
  start.setDate(1);
  start.setMonth(start.getMonth() - range.months);
  const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12).getDate();
  start.setDate(Math.min(selectedDay, lastDay));
  return dayKey(start);
}

function WeightTrendChart({ weights, colors }: { weights: WeightEntry[]; colors: ThemeColors }) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (weights.length === 0) {
    return (
      <View style={styles.weightChartEmpty} onLayout={onLayout}>
        <Text style={[styles.weightChartEmptyTitle, { color: colors.text }]}>Your trend starts here</Text>
        <Text style={[styles.weightChartEmptyText, { color: colors.textSecondary }]}>Log a weigh-in to begin your chart.</Text>
      </View>
    );
  }

  const values = weights.map((entry) => entry.weightKg);
  const observedMin = Math.min(...values);
  const observedMax = Math.max(...values);
  const observedRange = observedMax - observedMin;
  const padding = Math.max(0.5, observedRange * 0.25);
  const low = Math.floor((observedMin - padding) * 2) / 2;
  const high = Math.ceil((observedMax + padding) * 2) / 2;
  const chartLeft = 48;
  const chartRight = 8;
  const chartTop = 12;
  const chartBottom = 30;
  const plotWidth = Math.max(1, width - chartLeft - chartRight);
  const plotHeight = WEIGHT_CHART_HEIGHT - chartTop - chartBottom;
  const yRange = Math.max(1, high - low);
  const x = (index: number) => chartLeft + (weights.length === 1 ? plotWidth / 2 : (index / (weights.length - 1)) * plotWidth);
  const y = (value: number) => chartTop + (1 - (value - low) / yRange) * plotHeight;
  const points = weights.map((entry, index) => ({ x: x(index), y: y(entry.weightKg) }));
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const ticks = Array.from({ length: 5 }, (_, index) => high - (yRange * index) / 4);
  const firstDate = localDate(weights[0].date).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const lastDate = localDate(weights[weights.length - 1].date).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Weight chart from ${firstDate} to ${lastDate}, ${roundedWeight(weights[weights.length - 1].weightKg)} kilograms latest`}
      style={styles.weightChart}
      onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={WEIGHT_CHART_HEIGHT}>
          {ticks.map((tick, index) => {
            const tickY = chartTop + (plotHeight * index) / 4;
            return (
              <G key={`${tick}-${index}`}>
                <Line
                  x1={chartLeft}
                  y1={tickY}
                  x2={width - chartRight}
                  y2={tickY}
                  stroke={colors.backgroundSelected}
                  strokeWidth={1}
                  strokeDasharray="4 6"
                />
                <SvgText x={0} y={tickY + 4} fill={colors.textSecondary} fontSize={10} fontWeight="700">
                  {roundedWeight(tick)}
                </SvgText>
              </G>
            );
          })}
          <Path d={linePath} fill="none" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <Circle
              key={weights[index].date}
              cx={point.x}
              cy={point.y}
              r={index === points.length - 1 ? 5 : 3}
              fill={colors.backgroundElement}
              stroke={colors.accent}
              strokeWidth={index === points.length - 1 ? 3 : 2}
            />
          ))}
          {weights.length === 1 ? (
            <SvgText x={width / 2} y={WEIGHT_CHART_HEIGHT - 5} fill={colors.textSecondary} fontSize={10} fontWeight="700" textAnchor="middle">
              {firstDate}
            </SvgText>
          ) : (
            <>
              <SvgText x={chartLeft} y={WEIGHT_CHART_HEIGHT - 5} fill={colors.textSecondary} fontSize={10} fontWeight="700">
                {firstDate}
              </SvgText>
              <SvgText x={width - chartRight} y={WEIGHT_CHART_HEIGHT - 5} fill={colors.textSecondary} fontSize={10} fontWeight="700" textAnchor="end">
                {lastDate}
              </SvgText>
            </>
          )}
        </Svg>
      ) : null}
    </View>
  );
}

function WeightProgress({ weights, selectedDate, goal, colors }: {
  weights: WeightEntry[];
  selectedDate: string;
  goal?: Goal;
  colors: ThemeColors;
}) {
  const [range, setRange] = useState<WeightRange>('7d');
  const [rangePickerWidth, setRangePickerWidth] = useState(0);
  const rangeConfig = WEIGHT_RANGES.find((item) => item.key === range)!;
  const rangeStart = weightRangeStart(selectedDate, rangeConfig);
  const eligible = weights.filter((entry) => entry.date <= selectedDate);
  const visibleWeights = rangeStart == null
    ? eligible
    : eligible.filter((entry) => entry.date >= rangeStart);
  const rangeButtonWidth = Math.max(72, (rangePickerWidth - Spacing.two) / 4);
  const goalLabel: Record<Goal, string> = { lose: 'Lose weight', maintain: 'Maintain', gain: 'Gain muscle' };
  const trendGuidance = goal ? weightTrendGuidance(weights, goal, selectedDate) : null;

  return (
    <View style={styles.section}>
      <View style={[styles.weightProgressCard, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.weightProgressHeader}>
          <Text style={[styles.weightProgressTitle, { color: colors.text }]}>Weight progress</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit weight goal"
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.weightGoalChip,
              { borderColor: colors.backgroundSelected, backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
            ]}>
            <Text style={[styles.weightGoalText, { color: colors.textSecondary }]}>{goal ? goalLabel[goal] : 'Set goal'}</Text>
            <ChevronRightIcon size={14} color={colors.textSecondary} />
          </Pressable>
        </View>

        <WeightTrendChart weights={visibleWeights} colors={colors} />

        {trendGuidance ? <Text style={[styles.trendGuidance, { color: colors.accentStrong, backgroundColor: colors.greenTint }]}>{trendGuidance}</Text> : null}

        <View
          accessibilityRole="tablist"
          accessibilityLabel="Weight progress time ranges"
          onLayout={(event) => setRangePickerWidth(event.nativeEvent.layout.width)}
          style={[styles.weightRangePicker, { backgroundColor: colors.backgroundSelected }]}>
          <ScrollView
            horizontal
            bounces={false}
            decelerationRate="fast"
            disableIntervalMomentum
            showsHorizontalScrollIndicator={false}
            snapToInterval={rangeButtonWidth}
            contentContainerStyle={styles.weightRangeContent}>
            {WEIGHT_RANGES.map((item) => {
              const selected = item.key === range;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Show ${item.label} weight progress`}
                  onPress={() => {
                    setRange(item.key);
                    void Haptics.selectionAsync();
                  }}
                  style={({ pressed }) => [
                    styles.weightRangeButton,
                    { width: rangeButtonWidth },
                    selected && { backgroundColor: colors.backgroundElement },
                    pressed && !selected && { opacity: 0.62 },
                  ]}>
                  <Text style={[styles.weightRangeText, { color: selected ? colors.text : colors.textSecondary }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log weight"
          onPress={() => router.push({ pathname: '/weight', params: { date: selectedDate } })}
          style={({ pressed }) => [
            styles.addActivity,
            { backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Text style={[styles.addActivityText, { color: colors.text }]}>LOG WEIGHT</Text>
        </Pressable>
      </View>
    </View>
  );
}

type PlannedCompletion = {
  key: string;
  catalogId?: string;
  trainingPlanItemId?: string;
  name: string;
  prescription: string;
  effortCue?: string;
  durationMinutes: number;
  calories: number;
  splits: WorkoutSplit[];
  muscleSets: MuscleSetCounts;
  cardioIntensity?: CardioIntensity | null;
};

function emptyMuscleSets(): MuscleSetCounts {
  return { chest: 0, legs: 0, back: 0, arms: 0, shoulders: 0, abs: 0, glutes: 0, other: 0 };
}

function plannedRecommendation(recommendation: WorkoutRecommendation): PlannedCompletion {
  const { exercise } = recommendation;
  const muscleSets = emptyMuscleSets();
  const recommendedSets = recommendation.recommendedSets ?? exercise.strength?.sets ?? 0;
  if (exercise.activityType === 'strength') {
    exercise.primaryMuscles.forEach((muscle) => { muscleSets[muscle] = recommendedSets; });
  }
  return {
    key: `catalog-${exercise.id}`,
    catalogId: exercise.id,
    name: exercise.name,
    prescription: exercise.activityType === 'cardio'
      ? `${recommendation.recommendedDurationMinutes ?? exercise.cardio!.durationMinutes[0]} min · ${exercise.cardio!.intensity}`
      : `${recommendedSets} × ${exercise.strength!.reps} · ${exercise.strength!.restSeconds[0]}–${exercise.strength!.restSeconds[1]}s\u00a0rest`,
    effortCue: exercise.activityType === 'strength' ? recommendation.effortGuidance : undefined,
    durationMinutes: recommendation.estimatedMinutes,
    // Recommendations intentionally avoid guessed calorie targets. Completing
    // one updates workout time; completed strength sets also update muscle score.
    calories: 0,
    splits: exercise.activityType === 'cardio' ? ['cardio'] : exercise.primaryMuscles,
    muscleSets,
    cardioIntensity: recommendation.cardioIntensity ?? null,
  };
}

function MuscleFocusCard({ focusLabel, focusDetail, hasActiveFocus, colors }: {
  focusLabel: string;
  focusDetail: string;
  hasActiveFocus: boolean;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${focusLabel}. ${focusDetail}. ${hasActiveFocus ? 'Change' : 'Choose'} muscle focus`}
      onPress={() => router.push('/training-focus')}
      style={({ pressed }) => [
        styles.muscleFocusCard,
        { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.72 : 1 },
      ]}>
      <View style={[styles.muscleFocusIcon, { backgroundColor: colors.greenTint }]}>
        <BicepsFlexed size={21} color={colors.accent} strokeWidth={2} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.muscleFocusEyebrow, { color: colors.textSecondary }]}>MUSCLE FOCUS</Text>
        <Text style={[styles.muscleFocusTitle, { color: colors.text }]}>{focusLabel}</Text>
        <Text style={[styles.muscleFocusDetail, { color: colors.textSecondary }]}>{focusDetail}</Text>
      </View>
      <ChevronRightIcon size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

function TodayTraining({ latestScan, recommendations, weakest, selectedDate, goal, hasActiveFocus, needsSetup, routineLabel, colors }: {
  latestScan: BodyScan | null;
  recommendations: WorkoutRecommendation[];
  weakest: string;
  selectedDate: string;
  goal: Goal;
  hasActiveFocus: boolean;
  needsSetup: boolean;
  routineLabel: string;
  colors: ThemeColors;
}) {
  const { loaded, items } = useTrainingPlan();
  const { exercises, addExercise } = useMeals();
  const exerciseFeedback = useExerciseResponsePreferences();
  const [completingKey, setCompletingKey] = useState<string | null>(null);
  const training = latestScan?.result.training;
  if (needsSetup && items.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today’s training</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/workout-setup')} style={[styles.standardCard, { backgroundColor: colors.backgroundElement }]}>
          <HeaderRow title="Set up your workouts" subtitle="No photos needed · choose location, experience, time, equipment, and routine" icon={<DumbbellIcon size={21} color={colors.accent} />} colors={colors} />
          <View style={styles.trainingStatusRow}><Text style={[styles.trainingPrescription, { color: colors.accentStrong }]}>Create my workout setup</Text><ChevronRightIcon size={18} color={colors.textSecondary} /></View>
        </Pressable>
      </View>
    );
  }
  const title = items.length > 0
    ? 'Your training'
    : goal === 'lose'
      ? 'Strength + conditioning'
      : training?.weeklyFocus ?? `${weakest} focus`;
  const subtitle = items.length > 0
    ? `${items.length} exercise${items.length === 1 ? '' : 's'} · customised by you`
    : goal === 'lose'
      ? 'Retain muscle · build weekly activity · adapted to your setup'
    : training
      ? `${training.daysPerWeek} days per week · adapted to your setup and weekly balance`
      : recommendations.length > 0
        ? `${routineLabel} · based on your goal, setup, recovery and last seven days`
        : 'A simple suggestion from your weekly muscle score';
  const canComplete = selectedDate === dayKey();
  const completedNames = new Set(
    exercises
      .filter((exercise) => exercise.date === dayKey())
      .map((exercise) => exercise.name.trim().toLowerCase())
  );
  const customPlanned: PlannedCompletion[] = items.length > 0
    ? items.slice(0, 5).map((exercise) => {
        const muscleSets = emptyMuscleSets();
        if (exercise.activityType === 'strength' && exercise.muscleGroup) muscleSets[exercise.muscleGroup] = exercise.sets;
        return {
          key: exercise.id,
          trainingPlanItemId: exercise.id,
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
          cardioIntensity: exercise.activityType === 'cardio' ? exercise.cardioIntensity : null,
        };
      })
    : [];
  const recommendationPlanned = recommendations.map(plannedRecommendation);
  const fatLossCardio = recommendationPlanned.find((exercise) => exercise.splits.includes('cardio'));
  const fatLossStrength = recommendationPlanned
    .filter((exercise) => !exercise.splits.includes('cardio'))
    .reduce<PlannedCompletion[]>((selected, exercise) => {
      const used = selected.reduce((sum, item) => sum + item.durationMinutes, fatLossCardio?.durationMinutes ?? 0);
      return used + exercise.durationMinutes <= WORKOUT_GOAL ? [...selected, exercise] : selected;
    }, []);
  const fatLossPlanned = [...fatLossStrength, ...(fatLossCardio ? [fatLossCardio] : [])];
  const planned = customPlanned.length > 0
    ? customPlanned
    : goal === 'lose' && fatLossPlanned.length > 0
      ? fatLossPlanned
    : hasActiveFocus && recommendationPlanned.length > 0
      ? recommendationPlanned.slice(0, 3)
    : recommendationPlanned.slice(0, 3);

  async function markComplete(exercise: PlannedCompletion) {
    if (!canComplete || completedNames.has(exercise.name.trim().toLowerCase()) || completingKey) return;
    setCompletingKey(exercise.key);
    try {
      await addExercise(exercise.name, exercise.calories, exercise.durationMinutes, {
        workoutSplits: exercise.splits,
        muscleSets: exercise.muscleSets,
        cardioIntensity: exercise.cardioIntensity,
        trainingPlanItemId: exercise.trainingPlanItemId ?? null,
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
    const completedSets = Object.values(exercise.muscleSets).reduce((sum, sets) => sum + sets, 0);
    Alert.alert(
      'Mark training complete?',
      `${exercise.name} will be added to today’s workout log and update Workout Time${completedSets > 0 ? ' and Weekly Muscle Score' : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark complete', onPress: () => { void markComplete(exercise); } },
      ]
    );
  }

  async function saveExerciseResponse(exerciseId: string, response: ExerciseResponse | null) {
    try {
      await exerciseFeedback.setResponse(exerciseId, response);
      await Haptics.selectionAsync();
    } catch (error: any) {
      Alert.alert('Feedback not saved', error?.message ?? 'Please try again.');
    }
  }

  function markExerciseUnsuitable(exercise: PlannedCompletion) {
    if (!exercise.catalogId) return;
    Alert.alert(
      'Adjust this exercise?',
      'Trak can rank it lower when it feels uncomfortable, or stop recommending it entirely.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Uncomfortable', onPress: () => { void saveExerciseResponse(exercise.catalogId!, 'uncomfortable'); } },
        { text: "Don't suggest", style: 'destructive', onPress: () => { void saveExerciseResponse(exercise.catalogId!, 'unsuitable'); } },
      ]
    );
  }

  function confirmRestoreHiddenExercises() {
    Alert.alert(
      'Restore hidden exercises?',
      'Exercises marked “don’t suggest” will be eligible for recommendations again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: () => {
          void exerciseFeedback.restoreUnsuitable().catch((error: any) => {
            Alert.alert('Exercises not restored', error?.message ?? 'Please try again.');
          });
        } },
      ]
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s training</Text>
      <View style={[styles.standardCard, styles.trainingCard, { backgroundColor: colors.backgroundElement }]}>
        <HeaderRow
          title={title}
          subtitle={subtitle}
          icon={<DumbbellIcon size={21} color={colors.accent} />}
          colors={colors}
        />
        <Text selectable style={[styles.effortReminder, { color: colors.textSecondary }]}>
          Effort reminder: learn each movement with clean reps and some effort left. On familiar stable exercises, work close to failure; experienced lifters may take an appropriate final set to technical failure.
        </Text>
        {planned.map((exercise) => {
          const completed = completedNames.has(exercise.name.trim().toLowerCase());
          const response = exercise.catalogId ? exerciseFeedback.settings.responses[exercise.catalogId] : null;
          return (
            <View key={exercise.key} style={styles.trainingItem}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${exercise.name}${completed ? ', completed' : ', hold to mark complete'}`}
                accessibilityHint={!canComplete ? 'Open today to complete this training' : completed ? 'Training completed' : 'Use the Mark complete action after finishing this training'}
                accessibilityState={{ disabled: !canComplete || completed }}
                accessibilityActions={!canComplete || completed ? [] : [{ name: 'activate', label: 'Mark complete' }]}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === 'activate') confirmComplete(exercise);
                }}
                delayLongPress={450}
                disabled={!canComplete || completed || completingKey != null}
                onLongPress={() => confirmComplete(exercise)}
                style={({ pressed }) => [styles.trainingRow, completed && { backgroundColor: colors.greenTint }, pressed && { opacity: 0.72 }]}>
                <View style={styles.trainingTopRow}>
                  <Text style={[styles.trainingName, { color: colors.text }]}>{exercise.name}</Text>
                  {completed ? (
                    <View style={styles.trainingStatusRow}>
                      <Text style={[styles.trainingCompleteText, { color: colors.accent }]}>Complete</Text>
                      <View style={styles.completedIcon}><CheckIcon size={14} color="#ffffff" /></View>
                    </View>
                  ) : null}
                </View>
                {!completed ? <Text style={[styles.trainingPrescription, { color: colors.accentStrong }]}>{exercise.prescription}</Text> : null}
                {!completed && exercise.effortCue ? <Text selectable style={[styles.trainingEffort, { color: colors.accentStrong }]}>{exercise.effortCue}</Text> : null}
                {!completed ? <Text style={[styles.holdHint, { color: colors.textSecondary }]}>{canComplete ? 'Hold to mark complete' : 'Open today to complete'}</Text> : null}
              </Pressable>
              {exercise.catalogId && exerciseFeedback.loaded && !exerciseFeedback.error ? (
                <View style={styles.exerciseFeedbackRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: response === 'comfortable', disabled: exerciseFeedback.saving }}
                    disabled={exerciseFeedback.saving}
                    onPress={() => { void saveExerciseResponse(exercise.catalogId!, response === 'comfortable' ? null : 'comfortable'); }}
                    style={[styles.exerciseFeedbackButton, { backgroundColor: response === 'comfortable' ? colors.greenTint : colors.backgroundSelected }]}>
                    <Text style={[styles.exerciseFeedbackText, { color: response === 'comfortable' ? colors.accentStrong : colors.textSecondary }]}>Felt good{response === 'comfortable' ? ' ✓' : ''}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Adjust recommendations for ${exercise.name}`}
                    disabled={exerciseFeedback.saving}
                    onPress={() => markExerciseUnsuitable(exercise)}
                    style={[styles.exerciseFeedbackButton, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={[styles.exerciseFeedbackText, { color: colors.textSecondary }]}>{response === 'uncomfortable' ? 'Uncomfortable ✓' : 'Not for me'}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
        {loaded && planned.length === 0 ? <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>Build a focused {weakest.toLowerCase()} session, or add your own exercises.</Text> : null}
        {Object.values(exerciseFeedback.settings.responses).includes('unsuitable') ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Restore hidden exercises" accessibilityState={{ disabled: exerciseFeedback.saving }} disabled={exerciseFeedback.saving} onPress={confirmRestoreHiddenExercises}>
            <Text style={[styles.restoreExercisesText, { color: colors.textSecondary }]}>Restore hidden exercises</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" style={styles.tonalButton} onPress={() => router.push('/training-plan' as never)}>
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
      <HeaderRow title="Workout Time" subtitle={`${selected}/${WORKOUT_GOAL} minutes`} icon={<DumbbellIcon size={21} color={colors.accent} />} colors={colors} />
      <View style={styles.weekChart}>
        {data.map((item) => {
          const ratio = Math.min(1, item.minutes / WORKOUT_GOAL);
          const date = localDate(item.date);
          return (
            <View
              key={item.date}
              accessibilityRole="progressbar"
              accessibilityLabel={`${date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} workout time`}
              accessibilityValue={{ min: 0, max: WORKOUT_GOAL, now: Math.min(item.minutes, WORKOUT_GOAL), text: `${item.minutes} minutes` }}
              style={styles.dayColumn}>
              <View style={[styles.rail, { backgroundColor: colors.backgroundSelected }]}>
                <View style={[styles.railFill, { height: `${Math.max(8, ratio * 100)}%`, backgroundColor: colors.accent }]} />
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
      <Pressable accessibilityRole="button" accessibilityLabel="Log a workout" style={[styles.addActivity, { backgroundColor: colors.backgroundSelected }]} onPress={() => router.push('/exercise')}>
        <Text style={[styles.addActivityText, { color: colors.text }]}>LOG A WORKOUT</Text>
      </Pressable>
    </View>
  );
}

export function ProgressOverview({ colors, selectedDate, latestScan, preferences }: {
  colors: ThemeColors;
  selectedDate: string;
  latestScan: BodyScan | null;
  preferences: BodyAnalysisPreferences | null;
}) {
  const { exercises, weights, profile } = useMeals();
  const { settings: muscleSettings } = useMuscleScorePreferences();
  const exerciseFeedback = useExerciseResponsePreferences();
  const workoutFocus = useWorkoutFocusPreferences();
  const coach = useWorkoutCoachPreferences();
  const fatLoss = useFatLossPreferences();
  const balance = useMemo(() => muscleScores(exercises, selectedDate, WEEKLY_SET_TARGET, muscleSettings), [exercises, selectedDate, muscleSettings]);
  // Recommendation recency always means the trailing seven calendar days;
  // display-only score resets must not make older training look unperformed.
  const recommendationBalance = useMemo(() => muscleScores(exercises, selectedDate), [exercises, selectedDate]);
  const workoutWeek = useMemo(() => workoutMinutesByDay(exercises, selectedDate), [exercises, selectedDate]);
  const activityWeek = useMemo(() => weeklyActivitySummary(exercises, selectedDate), [exercises, selectedDate]);
  const goal = profile?.goal ?? 'maintain';
  const effectiveSettings = useMemo(() => coach.settings.configured
    ? coach.settings
    : preferences
      ? { configured: true, trainingLocation: preferences.trainingLocation, experience: preferences.experience, daysPerWeek: preferences.daysAvailable, sessionMinutes: 45, routine: 'coach' as const, equipment: preferences.equipment, limitationsNote: preferences.limitationsNote ?? '' }
      : null, [coach.settings, preferences]);
  const experience = effectiveSettings?.experience ?? 'beginner';
  const routineSession = useMemo(() => nextRoutineSession(effectiveSettings?.routine ?? 'coach', exercises.filter((entry) => entry.date <= selectedDate)), [effectiveSettings?.routine, exercises, selectedDate]);
  const focusWeek = workoutFocusWeek(workoutFocus.settings, localDate(selectedDate));
  const focusMuscle = workoutFocus.settings.priorityMuscle;
  const focusActive = focusMuscle != null && focusWeek != null && focusWeek <= 6;
  const weakest = [...balance].sort((a, b) => a.score - b.score)[0]?.label ?? 'Full body';
  const recommendations = useMemo(() => {
    if (!effectiveSettings) return [];
    const attention = recommendationBalance
      .filter((muscle) => muscle.sets < WEEKLY_SET_TARGET)
      .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
    const recommendationDays = new Set(trainingDayKeys(selectedDate));
    const recentLegDays = new Set(trainingDayKeys(selectedDate, 2));
    const recentHardLegTraining = exercises.some((exercise) =>
      recentLegDays.has(exercise.date)
      && ((exercise.muscleSets?.legs ?? 0) + (exercise.muscleSets?.glutes ?? 0) >= 3)
    );
    const recentExerciseIds = exercises
      .filter((exercise) => recommendationDays.has(exercise.date))
      .sort((a, b) => b.createdAt - a.createdAt)
      .flatMap((exercise) => {
        const id = workoutCatalogIdForName(exercise.name);
        return id ? [id] : [];
      });
    const analysisExerciseIds = latestScan?.result.training.exercises.flatMap((exercise) => {
      const id = workoutCatalogIdForName(exercise.name);
      return id ? [id] : [];
    }) ?? [];
    return recommendWorkout({
      goal,
      experience,
      location: effectiveSettings.trainingLocation,
      equipment: equipmentForWorkoutSettings(effectiveSettings),
      availableMinutes: effectiveSettings.sessionMinutes,
      recentMuscleSets: Object.fromEntries(recommendationBalance.map((muscle) => [muscle.key, muscle.sets])),
      musclesNeedingAttention: attention.map((muscle) => muscle.key),
      limitations: effectiveSettings.limitationsNote ? [effectiveSettings.limitationsNote] : [],
      exerciseResponses: exerciseFeedback.settings.responses,
      recentExerciseIds,
      targetMuscles: routineSession.targetMuscles,
      analysisExerciseIds,
      priorityMuscle: focusActive ? focusMuscle : null,
      ...(focusActive ? {
        specialization: {
          muscle: focusMuscle,
          baselineWeeklySets: workoutFocus.settings.baselineWeeklySets,
          weekOfBlock: focusWeek,
          additionalSetTarget: experience === 'advanced' ? 3 : 2,
        },
      } : {}),
      recentCardioEquivalentMinutes: activityWeek.cardioEquivalentMinutes,
      recentCardioSessions: activityWeek.cardioSessions,
      recentVigorousCardioSessions: activityWeek.vigorousCardioSessions,
      recentHardLegTraining,
      cardioTargetMinutes: cardioTargetForSettings(fatLoss.settings),
      comfortableCardioMinutes: fatLoss.settings.comfortableCardioMinutes,
      activityBaseline: fatLoss.settings.activityBaseline,
      preferredCardioIds: preferredCardioCatalogIds(fatLoss.settings),
      balanceConcern: fatLoss.settings.balanceConcern,
      chairStandComfortable: fatLoss.settings.chairStandComfortable,
      sessionStyle: routineSession.sessionStyle,
      includeCardio: goal === 'lose' && activityWeek.cardioEquivalentMinutes < cardioTargetForSettings(fatLoss.settings),
      limit: effectiveSettings.sessionMinutes >= 60 ? 5 : effectiveSettings.sessionMinutes >= 40 ? 4 : 3,
    });
  }, [activityWeek.cardioEquivalentMinutes, activityWeek.cardioSessions, activityWeek.vigorousCardioSessions, effectiveSettings, exerciseFeedback.settings.responses, exercises, experience, fatLoss.settings, focusActive, focusMuscle, focusWeek, goal, latestScan, recommendationBalance, routineSession, selectedDate, workoutFocus.settings.baselineWeeklySets]);
  const focusLabel = focusMuscle ? `${muscleLabel(focusMuscle)} focus` : 'Choose a muscle focus';
  const focusRecentSets = focusMuscle
    ? balance.find((muscle) => muscle.key === focusMuscle)?.sets ?? 0
    : 0;
  const focusDetail = focusMuscle
    ? focusActive
      ? experience === 'beginner' && focusRecentSets >= WEEKLY_SET_TARGET
        ? `Week ${focusWeek} of 6 · weekly target met`
        : focusRecentSets >= RECOVERY_CHECK_SET_THRESHOLD
          ? `Week ${focusWeek} of 6 · recovery check`
          : `Week ${focusWeek} of 6 · used in recommendations`
      : 'Six-week block complete · renew or rebalance'
    : 'Optional · six-week focus block';
  return (
    <View style={styles.content}>
      {goal === 'lose' ? <WeeklyCardio activity={activityWeek} settings={fatLoss.settings} showStrengthSupport colors={colors} /> : null}
      <MuscleBalance scores={balance} selectedDate={selectedDate} colors={colors} />
      {goal !== 'lose' ? <WeeklyCardio activity={activityWeek} settings={fatLoss.settings} targetMinutes={FAT_LOSS_CARDIO_BASELINE} showStrengthSupport={false} colors={colors} /> : null}
      <MuscleFocusCard focusLabel={focusLabel} focusDetail={focusDetail} hasActiveFocus={focusActive} colors={colors} />
      <TodayTraining latestScan={latestScan} recommendations={recommendations} weakest={weakest} selectedDate={selectedDate} goal={goal} hasActiveFocus={focusActive} needsSetup={!effectiveSettings} routineLabel={routineSession.label} colors={colors} />
      <WeightProgress weights={weights} selectedDate={selectedDate} goal={profile?.goal} colors={colors} />
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity</Text>
        <WorkoutTime data={workoutWeek} selectedDate={selectedDate} colors={colors} />
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
  weightProgressCard: { borderRadius: 24, padding: Spacing.three, gap: Spacing.three },
  weightProgressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  weightProgressTitle: { flex: 1, fontFamily: Type.display, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  weightGoalChip: { minHeight: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  weightGoalText: { fontSize: 11, lineHeight: 15, fontWeight: '800' },
  weightChart: { height: WEIGHT_CHART_HEIGHT },
  weightChartEmpty: { height: WEIGHT_CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', gap: Spacing.one, paddingHorizontal: Spacing.four },
  weightChartEmptyTitle: { fontFamily: Type.display, fontSize: 20, lineHeight: 25, fontWeight: '700', textAlign: 'center' },
  weightChartEmptyText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  trendGuidance: { borderRadius: 14, padding: Spacing.three, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  weightRangePicker: { minHeight: 46, borderRadius: 23, overflow: 'hidden' },
  weightRangeContent: { padding: Spacing.one },
  weightRangeButton: { minHeight: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  weightRangeText: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  muscleCard: { borderRadius: 20, paddingVertical: Spacing.three, paddingHorizontal: Spacing.two, flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.four },
  muscleItem: { width: '25%', alignItems: 'center', gap: Spacing.two },
  muscleItemLargeText: { width: '50%' },
  miniRing: { width: MINI_SIZE, height: MINI_SIZE, alignItems: 'center', justifyContent: 'center' },
  miniValue: { position: 'absolute', fontSize: 14, fontWeight: '900' },
  muscleLabel: { fontSize: 12, fontWeight: '800' },
  muscleTarget: { width: '100%', minHeight: 24, paddingHorizontal: 2, fontSize: 9, lineHeight: 11, fontWeight: '700', textAlign: 'center' },
  standardCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three },
  trainingCard: { gap: Spacing.two },
  muscleFocusCard: { minHeight: 78, borderRadius: 20, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  muscleFocusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  muscleFocusEyebrow: { fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 1 },
  muscleFocusTitle: { marginTop: 1, fontSize: 14, lineHeight: 18, fontWeight: '800' },
  muscleFocusDetail: { marginTop: 1, fontSize: 10, lineHeight: 14 },
  cardioCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three },
  cardioHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardioRing: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  cardioRingValue: { position: 'absolute', alignItems: 'center' },
  cardioMinutes: { fontFamily: Type.display, fontSize: 26, lineHeight: 30, fontWeight: '700' },
  cardioUnit: { fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 1 },
  cardioCopy: { flex: 1, alignItems: 'flex-start' },
  cardioEyebrow: { fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 1 },
  cardioHeadline: { marginTop: Spacing.one, fontFamily: Type.display, fontSize: 20, lineHeight: 25, fontWeight: '700' },
  cardioSummary: { marginTop: Spacing.one, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  cardioPrompt: { marginTop: Spacing.one, fontSize: 11, lineHeight: 16, fontWeight: '800' },
  strengthSupport: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  strengthSupportCopy: { flex: 1, gap: Spacing.one },
  strengthSupportTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  strengthSupportTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  strengthSupportBody: { fontSize: 11, lineHeight: 16 },
  strengthRing: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  strengthRingValue: { position: 'absolute', fontSize: 13, lineHeight: 17, fontWeight: '900' },
  cardioSettingsButton: { minHeight: 44, borderRadius: 14, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardioSettingsText: { fontSize: 12, lineHeight: 17, fontWeight: '800' },
  movementBreak: { fontSize: 11, lineHeight: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  cardIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  cardSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17 },
  trainingRow: { minHeight: 54, borderRadius: 14, paddingHorizontal: Spacing.two, paddingVertical: Spacing.two, gap: 3 },
  trainingItem: { gap: Spacing.one },
  trainingTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  trainingStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.one },
  trainingName: { flex: 1, fontSize: 14, fontWeight: '700' },
  trainingPrescription: { width: '100%', fontSize: 12, lineHeight: 17, fontWeight: '900' },
  trainingCompleteText: { fontSize: 12, lineHeight: 17, fontWeight: '900' },
  effortReminder: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
  trainingEffort: { marginTop: 3, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  holdHint: { marginTop: 2, fontSize: 10, lineHeight: 14, fontWeight: '600' },
  exerciseFeedbackRow: { flexDirection: 'row', gap: Spacing.one, paddingHorizontal: Spacing.two },
  exerciseFeedbackButton: { minHeight: 32, borderRadius: 16, paddingHorizontal: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  exerciseFeedbackText: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  restoreExercisesText: { fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center', textDecorationLine: 'underline' },
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
