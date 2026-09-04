import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useAppScheme, useThemeMode, type ThemeMode } from '@/lib/theme';
import { useAuth } from '@/lib/auth';
import {
  disableHealthSync,
  enableHealthSync,
  healthAvailable,
  healthSyncEnabled,
  openHealthSettings,
} from '@/lib/health';
import { useSubscription } from '@/lib/purchases';
import { dayKey, useMeals } from '@/lib/store';
import { useMuscleScorePreferences } from '@/lib/muscle-score-preferences';
import { muscleScoreScheduleLabel, RESET_WEEKDAYS, type MuscleScoreSettings } from '@/lib/muscle-score-settings';
import { CheckIcon } from '@/components/icons';
import { muscleLabel } from '@/lib/training-catalog';
import { useWorkoutFocusPreferences } from '@/lib/workout-focus-preferences';
import { workoutFocusWeek } from '@/lib/workout-focus-settings';
import { useWorkoutCoachPreferences } from '@/lib/workout-coach-preferences';
import { WORKOUT_ROUTINES } from '@/lib/workout-coach-settings';

type HealthState = 'hidden' | 'off' | 'on';

/** Summary of the user's body-stat profile, tap to view/edit. */
function ProfileCard({ colors }: { colors: ThemeColors }) {
  const { profile, targets } = useMeals();
  if (!profile) return null;
  const activityLabel: Record<string, string> = {
    sedentary: 'Sedentary',
    light: 'Lightly active',
    moderate: 'Moderately active',
    active: 'Very active',
    very_active: 'Extra active',
  };
  const goalLabel: Record<string, string> = {
    lose: 'Losing weight',
    maintain: 'Maintaining',
    gain: 'Gaining muscle',
  };
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/profile')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Your profile</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          {goalLabel[profile.goal]} · {Math.round(profile.weightKg)}kg ·{' '}
          {activityLabel[profile.activity]} · {targets.calories.toLocaleString()} kcal target
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Personal summaries stay in Profile; Progress is reserved for Body Analysis. */
function InsightsCard({ colors }: { colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/insights')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Insights</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>Nutrition and workout trends from your last 7 days.</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

function HistoryCard({ colors }: { colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/history')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>History</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>Every meal and workout you’ve logged, by day.</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

function AchievementsCard({ colors }: { colors: ThemeColors }) {
  const { streak } = useMeals();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/achievements')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Achievements</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          {streak > 0 ? `${streak}-day streak · see your badges` : 'Streaks and badges'}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Tappable card that opens the reminders settings screen. */
function RemindersCard({ colors }: { colors: ThemeColors }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.healthCard,
        { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
      ]}
      onPress={() => router.push('/reminders')}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Reminders</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          Daily nudges for meals, water, and weigh-ins.
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

/** Small card offering to mirror logged meals and workouts into Health Connect. */
function HealthCard({ colors }: { colors: ThemeColors }) {
  const [state, setState] = useState<HealthState>('hidden');
  const [healthBusy, setHealthBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await healthAvailable())) return; // stays hidden (iOS / Expo Go / no HC)
      const enabled = await healthSyncEnabled();
      if (active) setState(enabled ? 'on' : 'off');
    })();
    return () => {
      active = false;
    };
  }, []);

  if (state === 'hidden') return null;

  return (
    <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Health Connect</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>
          {state === 'on'
            ? 'New meals and workouts sync automatically.'
            : 'Mirror meals and workouts into Android Health.'}
        </Text>
      </View>
      {state === 'on' ? (
        <Pressable
          style={[styles.healthBtn, healthBusy && { opacity: 0.55 }]}
          disabled={healthBusy}
          onPress={() =>
            Alert.alert(
              'Disconnect Health Connect?',
              'Trak will stop syncing new meals and workouts. Records already written stay in Health Connect unless you delete them there.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Disconnect',
                  style: 'destructive',
                  onPress: async () => {
                    setHealthBusy(true);
                    const ok = await disableHealthSync();
                    setHealthBusy(false);
                    setState(ok ? 'off' : 'on');
                    if (!ok) {
                      Alert.alert(
                        'Open Health Connect',
                        'Trak could not revoke access automatically. Remove Trak under App permissions in Health Connect.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open settings', onPress: openHealthSettings },
                        ]
                      );
                    }
                  },
                },
              ]
            )
          }>
          <Text style={styles.healthBtnText}>Disconnect</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.healthBtn, healthBusy && { opacity: 0.55 }]}
          disabled={healthBusy}
          onPress={async () => {
            setHealthBusy(true);
            const ok = await enableHealthSync().catch(() => false);
            setHealthBusy(false);
            setState(ok ? 'on' : 'off');
            if (!ok) {
              Alert.alert('Health Connect', 'Permission was not granted.');
            }
          }}>
          <Text style={styles.healthBtnText}>Connect</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Subscription status and management entry point. */
function ProCard({ colors }: { colors: ThemeColors }) {
  const { isPro, testerAccess, inTrial, trialDaysLeft } = useSubscription();
  const hasProAccess = isPro || testerAccess;
  // Name only what a subscription actually unlocks. Insights, games, and the
  // rest are free, and implying otherwise invites refund requests.
  const body = testerAccess && !isPro
    ? 'Full access is enabled for this testing build.'
    : isPro
      ? 'Your subscription is active.'
      : inTrial
        ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your free trial.`
        : 'Subscribe to unlock AI photo scan, Chat and Ask, and Body Analysis.';
  return (
    <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Trak Pro</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>{body}</Text>
      </View>
      {hasProAccess ? (
        <Pressable style={styles.healthBtn} onPress={() => router.push('/paywall')}>
          <Text style={styles.healthBtnText}>{testerAccess && !isPro ? 'Tester' : 'Manage'}</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.healthBtn} onPress={() => router.push('/paywall')}>
          <Text style={styles.healthBtnText}>View plans</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Theme switcher — System follows the phone; Light/Dark force a look. */
function AppearanceCard({ colors }: { colors: ThemeColors }) {
  const { mode, setMode } = useThemeMode();
  const options: { value: ThemeMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
  return (
    <View style={[styles.healthCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Appearance</Text>
      </View>
      <View style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            onPress={() => setMode(o.value)}
            style={[
              styles.segment,
              mode === o.value && { backgroundColor: colors.greenTint },
            ]}>
            <Text
              style={[
                styles.segmentText,
                { color: mode === o.value ? Brand.greenDark : colors.textSecondary },
              ]}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MuscleScoreSettingsCard({ colors }: { colors: ThemeColors }) {
  const { settings, loaded, saving, error, retry, save } = useMuscleScorePreferences();
  const [expanded, setExpanded] = useState(false);
  const disabled = !loaded || saving || error;
  const scheduled = settings.resetWeekdays.length > 0;
  const latestReset = settings.manualResets.at(-1);

  async function persist(next: MuscleScoreSettings) {
    try { await save(next); }
    catch (e) { Alert.alert('Not saved', e instanceof Error ? e.message : 'Please try again.'); }
  }

  function resetNow() {
    Alert.alert('Reset muscle score?', 'Start counting sets from now. No workouts or Trak Points will be deleted. You can undo this reset here.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset score', onPress: () => { const now = new Date(); void persist({ ...settings, manualResets: [...settings.manualResets, { day: dayKey(now), at: now.getTime() }] }); } },
    ]);
  }

  return (
    <View style={[styles.healthCard, styles.muscleSettings, { backgroundColor: colors.backgroundElement }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Weekly muscle score settings" accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={({ pressed }) => [styles.muscleSettingsHeading, pressed && styles.pressed]}>
        <View style={styles.healthInfo}>
          <Text style={[styles.healthTitle, { color: colors.text }]}>Weekly muscle score</Text>
          <Text style={[styles.healthBody, { color: colors.textSecondary }]}>{!loaded ? 'Loading…' : error ? 'Could not load settings' : muscleScoreScheduleLabel(settings)}</Text>
        </View>
        <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
      </Pressable>
      {expanded && <>
        {error ? <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => [styles.muscleAction, { backgroundColor: colors.backgroundSelected }, pressed && styles.pressed]}><Text style={[styles.healthTitle, { color: colors.text }]}>Try again</Text></Pressable> : null}
        <View style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
          {[{ label: 'Last 7 days', active: !scheduled, weekdays: [] }, { label: 'Reset days', active: scheduled, weekdays: [1] }].map((option) => (
            <Pressable key={option.label} accessibilityRole="radio" accessibilityState={{ checked: option.active, disabled }} disabled={disabled} onPress={() => { if (!option.active) void persist({ ...settings, resetWeekdays: option.weekdays }); }} style={({ pressed }) => [styles.segment, styles.muscleMode, option.active && { backgroundColor: colors.greenTint }, disabled && styles.disabled, pressed && styles.pressed]}>
              <Text style={[styles.segmentText, styles.centerText, { color: colors.text }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>{scheduled ? 'Choose one or more days. Scores restart at midnight on those days, using your phone’s local time.' : 'Counts today and the previous 6 days. Older sets drop off each day; there is no weekly reset.'}</Text>
        {scheduled && <View style={styles.resetDays}>
          {RESET_WEEKDAYS.map((day) => {
            const selected = settings.resetWeekdays.includes(day.value);
            return <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={`Reset every ${day.label}`} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={() => void persist({ ...settings, resetWeekdays: selected ? settings.resetWeekdays.filter((value) => value !== day.value) : [...settings.resetWeekdays, day.value] })} style={({ pressed }) => [styles.resetDay, { backgroundColor: selected ? colors.greenTint : colors.background, borderColor: selected ? Brand.green : colors.backgroundSelected }, disabled && styles.disabled, pressed && styles.pressed]}>
              {selected && <CheckIcon size={14} color={colors.text} />}<Text style={[styles.segmentText, { color: colors.text }]}>{day.short}</Text>
            </Pressable>;
          })}
        </View>}
        <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{ disabled }} onPress={resetNow} style={({ pressed }) => [styles.muscleAction, { backgroundColor: colors.greenTint }, disabled && styles.disabled, pressed && styles.pressed]}>
          <Text style={[styles.healthTitle, { color: colors.text }]}>{saving ? 'Saving…' : 'Reset score now'}</Text>
        </Pressable>
        {latestReset && <>
          <Text style={[styles.healthBody, { color: colors.textSecondary }]}>Last manual reset: {new Date(latestReset.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={() => void persist({ ...settings, manualResets: settings.manualResets.slice(0, -1) })} style={({ pressed }) => [styles.muscleAction, { backgroundColor: colors.background }, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.healthTitle, { color: colors.text }]}>Undo last reset</Text></Pressable>
        </>}
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>Only muscle scores change—not workout history, calorie burn, or Trak Points. Saved for this account on this device.</Text>
      </>}
    </View>
  );
}

function TrainingFocusCard({ colors }: { colors: ThemeColors }) {
  const focus = useWorkoutFocusPreferences();
  const week = workoutFocusWeek(focus.settings);
  const muscle = focus.settings.priorityMuscle;
  const detail = !focus.loaded
    ? 'Loading…'
    : muscle
      ? `${muscleLabel(muscle)} · ${week && week <= 6 ? `week ${week} of 6` : 'ready to renew'}`
      : 'Balanced training';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Muscle focus, ${detail}`}
      onPress={() => router.push('/training-focus')}
      style={({ pressed }) => [styles.healthCard, { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement }]}>
      <View style={styles.healthInfo}>
        <Text style={[styles.healthTitle, { color: colors.text }]}>Muscle focus</Text>
        <Text style={[styles.healthBody, { color: colors.textSecondary }]}>{detail}</Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

function WorkoutSetupCard({ colors }: { colors: ThemeColors }) {
  const coach = useWorkoutCoachPreferences();
  const routine = WORKOUT_ROUTINES.find((item) => item.key === coach.settings.routine)?.label ?? 'Coach chooses';
  const detail = !coach.loaded
    ? 'Loading…'
    : coach.settings.configured
      ? `${routine} · ${coach.settings.trainingLocation} · ${coach.settings.sessionMinutes} min`
      : 'Set location, experience, time, equipment, and routine';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Workout setup, ${detail}`} onPress={() => router.push('/workout-setup')} style={({ pressed }) => [styles.healthCard, { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement }]}>
      <View style={styles.healthInfo}><Text style={[styles.healthTitle, { color: colors.text }]}>Workout setup</Text><Text style={[styles.healthBody, { color: colors.textSecondary }]}>{detail}</Text></View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() =>
                Alert.alert('Sign out?', 'You can sign back in anytime.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
                ])
              }
              hitSlop={8}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close profile"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>×</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ProfileCard colors={colors} />
          <InsightsCard colors={colors} />
          <HistoryCard colors={colors} />
          <AchievementsCard colors={colors} />
          <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>Settings</Text>
          <WorkoutSetupCard colors={colors} />
          <TrainingFocusCard colors={colors} />
          <MuscleScoreSettingsCard colors={colors} />
          <RemindersCard colors={colors} />
          <HealthCard colors={colors} />
          <ProCard colors={colors} />
          <AppearanceCard colors={colors} />
        </ScrollView>
      </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  signOut: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 28, lineHeight: 30, fontWeight: '300' },

  scroll: { paddingBottom: 100 },
  healthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  healthInfo: { flex: 1 },
  healthTitle: { fontSize: 15, fontWeight: '700' },
  healthBody: { fontSize: 13, marginTop: 2 },
  healthBtn: {
    backgroundColor: Brand.green,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  healthBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  segmentWrap: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  segment: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9 },
  segmentText: { fontSize: 13, fontWeight: '700' },
  chevron: { fontSize: 20, fontWeight: '600', marginLeft: 2 },
  settingsLabel: { fontSize: 13, fontWeight: '700', marginTop: Spacing.three, marginBottom: Spacing.two },
  muscleSettings: { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.three },
  muscleSettingsHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  muscleMode: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  resetDays: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  resetDay: { minHeight: 44, minWidth: 68, paddingHorizontal: Spacing.two, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  muscleAction: { minHeight: 48, padding: Spacing.two, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
