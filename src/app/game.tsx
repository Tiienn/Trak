import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlameIcon, PlateIcon, ShareIcon } from '@/components/icons';
import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import {
  CATEGORIES,
  dailyChallenge,
  EMPTY_STATS,
  INGREDIENT_BY_ID,
  loadGameStats,
  plateTotals,
  randomChallenge,
  recordRound,
  scoreRound,
  type Challenge,
  type GameStats,
  type RoundResult,
} from '@/lib/game';
import { useAppScheme } from '@/lib/theme';

type Phase = 'build' | 'result';

function Stars({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(count)}
      <Text style={styles.starsDim}>{'★'.repeat(3 - count)}</Text>
    </Text>
  );
}

export default function GameScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];

  // `?mode=free` starts a random round instead of today's daily challenge.
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [isDaily, setIsDaily] = useState(mode !== 'free');
  const [challenge, setChallenge] = useState<Challenge>(() =>
    mode === 'free' ? randomChallenge() : dailyChallenge()
  );
  const [plate, setPlate] = useState<Record<string, number>>({});
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [phase, setPhase] = useState<Phase>('build');
  const [result, setResult] = useState<RoundResult | null>(null);
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);

  useEffect(() => {
    loadGameStats().then(setStats);
  }, []);

  const totals = useMemo(() => plateTotals(plate), [plate]);
  const plateIds = Object.keys(plate).filter((id) => plate[id] > 0);
  const activeCategory = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];
  const dailyDoneToday = stats.lastDailyDay !== null && stats.lastDailyDay === challengeDay();

  function challengeDay(): string {
    // Small helper so "daily done" stays honest across midnight.
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function add(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPlate((p) => ({ ...p, [id]: Math.min(5, (p[id] ?? 0) + 1) }));
  }

  function remove(id: string) {
    setPlate((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) - 1) }));
  }

  async function serve() {
    if (plateIds.length === 0) return;
    const r = scoreRound(totals, challenge);
    setResult(r);
    setPhase('result');
    Haptics.notificationAsync(
      r.stars >= 2 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    ).catch(() => {});
    setStats(await recordRound(r, isDaily, stats));
  }

  function playAgain() {
    setChallenge(randomChallenge());
    setIsDaily(false);
    setPlate({});
    setResult(null);
    setPhase('build');
  }

  async function shareResult() {
    if (!result) return;
    const stars = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
    const lines = [
      `🎯 Trak — ${isDaily ? `Daily Challenge ${challengeDay()}` : 'Calorie Challenge'}`,
      `${stars} · ${result.diffPct}% off a ${challenge.targetCalories} kcal target`,
      ...(isDaily && stats.dailyStreak > 1 ? [`🔥 ${stats.dailyStreak}-day streak`] : []),
      'Think you can beat me? 🥗',
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // User closed the share sheet — nothing to do.
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isDaily ? 'Daily challenge' : 'Challenge'}
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        {phase === 'build' ? (
          <>
            {/* The brief */}
            <View style={[styles.brief, { backgroundColor: colors.greenTint }]}>
              <Text style={[styles.briefTitle, { color: colors.text }]}>
                Build a meal with ~{challenge.targetCalories} kcal
              </Text>
              <Text style={[styles.briefSub, { color: colors.textSecondary }]}>
                …and at least {challenge.minProtein} g protein. Calories stay hidden until you
                serve — trust your gut!
              </Text>
              {isDaily && stats.dailyStreak > 0 ? (
                <View style={styles.briefStreakRow}>
                  <FlameIcon size={14} color={Brand.greenDark} />
                  <Text style={[styles.briefStreak, { color: Brand.greenDark }]}>
                    {stats.dailyStreak}-day game streak
                    {dailyDoneToday ? ' · today already counted' : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {/* The plate */}
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                YOUR PLATE {plateIds.length > 0 ? `· ${plateIds.length}` : ''}
              </Text>
              {plateIds.length === 0 ? (
                <View style={[styles.emptyPlate, { backgroundColor: colors.backgroundElement }]}>
                  <PlateIcon size={18} color={colors.textSecondary} />
                  <Text style={[styles.emptyPlateText, { color: colors.textSecondary }]}>
                    Tap ingredients below to build your meal
                  </Text>
                </View>
              ) : (
                <View style={[styles.plate, { backgroundColor: colors.backgroundElement }]}>
                  {plateIds.map((id) => {
                    const ing = INGREDIENT_BY_ID[id];
                    return (
                      <View key={id} style={styles.plateRow}>
                        <Text style={[styles.plateName, { color: colors.text }]} numberOfLines={1}>
                          {ing.emoji} {ing.name}
                          {plate[id] > 1 ? ` ×${plate[id]}` : ''}
                        </Text>
                        <Text style={[styles.platePortion, { color: colors.textSecondary }]}>
                          {ing.portion}
                        </Text>
                        <Pressable
                          hitSlop={8}
                          onPress={() => remove(id)}
                          style={[styles.removeBtn, { backgroundColor: colors.background }]}>
                          <Text style={[styles.removeText, { color: colors.text }]}>−</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Categories */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}>
                {CATEGORIES.map((c) => (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor:
                          category === c.key ? colors.greenTint : colors.backgroundElement,
                        borderColor: category === c.key ? Brand.green : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.catChipText, { color: colors.text }]}>
                      {c.emoji} {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Ingredient grid */}
              <View style={styles.grid}>
                {activeCategory.items.map((ing) => {
                  const qty = plate[ing.id] ?? 0;
                  return (
                    <Pressable
                      key={ing.id}
                      onPress={() => add(ing.id)}
                      style={[
                        styles.ingBtn,
                        {
                          backgroundColor: qty > 0 ? colors.greenTint : colors.backgroundElement,
                          borderColor: qty > 0 ? Brand.green : 'transparent',
                        },
                      ]}>
                      <Text style={styles.ingEmoji}>{ing.emoji}</Text>
                      <Text style={[styles.ingName, { color: colors.text }]} numberOfLines={1}>
                        {ing.name}
                        {qty > 0 ? ` ×${qty}` : ''}
                      </Text>
                      <Text style={[styles.ingPortion, { color: colors.textSecondary }]} numberOfLines={1}>
                        {ing.portion}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              style={[styles.serveBtn, { opacity: plateIds.length > 0 ? 1 : 0.4 }]}
              disabled={plateIds.length === 0}
              onPress={serve}>
              <PlateIcon size={20} color="#ffffff" />
              <Text style={styles.serveText}>Serve it</Text>
            </Pressable>
          </>
        ) : (
          result && (
            <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.headline, { color: colors.text }]}>{result.headline}</Text>
              <Stars count={result.stars} />

              <View style={[styles.revealCard, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.revealBig, { color: colors.text }]}>
                  {totals.calories.toLocaleString()} kcal
                </Text>
                <Text style={[styles.revealSub, { color: colors.textSecondary }]}>
                  target ~{challenge.targetCalories} · you were {result.diffPct}% off
                </Text>
                <Text
                  style={[
                    styles.revealProtein,
                    { color: result.proteinMet ? Brand.greenDark : Brand.over },
                  ]}>
                  {totals.protein_g} g protein {result.proteinMet ? '✓' : `— needed ${challenge.minProtein} g`}
                </Text>
              </View>

              {/* The teach moment: per-item calories */}
              <View style={[styles.breakdown, { backgroundColor: colors.backgroundElement }]}>
                {plateIds.map((id, i) => {
                  const ing = INGREDIENT_BY_ID[id];
                  const qty = plate[id];
                  return (
                    <View
                      key={id}
                      style={[
                        styles.breakRow,
                        i < plateIds.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.backgroundSelected,
                        },
                      ]}>
                      <Text style={[styles.breakName, { color: colors.text }]} numberOfLines={1}>
                        {ing.emoji} {ing.name}
                        {qty > 1 ? ` ×${qty}` : ''}
                      </Text>
                      <Text style={[styles.breakCals, { color: colors.text }]}>
                        {ing.calories * qty}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.statsLine, { color: colors.textSecondary }]}>
                Played {stats.played} · {stats.threeStar} perfect · best miss{' '}
                {stats.bestDiffPct ?? '—'}%{stats.dailyStreak > 0 ? ` · ${stats.dailyStreak}-day streak` : ''}
              </Text>

              <Pressable
                style={[styles.shareBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={shareResult}>
                <ShareIcon size={17} color={colors.text} />
                <Text style={[styles.shareText, { color: colors.text }]}>Share your result</Text>
              </Pressable>

              <View style={styles.resultButtons}>
                <Pressable
                  style={[styles.againBtn, { backgroundColor: colors.backgroundElement }]}
                  onPress={playAgain}>
                  <Text style={[styles.againText, { color: colors.text }]}>Play again</Text>
                </Pressable>
                <Pressable style={styles.doneBtn} onPress={() => router.back()}>
                  <Text style={styles.doneText}>Done</Text>
                </Pressable>
              </View>
            </ScrollView>
          )
        )}
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
    marginBottom: Spacing.two,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },

  brief: { borderRadius: 16, padding: Spacing.four, gap: 4, marginBottom: Spacing.three },
  briefTitle: { fontSize: 17, fontWeight: '800' },
  briefSub: { fontSize: 13, lineHeight: 19 },
  briefStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  briefStreak: { fontSize: 13, fontWeight: '700' },

  scroll: { paddingBottom: Spacing.three, gap: Spacing.three },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  emptyPlate: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyPlateText: { fontSize: 13 },
  plate: { borderRadius: 14, paddingHorizontal: Spacing.three, paddingVertical: 4 },
  plateRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: Spacing.two },
  plateName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  platePortion: { fontSize: 12, flex: 1, textAlign: 'right' },
  removeBtn: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 16, fontWeight: '800' },

  catRow: { gap: Spacing.two, paddingVertical: 2 },
  catChip: { borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
  catChipText: { fontSize: 13, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  ingBtn: {
    width: '31.5%',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: Spacing.two,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 2,
  },
  ingEmoji: { fontSize: 26 },
  ingName: { fontSize: 12, fontWeight: '700' },
  ingPortion: { fontSize: 10 },

  serveBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: Spacing.two,
  },
  serveText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },

  resultScroll: { alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.four },
  headline: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: Spacing.four },
  stars: { fontSize: 34, color: '#FBBF24', letterSpacing: 4 },
  starsDim: { color: 'rgba(128,128,128,0.35)' },

  revealCard: { alignSelf: 'stretch', borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: 4 },
  revealBig: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  revealSub: { fontSize: 13 },
  revealProtein: { fontSize: 15, fontWeight: '700', marginTop: 4 },

  breakdown: { alignSelf: 'stretch', borderRadius: 16, paddingHorizontal: Spacing.three },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, gap: Spacing.two },
  breakName: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  breakCals: { fontSize: 14, fontWeight: '800' },

  statsLine: { fontSize: 12, fontWeight: '600' },

  shareBtn: {
    alignSelf: 'stretch',
    borderRadius: 16,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareText: { fontSize: 15, fontWeight: '700' },
  resultButtons: { flexDirection: 'row', gap: Spacing.two, alignSelf: 'stretch' },
  againBtn: { flex: 1, borderRadius: 16, paddingVertical: Spacing.three, alignItems: 'center' },
  againText: { fontSize: 15, fontWeight: '700' },
  doneBtn: {
    flex: 1,
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  doneText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
