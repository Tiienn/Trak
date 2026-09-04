import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarIcon, CheckIcon, ChevronRightIcon, DumbbellIcon, SparklesIcon } from '@/components/icons';
import { DateStrip, type DateStripItem } from '@/components/date-strip';
import { RingMark, TrakWordmark } from '@/components/logo';
import { ProfileAvatarButton } from '@/components/profile-avatar-button';
import { ProgressOverview } from '@/components/progress-overview';
import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import type { BodyAnalysisPreferences, BodyScan } from '@/lib/body-analysis';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { useExerciseResponsePreferences } from '@/lib/exercise-response-preferences';
import { useFatLossPreferences } from '@/lib/fat-loss-preferences';
import { cardioTargetForSettings, preferredCardioCatalogIds } from '@/lib/fat-loss-settings';
import { useMuscleScorePreferences } from '@/lib/muscle-score-preferences';
import { BODY_ANALYSIS_RECHECK_DAYS, bodyAnalysisDueAt, scheduleBodyAnalysisRecheck } from '@/lib/reminders';
import { dayKey, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { ALL_MUSCLE_GROUPS } from '@/lib/training-catalog';
import { useTrainingPlan, type TrainingPlanItem } from '@/lib/training-plan';
import { muscleScores, plannedTrainingCompletionDays, trainingDayKeys, weeklyActivitySummary, WEEKLY_SET_TARGET } from '@/lib/training-progress';
import type { Goal, MuscleSetCounts, WorkoutSplit } from '@/lib/types';
import { recommendWorkout, workoutCatalogIdForName } from '@/lib/workout-catalog';
import { useWorkoutCoachPreferences } from '@/lib/workout-coach-preferences';
import { equipmentForWorkoutSettings, nextRoutineSession } from '@/lib/workout-coach-settings';
import { useWorkoutFocusPreferences } from '@/lib/workout-focus-preferences';
import { workoutFocusWeek } from '@/lib/workout-focus-settings';

type ProgressView = 'overview' | 'workouts' | 'challenges' | 'analysis';
const PROGRESS_VIEWS: { key: ProgressView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'analysis', label: 'Body Analysis' },
];
type ProgressDate = DateStripItem;

function localDateFromKey(value: string): Date {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

function progressTimelineDates(today = new Date()): ProgressDate[] {
  const anchor = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  return Array.from({ length: 366 }, (_, index) => {
    const offset = index - 364;
    const date = new Date(anchor);
    date.setDate(anchor.getDate() + offset);
    return { date, key: dayKey(date), weekday: date.toLocaleDateString([], { weekday: 'short' }), day: date.getDate(), isFuture: offset > 0 };
  });
}

function ProgressDateStrip({ colors, today, selectedDate, onSelectDate }: { colors: ThemeColors; today: string; selectedDate: string; onSelectDate: (date: string) => void }) {
  const dates = useMemo(() => progressTimelineDates(localDateFromKey(today)), [today]);
  return (
    <DateStrip
      accessibilityLabel="Progress dates"
      colors={colors}
      dates={dates}
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      style={styles.dateStrip}
    />
  );
}

const STARTER_PLAN_TITLES: Record<Goal, string> = {
  lose: 'Strength + cardio starter',
  maintain: 'Balanced full-body training',
  gain: 'Build a strong foundation',
};

function Workouts({ colors, latestScan, preferences, selectedDate }: {
  colors: ThemeColors;
  latestScan: BodyScan | null;
  preferences: BodyAnalysisPreferences | null;
  selectedDate: string;
}) {
  const { exercises, profile } = useMeals();
  const coach = useWorkoutCoachPreferences();
  const workoutFocus = useWorkoutFocusPreferences();
  const exerciseFeedback = useExerciseResponsePreferences();
  const fatLoss = useFatLossPreferences();
  const goal = profile?.goal ?? 'maintain';
  const recentScores = useMemo(() => muscleScores(exercises, selectedDate), [exercises, selectedDate]);
  const effectiveSettings = useMemo(() => coach.settings.configured
    ? coach.settings
    : preferences
      ? {
        configured: true,
        trainingLocation: preferences.trainingLocation,
        experience: preferences.experience,
        daysPerWeek: preferences.daysAvailable,
        sessionMinutes: 45,
        routine: 'coach' as const,
        equipment: preferences.equipment,
        limitationsNote: preferences.limitationsNote ?? '',
      }
      : null, [coach.settings, preferences]);
  const routineSession = useMemo(() => nextRoutineSession(effectiveSettings?.routine ?? 'coach', exercises.filter((entry) => entry.date <= selectedDate)), [effectiveSettings?.routine, exercises, selectedDate]);
  const activityWeek = useMemo(() => weeklyActivitySummary(exercises, selectedDate), [exercises, selectedDate]);
  const focusWeek = workoutFocusWeek(workoutFocus.settings, localDateFromKey(selectedDate));
  const focusMuscle = workoutFocus.settings.priorityMuscle;
  const focusActive = focusMuscle != null && focusWeek != null && focusWeek <= 6;
  const starterRecommendations = useMemo(() => {
    if (!effectiveSettings) return [];
    const attention = recentScores
      .filter((muscle) => muscle.sets < WEEKLY_SET_TARGET)
      .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
    const recentDays = new Set(trainingDayKeys(selectedDate));
    const recentLegDays = new Set(trainingDayKeys(selectedDate, 2));
    const recentExerciseIds = exercises
      .filter((entry) => recentDays.has(entry.date))
      .sort((a, b) => b.createdAt - a.createdAt)
      .flatMap((entry) => { const id = workoutCatalogIdForName(entry.name); return id ? [id] : []; });
    const analysisExerciseIds = latestScan?.result.training.exercises.flatMap((entry) => { const id = workoutCatalogIdForName(entry.name); return id ? [id] : []; }) ?? [];
    const recentHardLegTraining = exercises.some((entry) => recentLegDays.has(entry.date) && ((entry.muscleSets?.legs ?? 0) + (entry.muscleSets?.glutes ?? 0) >= 3));
    return recommendWorkout({
      goal,
      experience: effectiveSettings.experience,
      location: effectiveSettings.trainingLocation,
      equipment: equipmentForWorkoutSettings(effectiveSettings),
      availableMinutes: effectiveSettings.sessionMinutes,
      recentMuscleSets: Object.fromEntries(recentScores.map((muscle) => [muscle.key, muscle.sets])),
      musclesNeedingAttention: attention.length > 0 ? attention.map((muscle) => muscle.key) : ALL_MUSCLE_GROUPS,
      limitations: effectiveSettings.limitationsNote ? [effectiveSettings.limitationsNote] : [],
      exerciseResponses: exerciseFeedback.settings.responses,
      recentExerciseIds,
      targetMuscles: routineSession.targetMuscles,
      analysisExerciseIds,
      priorityMuscle: focusActive ? focusMuscle : null,
      ...(focusActive ? { specialization: { muscle: focusMuscle, baselineWeeklySets: workoutFocus.settings.baselineWeeklySets, weekOfBlock: focusWeek, additionalSetTarget: effectiveSettings.experience === 'advanced' ? 3 as const : 2 as const } } : {}),
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
  }, [activityWeek.cardioEquivalentMinutes, activityWeek.cardioSessions, activityWeek.vigorousCardioSessions, effectiveSettings, exerciseFeedback.settings.responses, exercises, fatLoss.settings, focusActive, focusMuscle, focusWeek, goal, latestScan, recentScores, routineSession, selectedDate, workoutFocus.settings.baselineWeeklySets]);
  const training = latestScan?.result.training;
  if (!effectiveSettings) {
    return (
      <View style={styles.viewContent}>
        <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.greenTint }]}><DumbbellIcon size={28} color={colors.accent} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Set up your workouts</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>Choose your gym or home setup, experience, time, and preferred routine. No Body Analysis or photos required.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Set up workouts without photos" onPress={() => router.push('/workout-setup')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Set up without photos</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/body-analysis')} style={[styles.optionalAnalysis, { backgroundColor: colors.backgroundElement }]}>
          <SparklesIcon size={20} color={colors.accent} /><View style={styles.optionalAnalysisCopy}><Text style={[styles.optionalAnalysisTitle, { color: colors.text }]}>Optional Body Analysis</Text><Text style={[styles.optionalAnalysisBody, { color: colors.textSecondary }]}>Add a private visual check-in if you want another coaching signal.</Text></View><ChevronRightIcon size={17} color={colors.textSecondary} />
        </Pressable>
      </View>
    );
  }
  const planTitle = training?.weeklyFocus ?? STARTER_PLAN_TITLES[goal];
  const daysPerWeek = effectiveSettings.daysPerWeek;
  const planExercises = starterRecommendations.map((recommendation) => ({
      name: recommendation.exercise.name,
      prescription: recommendation.exercise.activityType === 'cardio'
        ? `${recommendation.recommendedDurationMinutes ?? recommendation.exercise.cardio!.durationMinutes[0]} min · ${recommendation.cardioIntensity ?? recommendation.exercise.cardio!.intensity}`
        : `${recommendation.recommendedSets ?? recommendation.exercise.strength!.sets} × ${recommendation.exercise.strength!.reps}`,
      equipment: recommendation.equipment,
      reason: recommendation.reason,
    }));
  return (
    <View style={styles.viewContent}>
      <View style={[styles.planCard, { backgroundColor: colors.greenTint }]}>
        <View style={styles.planHeading}><View style={[styles.planIcon, { backgroundColor: colors.backgroundElement }]}><DumbbellIcon size={24} color={colors.accent} /></View><Text style={[styles.planEyebrow, { color: colors.accentStrong }]}>{training ? 'YOUR TRAINING FOCUS' : 'STARTER PLAN'}</Text></View>
        <Text style={[styles.planTitle, { color: colors.text }]}>{planTitle}</Text>
        <Text style={[styles.planMeta, { color: colors.textSecondary }]}>{routineSession.label} · {daysPerWeek} days/week · {effectiveSettings.sessionMinutes} min</Text>
        <Text style={[styles.planMeta, { color: colors.textSecondary }]}>{training ? 'Body Analysis + ' : ''}{effectiveSettings.trainingLocation} setup · {effectiveSettings.experience} · recent training and recovery</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/workout-setup')} style={[styles.optionalAnalysis, { backgroundColor: colors.backgroundElement }]}>
        <DumbbellIcon size={20} color={colors.accent} /><View style={styles.optionalAnalysisCopy}><Text style={[styles.optionalAnalysisTitle, { color: colors.text }]}>Workout setup</Text><Text style={[styles.optionalAnalysisBody, { color: colors.textSecondary }]}>Change routine, time, location, experience, or equipment.</Text></View><ChevronRightIcon size={17} color={colors.textSecondary} />
      </Pressable>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended exercises</Text>
        {planExercises.map((exercise, index) => (
          <View key={`${exercise.name}-${index}`} style={[styles.exerciseCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.exerciseHeading}><Text style={[styles.exerciseTitle, { color: colors.text }]}>{exercise.name}</Text><View style={[styles.prescription, { backgroundColor: colors.greenTint }]}><Text style={[styles.prescriptionText, { color: colors.accentStrong }]}>{exercise.prescription}</Text></View></View>
            {exercise.equipment ? <Text style={[styles.equipment, { color: colors.accent }]}>{exercise.equipment}</Text> : null}
            <Text style={[styles.exerciseReason, { color: colors.textSecondary }]}>{exercise.reason}</Text>
          </View>
        ))}
      </View>
      {!training ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/body-analysis')} style={[styles.optionalAnalysis, { backgroundColor: colors.backgroundElement }]}>
          <SparklesIcon size={20} color={colors.accent} />
          <View style={styles.optionalAnalysisCopy}>
            <Text style={[styles.optionalAnalysisTitle, { color: colors.text }]}>Refine with Body Analysis</Text>
            <Text style={[styles.optionalAnalysisBody, { color: colors.textSecondary }]}>Optional · use a visual check-in to personalise your focus.</Text>
          </View>
          <ChevronRightIcon size={17} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => router.push('/exercise')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Log a workout</Text></Pressable>
    </View>
  );
}

function ChallengeCard({ title, body, value, target, unit, colors }: { title: string; body: string; value: number; target: number; unit: string; colors: ThemeColors }) {
  const complete = value >= target;
  const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((value / target) * 100))) : 0;
  return (
    <View style={[styles.challengeCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.challengeHeading}>
        <View style={styles.challengeCopy}><Text style={[styles.challengeTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.challengeBody, { color: colors.textSecondary }]}>{body}</Text></View>
        <Text style={[styles.challengeCount, { color: complete ? colors.accent : colors.text }]}>{Math.min(value, target)}/{target}</Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={title}
        accessibilityValue={{ min: 0, max: target, now: Math.min(value, target), text: complete ? 'Complete' : `${Math.max(0, target - value)} ${unit} remaining` }}
        style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}>
        <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: colors.accent }]} />
      </View>
      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{complete ? 'Complete' : `${Math.max(0, target - value)} ${unit} to go`}</Text>
    </View>
  );
}

type PlannedChallenge = {
  id: string;
  name: string;
  weeklyTarget: number;
  prescription: string;
  durationMinutes: number;
  calories: number;
  splits: WorkoutSplit[];
  muscleSets: MuscleSetCounts;
  cardioIntensity: TrainingPlanItem['cardioIntensity'];
};

function emptyMuscleSets(): MuscleSetCounts {
  return { chest: 0, legs: 0, back: 0, arms: 0, shoulders: 0, abs: 0, glutes: 0, other: 0 };
}

function durationLabel(totalMinutes: number): string {
  const minutes = Math.max(1, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function plannedChallenge(item: TrainingPlanItem): PlannedChallenge {
  const muscleSets = emptyMuscleSets();
  if (item.activityType === 'strength' && item.muscleGroup) muscleSets[item.muscleGroup] = item.sets;
  const durationMinutes = item.activityType === 'cardio'
    ? Math.max(1, item.durationTargetMinutes ?? 30)
    : Math.max(5, item.sets * 3);
  return {
    id: item.id,
    name: item.name,
    weeklyTarget: item.weeklyTarget,
    prescription: item.activityType === 'cardio'
      ? `${durationLabel(durationMinutes)} · ${item.cardioIntensity ?? 'moderate'}${item.calorieTarget ? ` · ${item.calorieTarget} kcal` : ''}`
      : `${item.sets} sets · ${item.reps} reps${item.loadValue == null ? '' : ` · ${item.loadValue} ${item.loadUnit}`}`,
    durationMinutes,
    calories: item.activityType === 'cardio' ? Math.max(0, item.calorieTarget ?? 0) : 0,
    splits: item.activityType === 'cardio' ? ['cardio'] : item.muscleGroup ? [item.muscleGroup] : [],
    muscleSets,
    cardioIntensity: item.activityType === 'cardio' ? item.cardioIntensity : null,
  };
}

function PlannedTrainingChallenges({ colors, selectedDate }: { colors: ThemeColors; selectedDate: string }) {
  const { loaded, items } = useTrainingPlan();
  const { exercises, addExercise } = useMeals();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const canComplete = selectedDate === dayKey();
  const planned = items.map(plannedChallenge);

  function completionDays(item: PlannedChallenge): Set<string> {
    return new Set(plannedTrainingCompletionDays(exercises, selectedDate, item.id, item.name));
  }

  async function markComplete(item: PlannedChallenge) {
    const days = completionDays(item);
    if (!canComplete || completingId || days.has(dayKey()) || days.size >= item.weeklyTarget) return;
    setCompletingId(item.id);
    try {
      await addExercise(item.name, item.calories, item.durationMinutes, {
        workoutSplits: item.splits,
        muscleSets: item.muscleSets,
        cardioIntensity: item.cardioIntensity,
        trainingPlanItemId: item.id,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Not completed', error?.message ?? 'Please try again.');
    } finally {
      setCompletingId(null);
    }
  }

  function confirmComplete(item: PlannedChallenge) {
    const days = completionDays(item);
    if (!canComplete || days.has(dayKey()) || days.size >= item.weeklyTarget) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const completedSets = Object.values(item.muscleSets).reduce((sum, sets) => sum + sets, 0);
    Alert.alert(
      'Mark training complete?',
      `${item.name} will be added to today’s workout log and update Workout Time${completedSets > 0 ? ' and Weekly Muscle Score' : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark complete', onPress: () => { void markComplete(item); } },
      ]
    );
  }

  return (
    <View style={styles.challengeSection}>
      <View style={styles.challengeSectionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Planned training</Text>
          <Text style={[styles.challengeSectionBody, { color: colors.textSecondary }]}>Complete each target on separate training days.</Text>
        </View>
      </View>
      {!loaded ? (
        <View style={[styles.plannedEmpty, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.challengeBody, { color: colors.textSecondary }]}>Loading planned training…</Text>
        </View>
      ) : planned.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/training-plan' as never)}
          style={[styles.plannedEmpty, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.challengeIcon, { backgroundColor: colors.greenTint }]}><DumbbellIcon size={22} color={colors.accent} /></View>
          <View style={styles.challengeCopy}>
            <Text style={[styles.challengeTitle, { color: colors.text }]}>Add your training</Text>
            <Text style={[styles.challengeBody, { color: colors.textSecondary }]}>Your exercises, sets, reps, loads, and cardio targets will appear here.</Text>
          </View>
          <ChevronRightIcon size={18} color={colors.textSecondary} />
        </Pressable>
      ) : (
        <View style={[styles.plannedCard, { backgroundColor: colors.backgroundElement }]}>
          {planned.map((item, index) => {
            const days = completionDays(item);
            const completionCount = Math.min(days.size, item.weeklyTarget);
            const complete = completionCount >= item.weeklyTarget;
            const completedToday = days.has(dayKey());
            const progress = `${Math.round((completionCount / item.weeklyTarget) * 100)}%` as `${number}%`;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${completionCount} of ${item.weeklyTarget} sessions complete${complete ? '' : ', hold to mark today complete'}`}
                accessibilityHint={!canComplete ? 'Open today to complete this training' : completedToday ? 'Already completed today' : complete ? 'Weekly target complete' : 'Use the Mark complete action after finishing this training'}
                accessibilityState={{ disabled: !canComplete || complete || completedToday }}
                accessibilityActions={!canComplete || complete || completedToday ? [] : [{ name: 'activate', label: 'Mark complete' }]}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === 'activate') confirmComplete(item);
                }}
                delayLongPress={450}
                disabled={!canComplete || complete || completedToday || completingId != null}
                onLongPress={() => confirmComplete(item)}
                style={({ pressed }) => [
                  styles.plannedRow,
                  index > 0 && { borderTopColor: colors.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth },
                  complete && { backgroundColor: colors.greenTint },
                  pressed && { opacity: 0.72 },
                ]}>
                <View style={styles.plannedCopy}>
                  <Text style={[styles.plannedName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.plannedPrescription, { color: colors.accentStrong }]}>{item.prescription}</Text>
                  <View style={styles.plannedProgressRow}>
                    <View
                      accessible={false}
                      style={[styles.plannedProgressTrack, { backgroundColor: colors.backgroundSelected }]}>
                      <View style={[styles.plannedProgressFill, { width: progress, backgroundColor: colors.accent }]} />
                    </View>
                    <Text style={[styles.plannedCount, { color: complete ? colors.accent : colors.text }]}>{completionCount}/{item.weeklyTarget}</Text>
                  </View>
                  {!complete ? (
                    <Text style={[styles.plannedHint, { color: colors.textSecondary }]}>
                      {!canComplete ? 'Open today to complete' : completedToday ? 'Completed today · continue another day' : 'Hold to mark today complete'}
                    </Text>
                  ) : null}
                </View>
                {complete ? <View style={styles.plannedComplete}><CheckIcon size={14} color="#ffffff" /></View> : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Challenges({ colors, latestScan, selectedDate }: { colors: ThemeColors; latestScan: BodyScan | null; selectedDate: string }) {
  const { exercises, profile } = useMeals();
  const coach = useWorkoutCoachPreferences();
  const workoutFocus = useWorkoutFocusPreferences();
  const { settings: muscleSettings } = useMuscleScorePreferences();
  const week = new Set(trainingDayKeys(selectedDate));
  const workoutDays = new Set(exercises.filter((exercise) => week.has(exercise.date)).map((exercise) => exercise.date)).size;
  const workoutTarget = coach.settings.configured ? coach.settings.daysPerWeek : latestScan?.result.training.daysPerWeek ?? 3;
  const goal = profile?.goal ?? 'maintain';
  const scores = useMemo(() => muscleScores(exercises, selectedDate, WEEKLY_SET_TARGET, muscleSettings), [exercises, muscleSettings, selectedDate]);
  const focusWeek = workoutFocusWeek(workoutFocus.settings, localDateFromKey(selectedDate));
  const focusMuscle = workoutFocus.settings.priorityMuscle;
  const focusActive = focusMuscle != null && focusWeek != null && focusWeek <= 6;
  const focusScore = focusActive ? scores.find((score) => score.key === focusMuscle) : null;
  const weekMessage = goal === 'lose'
    ? 'Cardio comes first. Complete the sessions you planned.'
    : goal === 'gain'
      ? focusScore
        ? `Build ${focusScore.label.toLowerCase()} volume and complete your planned training.`
        : 'Build balanced weekly volume and complete your planned training.'
      : 'Keep training balanced and complete the sessions you planned.';
  return (
    <View style={styles.viewContent}>
      <View style={[styles.weekCard, { backgroundColor: colors.greenTint }]}><View style={[styles.weekIcon, { backgroundColor: colors.backgroundElement }]}><CalendarIcon size={24} color={colors.accent} /></View><View style={styles.weekCopy}><Text style={[styles.weekTitle, { color: colors.text }]}>This week</Text><Text style={[styles.weekBody, { color: colors.textSecondary }]}>{weekMessage}</Text></View></View>
      {goal !== 'lose' && focusScore ? <ChallengeCard title={`${focusScore.label} target`} body={`Build ${focusScore.label.toLowerCase()} with completed working sets.`} value={focusScore.sets} target={WEEKLY_SET_TARGET} unit={WEEKLY_SET_TARGET - focusScore.sets === 1 ? 'set' : 'sets'} colors={colors} /> : null}
      {goal !== 'lose' && !focusScore ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/training-focus')} style={[styles.plannedEmpty, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.challengeIcon, { backgroundColor: colors.greenTint }]}><DumbbellIcon size={22} color={colors.accent} /></View>
          <View style={styles.challengeCopy}><Text style={[styles.challengeTitle, { color: colors.text }]}>Choose a muscle focus</Text><Text style={[styles.challengeBody, { color: colors.textSecondary }]}>Put one weekly 12-set target at the top of your challenges.</Text></View>
          <ChevronRightIcon size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      <PlannedTrainingChallenges colors={colors} selectedDate={selectedDate} />
      {goal === 'lose' && focusScore ? <ChallengeCard title={`${focusScore.label} target`} body={`Keep your ${focusScore.label.toLowerCase()} focus alongside cardio.`} value={focusScore.sets} target={WEEKLY_SET_TARGET} unit={WEEKLY_SET_TARGET - focusScore.sets === 1 ? 'set' : 'sets'} colors={colors} /> : null}
      <ChallengeCard title="Training consistency" body="Your Workout Setup target, counted across the last 7 days." value={workoutDays} target={workoutTarget} unit={workoutTarget - workoutDays === 1 ? 'day' : 'days'} colors={colors} />
    </View>
  );
}

function BodyAnalysisView({ colors, latestScan, available }: { colors: ThemeColors; latestScan: BodyScan | null; available: boolean }) {
  const [reminderEnabled, setReminderEnabled] = useState<boolean | null>(null);
  const [openedAt] = useState(() => Date.now());
  useEffect(() => {
    if (!latestScan) return;
    scheduleBodyAnalysisRecheck(latestScan.id, latestScan.createdAt, false)
      .then(setReminderEnabled)
      .catch(() => setReminderEnabled(false));
  }, [latestScan]);

  if (!latestScan) {
    return (
      <View style={styles.viewContent}>
        <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.greenTint }]}><SparklesIcon size={28} color={colors.accent} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Start with Body Analysis</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{available ? 'Complete a private visual check-in, then Trak will remind you to check your progress again in 28 days.' : 'Finish enabling Body Analysis to start private visual check-ins.'}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/body-analysis')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{available ? 'Get started' : 'Try again'}</Text></Pressable>
        </View>
      </View>
    );
  }

  const dueAt = bodyAnalysisDueAt(latestScan.createdAt);
  const daysLeft = Math.max(0, Math.ceil((dueAt - openedAt) / 86_400_000));
  const dueLabel = new Date(dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

  async function enableReminder() {
    const enabled = await scheduleBodyAnalysisRecheck(latestScan!.id, latestScan!.createdAt, true).catch(() => false);
    setReminderEnabled(enabled);
  }

  return (
    <View style={styles.viewContent}>
      <View style={[styles.analysisSummaryCard, { backgroundColor: colors.greenTint }]}>
        <View style={styles.planHeading}><View style={[styles.planIcon, { backgroundColor: colors.backgroundElement }]}><SparklesIcon size={24} color={colors.accent} /></View><Text style={[styles.planEyebrow, { color: colors.accentStrong }]}>BODY ANALYSIS</Text></View>
        <Text style={[styles.planTitle, { color: colors.text }]}>Your latest check-in</Text>
        <Text style={[styles.analysisSummary, { color: colors.textSecondary }]}>{latestScan.result.summary}</Text>
        <View style={[styles.reminderCard, { backgroundColor: colors.backgroundElement }]}>
          <CalendarIcon size={21} color={colors.accent} />
          <View style={styles.challengeCopy}>
            <Text style={[styles.reminderTitle, { color: colors.text }]}>{daysLeft > 0 ? `Next check-in in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Your next check-in is ready'}</Text>
            <Text style={[styles.reminderBody, { color: colors.textSecondary }]}>28-day check-in · {dueLabel}</Text>
          </View>
          {reminderEnabled ? <View style={styles.reminderCheck}><CheckIcon size={14} color="#ffffff" /></View> : null}
        </View>
        {reminderEnabled === false ? <Pressable accessibilityRole="button" onPress={() => { void enableReminder(); }} style={[styles.reminderButton, { backgroundColor: colors.backgroundElement }]}><Text style={[styles.reminderButtonText, { color: colors.accentStrong }]}>Enable 28-day reminder</Text></Pressable> : null}
        <Pressable accessibilityRole="button" onPress={() => router.push('/body-analysis')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{daysLeft === 0 ? 'New check-in' : 'View Body Analysis'}</Text></Pressable>
      </View>
      <Text style={[styles.analysisFootnote, { color: colors.textSecondary }]}>Trak schedules one private device notification {BODY_ANALYSIS_RECHECK_DAYS} days after each completed analysis. A new check-in replaces the previous reminder.</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.3;
  const [activeView, setActiveView] = useState<ProgressView>('overview');
  const { today } = useMeals();
  // null follows the live day across midnight; explicitly selected history stays put.
  const [dateSelection, setDateSelection] = useState<string | null>(null);
  const selectedDate = dateSelection ?? today;
  const { scans, available, preferences } = useBodyAnalysis();
  const scansThroughSelected = scans.filter((scan) => dayKey(new Date(scan.createdAt)) <= selectedDate);
  const latestScan = scansThroughSelected[0] ?? null;
  const currentLatestScan = scans[0] ?? null;
  return (
    <View testID="screen-progress" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><View style={styles.logoRow}><RingMark size={30} /><TrakWordmark color={colors.text} size={28} /></View><ProfileAvatarButton colors={colors} /></View>
        <ProgressDateStrip colors={colors} today={today} selectedDate={selectedDate} onSelectDate={(date) => setDateSelection(date === today ? null : date)} />
        <View style={[styles.segmentWrap, largeText && styles.segmentWrapLarge, { backgroundColor: colors.backgroundElement }]} accessibilityRole="tablist" accessibilityLabel="Progress sections">
          {PROGRESS_VIEWS.map((view) => {
            const selected = view.key === activeView;
            return <Pressable key={view.key} accessibilityRole="tab" accessibilityLabel={view.label} accessibilityState={{ selected }} onPress={() => setActiveView(view.key)} style={({ pressed }) => [styles.segment, largeText && styles.segmentLarge, selected && { backgroundColor: colors.background }, pressed && { opacity: 0.7 }]}><Text style={[styles.segmentText, { color: selected ? colors.text : colors.textSecondary }]}>{view.label}</Text></Pressable>;
          })}
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {activeView === 'overview'
            ? <ProgressOverview colors={colors} selectedDate={selectedDate} latestScan={latestScan} preferences={preferences} />
            : activeView === 'workouts'
              ? <Workouts colors={colors} latestScan={latestScan} preferences={preferences} selectedDate={selectedDate} />
              : activeView === 'challenges'
                ? <Challenges colors={colors} latestScan={latestScan} selectedDate={selectedDate} />
                : <BodyAnalysisView colors={colors} latestScan={currentLatestScan} available={available} />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safe: { flex: 1, paddingHorizontal: Spacing.four }, header: { paddingTop: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dateStrip: { marginTop: Spacing.three },
  segmentWrap: { width: '100%', flexDirection: 'row', alignSelf: 'center', borderRadius: 999, padding: 3, gap: 2, marginTop: Spacing.two }, segment: { flex: 1, minWidth: 0, paddingVertical: 8, paddingHorizontal: 3, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentWrapLarge: { flexWrap: 'wrap', borderRadius: 24, alignItems: 'stretch' },
  segmentLarge: { flexGrow: 1, flexBasis: '45%' },
  // Let Dynamic Type wrap instead of shrinking labels below the user's chosen size.
  segmentText: { width: '100%', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  scroll: { paddingTop: Spacing.four, paddingBottom: 110 }, viewContent: { gap: Spacing.four }, section: { gap: Spacing.three }, sectionTitle: { fontFamily: Type.display, fontSize: 21, lineHeight: 26, fontWeight: '700' },
  emptyCard: { borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: Spacing.three }, emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontFamily: Type.display, fontSize: 21, lineHeight: 26, fontWeight: '700', textAlign: 'center' }, emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' }, primaryButton: { minHeight: 50, width: '100%', borderRadius: 16, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three }, primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  planCard: { borderRadius: 24, padding: Spacing.four, gap: Spacing.three }, planHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, planIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, planEyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1 }, planTitle: { fontFamily: Type.display, fontSize: 24, lineHeight: 30, fontWeight: '700' }, planMeta: { fontSize: 13, lineHeight: 19 },
  exerciseCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.two }, exerciseHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }, exerciseTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '800' }, prescription: { borderRadius: 10, paddingVertical: Spacing.one, paddingHorizontal: Spacing.two }, prescriptionText: { fontSize: 12, lineHeight: 17, fontWeight: '800' }, equipment: { fontSize: 12, lineHeight: 17, fontWeight: '700' }, exerciseReason: { fontSize: 13, lineHeight: 19 },
  optionalAnalysis: { minHeight: 72, borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, optionalAnalysisCopy: { flex: 1, gap: 2 }, optionalAnalysisTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' }, optionalAnalysisBody: { fontSize: 12, lineHeight: 17 },
  weekCard: { borderRadius: 20, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, weekIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, weekCopy: { flex: 1, gap: Spacing.one }, weekTitle: { fontFamily: Type.display, fontSize: 20, lineHeight: 25, fontWeight: '700' }, weekBody: { fontSize: 13, lineHeight: 18 },
  analysisSummaryCard: { borderRadius: 24, padding: Spacing.four, gap: Spacing.three }, analysisSummary: { fontSize: 14, lineHeight: 21 }, reminderCard: { minHeight: 72, borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, reminderTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' }, reminderBody: { marginTop: 2, fontSize: 12, lineHeight: 17 }, reminderCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' }, reminderButton: { minHeight: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, reminderButtonText: { fontSize: 14, fontWeight: '800' }, analysisFootnote: { paddingHorizontal: Spacing.two, fontSize: 12, lineHeight: 18 },
  challengeCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three }, challengeHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three }, challengeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, challengeCopy: { flex: 1, gap: 2 }, challengeTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' }, challengeBody: { fontSize: 13, lineHeight: 18 }, challengeCount: { fontSize: 14, lineHeight: 20, fontWeight: '900' }, progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: Brand.green }, progressLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
  challengeSection: { gap: Spacing.three }, challengeSectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three }, challengeSectionBody: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  plannedEmpty: { minHeight: 88, borderRadius: 20, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  plannedCard: { borderRadius: 20, overflow: 'hidden' }, plannedRow: { minHeight: 108, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, plannedCopy: { flex: 1, gap: 3 }, plannedName: { fontSize: 15, lineHeight: 20, fontWeight: '800' }, plannedPrescription: { fontSize: 13, lineHeight: 18, fontWeight: '800' }, plannedProgressRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, plannedProgressTrack: { height: 6, flex: 1, borderRadius: 999, overflow: 'hidden' }, plannedProgressFill: { height: '100%', borderRadius: 999, backgroundColor: Brand.green }, plannedCount: { minWidth: 28, textAlign: 'right', fontSize: 12, lineHeight: 16, fontWeight: '800' }, plannedHint: { marginTop: 2, fontSize: 11, lineHeight: 16 }, plannedComplete: { width: 26, height: 26, borderRadius: 13, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
});
