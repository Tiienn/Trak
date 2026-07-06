import { router } from 'expo-router';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { computeScore, scoreCaption, type ScorePart } from '@/lib/score';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

function PartRow({ part, colors }: { part: ScorePart; colors: ThemeColors }) {
  const pct = part.max > 0 ? part.earned / part.max : 0;
  return (
    <View style={[styles.partCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.partHeader}>
        <Text style={[styles.partLabel, { color: colors.text }]}>{part.label}</Text>
        <Text style={[styles.partPoints, { color: pct >= 1 ? Brand.green : colors.textSecondary }]}>
          {part.earned} / {part.max}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: Brand.green }]} />
      </View>
      <Text style={[styles.partHint, { color: colors.textSecondary }]}>{part.hint}</Text>
    </View>
  );
}

export default function ScoreScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { todayTotals, targets, burnedToday, todayMeals, waterToday, waterGoal, streak } =
    useMeals();

  const score = computeScore({
    totals: todayTotals,
    targets,
    calorieBudget: targets.calories + burnedToday,
    mealsLogged: todayMeals.length,
    waterToday,
    waterGoal,
    streak,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Trak Score</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.heroValue, { color: colors.text }]}>{score.value}</Text>
            <Text style={[styles.heroCaption, { color: colors.textSecondary }]}>
              {scoreCaption(score.value)}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            HOW IT&apos;S BUILT
          </Text>
          {score.parts.map((p) => (
            <PartRow key={p.key} part={p} colors={colors} />
          ))}

          <Text style={[styles.footnote, { color: colors.textSecondary }]}>
            The score resets each morning and climbs as you log meals, hit protein, stay inside
            your calorie budget, drink water, and keep your streak alive.
          </Text>
        </ScrollView>
      </SafeAreaView>
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
  title: { fontSize: 28, fontFamily: Type.display, fontWeight: '700' },
  closeText: { fontSize: 20, fontWeight: '600' },

  scroll: { paddingBottom: Spacing.five, gap: Spacing.three },
  hero: { borderRadius: 28, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  heroValue: { fontSize: 64, fontFamily: Type.display, fontWeight: '700', letterSpacing: -1 },
  heroCaption: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },

  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: Spacing.two },
  partCard: { borderRadius: 18, padding: Spacing.three, gap: 8 },
  partHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partLabel: { fontSize: 15, fontWeight: '700' },
  partPoints: { fontSize: 14, fontWeight: '700' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  partHint: { fontSize: 12, lineHeight: 17 },

  footnote: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: Spacing.two },
});
