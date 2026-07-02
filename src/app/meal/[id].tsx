import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

function formatWhen(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

/** Full breakdown of one logged meal, with the (only) delete action. */
export default function MealDetailScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { meals, removeMeal } = useMeals();

  const meal = meals.find((m) => m.id === id);

  // The meal can vanish mid-view (deleted on another device, or just removed).
  if (!meal) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView style={[styles.safe, styles.missingWrap]}>
          <Text style={[styles.missingText, { color: colors.textSecondary }]}>
            This meal is no longer in your log.
          </Text>
          <Pressable style={styles.closeFloating} onPress={() => router.back()} hitSlop={8}>
            <Text style={[styles.closeText, { color: colors.text }]}>✕</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  function confirmDelete() {
    Alert.alert('Remove meal?', `Remove "${meal!.title}" from your log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMeal(meal!.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.back();
          } catch (e: any) {
            Alert.alert('Not removed', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }

  const macro = (label: string, grams: number) => (
    <View style={[styles.macroBox, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.macroGrams, { color: colors.text }]}>{grams} g</Text>
      <Text style={[styles.macroName, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={2}>
            {meal.title}
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>
        <Text style={[styles.when, { color: colors.textSecondary }]}>
          {formatWhen(meal.createdAt)}
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {meal.photoUri ? (
            <Image source={{ uri: meal.photoUri }} style={styles.photo} contentFit="cover" />
          ) : null}

          <View style={[styles.calsCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.calsBig, { color: colors.text }]}>
              {meal.total.calories.toLocaleString()}
            </Text>
            <Text style={[styles.calsLabel, { color: colors.textSecondary }]}>calories</Text>
          </View>

          <View style={styles.macroRow}>
            {macro('Protein', meal.total.protein_g)}
            {macro('Carbs', meal.total.carbs_g)}
            {macro('Fat', meal.total.fat_g)}
          </View>

          {meal.items.length > 0 ? (
            <View style={[styles.itemsCard, { backgroundColor: colors.backgroundElement }]}>
              {meal.items.map((it, i) => (
                <View
                  key={i}
                  style={[
                    styles.itemRow,
                    i < meal.items.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.backgroundSelected,
                    },
                  ]}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                      {it.name}
                    </Text>
                    {it.quantity ? (
                      <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                        {it.quantity}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.itemCals, { color: colors.text }]}>{it.calories}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {meal.confidence > 0 ? (
            <Text style={[styles.confidence, { color: colors.textSecondary }]}>
              AI estimate · {Math.round(meal.confidence * 100)}% confidence
            </Text>
          ) : null}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
          onPress={confirmDelete}>
          <Text style={styles.deleteText}>Remove from log</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', flex: 1 },
  closeText: { fontSize: 20, fontWeight: '600' },
  when: { fontSize: 13, marginTop: 4, marginBottom: Spacing.three },

  scroll: { gap: Spacing.three, paddingBottom: Spacing.four },
  photo: { width: '100%', height: 220, borderRadius: 20 },

  calsCard: { borderRadius: 20, paddingVertical: Spacing.four, alignItems: 'center' },
  calsBig: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  calsLabel: { fontSize: 14, fontWeight: '600' },

  macroRow: { flexDirection: 'row', gap: Spacing.two },
  macroBox: { flex: 1, borderRadius: 16, paddingVertical: Spacing.three, alignItems: 'center' },
  macroGrams: { fontSize: 18, fontWeight: '800' },
  macroName: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  itemsCard: { borderRadius: 16, paddingHorizontal: Spacing.three },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemQty: { fontSize: 12, marginTop: 2 },
  itemCals: { fontSize: 15, fontWeight: '700' },

  confidence: { fontSize: 12, textAlign: 'center' },

  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.three, marginBottom: Spacing.two },
  deleteText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

  missingWrap: { alignItems: 'center', justifyContent: 'center' },
  missingText: { fontSize: 15 },
  closeFloating: { position: 'absolute', top: Spacing.four, right: Spacing.four },
});
