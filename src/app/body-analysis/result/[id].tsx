import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Share, StyleSheet, Text, View } from 'react-native';

import {
  BodyButton,
  BodyCard,
  BodyHeader,
  BodyScreen,
  BodySectionTitle,
  BodySegment,
  BodyState,
} from '@/components/body-analysis-ui';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { canShowVisualEstimate, daysUntilNextCheckIn, type BodyPose } from '@/lib/body-analysis';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { bodyAnalysisDemoEnabled } from '@/lib/body-analysis-demo';
import type { BodyPhotoSet } from '@/lib/body-photo-repository';
import { BODY_ANALYSIS_RECHECK_DAYS } from '@/lib/reminders';
import { useAppScheme } from '@/lib/theme';

function List({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${index}-${item}`} style={styles.listRow}>
          <Text style={[styles.bullet, { color: Brand.green }]}>•</Text>
          <Text selectable style={[styles.listText, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export default function BodyAnalysisResultScreen() {
  const colors = Colors[useAppScheme()];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loaded, scans, localPhotos, deleteLocalPhotos, deleteScan, reportAnalysis } = useBodyAnalysis();
  const scan = scans.find((item) => item.id === id);
  const previousScan = scan?.previousScanId ? scans.find((item) => item.id === scan.previousScanId) : undefined;
  const [photos, setPhotos] = useState<BodyPhotoSet | null>(null);
  const [previousPhotos, setPreviousPhotos] = useState<BodyPhotoSet | null>(null);
  const [pose, setPose] = useState<BodyPose>('front');
  const [comparison, setComparison] = useState<'latest' | 'before'>('latest');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!scan) return;
    void Promise.all([
      localPhotos(scan.id),
      previousScan ? localPhotos(previousScan.id) : Promise.resolve(null),
    ]).then(([current, previous]) => {
      if (!active) return;
      setPhotos(current);
      setPreviousPhotos(previous);
    });
    return () => { active = false; };
  }, [localPhotos, previousScan, scan]);

  const shareText = useMemo(() => {
    if (!scan) return '';
    const focus = scan.result.focusAreas.map((item) => item.title).join(' and ');
    return `My Trak Body Analysis check-in\n\n${scan.result.summary}\n\nCurrent focus: ${focus}\n\nVisual estimates and general wellness guidance only—not medical advice.`;
  }, [scan]);

  if (!loaded) {
    return <BodyScreen><BodyHeader title="Body Analysis" /><BodyState colors={colors} title="Loading check-in…" body="This should only take a moment." /></BodyScreen>;
  }
  if (!scan) {
    return <BodyScreen><BodyHeader title="Body Analysis" /><BodyState colors={colors} title="Check-in not found" body="It may have been deleted or belongs to another account." action="Back to Body Analysis" onAction={() => router.replace('/body-analysis')} /></BodyScreen>;
  }

  const result = scan.result;
  const activePhotos = comparison === 'before' ? previousPhotos : photos;
  const nextDays = daysUntilNextCheckIn(new Date(scan.createdAt), BODY_ANALYSIS_RECHECK_DAYS);
  const targetLabel = {
    keep: 'Keep your current calorie target',
    small_decrease: 'Consider a small calorie decrease',
    small_increase: 'Consider a small calorie increase',
    log_consistently: 'Build a more consistent food log first',
  }[result.nutrition.targetAction];

  const sendReport = (category: 'inaccurate' | 'unsafe' | 'other') => {
    setBusy(true);
    void reportAnalysis(scan.id, category)
      .then(() => Alert.alert('Report sent', 'Thank you. This helps us improve and review unsafe or inaccurate output.'))
      .catch((error: any) => Alert.alert('Could not report', error?.message ?? 'Please try again.'))
      .finally(() => setBusy(false));
  };

  const chooseReport = () => {
    Alert.alert('Report this analysis', 'What best describes the issue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inaccurate', onPress: () => sendReport('inaccurate') },
      {
        text: 'Another issue',
        onPress: () => Alert.alert('Choose issue', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unsafe or inappropriate', onPress: () => sendReport('unsafe') },
          { text: 'Other', onPress: () => sendReport('other') },
        ]),
      },
    ]);
  };

  return (
    <BodyScreen>
      <BodyHeader
        title="Your check-in"
        subtitle={new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(scan.createdAt))}
      />
      {bodyAnalysisDemoEnabled ? (
        <BodyCard style={{ backgroundColor: colors.greenTint }}>
          <Text style={[styles.eyebrow, { color: Brand.greenDark }]}>LOCAL DEMO · NOT AI OUTPUT</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>This deterministic result tests the interface only. It was not generated from your photos.</Text>
        </BodyCard>
      ) : null}

      <BodyCard>
        <Text style={[styles.eyebrow, { color: Brand.green }]}>CURRENT DIRECTION</Text>
        <BodySectionTitle>{result.summary}</BodySectionTitle>
        <Text selectable style={[styles.body, { color: colors.textSecondary }]}>{result.progress.summary}</Text>
        <List items={result.progress.changes} color={colors.textSecondary} />
      </BodyCard>

      {activePhotos ? (
        <BodyCard>
          <View style={styles.headingRow}>
            <BodySectionTitle>Progress photos</BodySectionTitle>
            {previousPhotos ? (
              <BodySegment
                value={comparison}
                onChange={setComparison}
                options={[{ value: 'before', label: 'Before' }, { value: 'latest', label: 'Latest' }]}
              />
            ) : null}
          </View>
          <BodySegment
            accessibilityLabel="Photo pose"
            value={pose}
            onChange={setPose}
            options={[{ value: 'front', label: 'Front' }, { value: 'side', label: 'Side' }, { value: 'back', label: 'Back' }]}
          />
          <Image source={{ uri: activePhotos[pose] }} resizeMode="contain" style={[styles.photo, { backgroundColor: colors.background }]} />
          <Text style={[styles.photoNote, { color: colors.textSecondary }]}>Stored only on this device · not synced</Text>
        </BodyCard>
      ) : (
        <BodyCard>
          <BodySectionTitle>Progress photos</BodySectionTitle>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Local photo copies aren’t available on this device. Your written analysis is still here.</Text>
        </BodyCard>
      )}

      {canShowVisualEstimate(result) ? (
        <BodyCard style={styles.quietCard}>
          <Text style={[styles.quietLabel, { color: colors.textSecondary }]}>ROUGH VISUAL RANGE</Text>
          <Text style={[styles.estimate, { color: colors.text }]}>{result.visualEstimate!.bodyFatRangeMin}–{result.visualEstimate!.bodyFatRangeMax}%</Text>
          <Text selectable style={[styles.photoNote, { color: colors.textSecondary }]}>{result.visualEstimate!.explanation}</Text>
        </BodyCard>
      ) : null}

      <BodyCard>
        <BodySectionTitle>What’s going well</BodySectionTitle>
        <List items={result.strengths} color={colors.text} />
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>Your two priorities</BodySectionTitle>
        {result.focusAreas.map((focus, index) => (
          <View key={focus.id} style={styles.focusBlock}>
            <Text style={[styles.focusNumber, { color: Brand.green }]}>{index + 1}</Text>
            <View style={styles.focusText}>
              <Text style={[styles.focusTitle, { color: colors.text }]}>{focus.title}</Text>
              <Text selectable style={[styles.body, { color: colors.textSecondary }]}>{focus.reason}</Text>
              <List items={focus.evidence} color={colors.textSecondary} />
            </View>
          </View>
        ))}
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>Training focus</BodySectionTitle>
        <Text selectable style={[styles.body, { color: colors.textSecondary }]}>{result.training.weeklyFocus}</Text>
        <Text style={[styles.planMeta, { color: Brand.green }]}>{result.training.daysPerWeek} days per week</Text>
        {result.training.exercises.map((exercise) => (
          <View key={`${exercise.name}-${exercise.sets}`} style={[styles.exercise, { backgroundColor: colors.background }]}>
            <View style={styles.exerciseTop}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
              <Text style={[styles.exerciseDose, { color: Brand.greenDark }]}>{exercise.sets} × {exercise.reps}</Text>
            </View>
            <Text selectable style={[styles.photoNote, { color: colors.textSecondary }]}>{exercise.reason}{exercise.equipment ? ` · ${exercise.equipment}` : ''}</Text>
          </View>
        ))}
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>Nutrition direction</BodySectionTitle>
        <Text style={[styles.focusTitle, { color: colors.text }]}>{targetLabel}</Text>
        {result.nutrition.calorieAdjustment ? (
          <Text style={[styles.planMeta, { color: Brand.green }]}>{result.nutrition.calorieAdjustment > 0 ? '+' : ''}{result.nutrition.calorieAdjustment} kcal/day</Text>
        ) : null}
        {result.nutrition.proteinTargetG ? <Text style={[styles.body, { color: colors.textSecondary }]}>Protein guide: {result.nutrition.proteinTargetG} g/day</Text> : null}
        <List items={result.nutrition.habits} color={colors.textSecondary} />
        {result.nutrition.swaps.map((swap) => (
          <View key={`${swap.current}-${swap.tryInstead}`} style={[styles.exercise, { backgroundColor: colors.background }]}>
            <Text style={[styles.exerciseName, { color: colors.text }]}>{swap.current} → {swap.tryInstead}</Text>
            <Text selectable style={[styles.photoNote, { color: colors.textSecondary }]}>{swap.reason}</Text>
          </View>
        ))}
        <Text style={[styles.evidence, { color: colors.textSecondary }]}>Nutrition evidence: {result.nutrition.dataSufficiency}. Trak will not automatically change your plan.</Text>
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>{nextDays === 0 ? 'Ready for your next check-in' : `Check in again in about ${nextDays} days`}</BodySectionTitle>
        <Text selectable style={[styles.body, { color: colors.textSecondary }]}>{result.coachHandoff.reason}</Text>
        <BodyButton title="Back to Body Analysis" variant="tonal" onPress={() => router.replace('/body-analysis')} />
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>Analysis actions</BodySectionTitle>
        <BodyButton title="Share written summary" variant="ghost" onPress={() => void Share.share({ message: shareText })} />
        <BodyButton title="Report this analysis" variant="ghost" disabled={busy} onPress={chooseReport} />
        {photos ? (
          <BodyButton
            title="Delete photos from this device"
            variant="ghost"
            onPress={() => Alert.alert('Delete local photos?', 'The written analysis will remain. This can’t be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete photos', style: 'destructive', onPress: () => void deleteLocalPhotos(scan.id).then(() => setPhotos(null)) },
            ])}
          />
        ) : null}
        <BodyButton
          title="Delete this check-in"
          variant="destructive"
          onPress={() => Alert.alert('Delete this check-in?', 'The analysis and local photos will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => void deleteScan(scan.id)
                .then(() => router.replace('/body-analysis'))
                .catch((error: any) => Alert.alert('Could not delete', error?.message ?? 'Please try again.')),
            },
          ])}
        />
      </BodyCard>

      <Text selectable style={[styles.disclaimer, { color: colors.textSecondary }]}>{result.disclaimer}</Text>
    </BodyScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  body: { fontSize: 14, lineHeight: 21 },
  list: { gap: Spacing.two },
  listRow: { flexDirection: 'row', gap: Spacing.two },
  bullet: { fontSize: 20, lineHeight: 20, fontWeight: '900' },
  listText: { flex: 1, fontSize: 14, lineHeight: 20 },
  headingRow: { gap: Spacing.three },
  photo: { width: '100%', height: 430, borderRadius: 16 },
  photoNote: { fontSize: 12, lineHeight: 17 },
  quietCard: { alignItems: 'center' },
  quietLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  estimate: { fontSize: 28, fontWeight: '700' },
  focusBlock: { flexDirection: 'row', gap: Spacing.three },
  focusNumber: { fontSize: 24, fontWeight: '800' },
  focusText: { flex: 1, gap: Spacing.two },
  focusTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  planMeta: { fontSize: 14, fontWeight: '800' },
  exercise: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  exerciseTop: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'space-between' },
  exerciseName: { flex: 1, fontSize: 14, fontWeight: '800' },
  exerciseDose: { fontSize: 13, fontWeight: '800' },
  evidence: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  disclaimer: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: Spacing.three },
});
