import { router } from 'expo-router';
import { Drumstick } from 'lucide-react-native';
import { useEffect, useState, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CheckIcon, ChevronRightIcon, ChevronUpIcon, DropletIcon, DumbbellIcon, FlameIcon, PlateIcon, TargetIcon } from '@/components/icons';
import { Spacing, Type, type ThemeColors } from '@/constants/theme';
import { DAILY_MISSION_COUNT, DAILY_MISSION_POINTS, DAILY_SCORE_MAX, missionScore, type DailyMission, type DailyMissionKey } from '@/lib/missions';
import { compactMissionProgress, missionDetail } from '@/lib/mission-presentation';
import { dayKey } from '@/lib/store';
import { useTrakPoints } from '@/lib/trak-points';

const MISSION_PRESENTATION: Record<DailyMissionKey, { label: string; Icon: ComponentType<{ size?: number; color?: string }> }> = {
  meals: { label: 'Meals', Icon: PlateIcon },
  protein: { label: 'Protein', Icon: Drumstick },
  calories: { label: 'Fuel', Icon: FlameIcon },
  water: { label: 'Water', Icon: DropletIcon },
  workout: { label: 'Workout', Icon: DumbbellIcon },
};

export function DailyMissionsCard({ missions, selectedDate, colors }: { missions: DailyMission[]; selectedDate: string; colors: ThemeColors }) {
  const { balance, catalog, equipment, syncDaily } = useTrakPoints();
  const [expanded, setExpanded] = useState(false);
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.3;
  const score = missionScore(missions);
  const completeCount = missions.filter((mission) => mission.complete).length;
  const viewingToday = selectedDate === dayKey();
  const equippedTheme = catalog.find((item) => item.key === equipment.themeKey);
  const accent = equippedTheme?.accent ?? colors.accent;
  const tint = equippedTheme?.tint ?? colors.greenTint;

  useEffect(() => {
    if (!viewingToday) return;
    void syncDaily(selectedDate, missions.filter((mission) => mission.complete).map((mission) => mission.key));
  }, [missions, selectedDate, syncDaily, viewingToday]);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <View style={[styles.header, largeText && styles.largeTextHeader]}>
        <View style={[styles.headingCopy, largeText && styles.largeTextHeading]}>
          <Text style={[styles.title, { color: colors.text }]}>Daily missions</Text>
          <Text style={[styles.summaryBody, { color: colors.textSecondary }]}>Trak Score · <Text style={[styles.score, { color: colors.text }]}>{score}/{DAILY_SCORE_MAX}</Text></Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${balance} Trak Points. Open rewards.`} onPress={() => router.push('/rewards')} style={({ pressed }) => [styles.wallet, { backgroundColor: tint }, largeText && styles.largeTextWallet, pressed && styles.pressed]}>
          <TargetIcon size={17} color={accent} />
          <Text style={[styles.walletValue, { color: colors.text }]}>{balance.toLocaleString()} <Text style={styles.walletUnit}>pts</Text></Text>
          <ChevronRightIcon size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View accessibilityRole="progressbar" accessibilityLabel={viewingToday ? 'Today’s Trak Score' : 'Selected day’s Trak Score'} accessibilityValue={{ min: 0, max: DAILY_SCORE_MAX, now: score }} style={[styles.progressTrack, { backgroundColor: colors.backgroundSelected }]}>
        <View style={[styles.progressFill, { width: `${score}%`, backgroundColor: accent }]} />
      </View>

      <View style={[styles.indicators, largeText && styles.indicatorsLargeText]}>
        {missions.map((mission) => {
          const { label, Icon } = MISSION_PRESENTATION[mission.key];
          return (
            <Pressable
              key={mission.key}
              accessibilityRole="button"
              accessibilityLabel={`${mission.title}. ${missionDetail(mission)}. ${mission.points} points.`}
              accessibilityHint="Shows all mission targets"
              onPress={() => setExpanded(true)}
              style={({ pressed }) => [styles.indicator, largeText && styles.largeTextIndicator, pressed && styles.pressed]}>
              <View style={[styles.indicatorIcon, { backgroundColor: mission.complete ? tint : colors.backgroundSelected }]}>
                {mission.complete ? <CheckIcon size={18} color={accent} /> : <Icon size={18} color={colors.textSecondary} />}
              </View>
              <Text style={[styles.indicatorLabel, largeText && styles.indicatorLabelLargeText, { color: colors.text }]}>{label}</Text>
              <Text style={[styles.indicatorProgress, largeText && styles.indicatorProgressLargeText, { color: mission.complete ? accent : colors.textSecondary }]}>{compactMissionProgress(mission)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.footer, largeText && styles.largeTextFooter, { borderTopColor: colors.backgroundSelected }]}>
        <Text style={[styles.completion, { color: colors.textSecondary }]}>{completeCount}/{DAILY_MISSION_COUNT} complete</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Hide missions' : 'View missions'} accessibilityState={{ expanded }} onPress={() => setExpanded((current) => !current)} style={({ pressed }) => [styles.disclosure, largeText && styles.largeTextDisclosure, pressed && styles.pressed]}>
          <Text style={[styles.disclosureText, { color: colors.text }]}>{expanded ? 'Hide missions' : 'View missions'}</Text>
          {expanded ? <ChevronUpIcon size={16} color={colors.textSecondary} /> : <ChevronRightIcon size={16} color={colors.textSecondary} />}
        </Pressable>
      </View>

      {expanded && <View style={[styles.list, { borderTopColor: colors.backgroundSelected }]}>
        <Text style={[styles.detailHeading, { color: colors.textSecondary }]}>{DAILY_MISSION_POINTS} Trak Points per completed mission</Text>
        {missions.map((mission, index) => (
          <Pressable
            key={mission.key}
            accessibilityRole={viewingToday && !mission.complete && mission.route ? 'button' : 'text'}
            accessibilityLabel={`${mission.title}. ${missionDetail(mission)}. ${mission.complete ? 'Complete' : `${mission.points} points available`}`}
            accessibilityState={{ disabled: !viewingToday || mission.complete || !mission.route }}
            disabled={!viewingToday || mission.complete || !mission.route}
            onPress={() => mission.route && router.push(mission.route)}
            style={({ pressed }) => [styles.row, index > 0 && { borderTopColor: colors.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth }, pressed && styles.pressed]}>
            <View style={[styles.status, { backgroundColor: mission.complete ? tint : colors.backgroundSelected }]}>
              {mission.complete ? <CheckIcon size={15} color={accent} /> : <Text style={[styles.statusNumber, { color: colors.textSecondary }]}>{index + 1}</Text>}
            </View>
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{mission.title}</Text>
              <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>{missionDetail(mission)}</Text>
            </View>
            <Text style={[styles.points, { color: mission.complete ? accent : colors.textSecondary }]}>{mission.complete ? `${mission.points} pts` : `+${mission.points}`}</Text>
          </Pressable>
        ))}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  largeTextHeader: { flexDirection: 'column', alignItems: 'stretch' },
  headingCopy: { flex: 1, gap: Spacing.one },
  largeTextHeading: { flex: 0 },
  title: { fontFamily: Type.display, fontSize: 22, lineHeight: 27, fontWeight: '700' },
  wallet: { minHeight: 44, maxWidth: '48%', borderRadius: 24, paddingHorizontal: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  largeTextWallet: { alignSelf: 'flex-start', maxWidth: '100%' },
  walletValue: { flexShrink: 1, fontSize: 14, fontWeight: '900', fontVariant: ['tabular-nums'] },
  walletUnit: { fontWeight: '600' },
  score: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  summaryBody: { fontSize: 13, lineHeight: 18 },
  progressTrack: { height: Spacing.two, borderRadius: Spacing.one, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Spacing.one },
  indicators: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  indicatorsLargeText: { flexDirection: 'column', flexWrap: 'nowrap', gap: Spacing.two },
  indicator: { flex: 1, minWidth: 0, alignItems: 'center', gap: Spacing.one },
  largeTextIndicator: { flex: 0, width: '100%', minHeight: 44, flexDirection: 'row', justifyContent: 'flex-start', gap: Spacing.two },
  indicatorIcon: { width: Spacing.five, height: Spacing.five, borderRadius: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  indicatorLabel: { fontSize: 11, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  indicatorLabelLargeText: { flex: 1, textAlign: 'left' },
  indicatorProgress: { fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] },
  indicatorProgressLargeText: { textAlign: 'right' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  largeTextFooter: { flexDirection: 'column', alignItems: 'stretch', paddingTop: Spacing.two },
  completion: { flex: 1, fontSize: 12, fontWeight: '600' },
  disclosure: { minHeight: 44, maxWidth: '65%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  largeTextDisclosure: { alignSelf: 'flex-start', maxWidth: '100%' },
  disclosureText: { flexShrink: 1, fontSize: 12, fontWeight: '800' },
  list: { borderTopWidth: StyleSheet.hairlineWidth },
  detailHeading: { marginTop: Spacing.two, marginBottom: Spacing.one, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  row: { minHeight: 55, paddingVertical: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  status: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusNumber: { fontSize: 11, fontWeight: '900' },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  rowDetail: { marginTop: 1, fontSize: 11, lineHeight: 15, fontWeight: '600' },
  points: { minWidth: 28, textAlign: 'right', fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.7 },
});
