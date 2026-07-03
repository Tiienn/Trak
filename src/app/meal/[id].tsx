import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

function formatWhen(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

function toInt(v: string): number {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Editable numeric macro/calorie box used in edit mode. */
function EditNum({
  label,
  value,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.macroBox, { backgroundColor: colors.backgroundElement }]}>
      <TextInput
        style={[styles.macroInput, { color: colors.text }]}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChange}
        maxLength={5}
        selectTextOnFocus
      />
      <Text style={[styles.macroName, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

/** Full breakdown of one logged meal, with view + edit + delete. */
export default function MealDetailScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { meals, removeMeal, updateMeal, savedMeals, saveMeal, removeSavedMeal } = useMeals();

  const meal = meals.find((m) => m.id === id);
  const savedMatch = meal
    ? savedMeals.find((s) => s.title.trim().toLowerCase() === meal.title.trim().toLowerCase())
    : undefined;
  const isSaved = !!savedMatch;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingFav, setSavingFav] = useState(false);
  const [title, setTitle] = useState(meal?.title ?? '');
  const [cals, setCals] = useState(String(meal?.total.calories ?? 0));
  const [protein, setProtein] = useState(String(meal?.total.protein_g ?? 0));
  const [carbs, setCarbs] = useState(String(meal?.total.carbs_g ?? 0));
  const [fat, setFat] = useState(String(meal?.total.fat_g ?? 0));

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

  function startEdit() {
    setTitle(meal!.title);
    setCals(String(meal!.total.calories));
    setProtein(String(meal!.total.protein_g));
    setCarbs(String(meal!.total.carbs_g));
    setFat(String(meal!.total.fat_g));
    setEditing(true);
  }

  async function saveEdit() {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await updateMeal(meal!.id, {
        title: trimmed,
        total: {
          calories: toInt(cals),
          protein_g: toInt(protein),
          carbs_g: toInt(carbs),
          fat_g: toInt(fat),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleSave() {
    if (savingFav || !meal) return;
    setSavingFav(true);
    try {
      if (savedMatch) {
        await removeSavedMeal(savedMatch.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else {
        await saveMeal({ title: meal.title, total: meal.total, items: meal.items });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Please try again.');
    } finally {
      setSavingFav(false);
    }
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
          {editing ? (
            <TextInput
              style={[styles.titleInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
              value={title}
              onChangeText={setTitle}
              placeholder="Meal name"
              placeholderTextColor={colors.textSecondary}
              maxLength={60}
            />
          ) : (
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={2}>
              {meal.title}
            </Text>
          )}
          <View style={styles.headerActions}>
            {!editing ? (
              <Pressable onPress={toggleSave} hitSlop={12} disabled={savingFav}>
                <Text style={[styles.star, { color: isSaved ? Brand.green : colors.textSecondary }]}>
                  {isSaved ? '★' : '☆'}
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => (editing ? setEditing(false) : router.back())} hitSlop={12}>
              <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
            </Pressable>
          </View>
        </View>
        {!editing ? (
          <Text style={[styles.when, { color: colors.textSecondary }]}>
            {formatWhen(meal.createdAt)}
          </Text>
        ) : (
          <Text style={[styles.when, { color: colors.textSecondary }]}>Editing meal</Text>
        )}

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {meal.photoUri && !editing ? (
              <Image source={{ uri: meal.photoUri }} style={styles.photo} contentFit="cover" />
            ) : null}

            {editing ? (
              <View style={[styles.calsCard, { backgroundColor: colors.backgroundElement }]}>
                <TextInput
                  style={[styles.calsInput, { color: colors.text }]}
                  keyboardType="number-pad"
                  value={cals}
                  onChangeText={setCals}
                  maxLength={5}
                  selectTextOnFocus
                />
                <Text style={[styles.calsLabel, { color: colors.textSecondary }]}>calories</Text>
              </View>
            ) : (
              <View style={[styles.calsCard, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.calsBig, { color: colors.text }]}>
                  {meal.total.calories.toLocaleString()}
                </Text>
                <Text style={[styles.calsLabel, { color: colors.textSecondary }]}>calories</Text>
              </View>
            )}

            <View style={styles.macroRow}>
              {editing ? (
                <>
                  <EditNum label="Protein" value={protein} onChange={setProtein} colors={colors} />
                  <EditNum label="Carbs" value={carbs} onChange={setCarbs} colors={colors} />
                  <EditNum label="Fat" value={fat} onChange={setFat} colors={colors} />
                </>
              ) : (
                <>
                  {macro('Protein', meal.total.protein_g)}
                  {macro('Carbs', meal.total.carbs_g)}
                  {macro('Fat', meal.total.fat_g)}
                </>
              )}
            </View>

            {meal.items.length > 0 && !editing ? (
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

            {meal.confidence > 0 && !editing ? (
              <Text style={[styles.confidence, { color: colors.textSecondary }]}>
                AI estimate · {Math.round(meal.confidence * 100)}% confidence
              </Text>
            ) : null}
          </ScrollView>

          {editing ? (
            <Pressable
              style={[styles.saveBtn, { opacity: title.trim() && !saving ? 1 : 0.5 }]}
              onPress={saveEdit}
              disabled={!title.trim() || saving}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>Save changes</Text>}
            </Pressable>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.editBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={startEdit}>
                <Text style={[styles.editText, { color: colors.text }]}>Edit</Text>
              </Pressable>
              <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
                <Text style={styles.deleteText}>Remove</Text>
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', flex: 1 },
  titleInput: { flex: 1, fontSize: 20, fontWeight: '800', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  closeText: { fontSize: 20, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  star: { fontSize: 24, fontWeight: '600' },
  when: { fontSize: 13, marginTop: 4, marginBottom: Spacing.three },

  scroll: { gap: Spacing.three, paddingBottom: Spacing.four },
  photo: { width: '100%', height: 220, borderRadius: 20 },

  calsCard: { borderRadius: 20, paddingVertical: Spacing.four, alignItems: 'center' },
  calsBig: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  calsInput: { fontSize: 44, fontWeight: '800', letterSpacing: -1, textAlign: 'center', minWidth: 140 },
  calsLabel: { fontSize: 14, fontWeight: '600' },

  macroRow: { flexDirection: 'row', gap: Spacing.two },
  macroBox: { flex: 1, borderRadius: 16, paddingVertical: Spacing.three, alignItems: 'center' },
  macroGrams: { fontSize: 18, fontWeight: '800' },
  macroInput: { fontSize: 18, fontWeight: '800', textAlign: 'center', minWidth: 48 },
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

  actionRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.two },
  editBtn: { flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: Spacing.three },
  editText: { fontSize: 15, fontWeight: '700' },
  deleteBtn: { flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: Spacing.three },
  deleteText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

  saveBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    marginVertical: Spacing.two,
  },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  missingWrap: { alignItems: 'center', justifyContent: 'center' },
  missingText: { fontSize: 15 },
  closeFloating: { position: 'absolute', top: Spacing.four, right: Spacing.four },
});
