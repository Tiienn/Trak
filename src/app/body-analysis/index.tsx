import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BodyButton,
  BodyCard,
  BodyHeader,
  BodyScreen,
  BodySectionTitle,
  BodyState,
} from '@/components/body-analysis-ui';
import { Brand, Colors, Spacing } from '@/constants/theme';
import {
  bodyAnalysisEligibility,
  daysUntilNextCheckIn,
  type BodyScan,
} from '@/lib/body-analysis';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { bodyAnalysisDemoEnabled } from '@/lib/body-analysis-demo';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/purchases';
import { BODY_ANALYSIS_RECHECK_DAYS } from '@/lib/reminders';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(value));
}

function ScanRow({ scan }: { scan: BodyScan }) {
  const colors = Colors[useAppScheme()];
  const focus = scan.result.focusAreas.map((item) => item.title).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/body-analysis/result/${scan.id}`)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{dateLabel(scan.createdAt)}</Text>
        <Text numberOfLines={2} style={[styles.rowBody, { color: colors.textSecondary }]}>
          {focus || scan.result.summary}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </Pressable>
  );
}

export default function BodyAnalysisHubScreen() {
  const colors = Colors[useAppScheme()];
  const { user } = useAuth();
  const { profile } = useMeals();
  const { capabilities, loading: accessLoading } = useSubscription();
  const { loaded, available, loadError, preferences, scans, latestScan, refresh } = useBodyAnalysis();
  const eligibility = bodyAnalysisEligibility({
    signedIn: Boolean(user),
    profileAge: profile?.age ?? null,
    capability: capabilities.bodyAnalysis,
    consentVersion: preferences?.consentVersion ?? null,
  });

  const startCheckIn = () => {
    if (!latestScan) {
      router.push('/body-analysis/capture');
      return;
    }
    const days = daysUntilNextCheckIn(
      new Date(latestScan.createdAt),
      BODY_ANALYSIS_RECHECK_DAYS,
    );
    if (days === 0) {
      router.push('/body-analysis/capture');
      return;
    }
    Alert.alert(
      'Check in early?',
      `Your next suggested check-in is in ${days} day${days === 1 ? '' : 's'}. You can still continue now.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Continue', onPress: () => router.push('/body-analysis/capture') },
      ],
    );
  };

  let state: React.ReactNode = null;
  if (!loaded || accessLoading) {
    state = <BodyState colors={colors} title="Loading your progress…" body="This should only take a moment." />;
  } else if (!available || loadError) {
    state = (
      <BodyState
        colors={colors}
        title="Body Analysis isn’t available yet"
        body="Your nutrition log is unaffected. Try again after the latest Trak update is fully enabled."
        action="Try again"
        onAction={() => void refresh()}
      />
    );
  } else if (eligibility === 'underage') {
    state = (
      <BodyState
        colors={colors}
        title="Available for adults"
        body="Body Analysis is only available to people aged 18 or older. You can keep using the rest of Trak."
      />
    );
  } else if (eligibility === 'missing_profile') {
    state = (
      <BodyState
        colors={colors}
        title="Finish your profile first"
        body="We need your age and goal before Body Analysis can give relevant guidance."
        action="Open profile"
        onAction={() => router.push('/profile')}
      />
    );
  } else if (eligibility === 'locked') {
    state = (
      <BodyState
        colors={colors}
        title="Body Analysis with Trak Pro"
        body="Turn three private progress photos into a focused training and nutrition check-in."
        action="See Trak Pro"
        onAction={() => router.push('/paywall')}
      />
    );
  } else if (eligibility === 'needs_consent') {
    state = (
      <BodyState
        colors={colors}
        title="Set up your first check-in"
        body="Choose your training preferences and review how Trak handles your photos before you take any."
        action="Get started"
        onAction={() => router.push('/body-analysis/setup')}
      />
    );
  }

  const nextDays = latestScan
    ? daysUntilNextCheckIn(new Date(latestScan.createdAt), BODY_ANALYSIS_RECHECK_DAYS)
    : null;

  return (
    <BodyScreen>
      <BodyHeader
        title="Body Analysis"
        subtitle="A private visual check-in for clearer next steps—not a diagnosis or a score."
      />
      {bodyAnalysisDemoEnabled ? (
        <BodyCard style={{ backgroundColor: colors.greenTint }}>
          <Text style={[styles.demoTitle, { color: Brand.greenDark }]}>LOCAL DEMO MODE</Text>
          <Text style={[styles.summary, { color: colors.textSecondary }]}>Mock results and placeholder photos stay on this simulator. Nothing is sent to Gemini or the live Body Analysis backend.</Text>
        </BodyCard>
      ) : null}
      {state ?? (
        <>
          {latestScan ? (
            <BodyCard>
              <Text style={[styles.eyebrow, { color: Brand.green }]}>LATEST CHECK-IN</Text>
              <BodySectionTitle>{dateLabel(latestScan.createdAt)}</BodySectionTitle>
              <Text style={[styles.summary, { color: colors.textSecondary }]}>{latestScan.result.summary}</Text>
              <View style={styles.focusList}>
                {latestScan.result.focusAreas.map((focus) => (
                  <View key={focus.id} style={[styles.focus, { backgroundColor: colors.greenTint }]}>
                    <Text style={[styles.focusText, { color: colors.text }]}>{focus.title}</Text>
                  </View>
                ))}
              </View>
              <BodyButton title="View analysis" variant="tonal" onPress={() => router.push(`/body-analysis/result/${latestScan.id}`)} />
            </BodyCard>
          ) : (
            <BodyCard>
              <BodySectionTitle>Your first check-in</BodySectionTitle>
              <Text style={[styles.summary, { color: colors.textSecondary }]}>
                Take front, side, and back photos. Trak uses them once for analysis; the copies you keep stay on this device.
              </Text>
            </BodyCard>
          )}

          <BodyCard>
            <BodySectionTitle>{nextDays === 0 ? 'Ready for a check-in' : nextDays == null ? 'Start when you’re ready' : `Next check-in in ${nextDays} days`}</BodySectionTitle>
            <Text style={[styles.summary, { color: colors.textSecondary }]}>
              Consistent lighting, clothing, distance, and pose make comparisons more useful.
            </Text>
            <BodyButton title={latestScan ? 'New check-in' : 'Take progress photos'} onPress={startCheckIn} />
          </BodyCard>

          {scans.length > 0 ? (
            <BodyCard>
              <BodySectionTitle>History</BodySectionTitle>
              {scans.map((scan) => <ScanRow key={scan.id} scan={scan} />)}
            </BodyCard>
          ) : null}

          <BodyCard>
            <BodySectionTitle>Settings & privacy</BodySectionTitle>
            <Pressable onPress={() => router.push('/body-analysis/setup?edit=1')} style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.text }]}>Training preferences</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/body-analysis/privacy')} style={styles.linkRow}>
              <Text style={[styles.linkText, { color: colors.text }]}>Photo privacy & data</Text>
              <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
            </Pressable>
          </BodyCard>
        </>
      )}
    </BodyScreen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  summary: { fontSize: 14, lineHeight: 21 },
  focusList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  focus: { borderRadius: 99, paddingVertical: 8, paddingHorizontal: 12 },
  focusText: { fontSize: 13, fontWeight: '700' },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  rowText: { flex: 1, gap: Spacing.one },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowBody: { fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 22, fontWeight: '600' },
  linkRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { fontSize: 15, fontWeight: '700' },
  demoTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
