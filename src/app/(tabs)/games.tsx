import { Image, type ImageSource } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BalanceIcon,
  BarcodeIcon,
  BuildMealIcon,
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  PortionIcon,
  SparklesIcon,
  TargetIcon,
} from '@/components/icons';
import { RingMark, TrakWordmark } from '@/components/logo';
import { ProfileAvatarButton } from '@/components/profile-avatar-button';
import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import {
  decksForGroup,
  EMPTY_STATS,
  foodsForDeck,
  loadGameStats,
  masteredFoodCount,
  personalizedFoodIds,
  type DeckGroup,
  type GameDeck,
  type GameStats,
} from '@/lib/game';
import { useAuth } from '@/lib/auth';
import { dayKey, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

type GameMode = 'compare' | 'portion' | 'build';

const GROUPS: { key: DeckGroup; label: string }[] = [
  { key: 'food', label: 'Food type' },
  { key: 'meal', label: 'Meal' },
  { key: 'cuisine', label: 'Cuisine' },
];

const DECK_IMAGES: Record<string, ImageSource> = {
  personal: require('@/assets/images/games/deck-personal.png'),
  everyday: require('@/assets/images/games/deck-everyday.png'),
  restaurant: require('@/assets/images/games/deck-restaurant.png'),
  'drinks-snacks': require('@/assets/images/games/deck-drinks.png'),
  'protein-foods': require('@/assets/images/games/deck-protein.png'),
  'sauces-extras': require('@/assets/images/games/deck-sauces.png'),
  'breakfast-meal': require('@/assets/images/games/deck-everyday.png'),
  'lunch-dinner': require('@/assets/images/games/deck-personal.png'),
  'light-meals': require('@/assets/images/games/deck-protein.png'),
  'snack-time': require('@/assets/images/games/deck-drinks.png'),
  'global-basics': require('@/assets/images/games/deck-personal.png'),
  mediterranean: require('@/assets/images/games/deck-everyday.png'),
  'south-asian': require('@/assets/images/games/deck-personal.png'),
  'east-asian': require('@/assets/images/games/deck-personal.png'),
  'african-indian-ocean': require('@/assets/images/games/deck-restaurant.png'),
  'middle-eastern': require('@/assets/images/games/deck-sauces.png'),
  'latin-american': require('@/assets/images/games/deck-personal.png'),
};

function ProgressBar({ value, color, track }: { value: number; color: string; track: string }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: track }]}>
      <View style={[styles.progressFill, { backgroundColor: color, width: `${Math.max(4, value * 100)}%` }]} />
    </View>
  );
}

function ModeButton({
  mode,
  active,
  colors,
  onPress,
}: {
  mode: GameMode;
  active: boolean;
  colors: (typeof Colors)[keyof typeof Colors];
  onPress: () => void;
}) {
  const label = mode === 'compare' ? 'Compare' : mode === 'portion' ? 'Portion' : 'Build';
  const Icon = mode === 'compare' ? BalanceIcon : mode === 'portion' ? PortionIcon : BuildMealIcon;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${label} game mode`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.modeButton, active && { backgroundColor: colors.greenTint }]}>
      <Icon size={18} color={active ? colors.accent : colors.textSecondary} />
      <Text maxFontSizeMultiplier={1.5} style={[styles.modeLabel, { color: active ? colors.text : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export default function GamesScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.8;
  const { user } = useAuth();
  const { recentMeals } = useMeals();
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);
  const [group, setGroup] = useState<DeckGroup>('food');
  const [selectedKey, setSelectedKey] = useState('personal');
  const [mode, setMode] = useState<GameMode>('portion');

  useFocusEffect(
    useCallback(() => {
      loadGameStats(user?.id).then(setStats);
    }, [user?.id])
  );

  const personalIds = useMemo(
    () =>
      personalizedFoodIds(
        recentMeals.flatMap((meal) => [meal.title, ...meal.items.map((item) => item.name)])
      ),
    [recentMeals]
  );
  const decks = decksForGroup(group);
  const featured = decks[0];
  const selectedDeck = decks.find((deck) => deck.key === selectedKey) ?? featured;

  function chooseGroup(nextGroup: DeckGroup) {
    const nextDeck = decksForGroup(nextGroup)[0];
    setGroup(nextGroup);
    setSelectedKey(nextDeck.key);
  }

  function deckProgress(deck: GameDeck) {
    const foods = foodsForDeck(deck.key, deck.key === 'personal' ? personalIds : undefined);
    return { foods, mastered: masteredFoodCount(foods, stats) };
  }

  function playSelectedDeck() {
    const params: Record<string, string> = { deck: selectedDeck.key };
    if (selectedDeck.key === 'personal') params.foods = personalIds.join(',');
    if (mode === 'compare') router.push({ pathname: '/higher-lower', params });
    else if (mode === 'portion') router.push({ pathname: '/portion-guess', params });
    else router.push({ pathname: '/game', params: { ...params, mode: 'free' } });
  }

  function playDailyChallenge() {
    const params: Record<string, string> = { deck: selectedDeck.key };
    if (selectedDeck.key === 'personal') params.foods = personalIds.join(',');
    router.push({ pathname: '/game', params });
  }

  const featuredProgress = deckProgress(featured);

  return (
    <View testID="screen-games" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.brandRow}>
              <RingMark size={30} />
              <TrakWordmark color={colors.text} size={28} />
            </View>
            <ProfileAvatarButton colors={colors} />
          </View>
          <Text maxFontSizeMultiplier={2} style={[styles.title, { color: colors.text }]}>Choose a food deck</Text>
          <Text maxFontSizeMultiplier={2} style={[styles.subtitle, { color: colors.textSecondary }]}>Practice the foods you actually eat.</Text>
        </View>

        <View accessibilityRole="tablist" accessibilityLabel="Food deck groups" style={[styles.groupTabs, { backgroundColor: colors.backgroundElement }]}>
          {GROUPS.map((item) => {
            const active = item.key === group;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityLabel={`${item.label} decks`}
                accessibilityState={{ selected: active }}
                onPress={() => chooseGroup(item.key)}
                style={[styles.groupTab, active && { backgroundColor: colors.background }]}>
                <Text
                  maxFontSizeMultiplier={1.5}
                  style={[
                    styles.groupLabel,
                    { color: active ? colors.text : colors.textSecondary },
                  ]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.deckScroller}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play today's Build challenge for 10 Trak Points"
            onPress={playDailyChallenge}
            style={[styles.dailyCard, { backgroundColor: colors.greenTint }]}>
            <View style={[styles.dailyIcon, { backgroundColor: colors.background }]}>
              {stats.lastDailyDay === dayKey() ? (
                <CheckIcon size={18} color={colors.accent} />
              ) : (
                <TargetIcon size={18} color={colors.accent} />
              )}
            </View>
            <View style={styles.dailyCopy}>
              <Text maxFontSizeMultiplier={2} style={[styles.dailyTitle, { color: colors.text }]}>Today&apos;s Build challenge</Text>
              <Text maxFontSizeMultiplier={2} style={[styles.dailyBody, { color: colors.textSecondary }]}>One target · 10 Trak Points</Text>
            </View>
            <Text maxFontSizeMultiplier={1.5} style={[styles.dailyAction, { color: colors.text }]}>
              {stats.lastDailyDay === dayKey() ? 'Play again' : 'Play'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${featured.label}, ${featuredProgress.foods.length} foods, ${featuredProgress.mastered} mastered`}
            accessibilityState={{ selected: selectedKey === featured.key }}
            onPress={() => setSelectedKey(featured.key)}
            style={[
              styles.featured,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: selectedKey === featured.key ? colors.accent : 'transparent',
              },
            ]}>
            <Image source={DECK_IMAGES[featured.key]} style={styles.featuredImage} contentFit="cover" />
            {scheme === 'dark' ? (
              <View style={[styles.featuredScrim, { backgroundColor: 'rgba(18,20,15,0.82)' }]} />
            ) : null}
            <View style={[styles.featuredContent, largeText && styles.featuredContentLargeText]}>
              <Text maxFontSizeMultiplier={2} style={[styles.featuredTitle, { color: colors.text }]}>{featured.label}</Text>
              <Text maxFontSizeMultiplier={2} style={[styles.featuredCount, { color: colors.textSecondary }]}>
                {featuredProgress.foods.length} foods
              </Text>
              <Text maxFontSizeMultiplier={2} style={[styles.featuredMastered, { color: colors.accentStrong }]}>
                {featuredProgress.mastered} mastered
              </Text>
              <ProgressBar
                value={featuredProgress.mastered / featuredProgress.foods.length}
                color={colors.accent}
                track={colors.backgroundSelected}
              />
              <View style={styles.sources}>
                <View style={styles.sourceItem}>
                  <CameraIcon size={18} color={colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.5} style={[styles.sourceText, { color: colors.textSecondary }]}>Camera</Text>
                </View>
                <View style={styles.sourceItem}>
                  <BarcodeIcon size={18} color={colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.5} style={[styles.sourceText, { color: colors.textSecondary }]}>Barcode</Text>
                </View>
                <View style={styles.sourceItem}>
                  <SparklesIcon size={18} color={colors.textSecondary} />
                  <Text maxFontSizeMultiplier={1.5} style={[styles.sourceText, { color: colors.textSecondary }]}>Chat</Text>
                </View>
              </View>
            </View>
            {selectedKey === featured.key ? (
              <View style={styles.featuredCheck}>
                <CheckIcon size={15} color="#ffffff" />
              </View>
            ) : null}
          </Pressable>

          <View style={[styles.deckList, { backgroundColor: colors.backgroundElement }]}>
            {decks.slice(1).map((deck, index) => {
              const progress = deckProgress(deck);
              const selected = selectedKey === deck.key;
              return (
                <Pressable
                  key={deck.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${deck.label}, ${progress.foods.length} foods, ${progress.mastered} mastered`}
                  accessibilityState={{ selected }}
                  onPress={() => setSelectedKey(deck.key)}
                  style={[
                    styles.deckRow,
                    selected && { backgroundColor: colors.greenTint },
                    index > 0 && { borderTopColor: colors.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}>
                  <Image source={DECK_IMAGES[deck.key]} style={styles.deckImage} contentFit="cover" />
                  <View style={styles.deckInfo}>
                    <Text maxFontSizeMultiplier={2} style={[styles.deckTitle, { color: colors.text }]}>
                      {deck.label}
                    </Text>
                    <Text maxFontSizeMultiplier={2} style={[styles.deckCount, { color: colors.textSecondary }]}>{progress.foods.length} foods</Text>
                  </View>
                  <View style={styles.deckProgress}>
                    <Text maxFontSizeMultiplier={1.5} style={[styles.deckMastered, { color: colors.accentStrong }]}>{progress.mastered} mastered</Text>
                    <ProgressBar
                      value={progress.mastered / progress.foods.length}
                      color={colors.accent}
                      track={colors.backgroundSelected}
                    />
                  </View>
                  <View style={styles.deckChevron}>
                    <ChevronDownIcon size={18} color={selected ? colors.accent : colors.textSecondary} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.background }]}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Game mode" style={[styles.modePicker, { backgroundColor: colors.backgroundElement }]}>
            {(['compare', 'portion', 'build'] as const).map((gameMode) => (
              <ModeButton
                key={gameMode}
                mode={gameMode}
                active={mode === gameMode}
                colors={colors}
                onPress={() => setMode(gameMode)}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play ${selectedDeck.label} in ${mode === 'compare' ? 'Compare' : mode === 'portion' ? 'Portion' : 'Build'} mode`}
            onPress={playSelectedDeck}
            style={({ pressed }) => [styles.playButton, { opacity: pressed ? 0.86 : 1 }]}>
            <Text maxFontSizeMultiplier={2} style={styles.playText}>Play selected deck</Text>
            <View style={styles.playArrow}>
              <ChevronDownIcon size={21} color="#ffffff" />
            </View>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Sits directly under the Trak wordmark (28), so it stays smaller than the brand.
  title: { fontFamily: Type.display, fontSize: 24, lineHeight: 29, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  groupTabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.four,
    borderRadius: 999,
    padding: 3,
    gap: 2,
    marginBottom: Spacing.three,
  },
  groupTab: { flex: 1, borderRadius: 999, paddingVertical: 7, alignItems: 'center' },
  groupLabel: { fontSize: 14, fontWeight: '700' },
  deckScroller: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, gap: Spacing.three },
  dailyCard: { minHeight: 66, borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  dailyIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dailyCopy: { flex: 1 },
  dailyTitle: { fontSize: 14, fontWeight: '900' },
  dailyBody: { fontSize: 11, marginTop: 2 },
  dailyAction: { fontSize: 12, fontWeight: '900' },
  featured: { minHeight: 202, borderRadius: 20, overflow: 'hidden', borderWidth: 2 },
  featuredImage: StyleSheet.absoluteFill,
  featuredScrim: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '52%' },
  featuredContent: { width: '52%', minHeight: 202, padding: Spacing.three, justifyContent: 'center' },
  featuredContentLargeText: { width: '82%' },
  featuredTitle: { fontFamily: Type.display, fontSize: 25, lineHeight: 29, letterSpacing: -0.4 },
  featuredCount: { fontSize: 13, marginTop: 6 },
  featuredMastered: { fontSize: 13, fontWeight: '800', marginTop: 12 },
  progressTrack: { height: 5, borderRadius: 999, overflow: 'hidden', marginTop: 5 },
  progressFill: { height: '100%', borderRadius: 999 },
  sources: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sourceItem: { alignItems: 'center', gap: 2 },
  sourceText: { fontSize: 9, fontWeight: '600' },
  featuredCheck: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.green,
  },
  deckList: { borderRadius: 20, overflow: 'hidden' },
  deckRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 },
  deckImage: { width: 54, height: 54, borderRadius: 13 },
  deckInfo: { flex: 1, minWidth: 0 },
  deckTitle: { fontSize: 15, fontWeight: '800' },
  deckCount: { fontSize: 12, marginTop: 3 },
  deckProgress: { width: 82 },
  deckMastered: { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  modePicker: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  modeButton: { flex: 1, minHeight: 40, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  modeLabel: { fontSize: 13, fontWeight: '800' },
  playButton: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: Brand.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  playText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  playArrow: { position: 'absolute', right: Spacing.three, transform: [{ rotate: '-90deg' }] },
  deckChevron: { transform: [{ rotate: '-90deg' }] },
});
