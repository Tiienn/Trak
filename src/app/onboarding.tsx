import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { computeTargets } from '@/lib/nutrition';
import { useMeals } from '@/lib/store';
import { ActivityLevel, Goal, Sex, UserProfile } from '@/lib/types';

const Brand = { green: '#22C55E', greenDark: '#16A34A' } as const;

type ThemeColors = {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
};

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

const STEP_COUNT = 5;

function OptionCard({
  selected,
  onPress,
  colors,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionCard,
        {
          backgroundColor: selected ? '#22C55E22' : colors.backgroundElement,
          borderColor: selected ? Brand.green : 'transparent',
        },
      ]}>
      {children}
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { saveProfile } = useMeals();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [weight, setWeight] = useState(''); // kg or lb depending on unit

  // Validate only the numeric body-stat fields (independent of goal/sex/activity).
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
    if (!Number.isFinite(weightKg) || weightKg <= 0) return null;
    if (!Number.isFinite(hCm) || hCm <= 0) return null;
    return { age: ageN, weightKg, heightCm: hCm };
  }

  function buildProfile(): UserProfile | null {
    const stats = parseStats();
    if (!stats || !goal || !sex || !activity) return null;
    return {
      sex,
      goal,
      activity,
      age: stats.age,
      heightCm: stats.heightCm,
      weightKg: stats.weightKg,
      createdAt: Date.now(),
    };
  }

  const statsValid = parseStats() !== null;

  function canContinue(): boolean {
    if (step === 0) return goal !== null;
    if (step === 1) return sex !== null;
    if (step === 2) return statsValid;
    if (step === 3) return activity !== null;
    return true;
  }

  function next() {
    if (step < STEP_COUNT - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  function finish() {
    const profile = buildProfile();
    if (!profile) return;
    saveProfile(profile);
    router.replace('/');
  }

  const completeProfile = buildProfile();
  const preview = completeProfile ? computeTargets(completeProfile) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i <= step ? Brand.green : colors.backgroundSelected,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 0 && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>What&apos;s your goal?</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  We&apos;ll tailor your daily targets to it.
                </Text>
                {GOALS.map((g) => (
                  <OptionCard key={g.key} selected={goal === g.key} onPress={() => setGoal(g.key)} colors={colors}>
                    <Text style={styles.optionEmoji}>{g.emoji}</Text>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{g.label}</Text>
                  </OptionCard>
                ))}
              </>
            )}

            {step === 1 && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Your sex</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Used only to calculate your calorie needs.
                </Text>
                {SEXES.map((s) => (
                  <OptionCard key={s.key} selected={sex === s.key} onPress={() => setSex(s.key)} colors={colors}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>{s.label}</Text>
                  </OptionCard>
                ))}
              </>
            )}

            {step === 2 && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>About you</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  So we can estimate your metabolism.
                </Text>

                {/* Unit toggle */}
                <View style={[styles.unitToggle, { backgroundColor: colors.backgroundElement }]}>
                  {(['metric', 'imperial'] as const).map((u) => (
                    <Pressable
                      key={u}
                      style={[
                        styles.unitBtn,
                        unit === u && { backgroundColor: Brand.green },
                      ]}
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

                <Field label="Age" colors={colors}>
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
                  <Field label="Height" colors={colors}>
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
                  <View style={styles.rowFields}>
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
                  </View>
                )}

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
              </>
            )}

            {step === 3 && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>How active are you?</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Pick the closest match.
                </Text>
                {ACTIVITIES.map((a) => (
                  <OptionCard
                    key={a.key}
                    selected={activity === a.key}
                    onPress={() => setActivity(a.key)}
                    colors={colors}>
                    <View style={styles.flex}>
                      <Text style={[styles.optionLabel, { color: colors.text }]}>{a.label}</Text>
                      <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>{a.desc}</Text>
                    </View>
                  </OptionCard>
                ))}
              </>
            )}

            {step === 4 && preview && (
              <>
                <Text style={[styles.title, { color: colors.text }]}>Your daily target</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Based on your goal and body. You can rescan any time.
                </Text>
                <View style={[styles.targetCard, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.targetCals, { color: colors.text }]}>
                    {preview.calories.toLocaleString()}
                  </Text>
                  <Text style={[styles.targetLabel, { color: colors.textSecondary }]}>
                    calories / day
                  </Text>
                  <View style={styles.targetMacros}>
                    <TargetMacro label="Protein" value={preview.protein_g} colors={colors} />
                    <TargetMacro label="Carbs" value={preview.carbs_g} colors={colors} />
                    <TargetMacro label="Fat" value={preview.fat_g} colors={colors} />
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom buttons */}
        <View style={styles.footer}>
          {step > 0 && (
            <Pressable style={[styles.backBtn, { backgroundColor: colors.backgroundElement }]} onPress={back}>
              <Text style={[styles.backBtnText, { color: colors.text }]}>Back</Text>
            </Pressable>
          )}
          {step < STEP_COUNT - 1 ? (
            <Pressable
              style={[styles.primaryBtn, { opacity: canContinue() ? 1 : 0.4 }]}
              disabled={!canContinue()}
              onPress={next}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryBtn} onPress={finish}>
              <Text style={styles.primaryBtnText}>Start tracking</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
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
  children: ReactNode;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.fieldBox, { backgroundColor: colors.backgroundElement }]}>{children}</View>
    </View>
  );
}

function TargetMacro({ label, value, colors }: { label: string; value: number; colors: ThemeColors }) {
  return (
    <View style={styles.targetMacro}>
      <Text style={[styles.targetMacroValue, { color: colors.text }]}>{value}g</Text>
      <Text style={[styles.targetMacroLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: Spacing.three },
  dot: { height: 8, borderRadius: 4 },
  scroll: { paddingBottom: Spacing.four, gap: Spacing.two },
  title: { fontSize: 28, fontWeight: '800', marginTop: Spacing.two },
  subtitle: { fontSize: 15, marginBottom: Spacing.three },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 16,
    borderWidth: 2,
    padding: Spacing.four,
  },
  optionEmoji: { fontSize: 26 },
  optionLabel: { fontSize: 17, fontWeight: '700' },
  optionDesc: { fontSize: 13, marginTop: 2 },

  unitToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: Spacing.two },
  unitBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  unitBtnText: { fontSize: 15, fontWeight: '700' },

  field: { gap: 6, marginTop: Spacing.two },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  fieldBox: { borderRadius: 12, paddingHorizontal: Spacing.three },
  input: { fontSize: 18, fontWeight: '600', paddingVertical: Spacing.three },
  rowFields: { flexDirection: 'row', gap: Spacing.three },

  targetCard: { borderRadius: 24, padding: Spacing.five, alignItems: 'center', gap: Spacing.one },
  targetCals: { fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  targetLabel: { fontSize: 15 },
  targetMacros: { flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.three },
  targetMacro: { alignItems: 'center' },
  targetMacroValue: { fontSize: 20, fontWeight: '800' },
  targetMacroLabel: { fontSize: 13, marginTop: 2 },

  footer: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.three },
  backBtn: { borderRadius: 16, paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 16, fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
