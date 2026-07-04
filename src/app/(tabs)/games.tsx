import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { dailyChallenge, EMPTY_STATS, loadGameStats, type GameStats } from '@/lib/game';
import { dayKey } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

function StatBox({ value, label, colors }: { value: string; label: string; colors: ThemeColors }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/** The games hub — daily challenge, free play, and what's coming next. */
export default function GamesScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const [stats, setStats] = useState<GameStats>(EMPTY_STATS);

  // Refresh stats every time the tab comes into focus (e.g. after a round).
  useFocusEffect(
    useCallback(() => {
      loadGameStats().then(setStats);
    }, [])
  );

  const daily = dailyChallenge();
  const dailyDone = stats.lastDailyDay === dayKey();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={[styles.title, { color: colors.text }]}>Games</Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Lifetime stats */}
          <View style={[styles.statsCard, { backgroundColor: colors.backgroundElement }]}>
            <StatBox
              value={stats.dailyStreak > 0 ? `🔥 ${stats.dailyStreak}` : '—'}
              label="day streak"
              colors={colors}
            />
            <StatBox value={String(stats.played)} label="played" colors={colors} />
            <StatBox value={String(stats.threeStar)} label="3-star" colors={colors} />
            <StatBox
              value={stats.bestDiffPct === null ? '—' : `${stats.bestDiffPct}%`}
              label="best miss"
              colors={colors}
            />
          </View>

          {/* Daily challenge */}
          <Pressable
            style={({ pressed }) => [
              styles.gameCard,
              { backgroundColor: colors.greenTint, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push('/game')}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameEmoji}>🎯</Text>
              {dailyDone ? (
                <Text style={[styles.donePill, { color: Brand.greenDark }]}>✓ Done today</Text>
              ) : (
                <Text style={[styles.newPill, { color: Brand.greenDark }]}>NEW</Text>
              )}
            </View>
            <Text style={[styles.gameTitle, { color: colors.text }]}>Daily challenge</Text>
            <Text style={[styles.gameDesc, { color: colors.textSecondary }]}>
              Build a meal with ~{daily.targetCalories} kcal and {daily.minProtein} g+ protein.
              Everyone gets the same one — come back tomorrow for the next.
            </Text>
          </Pressable>

          {/* Free play */}
          <Pressable
            style={({ pressed }) => [
              styles.gameCard,
              { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
            ]}
            onPress={() => router.push('/game?mode=free')}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameEmoji}>🎲</Text>
            </View>
            <Text style={[styles.gameTitle, { color: colors.text }]}>Free play</Text>
            <Text style={[styles.gameDesc, { color: colors.textSecondary }]}>
              Endless random targets. Sharpen your calorie eye.
            </Text>
          </Pressable>

          {/* Higher or Lower */}
          <Pressable
            style={({ pressed }) => [
              styles.gameCard,
              { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
            ]}
            onPress={() => router.push('/higher-lower')}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameEmoji}>🔼🔽</Text>
              {stats.hlBest > 0 ? (
                <Text style={[styles.donePill, { color: Brand.greenDark }]}>
                  Best run: {stats.hlBest}
                </Text>
              ) : (
                <Text style={[styles.newPill, { color: Brand.greenDark }]}>NEW</Text>
              )}
            </View>
            <Text style={[styles.gameTitle, { color: colors.text }]}>Higher or Lower</Text>
            <Text style={[styles.gameDesc, { color: colors.textSecondary }]}>
              Which food has more calories? Keep the run alive.
            </Text>
          </Pressable>

          {/* Guess before you scan */}
          <Pressable
            style={({ pressed }) => [
              styles.gameCard,
              { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
            ]}
            onPress={() => router.push('/scan')}>
            <View style={styles.gameHeader}>
              <Text style={styles.gameEmoji}>📸</Text>
              {stats.guessCount > 0 ? (
                <Text style={[styles.donePill, { color: Brand.greenDark }]}>
                  avg miss {Math.round(stats.guessErrSum / stats.guessCount)}%
                </Text>
              ) : (
                <Text style={[styles.newPill, { color: Brand.greenDark }]}>NEW</Text>
              )}
            </View>
            <Text style={[styles.gameTitle, { color: colors.text }]}>Guess before you scan</Text>
            <Text style={[styles.gameDesc, { color: colors.textSecondary }]}>
              Scan a real meal and guess its calories while the AI thinks. Every scan becomes a
              round.
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  title: { fontSize: 30, fontWeight: '800', paddingTop: Spacing.two, marginBottom: Spacing.three },

  scroll: { paddingBottom: Spacing.six, gap: Spacing.three },

  statsCard: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600' },

  gameCard: { borderRadius: 20, padding: Spacing.four, gap: 6 },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gameEmoji: { fontSize: 30 },
  newPill: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  donePill: { fontSize: 13, fontWeight: '800' },
  gameTitle: { fontSize: 19, fontWeight: '800' },
  gameDesc: { fontSize: 13, lineHeight: 19 },

});
