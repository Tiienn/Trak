import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarIcon, CheckIcon, DumbbellIcon, FlagIcon, PlateIcon, SparklesIcon } from '@/components/icons';
import { RingMark, TrakWordmark } from '@/components/logo';
import { ProfileAvatarButton } from '@/components/profile-avatar-button';
import { ProgressOverview } from '@/components/progress-overview';
import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import type { BodyScan } from '@/lib/body-analysis';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { BODY_ANALYSIS_RECHECK_DAYS, bodyAnalysisDueAt, scheduleBodyAnalysisRecheck } from '@/lib/reminders';
import { dayKey, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

type ProgressView = 'overview' | 'workouts' | 'challenges' | 'analysis';
type IconComponent = ComponentType<{ size?: number; color?: string }>;
const PROGRESS_VIEWS: { key: ProgressView; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'workouts', label: 'Workouts' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'analysis', label: 'Body Analysis' },
];
type ProgressDate = { date: Date; key: string; weekday: string; day: number; isFuture: boolean };

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
  const { width } = useWindowDimensions();
  const dates = useMemo(() => progressTimelineDates(localDateFromKey(today)), [today]);
  const itemWidth = (width - Spacing.four * 2) / 7;
  const listRef = useRef<FlatList<ProgressDate>>(null);
  return (
    <View style={styles.dateStrip} accessibilityRole="tablist">
      <FlatList
        ref={listRef}
        horizontal
        data={dates}
        keyExtractor={(item) => item.key}
        initialScrollIndex={dates.length - 7}
        getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        disableIntervalMomentum
        onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: itemWidth * index, animated: false })}
        renderItem={({ item }) => {
          const selected = item.key === selectedDate;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={item.date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              accessibilityState={{ selected, disabled: item.isFuture }}
              disabled={item.isFuture}
              onPress={() => { void Haptics.selectionAsync(); onSelectDate(item.key); }}
              style={({ pressed }) => [styles.dateItem, { width: itemWidth }, selected && { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }, pressed && { opacity: 0.7 }]}>
              <Text style={[styles.dateWeekday, { color: item.isFuture ? colors.textSecondary : colors.text }, selected && styles.dateWeekdaySelected]}>{item.weekday}</Text>
              <View style={[styles.dateCircle, { borderColor: item.isFuture ? colors.backgroundSelected : colors.textSecondary }, selected && { borderColor: Brand.green, borderStyle: 'solid' }]}>
                <Text style={[styles.dateNumber, { color: item.isFuture ? colors.textSecondary : colors.text }, selected && { color: Brand.green }]}>{item.day}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function lastDayKeys(count: number, anchorKey: string): Set<string> {
  const keys = new Set<string>();
  const anchor = localDateFromKey(anchorKey);
  for (let offset = 0; offset < count; offset += 1) {
    const date = new Date(anchor);
    date.setDate(date.getDate() - offset);
    keys.add(dayKey(date));
  }
  return keys;
}

function elapsedDays(createdAt: string, anchorKey: string): number {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  const anchor = localDateFromKey(anchorKey);
  anchor.setHours(23, 59, 59, 999);
  return Math.max(0, Math.floor((anchor.getTime() - created) / 86_400_000));
}

function EmptyAnalysisCard({ colors, view }: { colors: ThemeColors; view: 'workouts' | 'challenges' }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.greenTint }]}><SparklesIcon size={28} color={Brand.green} /></View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Start with Body Analysis</Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{view === 'workouts' ? 'Complete Body Analysis to create a focused workout plan for your training setup.' : 'Complete Body Analysis to add a personalised check-in goal to your weekly challenges.'}</Text>
      <Pressable onPress={() => router.push('/body-analysis')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Get started</Text></Pressable>
    </View>
  );
}

function Workouts({ colors, latestScan }: { colors: ThemeColors; latestScan: BodyScan | null }) {
  if (!latestScan) return <EmptyAnalysisCard colors={colors} view="workouts" />;
  const training = latestScan.result.training;
  return (
    <View style={styles.viewContent}>
      <View style={[styles.planCard, { backgroundColor: colors.greenTint }]}>
        <View style={styles.planHeading}><View style={[styles.planIcon, { backgroundColor: colors.backgroundElement }]}><DumbbellIcon size={24} color={Brand.green} /></View><Text style={styles.planEyebrow}>YOUR TRAINING FOCUS</Text></View>
        <Text style={[styles.planTitle, { color: colors.text }]}>{training.weeklyFocus}</Text>
        <Text style={[styles.planMeta, { color: colors.textSecondary }]}>{training.daysPerWeek} day{training.daysPerWeek === 1 ? '' : 's'} per week · based on your latest analysis</Text>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended exercises</Text>
        {training.exercises.map((exercise, index) => (
          <View key={`${exercise.name}-${index}`} style={[styles.exerciseCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.exerciseHeading}><Text style={[styles.exerciseTitle, { color: colors.text }]}>{exercise.name}</Text><View style={[styles.prescription, { backgroundColor: colors.greenTint }]}><Text style={styles.prescriptionText}>{exercise.sets} × {exercise.reps}</Text></View></View>
            {exercise.equipment ? <Text style={styles.equipment}>{exercise.equipment}</Text> : null}
            <Text style={[styles.exerciseReason, { color: colors.textSecondary }]}>{exercise.reason}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={() => router.push('/exercise')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Log a workout</Text></Pressable>
    </View>
  );
}

function ChallengeCard({ Icon, title, body, value, target, unit, colors }: { Icon: IconComponent; title: string; body: string; value: number; target: number; unit: string; colors: ThemeColors }) {
  const complete = value >= target;
  const percent = target > 0 ? Math.min(100, Math.max(0, Math.round((value / target) * 100))) : 0;
  return (
    <View style={[styles.challengeCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.challengeHeading}>
        <View style={[styles.challengeIcon, { backgroundColor: colors.greenTint }]}>{complete ? <CheckIcon size={22} color={Brand.green} /> : <Icon size={22} color={Brand.green} />}</View>
        <View style={styles.challengeCopy}><Text style={[styles.challengeTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.challengeBody, { color: colors.textSecondary }]}>{body}</Text></View>
        <Text style={[styles.challengeCount, { color: complete ? Brand.green : colors.text }]}>{Math.min(value, target)}/{target}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}><View style={[styles.progressFill, { width: `${percent}%` }]} /></View>
      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{complete ? 'Complete' : `${Math.max(0, target - value)} ${unit} to go`}</Text>
    </View>
  );
}

function Challenges({ colors, latestScan, selectedDate }: { colors: ThemeColors; latestScan: BodyScan | null; selectedDate: string }) {
  const { meals, exercises } = useMeals();
  const week = lastDayKeys(7, selectedDate);
  const mealDays = new Set(meals.filter((meal) => week.has(meal.date)).map((meal) => meal.date)).size;
  const workoutDays = new Set(exercises.filter((exercise) => week.has(exercise.date)).map((exercise) => exercise.date)).size;
  const workoutTarget = latestScan?.result.training.daysPerWeek ?? 3;
  const checkInTarget = latestScan ? BODY_ANALYSIS_RECHECK_DAYS : null;
  const checkInDays = latestScan ? elapsedDays(latestScan.createdAt, selectedDate) : 0;
  return (
    <View style={styles.viewContent}>
      <View style={[styles.weekCard, { backgroundColor: colors.greenTint }]}><View style={[styles.weekIcon, { backgroundColor: colors.backgroundElement }]}><FlagIcon size={24} color={Brand.green} /></View><View style={styles.weekCopy}><Text style={[styles.weekTitle, { color: colors.text }]}>This week</Text><Text style={[styles.weekBody, { color: colors.textSecondary }]}>Small, useful wins based on your Trak activity.</Text></View></View>
      <ChallengeCard Icon={DumbbellIcon} title="Training consistency" body={`Train on ${workoutTarget} different days this week.`} value={workoutDays} target={workoutTarget} unit={workoutTarget - workoutDays === 1 ? 'day' : 'days'} colors={colors} />
      <ChallengeCard Icon={PlateIcon} title="Meal logging rhythm" body="Log at least one meal on 5 different days." value={mealDays} target={5} unit={5 - mealDays === 1 ? 'day' : 'days'} colors={colors} />
      {latestScan && checkInTarget ? <ChallengeCard Icon={CalendarIcon} title="Progress check-in" body={`Your next Body Analysis window opens after ${checkInTarget} days.`} value={checkInDays} target={checkInTarget} unit={checkInTarget - checkInDays === 1 ? 'day' : 'days'} colors={colors} /> : <EmptyAnalysisCard colors={colors} view="challenges" />}
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
          <View style={[styles.emptyIcon, { backgroundColor: colors.greenTint }]}><SparklesIcon size={28} color={Brand.green} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Start with Body Analysis</Text>
          <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>{available ? 'Complete a private visual check-in, then Trak will remind you to check your progress again in 28 days.' : 'Finish enabling Body Analysis to start private visual check-ins.'}</Text>
          <Pressable onPress={() => router.push('/body-analysis')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{available ? 'Get started' : 'Try again'}</Text></Pressable>
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
        <View style={styles.planHeading}><View style={[styles.planIcon, { backgroundColor: colors.backgroundElement }]}><SparklesIcon size={24} color={Brand.green} /></View><Text style={styles.planEyebrow}>BODY ANALYSIS</Text></View>
        <Text style={[styles.planTitle, { color: colors.text }]}>Your latest check-in</Text>
        <Text style={[styles.analysisSummary, { color: colors.textSecondary }]}>{latestScan.result.summary}</Text>
        <View style={[styles.reminderCard, { backgroundColor: colors.backgroundElement }]}>
          <CalendarIcon size={21} color={Brand.green} />
          <View style={styles.challengeCopy}>
            <Text style={[styles.reminderTitle, { color: colors.text }]}>{daysLeft > 0 ? `Next check-in in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : 'Your next check-in is ready'}</Text>
            <Text style={[styles.reminderBody, { color: colors.textSecondary }]}>28-day check-in · {dueLabel}</Text>
          </View>
          {reminderEnabled ? <View style={styles.reminderCheck}><CheckIcon size={14} color="#ffffff" /></View> : null}
        </View>
        {reminderEnabled === false ? <Pressable onPress={() => { void enableReminder(); }} style={[styles.reminderButton, { backgroundColor: colors.backgroundElement }]}><Text style={[styles.reminderButtonText, { color: Brand.greenDark }]}>Enable 28-day reminder</Text></Pressable> : null}
        <Pressable onPress={() => router.push('/body-analysis')} style={styles.primaryButton}><Text style={styles.primaryButtonText}>{daysLeft === 0 ? 'New check-in' : 'View Body Analysis'}</Text></Pressable>
      </View>
      <Text style={[styles.analysisFootnote, { color: colors.textSecondary }]}>Trak schedules one private device notification {BODY_ANALYSIS_RECHECK_DAYS} days after each completed analysis. A new check-in replaces the previous reminder.</Text>
    </View>
  );
}

export default function ProgressScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><View style={styles.logoRow}><RingMark size={30} /><TrakWordmark color={colors.text} size={28} /></View><ProfileAvatarButton colors={colors} /></View>
        <ProgressDateStrip colors={colors} today={today} selectedDate={selectedDate} onSelectDate={(date) => setDateSelection(date === today ? null : date)} />
        <View style={[styles.segmentWrap, { backgroundColor: colors.backgroundElement }]}>
          {PROGRESS_VIEWS.map((view) => {
            const selected = view.key === activeView;
            return <Pressable key={view.key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setActiveView(view.key)} style={({ pressed }) => [styles.segment, selected && { backgroundColor: colors.background }, pressed && { opacity: 0.7 }]}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={[styles.segmentText, { color: selected ? colors.text : colors.textSecondary }]}>{view.label}</Text></Pressable>;
          })}
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {activeView === 'overview'
            ? <ProgressOverview colors={colors} selectedDate={selectedDate} latestScan={latestScan} preferences={preferences} />
            : activeView === 'workouts'
              ? <Workouts colors={colors} latestScan={latestScan} />
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
  dateStrip: { height: 82, marginTop: Spacing.three }, dateItem: { height: 82, borderWidth: 1, borderColor: 'transparent', borderRadius: 22, paddingVertical: 9, alignItems: 'center', justifyContent: 'space-between' }, dateWeekday: { fontSize: 11, fontWeight: '700' }, dateWeekdaySelected: { fontWeight: '900' }, dateCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }, dateNumber: { fontSize: 14, fontWeight: '800' },
  segmentWrap: { width: '100%', flexDirection: 'row', alignSelf: 'center', borderRadius: 999, padding: 3, gap: 2, marginTop: Spacing.two }, segment: { flex: 1, minWidth: 0, paddingVertical: 8, paddingHorizontal: 3, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  // Center the full text box, including labels scaled to fit; omit Android's extra font padding.
  segmentText: { width: '100%', textAlign: 'center', textAlignVertical: 'center', includeFontPadding: false, fontSize: 12, fontWeight: '800' },
  scroll: { paddingTop: Spacing.four, paddingBottom: 110 }, viewContent: { gap: Spacing.four }, section: { gap: Spacing.three }, sectionTitle: { fontFamily: Type.display, fontSize: 21, lineHeight: 26, fontWeight: '700' },
  emptyCard: { borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: Spacing.three }, emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }, emptyTitle: { fontFamily: Type.display, fontSize: 21, lineHeight: 26, fontWeight: '700', textAlign: 'center' }, emptyBody: { fontSize: 14, lineHeight: 21, textAlign: 'center' }, primaryButton: { minHeight: 50, width: '100%', borderRadius: 16, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three }, primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  planCard: { borderRadius: 24, padding: Spacing.four, gap: Spacing.three }, planHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, planIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, planEyebrow: { color: Brand.greenDark, fontSize: 12, fontWeight: '800', letterSpacing: 1 }, planTitle: { fontFamily: Type.display, fontSize: 24, lineHeight: 30, fontWeight: '700' }, planMeta: { fontSize: 13, lineHeight: 19 },
  exerciseCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.two }, exerciseHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }, exerciseTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '800' }, prescription: { borderRadius: 10, paddingVertical: Spacing.one, paddingHorizontal: Spacing.two }, prescriptionText: { color: Brand.greenDark, fontSize: 12, lineHeight: 17, fontWeight: '800' }, equipment: { color: Brand.green, fontSize: 12, lineHeight: 17, fontWeight: '700' }, exerciseReason: { fontSize: 13, lineHeight: 19 },
  weekCard: { borderRadius: 20, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, weekIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, weekCopy: { flex: 1, gap: Spacing.one }, weekTitle: { fontFamily: Type.display, fontSize: 20, lineHeight: 25, fontWeight: '700' }, weekBody: { fontSize: 13, lineHeight: 18 },
  analysisSummaryCard: { borderRadius: 24, padding: Spacing.four, gap: Spacing.three }, analysisSummary: { fontSize: 14, lineHeight: 21 }, reminderCard: { minHeight: 72, borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, reminderTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' }, reminderBody: { marginTop: 2, fontSize: 12, lineHeight: 17 }, reminderCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' }, reminderButton: { minHeight: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, reminderButtonText: { fontSize: 14, fontWeight: '800' }, analysisFootnote: { paddingHorizontal: Spacing.two, fontSize: 12, lineHeight: 18 },
  challengeCard: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three }, challengeHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three }, challengeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, challengeCopy: { flex: 1, gap: 2 }, challengeTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' }, challengeBody: { fontSize: 13, lineHeight: 18 }, challengeCount: { fontSize: 14, lineHeight: 20, fontWeight: '900' }, progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 4, backgroundColor: Brand.green }, progressLabel: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
});
