import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
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

import { Brand, Colors, Spacing } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

/** Rough calories for ~30 min at a moderate pace — a helpful starting estimate. */
const PRESETS: { name: string; emoji: string; kcal: number }[] = [
  { name: 'Walk', emoji: '🚶', kcal: 120 },
  { name: 'Run', emoji: '🏃', kcal: 320 },
  { name: 'Cycling', emoji: '🚴', kcal: 260 },
  { name: 'Gym / weights', emoji: '🏋️', kcal: 200 },
  { name: 'Swimming', emoji: '🏊', kcal: 300 },
  { name: 'Yoga', emoji: '🧘', kcal: 120 },
];

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function ExerciseScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { todayExercises, burnedToday, addExercise, removeExercise } = useMeals();

  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [saving, setSaving] = useState(false);

  async function log(nameArg: string, kcalArg: number) {
    if (!nameArg.trim() || !(kcalArg > 0) || saving) return;
    setSaving(true);
    try {
      await addExercise(nameArg.trim(), kcalArg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setName('');
      setKcal('');
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const customValid = name.trim().length > 0 && parseInt(kcal, 10) > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Exercise</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Burned calories add back to today&apos;s budget.
        </Text>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Today's total */}
            <View style={[styles.totalCard, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.totalValue, { color: Brand.greenDark }]}>+{burnedToday}</Text>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                kcal burned today
              </Text>
            </View>

            {/* Quick presets */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUICK ADD (~30 MIN)</Text>
            <View style={styles.presetGrid}>
              {PRESETS.map((p) => (
                <Pressable
                  key={p.name}
                  style={({ pressed }) => [
                    styles.preset,
                    { backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement },
                  ]}
                  onPress={() => log(p.name, p.kcal)}
                  disabled={saving}>
                  <Text style={styles.presetEmoji}>{p.emoji}</Text>
                  <Text style={[styles.presetName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.presetKcal, { color: colors.textSecondary }]}>+{p.kcal}</Text>
                </Pressable>
              ))}
            </View>

            {/* Custom */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CUSTOM</Text>
            <View style={styles.customRow}>
              <TextInput
                style={[styles.nameInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
                value={name}
                onChangeText={setName}
                placeholder="Workout name"
                placeholderTextColor={colors.textSecondary}
                maxLength={40}
              />
              <View style={[styles.kcalBox, { backgroundColor: colors.backgroundElement }]}>
                <TextInput
                  style={[styles.kcalInput, { color: colors.text }]}
                  keyboardType="number-pad"
                  value={kcal}
                  onChangeText={setKcal}
                  placeholder="kcal"
                  placeholderTextColor={colors.textSecondary}
                  maxLength={4}
                />
              </View>
            </View>
            <Pressable
              style={[styles.addBtn, { opacity: customValid && !saving ? 1 : 0.4 }]}
              onPress={() => log(name, parseInt(kcal, 10))}
              disabled={!customValid || saving}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.addText}>Add workout</Text>}
            </Pressable>

            {/* Today's list */}
            {todayExercises.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TODAY</Text>
                <View style={[styles.listCard, { backgroundColor: colors.backgroundElement }]}>
                  {todayExercises.map((e, i) => (
                    <View
                      key={e.id}
                      style={[
                        styles.listRow,
                        i < todayExercises.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.backgroundSelected,
                        },
                      ]}>
                      <View style={styles.flex}>
                        <Text style={[styles.listName, { color: colors.text }]} numberOfLines={1}>
                          {e.name}
                        </Text>
                        <Text style={[styles.listTime, { color: colors.textSecondary }]}>
                          {formatTime(e.createdAt)}
                        </Text>
                      </View>
                      <Text style={[styles.listKcal, { color: Brand.greenDark }]}>+{e.caloriesBurned}</Text>
                      <Pressable onPress={() => removeExercise(e.id).catch(() => {})} hitSlop={8}>
                        <Text style={[styles.remove, { color: colors.textSecondary }]}>✕</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
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
    paddingTop: Spacing.two,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 14, marginTop: 2, marginBottom: Spacing.three },

  scroll: { paddingBottom: Spacing.four, gap: Spacing.three },

  totalCard: { borderRadius: 20, paddingVertical: Spacing.four, alignItems: 'center', gap: 2 },
  totalValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  totalLabel: { fontSize: 13, fontWeight: '600' },

  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: Spacing.one },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  preset: {
    width: '31.5%',
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: 2,
  },
  presetEmoji: { fontSize: 24 },
  presetName: { fontSize: 13, fontWeight: '700' },
  presetKcal: { fontSize: 12, fontWeight: '600' },

  customRow: { flexDirection: 'row', gap: Spacing.two },
  nameInput: { flex: 1, borderRadius: 14, paddingHorizontal: Spacing.three, fontSize: 16, fontWeight: '600', paddingVertical: Spacing.three },
  kcalBox: { width: 96, borderRadius: 14, paddingHorizontal: Spacing.three, justifyContent: 'center' },
  kcalInput: { fontSize: 16, fontWeight: '700', paddingVertical: Spacing.three, textAlign: 'center' },
  addBtn: {
    backgroundColor: Brand.green,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  addText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  listCard: { borderRadius: 16, paddingHorizontal: Spacing.three },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three, gap: Spacing.three },
  listName: { fontSize: 15, fontWeight: '600' },
  listTime: { fontSize: 12, marginTop: 2 },
  listKcal: { fontSize: 15, fontWeight: '800' },
  remove: { fontSize: 16, fontWeight: '600' },
});
