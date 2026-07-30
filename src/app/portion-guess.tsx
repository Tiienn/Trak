import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon, FlagIcon, TargetIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import {
  EMPTY_STATS,
  foodsForDeck,
  GAME_DECKS,
  loadGameStats,
  randomFood,
  recordPortionGuess,
  type GameStats,
  type Ingredient,
} from '@/lib/game';
import { useAppScheme } from '@/lib/theme';

const ROUND_COUNT = 5;

function roundToTen(value: number): number {
  return Math.max(10, Math.round(value / 10) * 10);
}

function answerOptions(food: Ingredient): number[] {
  const actual = food.calories;
  const values = new Set([
    actual,
    roundToTen(actual * 0.55),
    roundToTen(actual * 0.78),
    roundToTen(actual * 1.28),
    roundToTen(actual * 1.55),
  ]);
  let offset = 60;
  while (values.size < 4) {
    values.add(roundToTen(actual + offset));
    offset += 40;
  }
  const distractors = Array.from(values).filter((value) => value !== actual);
  const selected = [actual, ...distractors.sort(() => Math.random() - 0.5).slice(0, 3)];
  return selected.sort(() => Math.random() - 0.5);
}

export default function PortionGuessScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { deck, foods } = useLocalSearchParams<{ deck?: string; foods?: string }>();
  const foodPool = useMemo(
    () => foodsForDeck(deck, foods ? foods.split(',').filter(Boolean) : undefined),
    [deck, foods]
  );
  const deckLabel = GAME_DECKS.find((item) => item.key === deck)?.label ?? 'Global mix';
  const [food, setFood] = useState<Ingredient>(() => randomFood(undefined, 'calories', foodPool));
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [phase, setPhase] = useState<'guess' | 'reveal' | 'over'>('guess');
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const options = useMemo(() => answerOptions(food), [food]);

  useEffect(() => {
    loadGameStats().then(setStats);
  }, []);

  async function choose(value: number) {
    if (phase !== 'guess') return;
    const correct = value === food.calories;
    setChosen(value);
    setPhase('reveal');
    if (correct) {
      setScore((current) => current + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    setStats(await recordPortionGuess(correct, food.id, stats));
  }

  function next() {
    if (round + 1 >= ROUND_COUNT) {
      setPhase('over');
      return;
    }
    setRound((current) => current + 1);
    setFood(randomFood(food, 'calories', foodPool));
    setChosen(null);
    setPhase('guess');
  }

  function playAgain() {
    setFood(randomFood(undefined, 'calories', foodPool));
    setRound(0);
    setScore(0);
    setChosen(null);
    setPhase('guess');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: Brand.greenDark }]}>PORTION GUESS</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{deckLabel}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close game" onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.close, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        {phase === 'over' ? (
          <View style={styles.over}>
            <View style={[styles.overIcon, { backgroundColor: colors.greenTint }]}>
              <FlagIcon size={32} color={Brand.green} />
            </View>
            <Text style={[styles.overTitle, { color: colors.text }]}>Round complete</Text>
            <Text style={[styles.overScore, { color: Brand.greenDark }]}>{score}/{ROUND_COUNT}</Text>
            <Text style={[styles.overBody, { color: colors.textSecondary }]}>Each correct answer builds mastery for that food.</Text>
            <View style={styles.overActions}>
              <Pressable
                accessibilityRole="button"
                style={[styles.secondaryButton, { backgroundColor: colors.backgroundElement }]}
                onPress={() => router.back()}>
                <Text style={[styles.secondaryText, { color: colors.text }]}>Done</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={playAgain}>
                <Text style={styles.primaryText}>Play again</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.progressRow}>
              {Array.from({ length: ROUND_COUNT }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressSegment,
                    { backgroundColor: index <= round ? Brand.green : colors.backgroundSelected },
                  ]}
                />
              ))}
            </View>

            <View style={[styles.questionCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={[styles.iconTile, { backgroundColor: colors.greenTint }]}>
                <TargetIcon size={28} color={Brand.green} />
              </View>
              <Text style={[styles.roundLabel, { color: colors.textSecondary }]}>Question {round + 1} of {ROUND_COUNT}</Text>
              <Text style={[styles.question, { color: colors.text }]}>How many calories?</Text>
              <Text style={[styles.foodName, { color: colors.text }]}>{food.name}</Text>
              <View style={[styles.portionPill, { backgroundColor: colors.background }]}>
                <Text style={[styles.portion, { color: colors.textSecondary }]}>{food.portion}</Text>
              </View>
            </View>

            <View style={styles.options}>
              {options.map((value) => {
                const isCorrect = value === food.calories;
                const isChosen = chosen === value;
                const revealCorrect = phase === 'reveal' && isCorrect;
                const revealWrong = phase === 'reveal' && isChosen && !isCorrect;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${value} calories`}
                    accessibilityState={{ disabled: phase !== 'guess' }}
                    disabled={phase !== 'guess'}
                    onPress={() => choose(value)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: revealCorrect
                          ? colors.greenTint
                          : colors.backgroundElement,
                        borderColor: revealCorrect
                          ? Brand.green
                          : revealWrong
                            ? Brand.over
                            : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.optionValue, { color: colors.text }]}>{value}</Text>
                    <Text style={[styles.optionUnit, { color: colors.textSecondary }]}>kcal</Text>
                    {revealCorrect ? <CheckIcon size={17} color={Brand.green} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {phase === 'reveal' ? (
              <View style={[styles.feedback, { backgroundColor: colors.greenTint }]}>
                <Text style={[styles.feedbackTitle, { color: colors.text }]}>
                  {chosen === food.calories ? 'Exactly right' : 'Now you know'}
                </Text>
                <Text style={[styles.feedbackBody, { color: colors.textSecondary }]}>
                  {food.portion} of {food.name.toLowerCase()} is about {food.calories} kcal.
                </Text>
                <Pressable accessibilityRole="button" style={styles.nextButton} onPress={next}>
                  <Text style={styles.nextText}>{round + 1 === ROUND_COUNT ? 'See result' : 'Next question'}</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>Choose the closest estimate. You will see the answer immediately.</Text>
            )}
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.two },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  close: { fontSize: 20, fontWeight: '700' },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: Spacing.four },
  progressSegment: { height: 5, flex: 1, borderRadius: 999 },
  questionCard: { borderRadius: 22, alignItems: 'center', padding: Spacing.four, marginTop: Spacing.four },
  iconTile: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  roundLabel: { fontSize: 12, fontWeight: '700', marginTop: Spacing.three },
  question: { fontFamily: Type.display, fontSize: 30, marginTop: 4 },
  foodName: { fontSize: 22, fontWeight: '800', marginTop: Spacing.three },
  portionPill: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginTop: Spacing.two },
  portion: { fontSize: 14, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  option: { width: '48.7%', minHeight: 70, borderRadius: 16, borderWidth: 2, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 5, padding: Spacing.three },
  optionValue: { fontSize: 24, fontWeight: '900' },
  optionUnit: { fontSize: 12, fontWeight: '700' },
  feedback: { borderRadius: 18, padding: Spacing.three, marginTop: Spacing.three },
  feedbackTitle: { fontSize: 18, fontWeight: '800' },
  feedbackBody: { fontSize: 13, lineHeight: 19, marginTop: 3 },
  nextButton: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: Brand.green, borderRadius: 14, paddingVertical: 12, marginTop: Spacing.three },
  nextText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: Spacing.three, paddingHorizontal: Spacing.three },
  over: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  overTitle: { fontFamily: Type.display, fontSize: 30, marginTop: Spacing.three },
  overScore: { fontSize: 52, fontWeight: '900', marginTop: Spacing.one },
  overBody: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: Spacing.two },
  overActions: { flexDirection: 'row', gap: Spacing.two, alignSelf: 'stretch', marginTop: Spacing.four },
  secondaryButton: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: 16 },
  secondaryText: { fontSize: 15, fontWeight: '800' },
  primaryButton: { flex: 1, alignItems: 'center', paddingVertical: Spacing.three, borderRadius: 16, backgroundColor: Brand.green },
  primaryText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
