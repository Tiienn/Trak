import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

type Badge = {
  emoji: string;
  title: string;
  desc: string;
  earned: boolean;
};

function BadgeCard({ badge, colors }: { badge: Badge; colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badge.earned ? colors.greenTint : colors.backgroundElement,
          borderColor: badge.earned ? Brand.green : 'transparent',
        },
      ]}>
      <Text style={[styles.badgeEmoji, !badge.earned && styles.locked]}>{badge.emoji}</Text>
      <Text
        style={[
          styles.badgeTitle,
          { color: badge.earned ? colors.text : colors.textSecondary },
        ]}
        numberOfLines={1}>
        {badge.title}
      </Text>
      <Text style={[styles.badgeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
        {badge.desc}
      </Text>
    </View>
  );
}

export default function AchievementsScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { meals, weights, streak, waterToday, waterGoal, burnedToday } = useMeals();

  const badges: Badge[] = [
    { emoji: '🍽️', title: 'First bite', desc: 'Log your first meal', earned: meals.length >= 1 },
    { emoji: '🔥', title: '3-day streak', desc: 'Log meals 3 days in a row', earned: streak >= 3 },
    { emoji: '📅', title: 'One week strong', desc: 'A 7-day logging streak', earned: streak >= 7 },
    { emoji: '🏆', title: 'Unstoppable', desc: 'A 30-day logging streak', earned: streak >= 30 },
    { emoji: '⚖️', title: 'Stepped on', desc: 'Log your weight once', earned: weights.length >= 1 },
    { emoji: '📈', title: 'Trend setter', desc: 'Log weight 5 times', earned: weights.length >= 5 },
    { emoji: '💧', title: 'Hydrated', desc: 'Hit your water goal today', earned: waterToday >= waterGoal && waterGoal > 0 },
    { emoji: '🏃', title: 'Moved today', desc: 'Log a workout today', earned: burnedToday > 0 },
  ];

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Achievements</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Streak hero */}
          <View style={[styles.hero, { backgroundColor: colors.backgroundElement }]}>
            <Text style={styles.heroEmoji}>🔥</Text>
            <Text style={[styles.heroValue, { color: colors.text }]}>
              {streak} day{streak === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
              {streak > 0 ? 'current logging streak' : 'Log a meal to start a streak'}
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            BADGES · {earnedCount}/{badges.length}
          </Text>
          <View style={styles.grid}>
            {badges.map((b) => (
              <BadgeCard key={b.title} badge={b} colors={colors} />
            ))}
          </View>
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
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },

  scroll: { paddingBottom: Spacing.four, gap: Spacing.four },

  hero: { borderRadius: 24, paddingVertical: Spacing.five, alignItems: 'center', gap: 4 },
  heroEmoji: { fontSize: 40 },
  heroValue: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  heroLabel: { fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  badge: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 2,
    padding: Spacing.three,
    gap: 4,
  },
  badgeEmoji: { fontSize: 28 },
  locked: { opacity: 0.35 },
  badgeTitle: { fontSize: 15, fontWeight: '800' },
  badgeDesc: { fontSize: 12, lineHeight: 16 },
});
