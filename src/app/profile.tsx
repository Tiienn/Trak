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

import { BalanceIcon, DumbbellIcon, TrendDownIcon } from '@/components/icons';
import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { computeTargets, DIETS } from '@/lib/nutrition';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { ActivityLevel, DietStyle, Goal, Sex, UserProfile } from '@/lib/types';

type GoalIcon = (props: { size?: number; color?: string }) => React.JSX.Element;
const GOALS: { key: Goal; label: string; Icon: GoalIcon }[] = [
  { key: 'lose', label: 'Lose weight', Icon: TrendDownIcon },
  { key: 'maintain', label: 'Maintain', Icon: BalanceIcon },
  { key: 'gain', label: 'Gain muscle', Icon: DumbbellIcon },
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
  const { profile, saveProfile, calorieBias, setCalorieBias } = useMeals();

  const [goal, setGoal] = useState<Goal | null>(profile?.goal ?? null);
  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [activity, setActivity] = useState<ActivityLevel | null>(profile?.activity ?? null);
  const [diet, setDiet] = useState<DietStyle>(profile?.diet ?? 'balanced');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [age, setAge] = useState(profile ? String(profile.age) : '');
  const [heightCm, setHeightCm] = useState(profile ? String(Math.round(profile.heightCm)) : '');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState(profile ? String(Math.round(profile.weightKg)) : '');
  const [saving, setSaving] = useState(false);

  // Switching units CONVERTS the field values — reinterpreting "80" (kg) as
  // 80 lb silently corrupted body stats and wrecked calorie targets.
  function switchUnit(next: 'metric' | 'imperial') {
    if (next === unit) return;
    if (next === 'imperial') {
      const kg = parseFloat(weight);
      if (Number.isFinite(kg)) setWeight(String(Math.round(kg / 0.453592)));
      const cm = parseFloat(heightCm);
      if (Number.isFinite(cm)) {
        const totalIn = cm / 2.54;
        let ft = Math.floor(totalIn / 12);
        let inches = Math.round(totalIn % 12);
        if (inches === 12) {
          ft += 1;
          inches = 0;
        }
        setHeightFt(String(ft));
        setHeightIn(String(inches));
      }
    } else {
      const lb = parseFloat(weight);
      if (Number.isFinite(lb)) setWeight(String(Math.round(lb * 0.453592)));
      const ft = parseInt(heightFt || '0', 10);
      const inches = parseInt(heightIn || '0', 10);
      if (ft > 0 || inches > 0) setHeightCm(String(Math.round((ft * 12 + inches) * 2.54)));
    }
    setUnit(next);
  }

  function parseStats(): { age: number; weightKg: number; heightCm: number } | null {
    const ageN = parseInt(age, 10);
    let weightKg: number;
    let hCm: number;
    if (unit === 'metric') {
      weightKg = parseFloat(weight);
      hCm = parseFloat(heightCm);
    } else {
      weightKg = parseFloat(weight) * 0.453592;
      hCm = (parseInt(heightFt || '0', 10) * 12 + parseInt(heightIn || '0', 10)) * 2.54;
    }
    if (!Number.isFinite(ageN) || ageN < 10 || ageN > 100) return null;
    // Plausibility bounds — a typo like "700" (meaning 70.0) would otherwise
    // silently corrupt every calorie/macro target.
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 400) return null;
    if (!Number.isFinite(hCm) || hCm < 90 || hCm > 250) return null;
    return { age: ageN, weightKg, heightCm: hCm };
  }

  const stats = parseStats();
  const canSave = stats !== null && goal !== null && sex !== null && activity !== null;
  const preview =
    stats && goal && sex && activity
      ? computeTargets({ ...stats, goal, sex, activity, diet, createdAt: 0 })
      : null;

  async function save() {
    if (!stats || !goal || !sex || !activity || saving) return;
    setSaving(true);
    const next: UserProfile = {
      sex,
      goal,
      activity,
      diet,
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

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                    <g.Icon size={17} color={goal === g.key ? Brand.green : colors.text} />
                    <Text style={[styles.chipLabel, { color: colors.text }]}>{g.label}</Text>
                  </Chip>
                ))}
              </View>
            </Section>

            <Section title="DIET STYLE" colors={colors}>
              <View style={styles.chipRow}>
                {DIETS.map((d) => (
                  <Chip key={d.key} selected={diet === d.key} onPress={() => setDiet(d.key)} colors={colors}>
                    <Text style={[styles.chipLabel, { color: colors.text }]}>{d.label}</Text>
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
                    onPress={() => switchUnit(u)}>
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
                {unit === 'metric' ? (
                  <Field label="Height (cm)" colors={colors} style={styles.flex}>
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
                ) : (
                  <>
                    <Field label="Height (ft)" colors={colors} style={styles.flex}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        keyboardType="number-pad"
                        value={heightFt}
                        onChangeText={setHeightFt}
                        placeholder="ft"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={1}
                      />
                    </Field>
                    <Field label="(in)" colors={colors} style={styles.flex}>
                      <TextInput
                        style={[styles.input, { color: colors.text }]}
                        keyboardType="number-pad"
                        value={heightIn}
                        onChangeText={setHeightIn}
                        placeholder="in"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={2}
                      />
                    </Field>
                  </>
                )}
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

            {profile ? (
              <Section title="AI ESTIMATE ADJUSTMENT" colors={colors}>
                <View style={[styles.biasCard, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.biasHint, { color: colors.textSecondary }]}>
                    If Trak’s scan and chat estimates feel too high or too low, nudge every future
                    estimate here. Saved automatically.
                  </Text>
                  <View style={styles.biasRow}>
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        setCalorieBias(calorieBias - 5).catch((e) =>
                          Alert.alert('Not saved', e?.message ?? 'Please try again.')
                        )
                      }
                      style={[styles.biasBtn, { backgroundColor: colors.background }]}>
                      <Text style={[styles.biasBtnText, { color: colors.text }]}>−</Text>
                    </Pressable>
                    <View style={styles.biasValueWrap}>
                      <Text style={[styles.biasValue, { color: colors.text }]}>
                        {calorieBias > 0 ? '+' : calorieBias < 0 ? '−' : ''}
                        {Math.abs(calorieBias)}%
                      </Text>
                      <Text style={[styles.biasSub, { color: colors.textSecondary }]}>
                        {calorieBias === 0
                          ? 'Estimates unchanged'
                          : calorieBias > 0
                            ? 'Estimates raised'
                            : 'Estimates lowered'}
                      </Text>
                    </View>
                    <Pressable
                      hitSlop={8}
                      onPress={() =>
                        setCalorieBias(calorieBias + 5).catch((e) =>
                          Alert.alert('Not saved', e?.message ?? 'Please try again.')
                        )
                      }
                      style={[styles.biasBtn, { backgroundColor: colors.background }]}>
                      <Text style={[styles.biasBtnText, { color: colors.text }]}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </Section>
            ) : null}
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

  biasCard: { borderRadius: 16, padding: Spacing.four, gap: Spacing.three },
  biasHint: { fontSize: 13, lineHeight: 19 },
  biasRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  biasBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  biasBtnText: { fontSize: 24, fontWeight: '800' },
  biasValueWrap: { alignItems: 'center' },
  biasValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  biasSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },

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
