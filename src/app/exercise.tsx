import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, DumbbellIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import {
  MUSCLE_FOCUSES,
  MUSCLE_GROUPS,
  WORKOUT_PRESETS,
  WORKOUT_FOCUSES,
  type WorkoutFocus,
  workoutFocusLabel,
} from '@/lib/training-catalog';
import { MUSCLE_POINTS_PER_SET, SCORED_MUSCLE_GROUPS, WEEKLY_SET_TARGET } from '@/lib/training-progress';
import type { CardioIntensity, MuscleGroup, MuscleSetCounts, WorkoutSplit } from '@/lib/types';

const EMPTY_SETS: MuscleSetCounts = {
  chest: 0,
  legs: 0,
  back: 0,
  arms: 0,
  shoulders: 0,
  abs: 0,
  glutes: 0,
  other: 0,
};

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function splitLabel(split: WorkoutSplit): string {
  return workoutFocusLabel(split);
}

function selectedMuscles(splits: WorkoutSplit[]): Set<MuscleGroup> {
  return new Set(WORKOUT_FOCUSES.filter((item) => splits.includes(item.key)).flatMap((item) => item.muscles));
}

function FocusChip({ item, selected, colors, compact = false, onPress }: { item: WorkoutFocus; selected: boolean; colors: ThemeColors; compact?: boolean; onPress: () => void }) {
  const muscle = MUSCLE_GROUPS.find((entry) => entry.key === item.key);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.muscleChip : styles.presetChip,
        {
          backgroundColor: selected ? colors.greenTint : colors.backgroundElement,
          borderColor: selected ? (muscle?.color ?? colors.accent) : 'transparent',
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      {muscle ? <View style={[styles.muscleDot, { backgroundColor: muscle.color }]} /> : null}
      <Text numberOfLines={1} style={[compact ? styles.muscleChipText : styles.presetChipText, { color: colors.text }]}>{item.label}</Text>
      <View style={[styles.selectionMark, { borderColor: selected ? colors.accent : colors.backgroundSelected, backgroundColor: selected ? Brand.green : 'transparent' }]}>
        {selected ? <Text style={styles.check}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

function NumberField({ label, value, onChange, suffix, colors }: { label: string; value: string; onChange: (value: string) => void; suffix?: string; colors: ThemeColors }) {
  return (
    <View style={[styles.numberField, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.numberInputRow}>
        <TextInput
          value={value}
          onChangeText={(next) => onChange(next.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={4}
          selectTextOnFocus
          style={[styles.numberInput, { color: colors.text }]}
        />
        {suffix ? <Text style={[styles.suffix, { color: colors.textSecondary }]}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function CardioIntensityToggle({ value, onChange, colors }: {
  value: CardioIntensity;
  onChange: (value: CardioIntensity) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.intensityToggle, { backgroundColor: colors.backgroundElement }]}>
      {(['light', 'moderate', 'vigorous'] as const).map((intensity) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value === intensity }}
          key={intensity}
          onPress={() => onChange(intensity)}
          style={[styles.intensityButton, value === intensity && { backgroundColor: colors.greenTint }]}>
          <Text style={[styles.intensityText, { color: value === intensity ? colors.accentStrong : colors.textSecondary }]}>{intensity}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ExerciseScreen() {
  const colors = Colors[useAppScheme()];
  const insets = useSafeAreaInsets();
  const { todayExercises, addExercise, removeExercise } = useMeals();
  const [splits, setSplits] = useState<WorkoutSplit[]>(['chest']);
  const [sets, setSets] = useState<MuscleSetCounts>({ ...EMPTY_SETS, chest: 3 });
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [caloriesText, setCaloriesText] = useState('');
  const [caloriesEdited, setCaloriesEdited] = useState(false);
  const [customName, setCustomName] = useState('');
  const [cardioIntensity, setCardioIntensity] = useState<CardioIntensity>('moderate');
  const [saving, setSaving] = useState(false);

  const duration = Math.min(1440, (Number(hours) || 0) * 60 + (Number(minutes) || 0));
  const activeMuscles = useMemo(() => selectedMuscles(splits), [splits]);
  const workingSetGroups = useMemo(
    () => MUSCLE_GROUPS.filter((item) => activeMuscles.has(item.key)),
    [activeMuscles]
  );
  const intensity = splits.includes('cardio') ? 9 : splits.includes('legs') || splits.includes('full_body') ? 8 : splits.length > 1 ? 7.5 : 7;
  const estimatedCalories = Math.max(0, Math.round(duration * intensity));
  const calories = caloriesEdited ? Math.max(0, Number(caloriesText) || 0) : estimatedCalories;
  const totalMinutes = todayExercises.reduce((sum, item) => sum + item.durationMinutes, 0);

  function toggleSplit(key: WorkoutSplit) {
    setSplits((current) => {
      let next: WorkoutSplit[];
      if (current.includes(key)) {
        next = current.filter((item) => item !== key);
      } else if (key === 'full_body') {
        next = [...current.filter((item) => item === 'cardio'), key];
      } else if (key !== 'cardio') {
        next = [...current.filter((item) => item !== 'full_body'), key];
      } else {
        next = [...current, key];
      }
      const nextMuscles = selectedMuscles(next);
      setSets((currentSets) => {
        const updated = { ...EMPTY_SETS };
        for (const muscle of Object.keys(updated) as MuscleGroup[]) {
          updated[muscle] = nextMuscles.has(muscle) ? Math.max(3, currentSets[muscle]) : 0;
        }
        return updated;
      });
      return next;
    });
    Haptics.selectionAsync().catch(() => {});
  }

  function changeSets(group: MuscleGroup, change: number) {
    setSets((current) => ({ ...current, [group]: Math.max(0, Math.min(100, current[group] + change)) }));
    Haptics.selectionAsync().catch(() => {});
  }

  async function save() {
    if (saving) return;
    if (splits.length === 0) {
      Alert.alert('Choose your training', 'Select at least one workout type.');
      return;
    }
    if (duration < 1) {
      Alert.alert('Add a duration', 'Enter how many hours and minutes you trained.');
      return;
    }
    if (caloriesEdited && caloriesText.trim() === '') {
      Alert.alert('Add calories burned', 'Enter your calorie burn, or enter 0 if you do not want to estimate it.');
      return;
    }
    if (activeMuscles.size > 0 && [...activeMuscles].every((muscle) => sets[muscle] === 0)) {
      Alert.alert('Add your sets', 'At least one trained muscle needs a working set.');
      return;
    }
    const name = customName.trim() || splits.map(splitLabel).join(' + ');
    setSaving(true);
    try {
      await addExercise(name, calories, duration, {
        workoutSplits: splits,
        muscleSets: sets,
        cardioIntensity: splits.includes('cardio') ? cardioIntensity : null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Alert.alert('Not saved', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerLabel, { color: colors.text }]}>Log workout</Text>
          <Pressable accessibilityLabel="Close workout logger" onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: colors.backgroundElement }]}>
            <CloseIcon size={24} color={colors.text} />
          </Pressable>
        </View>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>What did you train?</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select everything that applies. Completed working sets build your weekly muscle score.</Text>
            </View>

            <View style={styles.focusSection}>
              <Text style={[styles.focusLabel, { color: colors.textSecondary }]}>QUICK SELECT</Text>
              <View style={styles.presetGrid}>
                {WORKOUT_PRESETS.map((item) => <FocusChip key={item.key} item={item} selected={splits.includes(item.key)} colors={colors} onPress={() => toggleSplit(item.key)} />)}
              </View>
              <Text style={[styles.focusLabel, { color: colors.textSecondary }]}>CHOOSE MUSCLES</Text>
              <View style={styles.muscleGrid}>
                {MUSCLE_FOCUSES.map((item) => <FocusChip key={item.key} item={item} selected={splits.includes(item.key)} colors={colors} compact onPress={() => toggleSplit(item.key)} />)}
              </View>
            </View>

            {splits.includes('cardio') ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Cardio intensity</Text>
                <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>Moderate minutes count once; vigorous minutes count twice toward the weekly baseline. Light movement is tracked separately.</Text>
                <CardioIntensityToggle value={cardioIntensity} onChange={setCardioIntensity} colors={colors} />
              </View>
            ) : null}

            {workingSetGroups.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Working sets</Text>
                <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>Every completed working set earns 1 point for its selected muscle. Weekly target: {WEEKLY_SET_TARGET}. Warm-ups do not count.</Text>
                <View style={[styles.setCard, { backgroundColor: colors.backgroundElement }]}>
                  {workingSetGroups.map((item, index) => (
                    <View key={item.key} style={[styles.setRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.backgroundSelected }]}>
                      <View style={[styles.muscleDot, { backgroundColor: item.color }]} />
                      <View style={styles.muscleInfo}>
                        <Text style={[styles.muscleName, { color: colors.text }]}>{item.label}</Text>
                        <Text style={[styles.pointRate, { color: colors.textSecondary }]}>{SCORED_MUSCLE_GROUPS.includes(item.key) ? `${MUSCLE_POINTS_PER_SET[item.key]} point / set` : 'Tracked · no weekly target'}</Text>
                      </View>
                      <View style={[styles.setStepper, { backgroundColor: colors.background }]}>
                        <Pressable hitSlop={8} onPress={() => changeSets(item.key, -1)}><Text style={[styles.stepGlyph, { color: colors.text }]}>−</Text></Pressable>
                        <Text style={[styles.setValue, { color: colors.text }]}>{sets[item.key]}</Text>
                        <Pressable hitSlop={8} onPress={() => changeSets(item.key, 1)}><Text style={[styles.stepGlyph, { color: colors.text }]}>+</Text></Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Duration</Text>
              <View style={styles.twoColumns}>
                <NumberField label="HOURS" value={hours} onChange={setHours} suffix="hr" colors={colors} />
                <NumberField label="MINUTES" value={minutes} onChange={setMinutes} suffix="min" colors={colors} />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Calories burned</Text>
              <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>This updates your exercise credit and calorie budget on Home.</Text>
              <NumberField
                label="CALORIE BURN"
                value={caloriesEdited ? caloriesText : String(estimatedCalories)}
                onChange={(value) => {
                  setCaloriesEdited(true);
                  setCaloriesText(value);
                }}
                suffix="kcal"
                colors={colors}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout name <Text style={[styles.optional, { color: colors.textSecondary }]}>(optional)</Text></Text>
              <TextInput value={customName} onChangeText={setCustomName} placeholder={splits.length > 0 ? splits.map(splitLabel).join(' + ') : 'Workout name'} placeholderTextColor={colors.textSecondary} maxLength={40} style={[styles.nameInput, { backgroundColor: colors.backgroundElement, color: colors.text }]} />
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.greenTint }]}><DumbbellIcon size={24} color={colors.accent} /></View>
              <View style={styles.flex}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>{customName.trim() || splits.map(splitLabel).join(' + ') || 'Workout'}</Text>
                <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>{duration} minutes · {calories} kcal · {[...activeMuscles].reduce((sum, muscle) => sum + sets[muscle], 0)} sets</Text>
              </View>
            </View>

            {todayExercises.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Today · {totalMinutes} min</Text>
                <View style={[styles.todayCard, { backgroundColor: colors.backgroundElement }]}>
                  {todayExercises.map((exercise, index) => {
                    const setTotal = Object.values(exercise.muscleSets).reduce((sum, value) => sum + value, 0);
                    return (
                      <View key={exercise.id} style={[styles.todayRow, index > 0 && { borderTopColor: colors.backgroundSelected, borderTopWidth: StyleSheet.hairlineWidth }]}>
                        <View style={styles.flex}>
                          <Text style={[styles.todayName, { color: colors.text }]}>{exercise.name}</Text>
                          <Text style={[styles.todayMeta, { color: colors.textSecondary }]}>{formatTime(exercise.createdAt)} · {exercise.durationMinutes} min{exercise.cardioIntensity ? ` · ${exercise.cardioIntensity}` : ''} · {exercise.caloriesBurned} kcal{setTotal > 0 ? ` · ${setTotal} sets` : ''}</Text>
                        </View>
                        <Pressable accessibilityLabel={`Remove ${exercise.name}`} onPress={() => removeExercise(exercise.id).catch(() => {})} style={[styles.removeButton, { backgroundColor: colors.backgroundSelected }]}><CloseIcon size={16} color={colors.textSecondary} /></Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>
          <Pressable disabled={saving} onPress={save} style={[styles.saveButton, saving && { opacity: 0.55 }]}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>ADD WORKOUT</Text>}
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safe: { flex: 1, paddingHorizontal: Spacing.four }, flex: { flex: 1 }, header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerSpacer: { width: 48 }, headerLabel: { fontSize: 17, fontWeight: '700' }, closeButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: Spacing.three, paddingBottom: Spacing.four, gap: Spacing.four }, title: { fontFamily: Type.display, fontSize: 34, lineHeight: 40, fontWeight: '700' }, subtitle: { marginTop: Spacing.two, fontSize: 14, lineHeight: 20 },
  focusSection: { gap: Spacing.two }, focusLabel: { marginTop: Spacing.one, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  intensityToggle: { flexDirection: 'row', borderRadius: 16, padding: 4 }, intensityButton: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, intensityText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, presetChip: { width: '31.8%', minHeight: 50, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, presetChipText: { flexShrink: 1, fontSize: 12, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, muscleChip: { width: '31.8%', minHeight: 42, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, muscleChipText: { flexShrink: 1, fontSize: 11.5, lineHeight: 14, fontWeight: '800' }, selectionMark: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, check: { color: '#ffffff', fontSize: 10, fontWeight: '900' },
  section: { gap: Spacing.two }, sectionTitle: { fontFamily: Type.display, fontSize: 21, fontWeight: '700' }, sectionBody: { fontSize: 13, lineHeight: 18 }, optional: { fontFamily: undefined, fontSize: 13, fontWeight: '600' },
  setCard: { borderRadius: 20, paddingHorizontal: Spacing.three }, setRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, muscleDot: { width: 11, height: 11, borderRadius: 6 }, muscleInfo: { flex: 1 }, muscleName: { fontSize: 14, fontWeight: '800' }, pointRate: { marginTop: 2, fontSize: 10, fontWeight: '600' }, setStepper: { width: 108, height: 42, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }, stepGlyph: { fontSize: 20, fontWeight: '800' }, setValue: { fontSize: 16, fontWeight: '900' },
  twoColumns: { flexDirection: 'row', gap: Spacing.two }, numberField: { flex: 1, minHeight: 76, borderRadius: 18, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two }, fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }, numberInputRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 5 }, numberInput: { flex: 1, padding: 0, fontSize: 24, lineHeight: 29, fontWeight: '800' }, suffix: { paddingBottom: 3, fontSize: 13, fontWeight: '700' },
  nameInput: { minHeight: 56, borderRadius: 18, paddingHorizontal: Spacing.three, fontSize: 15, fontWeight: '600' }, summaryCard: { borderRadius: 20, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, summaryTitle: { fontSize: 16, fontWeight: '800' }, summaryMeta: { marginTop: 3, fontSize: 12 },
  todayCard: { borderRadius: 18, paddingHorizontal: Spacing.three }, todayRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, todayName: { fontSize: 14, fontWeight: '800' }, todayMeta: { marginTop: 3, fontSize: 12, lineHeight: 17 }, removeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  saveButton: { minHeight: 58, borderRadius: 29, marginBottom: Spacing.two, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#ffffff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
});
