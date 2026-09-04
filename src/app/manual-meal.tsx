import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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

import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

type NutritionKey = 'calories' | 'protein_g' | 'carbs_g' | 'fat_g';

const NUTRIENTS: { key: NutritionKey; label: string; unit: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];

function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export default function ManualMealScreen() {
  const colors = Colors[useAppScheme()];
  const { addMeal } = useMeals();
  const [name, setName] = useState('');
  const [serving, setServing] = useState('1 serving');
  const [values, setValues] = useState<Record<NutritionKey, string>>({
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
  });
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(
    () => Object.fromEntries(NUTRIENTS.map(({ key }) => [key, parseAmount(values[key])])) as Record<NutritionKey, number | null>,
    [values],
  );
  const validNumbers = NUTRIENTS.every(({ key }) => parsed[key] != null);
  const hasNutrition = NUTRIENTS.some(({ key }) => (parsed[key] ?? 0) > 0);
  const canSave = name.trim().length > 0
    && serving.trim().length > 0
    && validNumbers
    && hasNutrition
    && !saving;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const title = name.trim();
    const quantity = serving.trim();
    const total = {
      calories: parsed.calories!,
      protein_g: parsed.protein_g!,
      carbs_g: parsed.carbs_g!,
      fat_g: parsed.fat_g!,
    };
    try {
      await addMeal({
        isFood: true,
        title,
        items: [{ name: title, quantity, ...total }],
        total,
        confidence: 1,
        notes: 'Entered manually.',
        analysisMeta: { inputSource: 'manual' },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.dismissAll();
    } catch (error) {
      setSaving(false);
      Alert.alert('Not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: colors.textSecondary }]}>FREE MEAL LOG</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.close, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Add a meal</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Use the nutrition label or your own estimate. You can edit it again from your meal history.</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>MEAL NAME</Text>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                placeholder="e.g. Chicken rice bowl"
                placeholderTextColor={colors.textSecondary}
                maxLength={80}
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.background }]}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]}>SERVING</Text>
              <TextInput
                value={serving}
                onChangeText={setServing}
                placeholder="e.g. 1 bowl or 2 slices"
                placeholderTextColor={colors.textSecondary}
                maxLength={40}
                style={[styles.textInput, { color: colors.text, backgroundColor: colors.background }]}
              />
            </View>

            <View style={styles.grid}>
              {NUTRIENTS.map(({ key, label, unit }) => (
                <View key={key} style={[styles.nutrient, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
                  <View style={styles.valueRow}>
                    <TextInput
                      value={values[key]}
                      onChangeText={(value) => setValues((current) => ({ ...current, [key]: value }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      maxLength={7}
                      style={[styles.numberInput, { color: colors.text }]}
                      accessibilityLabel={label}
                    />
                    <Text style={[styles.unit, { color: colors.textSecondary }]}>{unit}</Text>
                  </View>
                </View>
              ))}
            </View>

            {!validNumbers ? <Text style={styles.error}>Use positive numbers only.</Text> : null}
            {validNumbers && !hasNutrition ? <Text style={[styles.hint, { color: colors.textSecondary }]}>Enter at least one nutrition value.</Text> : null}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            onPress={save}
            disabled={!canSave}
            style={[styles.save, !canSave && styles.saveDisabled]}>
            <Text style={styles.saveText}>{saving ? 'SAVING…' : 'ADD TO TODAY'}</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.two },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1 },
  close: { fontSize: 20, fontWeight: '600' },
  content: { gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.four },
  title: { fontFamily: Type.display, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: Spacing.one },
  card: { borderRadius: 18, padding: Spacing.four, gap: Spacing.two },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.8 },
  textInput: { minHeight: 52, borderRadius: 14, paddingHorizontal: Spacing.three, fontSize: 16, fontWeight: '600', marginBottom: Spacing.two },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  nutrient: { width: '48%', flexGrow: 1, minHeight: 96, borderRadius: 18, padding: Spacing.three, justifyContent: 'space-between' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.one },
  numberInput: { flex: 1, minWidth: 0, paddingVertical: 0, fontFamily: Type.display, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  unit: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 13, textAlign: 'center' },
  error: { color: '#C2413B', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  save: { backgroundColor: Brand.green, minHeight: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
});
