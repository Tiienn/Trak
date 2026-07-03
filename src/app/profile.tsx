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

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { computeTargets } from '@/lib/nutrition';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { ActivityLevel, Goal, Sex, UserProfile } from '@/lib/types';

const GOALS: { key: Goal; label: string; emoji: string }[] = [
  { key: 'lose', label: 'Lose weight', emoji: '📉' },
  { key: 'maintain', label: 'Maintain', emoji: '⚖️' },
  { key: 'gain', label: 'Gain muscle', emoji: '📈' },
];

const SEXES: { key: Sex; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
];

const ACTIVITIES: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { key: 'light', label: 'Lightly active', desc: 'Exercise 1–3 days/week' },
  { key: 'moderate', label: 'Moderately active', desc: 'Exercise 3–5 days/week' },
  { key: 'active', label: 'Very active', desc: 'Exercise 6–7 days/week' },
  { key: 'very_active', label: 'Extra active', desc: 'Hard exercise or physical job' },
];

function Chip({
  selected,
  onPress,
  colors,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.greenTint : colors.backgroundElement,
          borderColor: selected ? Brand.green : 'transparent',
        },
      ]}>
      {children}
    </Pressable>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ThemeColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  colors,
  style,
  children,
}: {
  label: string;
  colors: ThemeColors;
  style?: object;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldBox, { backgroundColor: colors.backgroundElement }]}>{children}</View>
    </View>
  );
}

/** View + edit the body stats that drive daily targets. Doubles as onboarding's editable twin. */
export default function ProfileScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { profile, saveProfile } = useMeals();

  const [goal, setGoal] = useState<Goal | null>(profile?.goal ?? null);
  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [activity, setActivity] = useState<ActivityLevel | null>(profile?.activity ?? null);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [age, setAge] = useState(profile ? String(profile.age) : '');
  const [heightCm, setHeightCm] = useState(profile ? String(Math.round(profile.heightCm)) : '');
  const [weight, setWeight] = useState(profile ? String(Math.round(profile.weightKg)) : '');
  const [saving, setSaving] = useState(false);

  function parseStats(): { age: number; weightKg: number; heightCm: number } | null {
    const ageN = parseInt(age, 10);
    const weightKg = unit === 'metric' ? parseFloat(weight) : parseFloat(weight) * 0.453592;
    const hCm = parseFloat(heightCm);
    if (!Number.isFinite(ageN) || ageN < 10 || ageN > 100) return null;
    if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
    if (!Number.isFinite(hCm) || hCm <= 0) return null;
    return { age: ageN, weightKg, heightCm: hCm };
  }

  const stats = parseStats();
  const canSave = stats !== null && goal !== null && sex !== null && activity !== null;
  const preview =
    stats && goal && sex && activity
      ? computeTargets({ ...stats, goal, sex, activity, createdAt: 0 })
      : null;

  async function save() {
    if (!stats || !goal || !sex || !activity || saving) return;
    setSaving(true);
    const next: UserProfile = {
      sex,
      goal,
      activity,
      age: stats.age,
      heightCm: stats.heightCm,
      weightKg: stats.weightKg,
      createdAt: profile?.createdAt ?? Date.now(),
    };
    try {
      await saveProfile(next);
      router.back();
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Could not save your profile. Please try again.');
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Your profile</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {preview ? (
              <View style={[styles.targetCard, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[styles.targetCals, { color: colors.text }]}>
                  {preview.calories.toLocaleString()}
                </Text>
                <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>
                  calories / day
                </Text>
                <View style={styles.targetMacros}>
                  <View style={styles.targetMacro}>
                    <Text style={[styles.targetMacroValue, { color: colors.text }]}>
                      {preview.protein_g}g
                    </Text>
                    <Text style={[styles.targetMacroLabel, { color: colors.textSecondary }]}>
                      Protein
                    </Text>
                  </View>
                  <View style={styles.targetMacro}>
                    <Text style={[styles.targetMacroValue, { color: colors.text }]}>
                      {preview.carbs_g}g
                    </Text>
                    <Text style={[styles.targetMacroLabel, { color: colors.textSecondary }]}>
                      Carbs
                    </Text>
                  </View>
                  <View style={styles.targetMacro}>
                    <Text style={[styles.targetMacroValue, { color: colors.text }]}>
                      {preview.fat_g}g
                    </Text>
                    <Text style={[styles.targetMacroLabel, { color: colors.textSecondary }]}>
                      Fat
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            <Section title="GOAL" colors={colors}>
              <View style={styles.chipRow}>
                {GOALS.map((g) => (
                  <Chip key={g.key} selected={goal === g.key} onPress={() => setGoal(g.key)} colors={colors}>
                    <Text style={styles.chipEmoji}>{g.emoji}</Text>
                    <Text style={[styles.chipLabel, { color: colors.text }]}>{g.label}</Text>
                  </Chip>
                ))}
              </View>
            </Section>

            <Section title="SEX" colors={colors}>
              <View style={styles.chipRow}>
                {SEXES.map((s) => (
                  <Chip key={s.key} selected={sex === s.key} onPress={() => setSex(s.key)} colors={colors}>
                    <Text style={[styles.chipLabel, { color: colors.text }]}>{s.label}</Text>
                  </Chip>
                ))}
              </View>
            </Section>

            <Section title="ABOUT YOU" colors={colors}>
              <View style={[styles.unitToggle, { backgroundColor: colors.backgroundElement }]}>
                {(['metric', 'imperial'] as const).map((u) => (
                  <Pressable
                    key={u}
                    style={[styles.unitBtn, unit === u && { backgroundColor: Brand.green }]}
                    onPress={() => setUnit(u)}>
                    <Text
                      style={[
                        styles.unitBtnText,
                        { color: unit === u ? '#fff' : colors.textSecondary },
                      ]}>
                      {u === 'metric' ? 'Metric' : 'Imperial'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.rowFields}>
                <Field label="Age" colors={colors} style={styles.flex}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    keyboardType="number-pad"
                    value={age}
                    onChangeText={setAge}
                    placeholder="years"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={3}
                  />
                </Field>
                <Field label={unit === 'metric' ? 'Height (cm)' : 'Height (cm)'} colors={colors} style={styles.flex}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    keyboardType="numeric"
                    value={heightCm}
                    onChangeText={setHeightCm}
                    placeholder="cm"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={3}
                  />
                </Field>
              </View>
              <Field label={unit === 'metric' ? 'Weight (kg)' : 'Weight (lb)'} colors={colors}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={unit === 'metric' ? 'kg' : 'lb'}
                  placeholderTextColor={colors.textSecondary}
                  maxLength={5}
                />
              </Field>
            </Section>

            <Section title="ACTIVITY LEVEL" colors={colors}>
              {ACTIVITIES.map((a) => (
                <Pressable
                  key={a.key}
                  onPress={() => setActivity(a.key)}
                  style={[
                    styles.activityRow,
                    {
                      backgroundColor: activity === a.key ? colors.greenTint : colors.backgroundElement,
                      borderColor: activity === a.key ? Brand.green : 'transparent',
                    },
                  ]}>
                  <View style={styles.flex}>
                    <Text style={[styles.chipLabel, { color: colors.text }]}>{a.label}</Text>
                    <Text style={[styles.activityDesc, { color: colors.textSecondary }]}>{a.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </Section>
          </ScrollView>

          <Pressable
            style={[styles.saveBtn, { opacity: canSave && !saving ? 1 : 0.4 }]}
            onPress={save}
            disabled={!canSave || saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveBtnText}>Save changes</Text>}
          </Pressable>
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
    marginBottom: Spacing.two,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },

  scroll: { paddingBottom: Spacing.four, gap: Spacing.four },

  targetCard: { borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: 2 },
  targetCals: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  targetLabel: { fontSize: 13 },
  targetMacros: { flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.two },
  targetMacro: { alignItems: 'center' },
  targetMacroValue: { fontSize: 17, fontWeight: '800' },
  targetMacroLabel: { fontSize: 12, marginTop: 2 },

  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 14,
  },
  chipEmoji: { fontSize: 16 },
  chipLabel: { fontSize: 14, fontWeight: '700' },

  unitToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: Spacing.two },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  unitBtnText: { fontSize: 14, fontWeight: '700' },

  rowFields: { flexDirection: 'row', gap: Spacing.three },
  field: { gap: 6, marginTop: Spacing.two },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  fieldBox: { borderRadius: 12, paddingHorizontal: Spacing.three },
  input: { fontSize: 18, fontWeight: '600', paddingVertical: Spacing.three },

  activityRow: {
    borderRadius: 14,
    borderWidth: 2,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  activityDesc: { fontSize: 12, marginTop: 2 },

  saveBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  saveBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
