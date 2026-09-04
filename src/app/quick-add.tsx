import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronDownIcon, ChevronRightIcon, CloseIcon, PlateIcon } from '@/components/icons';
import { Colors, Spacing, type ThemeColors } from '@/constants/theme';
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
  removeLabel,
}: {
  item: QuickItem;
  added: boolean;
  colors: ThemeColors;
  onAdd: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${item.title}`}
        style={({ pressed }) => [
          styles.rowMain,
          { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
        ]}
        onPress={onAdd}>
        <View style={styles.rowInfo}>
          <Text maxFontSizeMultiplier={2} style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text maxFontSizeMultiplier={1.75} style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.total.calories} kcal · {item.total.protein_g}p · {item.total.carbs_g}c ·{' '}
            {item.total.fat_g}f
          </Text>
        </View>
        {added ? (
          <Text maxFontSizeMultiplier={1.5} style={[styles.added, { color: colors.accent }]}>Added</Text>
        ) : (
          <View style={[styles.addPill, { backgroundColor: colors.greenTint }]}>
            <Plus size={14} strokeWidth={2.5} color={colors.accentStrong} />
            <Text maxFontSizeMultiplier={1.5} style={[styles.addPillText, { color: colors.accentStrong }]}>Add</Text>
          </View>
        )}
      </Pressable>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={removeLabel ?? `Hide ${item.title}`}
          hitSlop={8}
          onPress={onRemove}
          style={({ pressed }) => [styles.removeBtn, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
          <CloseIcon size={15} color={colors.textSecondary} />
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
  const insets = useSafeAreaInsets();
  const { savedMeals, recentMeals, quickLog, removeSavedMeal } = useMeals();
  // Keyed by normalized TITLE, not id: logging a recent meal inserts a new row
  // whose id replaces the old one in the dedup list, orphaning id-keyed flags
  // (no "Added ✓" feedback, and dismissed rows resurrected).
  const keyOf = (m: { title: string }) => m.title.trim().toLowerCase();
  const [added, setAdded] = useState<Record<string, boolean>>({});
  // Recent suggestions the user waved off this session — the next ones backfill.
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [recentLimit, setRecentLimit] = useState(RECENT_WINDOW);
  const availableRecent = recentMeals.filter((m) => !dismissed[keyOf(m)]);
  const visibleRecent = availableRecent.slice(0, recentLimit);
  const hiddenCount = Math.max(0, availableRecent.length - visibleRecent.length);

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
      <View
        style={[
          styles.safe,
          {
            paddingTop: insets.top + Spacing.two,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <View style={styles.headerRow}>
          <Text maxFontSizeMultiplier={2} style={[styles.headerTitle, { color: colors.text }]}>Quick add</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Quick add"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
            <CloseIcon size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create a meal manually"
            onPress={() => router.push('/manual-meal')}
            style={({ pressed }) => [
              styles.manualCard,
              { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
            ]}>
            <View style={styles.manualInfo}>
              <Text maxFontSizeMultiplier={2} style={[styles.manualTitle, { color: colors.text }]}>Create meal manually</Text>
              <Text maxFontSizeMultiplier={2} style={[styles.manualBody, { color: colors.textSecondary }]}>Enter the serving, calories, and macros yourself.</Text>
            </View>
            <ChevronRightIcon size={20} color={colors.textSecondary} />
          </Pressable>

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
                    removeLabel={`Remove ${s.title} from saved meals`}
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
                    removeLabel={`Hide ${m.title} from recent meals`}
                  />
                ))}
              </View>
              {hiddenCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${Math.min(hiddenCount, RECENT_WINDOW)} more recent meals`}
                  onPress={() => setRecentLimit((current) => current + RECENT_WINDOW)}
                  style={({ pressed }) => [styles.showMore, { backgroundColor: colors.backgroundElement }, pressed && styles.pressed]}>
                  <Text maxFontSizeMultiplier={1.75} style={[styles.showMoreText, { color: colors.text }]}>
                    Show {Math.min(hiddenCount, RECENT_WINDOW)} more
                  </Text>
                  <ChevronDownIcon size={18} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
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
    marginBottom: Spacing.three,
    minHeight: 48,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingBottom: Spacing.four, gap: Spacing.two },
  manualCard: {
    borderRadius: 16,
    padding: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  manualInfo: { flex: 1, gap: 3 },
  manualTitle: { fontSize: 16, fontWeight: '800' },
  manualBody: { fontSize: 13, lineHeight: 18 },
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
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  addPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 4 },
  addPillText: { fontSize: 13, fontWeight: '700' },
  added: { fontSize: 14, fontWeight: '800' },
  removeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  empty: { borderRadius: 20, padding: Spacing.five, alignItems: 'center', gap: Spacing.two },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  showMore: { minHeight: 46, borderRadius: 16, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, marginTop: Spacing.two },
  showMoreText: { fontSize: 13.5, fontWeight: '800' },
  pressed: { opacity: 0.68 },
});
