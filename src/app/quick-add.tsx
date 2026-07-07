import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlateIcon } from '@/components/icons';
import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import type { FoodItem, FoodTotals } from '@/lib/types';

type QuickItem = {
  id: string;
  title: string;
  total: FoodTotals;
  items: FoodItem[];
};

function Row({
  item,
  added,
  colors,
  onAdd,
  onRemove,
}: {
  item: QuickItem;
  added: boolean;
  colors: ThemeColors;
  onAdd: () => void;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [
          styles.rowMain,
          { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
        ]}
        onPress={onAdd}>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
            {item.total.calories} kcal · {item.total.protein_g}p · {item.total.carbs_g}c ·{' '}
            {item.total.fat_g}f
          </Text>
        </View>
        {added ? (
          <Text style={[styles.added, { color: Brand.green }]}>Added ✓</Text>
        ) : (
          <View style={[styles.addPill, { backgroundColor: colors.greenTint }]}>
            <Text style={[styles.addPillText, { color: Brand.greenDark }]}>＋ Add</Text>
          </View>
        )}
      </Pressable>
      {onRemove ? (
        <Pressable hitSlop={8} onPress={onRemove} style={styles.removeBtn}>
          <Text style={[styles.removeText, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** How many recent suggestions to show at once (dismissing one reveals the next). */
const RECENT_WINDOW = 6;

export default function QuickAddScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { savedMeals, recentMeals, quickLog, removeSavedMeal } = useMeals();
  // Keyed by normalized TITLE, not id: logging a recent meal inserts a new row
  // whose id replaces the old one in the dedup list, orphaning id-keyed flags
  // (no "Added ✓" feedback, and dismissed rows resurrected).
  const keyOf = (m: { title: string }) => m.title.trim().toLowerCase();
  const [added, setAdded] = useState<Record<string, boolean>>({});
  // Recent suggestions the user waved off this session — the next ones backfill.
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const visibleRecent = recentMeals.filter((m) => !dismissed[keyOf(m)]).slice(0, RECENT_WINDOW);
  const hiddenCount = recentMeals.filter((m) => !dismissed[keyOf(m)]).length - visibleRecent.length;

  async function add(item: QuickItem) {
    try {
      await quickLog({ title: item.title, total: item.total, items: item.items });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const key = keyOf(item);
      setAdded((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => setAdded((prev) => ({ ...prev, [key]: false })), 1300);
    } catch (e: any) {
      Alert.alert('Not added', e?.message ?? 'Please try again.');
    }
  }

  async function remove(id: string) {
    try {
      await removeSavedMeal(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e: any) {
      Alert.alert('Not removed', e?.message ?? 'Please try again.');
    }
  }

  const isEmpty = savedMeals.length === 0 && recentMeals.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Quick add</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isEmpty ? (
            <View style={[styles.empty, { backgroundColor: colors.backgroundElement }]}>
              <PlateIcon size={30} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Log a few meals and they’ll show up here for one-tap re-logging.{'\n'}
                Star a meal from its detail page to save it.
              </Text>
            </View>
          ) : null}

          {savedMeals.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SAVED</Text>
              <View style={styles.list}>
                {savedMeals.map((s) => (
                  <Row
                    key={s.id}
                    item={s}
                    added={!!added[keyOf(s)]}
                    colors={colors}
                    onAdd={() => add(s)}
                    onRemove={() => remove(s.id)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {visibleRecent.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT</Text>
              <View style={styles.list}>
                {visibleRecent.map((m) => (
                  <Row
                    key={m.id}
                    item={m}
                    added={!!added[keyOf(m)]}
                    colors={colors}
                    onAdd={() => add(m)}
                    onRemove={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setDismissed((prev) => ({ ...prev, [keyOf(m)]: true }));
                    }}
                  />
                ))}
              </View>
              {hiddenCount > 0 ? (
                <Text style={[styles.moreHint, { color: colors.textSecondary }]}>
                  {hiddenCount} more in your history — tap ✕ to see them
                </Text>
              ) : null}
            </>
          ) : null}
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

  scroll: { paddingBottom: Spacing.four, gap: Spacing.two },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: Spacing.three },
  list: { gap: Spacing.two, marginTop: Spacing.two },

  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  addPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  addPillText: { fontSize: 13, fontWeight: '700' },
  added: { fontSize: 14, fontWeight: '800' },
  removeBtn: { width: 28, alignItems: 'center' },
  removeText: { fontSize: 16, fontWeight: '600' },

  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  moreHint: { fontSize: 12, textAlign: 'center', marginTop: Spacing.two },
});
