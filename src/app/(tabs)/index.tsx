import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import {
  BarcodeIcon,
  CameraIcon,
  ChevronRightIcon,
  DropletIcon,
  DumbbellIcon,
  FlameIcon,
  PlateIcon,
  ScaleIcon,
  SparklesIcon,
} from '@/components/icons';
import { DateStrip, type DateStripItem } from '@/components/date-strip';
import { DailyMissionsCard } from '@/components/daily-missions-card';
import { useSupplements } from '@/lib/supplements';
import { RingMark, TrakWordmark } from '@/components/logo';
import { ProfileAvatarButton } from '@/components/profile-avatar-button';
import {
  Brand,
  Colors,
  MacroColors,
  Spacing,
  Type,
  type ThemeColors,
} from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { dailyHistoryFor } from '@/lib/history';
import { dayKey, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { LoggedMeal } from '@/lib/types';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function localDateFromKey(value: string): Date {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date);
}

/* ------------------------------ Date ribbon ----------------------------- */

type WeekDate = DateStripItem & { isToday: boolean };

const HOME_TIMELINE_DAYS = 365;

function homeTimelineDates(today = new Date()): WeekDate[] {
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Array.from({ length: HOME_TIMELINE_DAYS + 1 }, (_, index) => {
    const offset = index - (HOME_TIMELINE_DAYS - 1);
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + offset);
    return {
      date,
      key: dayKey(date),
      weekday: date.toLocaleDateString([], { weekday: 'short' }),
      day: date.getDate(),
      isToday: offset === 0,
      isFuture: offset > 0,
    };
  });
}

function WeekDateStrip({
  colors,
  selectedDate,
  onSelectDate,
}: {
  colors: ThemeColors;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const dates = useMemo(() => homeTimelineDates(), []);
  return (
    <DateStrip
      accessibilityLabel="Home dates"
      colors={colors}
      dates={dates}
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
    />
  );
}

/* ------------------------------ Macro rings ------------------------------ */

const MINI_STROKE = 7;

function MiniRing({
  value,
  sub,
  label,
  pct,
  color,
  colors,
  onPress,
}: {
  value: string;
  sub: string;
  label: string;
  pct: number;
  color: string;
  colors: ThemeColors;
  onPress?: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const miniSize = 62 + Math.min(28, Math.round(Math.max(0, fontScale - 1) * 24));
  const miniRadius = (miniSize - MINI_STROKE) / 2;
  const miniCircumference = 2 * Math.PI * miniRadius;
  const clamped = Math.min(1, Math.max(0, pct));
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'progressbar'}
      accessibilityLabel={`${label}, ${value}, ${sub}`}
      accessibilityValue={onPress ? undefined : { min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.miniWrap, fontScale >= 1.35 && styles.miniWrapLargeText]}
      disabled={!onPress}
      onPress={onPress}
      hitSlop={4}>
      <View style={styles.miniRing}>
        <Svg width={miniSize} height={miniSize}>
          <Circle
            cx={miniSize / 2}
            cy={miniSize / 2}
            r={miniRadius}
            stroke={colors.backgroundSelected}
            strokeWidth={MINI_STROKE}
            fill="none"
          />
          <Circle
            cx={miniSize / 2}
            cy={miniSize / 2}
            r={miniRadius}
            stroke={color}
            strokeWidth={MINI_STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${miniCircumference} ${miniCircumference}`}
            strokeDashoffset={miniCircumference * (1 - clamped)}
            transform={`rotate(-90 ${miniSize / 2} ${miniSize / 2})`}
          />
        </Svg>
        <View style={styles.miniCenter}>
          <Text style={[styles.miniValue, { color: colors.text }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </View>
      <Text style={[styles.miniSub, { color: colors.textSecondary }]} numberOfLines={1}>
        {sub}
      </Text>
      <Text style={[styles.miniLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------ Coaching card ----------------------------- */

/**
 * Pick today's coaching nudge from the day's state — most urgent gap first.
 * Always visible (no dismissal); the message itself changes as the day evolves.
 */
function pickTip(input: {
  mealsLogged: number;
  proteinPct: number;
  caloriePct: number;
  waterPct: number;
  streak: number;
}): { title: string; body: string; destination: 'chat' | 'ask' } {
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

/** The permanent coaching card — tapping it opens Chat's Ask panel. */
function CoachCard({
  tip,
  colors,
}: {
  tip: { title: string; body: string; destination: 'chat' | 'ask' };
  colors: ThemeColors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tip.title}. ${tip.body}`}
      accessibilityHint="Opens Trak coaching"
      style={({ pressed }) => [
        styles.tipCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() =>
        router.push({
          pathname: '/chat',
          params: { mode: tip.destination, t: String(Date.now()) },
        })
      }>
      <View style={[styles.tipIcon, { backgroundColor: colors.greenTint }]}>
        <SparklesIcon size={18} color={colors.accentStrong} />
      </View>
      <View style={styles.tipInfo}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
        <Text style={[styles.tipBody, { color: colors.textSecondary }]}>{tip.body}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/* ------------------------------- Water card ------------------------------ */

/** A glass of water, in litres. */
const L_PER_GLASS = 0.25;
const WATER_UNIT_KEY = 'trak.waterUnit.v1';
type WaterUnit = 'glasses' | 'litres';

/** Format a glass count in the chosen unit (litres = glasses × 250 ml). */
function litres(glasses: number): string {
  return `${(glasses * L_PER_GLASS).toFixed(2).replace(/\.00$/, '')} L`;
}

/** Tap glasses to fill; tapping the current glass empties it back one. Toggle Glasses/Litres readout. */
function WaterCard({
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
    AsyncStorage.getItem(WATER_UNIT_KEY).then((v) => {
      if (v === 'litres' || v === 'glasses') setUnit(v);
    });
  }, []);

  function pickUnit(u: WaterUnit) {
    setUnit(u);
    AsyncStorage.setItem(WATER_UNIT_KEY, u).catch(() => {});
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
          <DropletIcon size={18} color={colors.accent} filled />
          <Text style={[styles.waterTitle, { color: colors.text }]}>Water</Text>
        </View>
        <View style={[styles.unitToggle, { backgroundColor: colors.background }]}>
          {(['glasses', 'litres'] as const).map((u) => (
            <Pressable
              key={u}
              accessibilityRole="radio"
              accessibilityLabel={u === 'glasses' ? 'Show water in glasses' : 'Show water in litres'}
              accessibilityState={{ checked: unit === u }}
              onPress={() => pickUnit(u)}
              style={[styles.unitBtn, unit === u && { backgroundColor: colors.greenTint }]}>
              <Text
                style={[
                  styles.unitBtnText,
                  { color: unit === u ? colors.accentStrong : colors.textSecondary },
                ]}>
                {u === 'glasses' ? 'Glasses' : 'Litres'}
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
              accessibilityRole="button"
              accessibilityLabel="Decrease water goal"
              accessibilityState={{ disabled: waterGoal <= 1 }}
              hitSlop={8}
              onPress={() =>
                setWaterGoal(Math.max(1, waterGoal - 1)).catch((e) =>
                  Alert.alert('Not saved', e?.message ?? 'Please try again.')
                )
              }
              style={[styles.stepBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
            </Pressable>
            <Text style={[styles.goalValue, { color: colors.text }]}>{goalLabel}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase water goal"
              hitSlop={8}
              onPress={() =>
                setWaterGoal(waterGoal + 1).catch((e) =>
                  Alert.alert('Not saved', e?.message ?? 'Please try again.')
                )
              }
              style={[styles.stepBtn, { backgroundColor: colors.background }]}>
              <Text style={[styles.stepText, { color: colors.text }]}>+</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Finish editing water goal" hitSlop={8} onPress={() => setEditingGoal(false)}>
              <Text style={[styles.goalDone, { color: colors.accentStrong }]}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Water, ${countLabel}. Edit goal`}
            accessibilityState={{ disabled: !viewingToday }}
            disabled={!viewingToday}
            onPress={() => setEditingGoal(true)}
            hitSlop={8}>
            <Text style={[styles.waterCount, { color: colors.textSecondary }]}>
              {countLabel}{viewingToday ? ' ✎' : ''}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.glassRow}>
        {Array.from({ length: waterGoal }).map((_, i) => {
          const filled = i < displayedWater;
          return (
            <Pressable
              key={i}
              accessibilityRole="checkbox"
              accessibilityLabel={`Water glass ${i + 1} of ${waterGoal}`}
              accessibilityState={{ checked: filled, disabled: !viewingToday }}
              hitSlop={4}
              disabled={!viewingToday}
              onPress={() => setWater(i + 1 === displayedWater ? i : i + 1)}
              style={styles.glassTap}>
              <DropletIcon size={26} color={filled ? colors.accent : colors.backgroundSelected} filled />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ---------------------------- Supplements card --------------------------- */

/** Round tick you check off once a day — green fill when taken, outline when not. */
function CheckCircle({ checked, colors }: { checked: boolean; colors: ThemeColors }) {
  return (
    <View
      accessible={false}
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

/**
 * Home glance at today's supplements — tap a row to check it off without
 * leaving the dashboard; the header opens the full management screen.
 * Mirrors WaterCard's visual weight so the two habit cards feel like a set.
 */
function SupplementsCard({ colors, selectedDate }: { colors: ThemeColors; selectedDate: string }) {
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

  // Nothing to show until state settles — avoids a flash of the empty prompt.
  if (!loaded) return null;

  async function tap(id: string) {
    try {
      await toggleTaken(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Please try again.');
    }
  }

  return (
    <View style={[styles.suppCard, { backgroundColor: colors.backgroundElement }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Manage supplements"
        style={styles.suppHeader}
        onPress={() => router.push('/supplements')}
        hitSlop={6}>
        <Text style={[styles.suppTitle, { color: colors.text }]}>Supplements</Text>
        <View style={styles.suppHeaderRight}>
          {viewingToday && streak > 0 ? (
            <Text style={[styles.suppStreak, { color: colors.accentStrong }]}>{streak}-day streak</Text>
          ) : null}
          <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
        </View>
      </Pressable>

      {visibleSupplements.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={viewingToday ? 'Add vitamins and supplements' : 'View supplements'}
          onPress={() => router.push('/supplements')}
          hitSlop={6}>
          <Text style={[styles.suppAddLine, { color: colors.textSecondary }]}>
            {viewingToday ? 'Add your vitamins and supplements ›' : 'No supplements planned on this day'}
          </Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.suppList}>
            {visibleSupplements.slice(0, 6).map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="checkbox"
                accessibilityLabel={s.name}
                accessibilityState={{ checked: !!checkedForDay[s.id], disabled: !viewingToday }}
                style={styles.suppRow}
                disabled={!viewingToday}
                onPress={() => tap(s.id)}
                hitSlop={4}>
                <Text style={[styles.suppName, { color: colors.text }]} numberOfLines={1}>
                  {s.name}
                </Text>
                <CheckCircle checked={!!checkedForDay[s.id]} colors={colors} />
              </Pressable>
            ))}
          </View>
          {visibleSupplements.length > 0 ? (
            <Text style={[styles.suppCaption, { color: colors.textSecondary }]}>
              {displayedTakenCount} of {visibleSupplements.length} taken
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

function MealRow({ meal, colors }: { meal: LoggedMeal; colors: ThemeColors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${meal.title}, ${meal.total.calories} calories, ${meal.total.protein_g} grams protein, ${meal.total.carbs_g} grams carbohydrates, ${meal.total.fat_g} grams fat`}
      style={({ pressed }) => [
        styles.mealRow,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push(`/meal/${meal.id}`)}>
      <View style={styles.mealInfo}>
        <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={1}>
          {meal.title}
        </Text>
        <Text style={[styles.mealMeta, { color: colors.textSecondary }]}>
          {formatTime(meal.createdAt)} · {meal.total.protein_g}p · {meal.total.carbs_g}c ·{' '}
          {meal.total.fat_g}f
        </Text>
      </View>
      <Text style={[styles.mealCals, { color: colors.text }]}>{meal.total.calories}</Text>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

const GOAL_LABEL: Record<string, string> = {
  lose: 'Losing weight',
  maintain: 'Maintaining weight',
  gain: 'Gaining muscle',
};

export default function HomeScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.35;
  const { user, authLoading } = useAuth();
  const {
    meals,
    exercises,
    targets,
    weights,
    loaded,
    loadError,
    retryLoad,
    refresh,
    hasProfile,
    profile,
    recentMeals,
    savedMeals,
    waterHistory,
    waterGoal,
  } = useMeals();
  const { supplements, checks } = useSupplements();
  const today = dayKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const [refreshing, setRefreshing] = useState(false);

  const selectedDay = useMemo(
    () =>
      dailyHistoryFor(selectedDate, {
        meals,
        exercises,
        water: waterHistory,
        supplements,
        supplementChecks: checks,
        targets,
        waterGoal,
        goal: profile?.goal,
      }),
    [selectedDate, meals, exercises, waterHistory, supplements, checks, targets, waterGoal, profile?.goal]
  );
  const viewingToday = selectedDate === today;
  const hasQuickAdd = viewingToday && (recentMeals.length > 0 || savedMeals.length > 0);
  const weightsThroughSelected = weights.filter((entry) => entry.date <= selectedDate);
  const selectedWeight = weightsThroughSelected.at(-1)?.weightKg ?? null;
  const weightChange =
    weightsThroughSelected.length >= 2
      ? weightsThroughSelected[weightsThroughSelected.length - 1].weightKg - weightsThroughSelected[0].weightKg
      : null;
  const selectedDateLabel = viewingToday
    ? 'Today'
    : localDateFromKey(selectedDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Route based on auth + onboarding state.
  if (authLoading) return null;
  if (!user) return <Redirect href="/auth" />;
  if (!loaded) return null;
  if (loadError) {
    // The cloud load failed (e.g. offline). Never fall through to the
    // onboarding redirect here — the user may well have a profile.
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={[styles.safe, styles.loadErrorWrap]}>
          <Text style={[styles.loadErrorTitle, { color: colors.text }]}>
            Couldn&apos;t load your data
          </Text>
          <Text style={[styles.loadErrorBody, { color: colors.textSecondary }]}>
            Check your internet connection and try again.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading your data"
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: pressed ? Brand.greenDark : Brand.green },
            ]}
            onPress={retryLoad}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }
  if (!hasProfile) return <Redirect href="/onboarding" />;

  const tip = pickTip({
    mealsLogged: selectedDay.meals.length,
    proteinPct: targets.protein_g > 0 ? selectedDay.totals.protein_g / targets.protein_g : 0,
    caloriePct: selectedDay.calorieBudget > 0 ? selectedDay.totals.calories / selectedDay.calorieBudget : 0,
    waterPct: waterGoal > 0 ? selectedDay.waterGlasses / waterGoal : 0,
    streak: selectedDay.loggingStreak,
  });
  const caloriesLeft = Math.max(0, selectedDay.calorieBudget - selectedDay.totals.calories);
  const caloriesOver = selectedDay.totals.calories > selectedDay.calorieBudget;
  const selectedWorkoutMinutes = selectedDay.exercises.reduce(
    (sum, exercise) => sum + Math.max(0, exercise.durationMinutes || 0),
    0
  );

  return (
    <View testID="screen-home" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.green} colors={[Brand.green]} />
          }>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <RingMark size={30} />
              <TrakWordmark color={colors.text} size={28} />
            </View>
            <View style={styles.headerActions}>
              {!largeText && viewingToday && selectedDay.loggingStreak > 0 ? (
                <View style={[styles.streakPill, { backgroundColor: colors.backgroundElement }]}>
                  <FlameIcon size={15} color={colors.accent} />
                  <Text style={[styles.streakText, { color: colors.text }]}>
                    {selectedDay.loggingStreak} day{selectedDay.loggingStreak > 1 ? 's' : ''}
                  </Text>
                </View>
              ) : !largeText ? (
                <Text style={[styles.todayLabel, { color: colors.textSecondary }]}>{selectedDateLabel}</Text>
              ) : null}
              <ProfileAvatarButton colors={colors} />
            </View>
          </View>

          {/* The selected date controls every daily detail below without leaving Home. */}
          <WeekDateStrip colors={colors} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <DailyMissionsCard missions={selectedDay.missions} selectedDate={selectedDate} colors={colors} />

          {/* Daily coaching nudge — always visible, opens Chat's Ask panel */}
          {viewingToday ? <CoachCard tip={tip} colors={colors} /> : null}

          {/* Goal + macro rings */}
          <View style={[styles.macroCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.goalRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Goal, ${GOAL_LABEL[profile?.goal ?? 'maintain']}`} style={styles.goalInfo} onPress={() => router.push('/profile')} hitSlop={6}>
                <ScaleIcon size={16} color={colors.text} />
                <Text style={[styles.goalText, { color: colors.text }]}>
                  {GOAL_LABEL[profile?.goal ?? 'maintain']}
                </Text>
                <Text style={[styles.goalChevron, { color: colors.textSecondary }]}>›</Text>
              </Pressable>
            </View>

            <View style={[styles.miniRow, largeText && styles.miniRowLargeText]}>
              <MiniRing
                value={`${Math.round(selectedDay.totals.calories)}`}
                sub={`of ${Math.round(selectedDay.calorieBudget).toLocaleString()}`}
                label="Calories"
                pct={selectedDay.calorieBudget > 0 ? selectedDay.totals.calories / selectedDay.calorieBudget : 0}
                color={caloriesOver ? Brand.over : colors.accent}
                colors={colors}
                onPress={viewingToday ? () => router.push('/macro/calories') : undefined}
              />
              <MiniRing
                value={`${Math.round(selectedDay.totals.protein_g)}g`}
                sub={`of ${targets.protein_g}`}
                label="Protein"
                pct={targets.protein_g > 0 ? selectedDay.totals.protein_g / targets.protein_g : 0}
                color={MacroColors.protein}
                colors={colors}
                onPress={viewingToday ? () => router.push('/macro/protein') : undefined}
              />
              <MiniRing
                value={`${Math.round(selectedDay.totals.carbs_g)}g`}
                sub={`of ${targets.carbs_g}`}
                label="Carbs"
                pct={targets.carbs_g > 0 ? selectedDay.totals.carbs_g / targets.carbs_g : 0}
                color={MacroColors.carbs}
                colors={colors}
                onPress={viewingToday ? () => router.push('/macro/carbs') : undefined}
              />
              <MiniRing
                value={`${Math.round(selectedDay.totals.fat_g)}g`}
                sub={`of ${targets.fat_g}`}
                label="Fat"
                pct={targets.fat_g > 0 ? selectedDay.totals.fat_g / targets.fat_g : 0}
                color={MacroColors.fat}
                colors={colors}
                onPress={viewingToday ? () => router.push('/macro/fat') : undefined}
              />
            </View>
            {caloriesOver ? (
              <Text style={[styles.overNote, { color: Brand.over }]}>
                {Math.round(selectedDay.totals.calories - selectedDay.calorieBudget)} kcal over budget
              </Text>
            ) : (
              <Text style={[styles.leftNote, { color: colors.textSecondary }]}>
                {caloriesLeft.toLocaleString()} kcal left
                {selectedDay.exerciseCredit > 0 ? ` · +${selectedDay.exerciseCredit} exercise credit` : ''}
              </Text>
            )}
          </View>

          {/* Today's meals — primary daily log, before secondary progress cards. */}
          <View style={styles.mealsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {viewingToday ? "Today's meals" : `${selectedDateLabel} meals`}
            </Text>
            {hasQuickAdd ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quick add a meal"
                onPress={() => router.push('/quick-add')}
                style={({ pressed }) => [
                  styles.quickAddPill,
                  { backgroundColor: colors.greenTint, opacity: pressed ? 0.7 : 1 },
                ]}>
                <Text style={[styles.quickAddText, { color: colors.accentStrong }]}>＋ Quick add</Text>
              </Pressable>
            ) : null}
          </View>
          {selectedDay.meals.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <PlateIcon size={30} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {viewingToday
                  ? <>No meals logged yet.{'\n'}Tap “Scan a meal” to add your first one.</>
                  : 'No meals logged on this day.'}
              </Text>
            </View>
          ) : (
            <View style={styles.mealsList}>
              {selectedDay.meals.map((meal) => (
                <MealRow key={meal.id} meal={meal} colors={colors} />
              ))}
            </View>
          )}

          {/* Body + activity — paired daily actions in one compact card. */}
          <View style={[styles.bodyActivityCard, largeText && styles.bodyActivityCardLargeText, { backgroundColor: colors.backgroundElement }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={selectedWeight == null ? 'Weight, log weight' : `Weight, ${Math.round(selectedWeight * 10) / 10} kilograms`}
              disabled={!viewingToday}
              onPress={() => router.push('/weight')}
              style={({ pressed }) => [
                styles.bodyActivityItem,
                pressed && { backgroundColor: colors.backgroundSelected },
              ]}>
              <View style={styles.bodyActivityHeader}>
                <View style={[styles.bodyActivityIcon, { backgroundColor: colors.greenTint }]}>
                  <ScaleIcon size={18} color={colors.accentStrong} />
                </View>
                <Text style={[styles.bodyActivityLabel, { color: colors.textSecondary }]}>Weight</Text>
                {viewingToday ? <ChevronRightIcon size={15} color={colors.textSecondary} /> : null}
              </View>
              <Text style={[styles.bodyActivityValue, { color: colors.text }]}>
                {selectedWeight != null ? `${Math.round(selectedWeight * 10) / 10} kg` : viewingToday ? 'Log weight' : '—'}
              </Text>
              <Text style={[styles.bodyActivityMeta, { color: weightChange ? colors.accentStrong : colors.textSecondary }]}>
                {weightChange != null && weightChange !== 0
                  ? `${weightChange > 0 ? '▲' : '▼'} ${Math.abs(Math.round(weightChange * 10) / 10)} kg`
                  : selectedWeight != null
                    ? 'Latest weigh-in'
                    : viewingToday
                      ? 'Add today’s weigh-in'
                      : 'No weight logged'}
              </Text>
            </Pressable>

            <View style={[styles.bodyActivityDivider, largeText && styles.bodyActivityDividerLargeText, { backgroundColor: colors.backgroundSelected }]} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={selectedDay.caloriesBurned > 0 ? `Exercise, ${selectedDay.caloriesBurned} calories burned` : 'Exercise, log a workout'}
              disabled={!viewingToday}
              onPress={() => router.push('/exercise')}
              style={({ pressed }) => [
                styles.bodyActivityItem,
                pressed && { backgroundColor: colors.backgroundSelected },
              ]}>
              <View style={styles.bodyActivityHeader}>
                <View style={[styles.bodyActivityIcon, { backgroundColor: colors.greenTint }]}>
                  <DumbbellIcon size={18} color={colors.accentStrong} />
                </View>
                <Text style={[styles.bodyActivityLabel, { color: colors.textSecondary }]}>Exercise</Text>
                {viewingToday ? <ChevronRightIcon size={15} color={colors.textSecondary} /> : null}
              </View>
              <Text style={[styles.bodyActivityValue, { color: colors.text }]}>
                {selectedDay.caloriesBurned > 0 ? `${selectedDay.caloriesBurned} kcal` : viewingToday ? 'Log workout' : '—'}
              </Text>
              <Text style={[styles.bodyActivityMeta, { color: colors.textSecondary }]}>
                {selectedWorkoutMinutes > 0
                  ? `${selectedWorkoutMinutes} min today`
                  : selectedDay.caloriesBurned > 0
                    ? 'Burned today'
                  : viewingToday
                    ? 'Add today’s activity'
                    : 'No workout logged'}
              </Text>
            </Pressable>
          </View>

          {/* Water */}
          <WaterCard
            key={selectedDate}
            colors={colors}
            selectedDate={selectedDate}
            historicalWater={selectedDay.waterGlasses}
          />

          {/* Supplements — daily check-off, sits alongside water as a habit card */}
          <SupplementsCard colors={colors} selectedDate={selectedDate} />
        </ScrollView>

        {/* Scan actions — a solid footer in normal flow, so it can never cover the list. */}
        <View style={[styles.bottomBar, fontScale >= 1.8 && styles.bottomBarLargeText, { backgroundColor: colors.background }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan a meal"
            style={({ pressed }) => [
              styles.scanButton,
              fontScale >= 1.8 && styles.bottomActionLargeText,
              { backgroundColor: pressed ? Brand.greenDark : Brand.green },
            ]}
            onPress={() => {
              setSelectedDate(today);
              router.push('/scan');
            }}>
            <CameraIcon size={22} color="#ffffff" />
            <Text maxFontSizeMultiplier={2} style={styles.scanButtonText}>Scan a meal</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan a barcode"
            style={({ pressed }) => [
              styles.barcodeButton,
              fontScale >= 1.8 && styles.bottomActionLargeText,
              { backgroundColor: colors.greenTint, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => {
              setSelectedDate(today);
              router.push('/barcode');
            }}>
            <BarcodeIcon size={22} color={colors.accentStrong} />
            <Text maxFontSizeMultiplier={2} style={[styles.barcodeButtonText, { color: colors.accentStrong }]}>Barcode</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  scroll: { paddingBottom: Spacing.four, gap: Spacing.three },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  todayLabel: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  streakText: { fontSize: 14, fontWeight: '700' },

  /* Date ribbon */
  /* Coaching nudge */
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipInfo: { flex: 1, gap: 2 },
  tipTitle: { fontSize: 15, fontWeight: '700' },
  tipBody: { fontSize: 13, lineHeight: 19 },

  /* Goal + macro rings */
  macroCard: { borderRadius: 24, padding: Spacing.four, gap: Spacing.three },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalText: { fontSize: 15, fontWeight: '700' },
  goalChevron: { fontSize: 16, fontWeight: '600' },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between' },
  miniRowLargeText: { flexWrap: 'wrap', rowGap: Spacing.three },
  miniWrap: { alignItems: 'center', gap: 2, flex: 1 },
  miniWrapLargeText: { flexBasis: '45%' },
  miniRing: { alignItems: 'center', justifyContent: 'center' },
  miniCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniValue: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  miniSub: { fontSize: 10, lineHeight: 14, marginTop: 4 },
  miniLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 1 },
  overNote: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  leftNote: { fontSize: 13, textAlign: 'center' },

  bodyActivityCard: { minHeight: 132, borderRadius: 20, padding: Spacing.two, flexDirection: 'row', alignItems: 'stretch' },
  bodyActivityCardLargeText: { flexDirection: 'column' },
  bodyActivityItem: { flex: 1, borderRadius: 14, padding: Spacing.two, justifyContent: 'space-between', gap: 6 },
  bodyActivityHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bodyActivityIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bodyActivityLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  bodyActivityValue: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  bodyActivityMeta: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  bodyActivityDivider: { width: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
  bodyActivityDividerLargeText: { width: '100%', height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
  bodyAnalysisCard: {
    minHeight: 82,
    borderRadius: 16,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  bodyAnalysisText: { flex: 1, gap: Spacing.one },
  bodyAnalysisTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
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
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: { color: '#ffffff', fontSize: 15, fontWeight: '800', lineHeight: 17 },

  sectionTitle: { fontSize: 19, fontFamily: Type.display, fontWeight: '700' },
  mealsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickAddPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  quickAddText: { fontSize: 13, fontWeight: '700' },
  mealsList: { gap: Spacing.two },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  mealInfo: { flex: 1 },
  mealTitle: { fontSize: 15, fontWeight: '700' },
  mealMeta: { fontSize: 12, marginTop: 2 },
  mealCals: { fontSize: 16, fontWeight: '800' },
  chevron: { fontSize: 20, fontWeight: '600', marginLeft: 2 },

  loadErrorWrap: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  loadErrorTitle: { fontSize: 20, fontFamily: Type.display, fontWeight: '700' },
  loadErrorBody: { fontSize: 14, textAlign: 'center' },
  retryBtn: {
    marginTop: Spacing.two,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    alignItems: 'center',
  },
  retryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  bottomBar: {
    flexDirection: 'row',
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  bottomBarLargeText: { flexDirection: 'column' },
  bottomActionLargeText: { flex: 0, width: '100%' },
  scanButton: {
    flex: 1.8,
    borderRadius: 999,
    minHeight: 56,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  scanButtonText: { color: '#ffffff', fontSize: 17, lineHeight: 23, fontWeight: '700' },
  barcodeButton: {
    flex: 1,
    borderRadius: 999,
    minHeight: 56,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  barcodeButtonText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
});
