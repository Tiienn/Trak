import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlagIcon, ShareIcon } from '@/components/icons';
import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  EMPTY_STATS,
  foodsForDeck,
  loadGameStats,
  METRICS,
  randomFood,
  recordHigherLower,
  type GameStats,
  type Ingredient,
  type MetricKey,
} from '@/lib/game';
import { useAppScheme } from '@/lib/theme';
import { useTrakPoints } from '@/lib/trak-points';

type Phase = 'guess' | 'reveal' | 'over';

function FoodCard({
  food,
  value,
  highlight,
  colors,
}: {
  food: Ingredient;
  value: string;
  highlight?: 'right' | 'wrong' | null;
  colors: ThemeColors;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          borderColor:
            highlight === 'right' ? colors.accent : highlight === 'wrong' ? '#EF4444' : 'transparent',
        },
      ]}>
      <View style={[styles.emojiTile, { backgroundColor: colors.background }]}>
        <Text style={styles.cardEmoji}>{food.emoji}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {food.name}
        </Text>
        <View style={[styles.portionPill, { backgroundColor: colors.background }]}>
          <Text style={[styles.portionText, { color: colors.text }]} numberOfLines={1}>
            {food.portion}
          </Text>
        </View>
      </View>
      <Text style={[styles.cardCals, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const SWIPE_THRESHOLD = 90;

export default function HigherLowerScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { user } = useAuth();
  const { awardGame } = useTrakPoints();

  const { deck, foods } = useLocalSearchParams<{ deck?: string; foods?: string }>();
  const foodPool = useMemo(
    () => foodsForDeck(deck, foods ? foods.split(',').filter(Boolean) : undefined),
    [deck, foods]
  );

  const [metric, setMetric] = useState<MetricKey>('calories');
  const [known, setKnown] = useState<Ingredient>(() => randomFood(undefined, 'calories', foodPool));
  const [mystery, setMystery] = useState<Ingredient>(() => randomFood(known, 'calories', foodPool));
  const [phase, setPhase] = useState<Phase>('guess');
  const [run, setRun] = useState(0);
  const [correctFoodIds, setCorrectFoodIds] = useState<string[]>([]);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [pointsEarned, setPointsEarned] = useState(0);
  const metricInfo = METRICS.find((m) => m.key === metric)!;
  const fmt = (n: number) => `${n} ${metricInfo.unit}`;

  const translateX = useSharedValue(0);
  const canSwipe = useSharedValue(1);

  useEffect(() => {
    loadGameStats(user?.id).then(setStats);
  }, [user?.id]);

  useEffect(() => {
    canSwipe.set(phase === 'guess' ? 1 : 0);
  }, [phase, canSwipe]);

  // Keep the reveal visible briefly, then advance. The effect cleanup cancels
  // the transition when the player changes nutrient or leaves the screen.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const timeout = setTimeout(() => {
      if (lastCorrect) {
        const nextKnown = mystery;
        setKnown(nextKnown);
        setMystery(randomFood(nextKnown, metric, foodPool));
        setPhase('guess');
      } else {
        setPhase('over');
      }
    }, 1100);
    return () => clearTimeout(timeout);
  }, [phase, lastCorrect, mystery, metric, foodPool]);

  function answer(saidMore: boolean) {
    if (phase !== 'guess') return;
    const correct = saidMore === (mystery[metric] > known[metric]);
    setLastCorrect(correct);
    setPhase('reveal');
    if (correct) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const nextRun = run + 1;
      setRun(nextRun);
      setCorrectFoodIds((ids) => (ids.includes(mystery.id) ? ids : [...ids, mystery.id]));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // Record IMMEDIATELY — recording inside the reveal timer meant leaving
      // the screen (or switching metric) during the 1.1s reveal silently
      // discarded the run, including personal bests.
      Promise.all([
        recordHigherLower(run, stats, correctFoodIds, user?.id),
        awardGame('compare'),
      ]).then(([nextStats, awarded]) => {
        setStats(nextStats);
        setPointsEarned(awarded);
      }).catch(() => {});
    }
  }

  // Switching the compared nutrient starts a fresh pairing at run 0.
  function pickMetric(m: MetricKey) {
    if (m === metric) return;
    Haptics.selectionAsync().catch(() => {});
    const a = randomFood(undefined, m, foodPool);
    setMetric(m);
    setKnown(a);
    setMystery(randomFood(a, m, foodPool));
    setRun(0);
    setCorrectFoodIds([]);
    setPointsEarned(0);
    translateX.set(0);
    setPhase('guess');
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (canSwipe.get()) translateX.set(e.translationX);
    })
    .onEnd((e) => {
      'worklet';
      if (canSwipe.get() && e.translationX > SWIPE_THRESHOLD) {
        runOnJS(answer)(true);
      } else if (canSwipe.get() && e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(answer)(false);
      }
      translateX.set(withSpring(0, { damping: 18, stiffness: 180 }));
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }, { rotateZ: `${translateX.get() / 24}deg` }],
  }));
  const moreHint = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, translateX.get() / SWIPE_THRESHOLD)),
  }));
  const fewerHint = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -translateX.get() / SWIPE_THRESHOLD)),
  }));

  function playAgain() {
    const a = randomFood(undefined, metric, foodPool);
    setKnown(a);
    setMystery(randomFood(a, metric, foodPool));
    setRun(0);
    setCorrectFoodIds([]);
    translateX.set(0);
    setPhase('guess');
  }

  async function share() {
    const best = Math.max(stats.hlBest, run);
    try {
      await Share.share({
        message: `Trak — Higher or Lower\nI got a run of ${run}${best > run ? ` (best: ${best})` : ''} guessing which food has more ${metricInfo.label.toLowerCase()}.\nThink you know food?`,
      });
    } catch {
      // User closed the share sheet — nothing to do.
    }
  }

  const revealHighlight = phase !== 'guess' ? (lastCorrect ? 'right' : 'wrong') : null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Higher or Lower</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close game" onPress={() => router.back()} hitSlop={12}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>
          <Text style={[styles.runLine, { color: colors.textSecondary }]}>
            Run: {run} · Best: {Math.max(stats.hlBest, run)}
          </Text>

          {phase === 'over' ? (
            <View style={styles.overWrap}>
              <View style={[styles.overBadge, { backgroundColor: colors.backgroundElement }]}>
                <FlagIcon size={30} color={colors.accent} />
              </View>
              <Text style={[styles.overTitle, { color: colors.text }]}>
                Run over — you got {run}!
              </Text>
              <Text style={[styles.overSub, { color: colors.textSecondary }]}>
                {run >= stats.hlBest && run > 0
                  ? 'New personal best!'
                  : `Personal best: ${stats.hlBest}`}
              </Text>
              {pointsEarned > 0 ? (
                <Text style={[styles.pointsEarned, { color: colors.accentStrong }]}>+{pointsEarned} Trak Points</Text>
              ) : null}
              <View style={styles.overButtons}>
                <Pressable
                  style={[styles.shareBtn, { backgroundColor: colors.backgroundElement }]}
                  onPress={share}>
                  <ShareIcon size={16} color={colors.text} />
                  <Text style={[styles.shareText, { color: colors.text }]}>Share</Text>
                </Pressable>
                <Pressable style={styles.playBtn} onPress={playAgain}>
                  <Text style={styles.playText}>Play again</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.gameWrap}>
              {/* Instructions + nutrient picker pinned to the top */}
              <View style={styles.topInfo}>
                <View style={styles.metricTabs}>
                  {METRICS.map((m) => {
                    const active = m.key === metric;
                    return (
                      <Pressable
                        key={m.key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        onPress={() => pickMetric(m.key)}
                        style={[
                          styles.metricTab,
                          {
                            backgroundColor: active ? Brand.green : colors.backgroundElement,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.metricTabText,
                            { color: active ? '#ffffff' : colors.textSecondary },
                          ]}>
                          {m.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.vs, { color: colors.textSecondary }]}>
                  does the next one have more or less {metricInfo.label.toLowerCase()}?
                </Text>
                {phase === 'reveal' ? (
                  <Text
                    style={[styles.verdict, { color: lastCorrect ? colors.accentStrong : '#EF4444' }]}>
                    {lastCorrect ? 'Correct!' : 'Wrong!'}
                  </Text>
                ) : (
                  <Text style={[styles.swipeGuide, { color: colors.textSecondary }]}>
                    ← swipe left for fewer · swipe right for more →
                  </Text>
                )}
              </View>

              {/* Cards drop to the lower third so the mystery card sits under your thumb */}
              <View style={styles.cardsWrap}>
                <FoodCard food={known} value={fmt(known[metric])} colors={colors} />

                <View>
                  {/* directional hints behind the card */}
                  <Animated.View style={[styles.swipeHint, styles.hintLeft, fewerHint]}>
                    <Text style={[styles.hintText, { color: '#EF4444' }]}>▼ FEWER</Text>
                  </Animated.View>
                  <Animated.View style={[styles.swipeHint, styles.hintRight, moreHint]}>
                    <Text style={[styles.hintText, { color: colors.accentStrong }]}>MORE ▲</Text>
                  </Animated.View>

                  <GestureDetector gesture={pan}>
                    <Animated.View style={cardStyle}>
                      <FoodCard
                        food={mystery}
                        value={phase === 'reveal' ? fmt(mystery[metric]) : `? ${metricInfo.unit}`}
                        highlight={revealHighlight}
                        colors={colors}
                      />
                    </Animated.View>
                  </GestureDetector>
                </View>
                <View style={styles.answerButtons}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Fewer ${metricInfo.label.toLowerCase()}`}
                    accessibilityState={{ disabled: phase !== 'guess' }}
                    disabled={phase !== 'guess'}
                    onPress={() => answer(false)}
                    style={[styles.answerButton, { backgroundColor: colors.backgroundElement }]}>
                    <Text style={[styles.answerText, { color: colors.text }]}>Fewer</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`More ${metricInfo.label.toLowerCase()}`}
                    accessibilityState={{ disabled: phase !== 'guess' }}
                    disabled={phase !== 'guess'}
                    onPress={() => answer(true)}
                    style={[styles.answerButton, { backgroundColor: colors.greenTint }]}>
                    <Text style={[styles.answerText, { color: colors.text }]}>More</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
    </GestureHandlerRootView>
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
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },
  runLine: { fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: Spacing.four },

  gameWrap: { flex: 1 },
  topInfo: { gap: Spacing.three },
  metricTabs: { flexDirection: 'row', gap: Spacing.two },
  metricTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  metricTabText: { fontSize: 14, fontWeight: '800' },
  // marginTop:auto pushes the cards to the bottom of the flex area — thumb reach.
  cardsWrap: { marginTop: 'auto', gap: Spacing.three, paddingBottom: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2.5,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emojiTile: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 30 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 18, fontWeight: '800' },
  portionPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  portionText: { fontSize: 13, fontWeight: '700' },
  cardCals: { fontSize: 18, fontWeight: '800' },

  vs: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  verdict: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  swipeGuide: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  answerButtons: { flexDirection: 'row', gap: Spacing.two },
  answerButton: { flex: 1, minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  answerText: { fontSize: 15, fontWeight: '900' },

  swipeHint: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center', zIndex: 0 },
  hintLeft: { left: Spacing.two },
  hintRight: { right: Spacing.two },
  hintText: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  overWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  overBadge: {
    width: 72,
    minHeight: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  overTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  overSub: { fontSize: 14, fontWeight: '600' },
  pointsEarned: { fontSize: 14, fontWeight: '900', marginTop: Spacing.one },
  overButtons: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.four, alignSelf: 'stretch' },
  shareBtn: {
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.three,
  },
  shareText: { fontSize: 15, fontWeight: '700' },
  playBtn: {
    flex: 1,
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  playText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
