import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import {
  EMPTY_STATS,
  loadGameStats,
  randomFood,
  recordHigherLower,
  type GameStats,
  type Ingredient,
} from '@/lib/game';
import { useAppScheme } from '@/lib/theme';

type Phase = 'guess' | 'reveal' | 'over';

function FoodCard({
  food,
  calories,
  highlight,
  colors,
}: {
  food: Ingredient;
  calories: string;
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
            highlight === 'right' ? Brand.green : highlight === 'wrong' ? '#EF4444' : 'transparent',
        },
      ]}>
      <View style={[styles.emojiTile, { backgroundColor: colors.background }]}>
        <Text style={styles.cardEmoji}>{food.emoji}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {food.name}
        </Text>
        <Text style={[styles.cardPortion, { color: colors.textSecondary }]}>{food.portion}</Text>
      </View>
      <Text style={[styles.cardCals, { color: colors.text }]}>{calories}</Text>
    </View>
  );
}

const SWIPE_THRESHOLD = 90;

export default function HigherLowerScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];

  const [known, setKnown] = useState<Ingredient>(() => randomFood());
  const [mystery, setMystery] = useState<Ingredient>(() => randomFood());
  const [phase, setPhase] = useState<Phase>('guess');
  const [run, setRun] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateX = useSharedValue(0);
  const canSwipe = useSharedValue(1);

  useEffect(() => {
    setMystery(randomFood(known));
    loadGameStats().then(setStats);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    canSwipe.value = phase === 'guess' ? 1 : 0;
  }, [phase, canSwipe]);

  function answer(saidMore: boolean) {
    if (phase !== 'guess') return;
    const correct = saidMore === (mystery.calories > known.calories);
    setLastCorrect(correct);
    setPhase('reveal');
    if (correct) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const nextRun = run + 1;
      setRun(nextRun);
      timer.current = setTimeout(() => {
        const nextKnown = mystery;
        setKnown(nextKnown);
        setMystery(randomFood(nextKnown));
        setPhase('guess');
      }, 1100);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      timer.current = setTimeout(async () => {
        setPhase('over');
        setStats(await recordHigherLower(run, stats));
      }, 1100);
    }
  }

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (canSwipe.value) translateX.value = e.translationX;
    })
    .onEnd((e) => {
      'worklet';
      if (canSwipe.value && e.translationX > SWIPE_THRESHOLD) {
        runOnJS(answer)(true);
      } else if (canSwipe.value && e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(answer)(false);
      }
      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { rotateZ: `${translateX.value / 24}deg` }],
  }));
  const moreHint = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, translateX.value / SWIPE_THRESHOLD)),
  }));
  const fewerHint = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -translateX.value / SWIPE_THRESHOLD)),
  }));

  function playAgain() {
    const a = randomFood();
    setKnown(a);
    setMystery(randomFood(a));
    setRun(0);
    translateX.value = 0;
    setPhase('guess');
  }

  async function share() {
    const best = Math.max(stats.hlBest, run);
    try {
      await Share.share({
        message: `Trak — Higher or Lower\nI got a run of ${run}${best > run ? ` (best: ${best})` : ''} guessing which food has more calories.\nThink you know food?`,
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
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>
          <Text style={[styles.runLine, { color: colors.textSecondary }]}>
            Run: {run} · Best: {Math.max(stats.hlBest, run)}
          </Text>

          {phase === 'over' ? (
            <View style={styles.overWrap}>
              <View style={[styles.overBadge, { backgroundColor: colors.backgroundElement }]}>
                <FlagIcon size={30} color={Brand.green} />
              </View>
              <Text style={[styles.overTitle, { color: colors.text }]}>
                Run over — you got {run}!
              </Text>
              <Text style={[styles.overSub, { color: colors.textSecondary }]}>
                {run >= stats.hlBest && run > 0
                  ? 'New personal best!'
                  : `Personal best: ${stats.hlBest}`}
              </Text>
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
              <FoodCard food={known} calories={`${known.calories} kcal`} colors={colors} />

              <Text style={[styles.vs, { color: colors.textSecondary }]}>
                does the next one have more or fewer calories?
              </Text>

              <View>
                {/* directional hints behind the card */}
                <Animated.View style={[styles.swipeHint, styles.hintLeft, fewerHint]}>
                  <Text style={[styles.hintText, { color: '#EF4444' }]}>▼ FEWER</Text>
                </Animated.View>
                <Animated.View style={[styles.swipeHint, styles.hintRight, moreHint]}>
                  <Text style={[styles.hintText, { color: Brand.greenDark }]}>MORE ▲</Text>
                </Animated.View>

                <GestureDetector gesture={pan}>
                  <Animated.View style={cardStyle}>
                    <FoodCard
                      food={mystery}
                      calories={phase === 'reveal' ? `${mystery.calories} kcal` : '? kcal'}
                      highlight={revealHighlight}
                      colors={colors}
                    />
                  </Animated.View>
                </GestureDetector>
              </View>

              {phase === 'reveal' ? (
                <Text
                  style={[styles.verdict, { color: lastCorrect ? Brand.greenDark : '#EF4444' }]}>
                  {lastCorrect ? 'Correct!' : 'Wrong!'}
                </Text>
              ) : (
                <Text style={[styles.swipeGuide, { color: colors.textSecondary }]}>
                  ← swipe left for fewer · swipe right for more →
                </Text>
              )}
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

  gameWrap: { flex: 1, gap: Spacing.three },
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
  cardPortion: { fontSize: 13, marginTop: 2 },
  cardCals: { fontSize: 18, fontWeight: '800' },

  vs: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  verdict: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: Spacing.three },
  swipeGuide: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: Spacing.three },

  swipeHint: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center', zIndex: 0 },
  hintLeft: { left: Spacing.two },
  hintRight: { right: Spacing.two },
  hintText: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },

  overWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  overBadge: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  overTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  overSub: { fontSize: 14, fontWeight: '600' },
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
