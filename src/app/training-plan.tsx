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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, DumbbellIcon, FlameIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { MUSCLE_GROUPS, muscleLabel } from '@/lib/training-catalog';
import {
  useTrainingPlan,
  type TrainingLoadEntry,
  type TrainingPlanItem,
  type TrainingPlanPatch,
} from '@/lib/training-plan';
import { useAppScheme } from '@/lib/theme';
import type { CardioIntensity, LoadUnit, MuscleGroup, TrainingActivityType } from '@/lib/types';

function numeric(value: string): number {
  return Math.max(0, Number(value.replace(',', '.')) || 0);
}

function durationParts(totalMinutes: number | null): { hours: string; minutes: string } {
  const safeMinutes = Math.max(1, Math.min(1440, Math.round(totalMinutes ?? 30)));
  return {
    hours: String(Math.floor(safeMinutes / 60)),
    minutes: String(safeMinutes % 60),
  };
}

function durationFromParts(hours: string, minutes: string): number {
  const hourValue = Math.min(24, Math.floor(numeric(hours)));
  const minuteValue = Math.floor(numeric(minutes));
  return Math.max(1, Math.min(1440, hourValue * 60 + minuteValue));
}

function LoadUnitToggle({ value, onChange, colors }: {
  value: LoadUnit;
  onChange: (unit: LoadUnit) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.unitToggle, { backgroundColor: colors.background }]}>
      {(['kg', 'lb'] as const).map((unit) => (
        <Pressable
          key={unit}
          onPress={() => onChange(unit)}
          style={[styles.unitButton, value === unit && { backgroundColor: colors.greenTint }]}>
          <Text style={[styles.unitText, { color: value === unit ? colors.accentStrong : colors.textSecondary }]}>{unit}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CardioIntensityToggle({ value, onChange, colors }: {
  value: CardioIntensity;
  onChange: (intensity: CardioIntensity) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.typeToggle, { backgroundColor: colors.background }]}>
      {(['light', 'moderate', 'vigorous'] as const).map((intensity) => (
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: value === intensity }}
          key={intensity}
          onPress={() => onChange(intensity)}
          style={[styles.typeButton, value === intensity && { backgroundColor: colors.greenTint }]}>
          <Text style={[styles.intensityText, { color: value === intensity ? colors.accentStrong : colors.textSecondary }]}>{intensity}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function WeeklyTargetField({ value, onChange, colors, backgroundColor }: {
  value: number;
  onChange: (value: number) => void;
  colors: ThemeColors;
  backgroundColor: string;
}) {
  return (
    <View style={[styles.frequencyField, { backgroundColor }]}>
      <View style={styles.frequencyCopy}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SESSIONS PER WEEK</Text>
        <Text style={[styles.frequencyHint, { color: colors.textSecondary }]}>Complete on separate days</Text>
      </View>
      <View style={[styles.frequencyStepper, { backgroundColor: colors.backgroundSelected }]}>
        <Pressable accessibilityLabel="Decrease weekly sessions" disabled={value <= 1} hitSlop={8} onPress={() => onChange(Math.max(1, value - 1))}>
          <Text style={[styles.largeStep, { color: colors.text }, value <= 1 && { opacity: 0.35 }]}>−</Text>
        </Pressable>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
        <Pressable accessibilityLabel="Increase weekly sessions" disabled={value >= 7} hitSlop={8} onPress={() => onChange(Math.min(7, value + 1))}>
          <Text style={[styles.largeStep, { color: colors.text }, value >= 7 && { opacity: 0.35 }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DurationTargetEditor({ value, name, colors, onSave }: {
  value: number | null;
  name: string;
  colors: ThemeColors;
  onSave: (minutes: number) => void;
}) {
  const initialDuration = durationParts(value);
  const [hours, setHours] = useState(initialDuration.hours);
  const [minutes, setMinutes] = useState(initialDuration.minutes);

  function save() {
    const totalMinutes = durationFromParts(hours, minutes);
    const normalized = durationParts(totalMinutes);
    setHours(normalized.hours);
    setMinutes(normalized.minutes);
    onSave(totalMinutes);
  }

  return (
    <View style={[styles.compactField, { backgroundColor: colors.background }]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TIME TARGET</Text>
      <View style={styles.durationParts}>
        <View style={styles.durationPart}>
          <TextInput
            accessibilityLabel={`Hours target for ${name}`}
            value={hours}
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={(nextValue) => setHours(nextValue.replace(/[^0-9]/g, ''))}
            onEndEditing={save}
            style={[styles.durationInput, { color: colors.text }]}
          />
          <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>hr</Text>
        </View>
        <View style={styles.durationPart}>
          <TextInput
            accessibilityLabel={`Minutes target for ${name}`}
            value={minutes}
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={(nextValue) => setMinutes(nextValue.replace(/[^0-9]/g, ''))}
            onEndEditing={save}
            style={[styles.durationInput, { color: colors.text }]}
          />
          <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>min</Text>
        </View>
      </View>
    </View>
  );
}

function progressionLabel(item: TrainingPlanItem, history: TrainingLoadEntry[]): string | null {
  if (item.activityType !== 'strength' || item.loadValue == null) return null;
  const entries = history
    .filter((entry) => entry.trainingPlanItemId === item.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  if (entries.length < 2) return 'Starting load tracked';
  const previous = entries[1];
  if (previous.loadUnit !== item.loadUnit) return `Previous: ${previous.loadValue} ${previous.loadUnit}`;
  const change = Math.round((item.loadValue - previous.loadValue) * 100) / 100;
  if (change > 0) return `↑ ${change} ${item.loadUnit} from previous`;
  if (change < 0) return `↓ ${Math.abs(change)} ${item.loadUnit} from previous`;
  return `Previous: ${previous.loadValue} ${previous.loadUnit}`;
}

function PlanItemCard({ item, history, colors, onUpdate, onRemove }: {
  item: TrainingPlanItem;
  history: TrainingLoadEntry[];
  colors: ThemeColors;
  onUpdate: (patch: TrainingPlanPatch) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const muscle = MUSCLE_GROUPS.find((entry) => entry.key === item.muscleGroup);
  const progress = progressionLabel(item, history);

  async function update(patch: TrainingPlanPatch) {
    try {
      await onUpdate(patch);
    } catch (error: any) {
      Alert.alert('Not saved', error?.message ?? 'Please try again.');
    }
  }

  return (
    <View style={[styles.planItem, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.planHeading}>
        <View style={[styles.exerciseIcon, { backgroundColor: colors.greenTint }]}>
          {item.activityType === 'cardio'
            ? <FlameIcon size={19} color={colors.accent} />
            : <DumbbellIcon size={19} color={muscle?.color ?? colors.accent} />}
        </View>
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.exerciseMeta, { color: colors.textSecondary }]}>
            {item.activityType === 'cardio'
              ? `${item.durationTargetMinutes ?? 0} min · ${item.cardioIntensity ?? 'moderate'} · ${item.calorieTarget ?? 0} kcal target`
              : `${muscleLabel(item.muscleGroup)} · ${item.sets} sets · ${item.reps} reps`}
          </Text>
        </View>
        <Pressable accessibilityLabel={`Remove ${item.name}`} onPress={onRemove} style={[styles.removeButton, { backgroundColor: colors.backgroundSelected }]}>
          <CloseIcon size={15} color={colors.textSecondary} />
        </Pressable>
      </View>

      {item.activityType === 'strength' ? (
        <>
          <View style={styles.itemFields}>
            <View style={[styles.compactField, { backgroundColor: colors.background }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SETS</Text>
              <View style={styles.inlineStepper}>
                <Pressable hitSlop={8} onPress={() => update({ sets: Math.max(1, item.sets - 1) })}><Text style={[styles.largeStep, { color: colors.text }]}>−</Text></Pressable>
                <Text style={[styles.detailValue, { color: colors.text }]}>{item.sets}</Text>
                <Pressable hitSlop={8} onPress={() => update({ sets: Math.min(20, item.sets + 1) })}><Text style={[styles.largeStep, { color: colors.text }]}>+</Text></Pressable>
              </View>
            </View>
            <View style={[styles.compactField, { backgroundColor: colors.background }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>REPS</Text>
              <TextInput
                key={`${item.id}-reps-${item.reps}`}
                defaultValue={item.reps}
                maxLength={20}
                onEndEditing={(event) => update({ reps: event.nativeEvent.text || item.reps })}
                style={[styles.compactInput, { color: colors.text }]}
              />
            </View>
          </View>
          <View style={[styles.loadField, { backgroundColor: colors.background }]}>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TRAINING LOAD</Text>
              {progress ? <Text style={[styles.progressText, { color: colors.accentStrong }]}>{progress}</Text> : null}
            </View>
            <View style={styles.loadControls}>
              <TextInput
                accessibilityLabel={`Load for ${item.name}`}
                key={`${item.id}-load-${item.loadValue}`}
                defaultValue={item.loadValue == null ? '' : String(item.loadValue)}
                keyboardType="decimal-pad"
                maxLength={7}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                onEndEditing={(event) => update({ loadValue: numeric(event.nativeEvent.text) })}
                style={[styles.loadInput, { color: colors.text }]}
              />
              <LoadUnitToggle value={item.loadUnit} onChange={(loadUnit) => update({ loadUnit })} colors={colors} />
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.itemFields}>
            <DurationTargetEditor
              value={item.durationTargetMinutes}
              name={item.name}
              colors={colors}
              onSave={(durationTargetMinutes) => void update({ durationTargetMinutes })}
            />
            <View style={[styles.compactField, { backgroundColor: colors.background }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CALORIE TARGET</Text>
              <View style={styles.inputWithSuffix}>
                <TextInput
                  key={`${item.id}-calories-${item.calorieTarget}`}
                  defaultValue={String(item.calorieTarget ?? 200)}
                  keyboardType="number-pad"
                  maxLength={5}
                  onEndEditing={(event) => update({ calorieTarget: numeric(event.nativeEvent.text) })}
                  style={[styles.compactInput, { color: colors.text }]}
                />
                <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>kcal</Text>
              </View>
            </View>
          </View>
          <CardioIntensityToggle value={item.cardioIntensity ?? 'moderate'} onChange={(cardioIntensity) => update({ cardioIntensity })} colors={colors} />
        </>
      )}
      <WeeklyTargetField value={item.weeklyTarget} onChange={(weeklyTarget) => { void update({ weeklyTarget }); }} colors={colors} backgroundColor={colors.background} />
    </View>
  );
}

export default function TrainingPlanScreen() {
  const colors = Colors[useAppScheme()];
  const insets = useSafeAreaInsets();
  const { loaded, items, loadHistory, addItem, updateItem, removeItem } = useTrainingPlan();
  const [activityType, setActivityType] = useState<TrainingActivityType>('strength');
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState('8–12');
  const [loadText, setLoadText] = useState('');
  const [loadUnit, setLoadUnit] = useState<LoadUnit>('kg');
  const [cardioHours, setCardioHours] = useState('0');
  const [cardioMinutes, setCardioMinutes] = useState('30');
  const [cardioCalories, setCardioCalories] = useState('200');
  const [cardioIntensity, setCardioIntensity] = useState<CardioIntensity>('moderate');
  const [weeklyTarget, setWeeklyTarget] = useState(1);
  const [saving, setSaving] = useState(false);

  async function add() {
    if (saving) return;
    setSaving(true);
    try {
      await addItem({
        name,
        activityType,
        muscleGroup: activityType === 'strength' ? muscle : null,
        sets: activityType === 'strength' ? sets : 1,
        reps: activityType === 'strength' ? reps : '—',
        loadValue: activityType === 'strength' && loadText.trim() ? numeric(loadText) : null,
        loadUnit,
        durationTargetMinutes: activityType === 'cardio' ? durationFromParts(cardioHours, cardioMinutes) : null,
        calorieTarget: activityType === 'cardio' ? numeric(cardioCalories) : null,
        cardioIntensity: activityType === 'cardio' ? cardioIntensity : null,
        weeklyTarget,
      });
      setName('');
      setLoadText('');
      setWeeklyTarget(1);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Not saved', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await removeItem(id);
    } catch (error: any) {
      Alert.alert('Not removed', error?.message ?? 'Please try again.');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerLabel, { color: colors.text }]}>Training plan</Text>
          <Pressable accessibilityLabel="Close training plan" onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: colors.backgroundElement }]}>
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
              <Text style={[styles.title, { color: colors.text }]}>Customise training</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Set strength loads or cardio targets. Trak keeps each load change so you can see progressive overload over time.</Text>
            </View>

            {loaded && items.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your training</Text>
                <View style={styles.planList}>
                  {items.map((item) => (
                    <PlanItemCard
                      key={item.id}
                      item={item}
                      history={loadHistory}
                      colors={colors}
                      onUpdate={(patch) => updateItem(item.id, patch)}
                      onRemove={() => remove(item.id)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Add training</Text>
              <View style={[styles.typeToggle, { backgroundColor: colors.backgroundElement }]}>
                {(['strength', 'cardio'] as const).map((type) => (
                  <Pressable key={type} onPress={() => setActivityType(type)} style={[styles.typeButton, activityType === type && { backgroundColor: colors.greenTint }]}>
                    <Text style={[styles.typeText, { color: activityType === type ? colors.accentStrong : colors.textSecondary }]}>{type === 'strength' ? 'Strength' : 'Cardio'}</Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                accessibilityLabel={activityType === 'cardio' ? 'Cardio activity' : 'Exercise name'}
                value={name}
                onChangeText={setName}
                placeholder={activityType === 'cardio' ? 'Cardio activity' : 'Exercise name'}
                placeholderTextColor={colors.textSecondary}
                maxLength={60}
                style={[styles.input, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              />

              {activityType === 'strength' ? (
                <>
                  <View style={styles.muscleGrid}>
                    {MUSCLE_GROUPS.map((item) => (
                      <Pressable
                        key={item.key}
                        onPress={() => setMuscle(item.key)}
                        style={[styles.muscleChip, { backgroundColor: muscle === item.key ? colors.greenTint : colors.backgroundElement, borderColor: muscle === item.key ? item.color : 'transparent' }]}>
                        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                        <Text style={[styles.muscleText, { color: colors.text }]}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailField, { backgroundColor: colors.backgroundElement }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>SETS</Text>
                      <View style={styles.inlineStepper}>
                        <Pressable hitSlop={8} onPress={() => setSets((value) => Math.max(1, value - 1))}><Text style={[styles.largeStep, { color: colors.text }]}>−</Text></Pressable>
                        <Text style={[styles.detailValue, { color: colors.text }]}>{sets}</Text>
                        <Pressable hitSlop={8} onPress={() => setSets((value) => Math.min(20, value + 1))}><Text style={[styles.largeStep, { color: colors.text }]}>+</Text></Pressable>
                      </View>
                    </View>
                    <View style={[styles.detailField, { backgroundColor: colors.backgroundElement }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>REPS</Text>
                      <TextInput value={reps} onChangeText={setReps} maxLength={20} style={[styles.repsInput, { color: colors.text }]} />
                    </View>
                  </View>
                  <View style={[styles.addLoadField, { backgroundColor: colors.backgroundElement }]}>
                    <View>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TRAINING LOAD</Text>
                      <Text style={[styles.loadHint, { color: colors.textSecondary }]}>Optional · update it as you get stronger</Text>
                    </View>
                    <View style={styles.loadControls}>
                      <TextInput
                        accessibilityLabel="Training load"
                        value={loadText}
                        onChangeText={(value) => setLoadText(value.replace(/[^0-9.,]/g, ''))}
                        keyboardType="decimal-pad"
                        maxLength={7}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                        style={[styles.loadInput, { color: colors.text }]}
                      />
                      <LoadUnitToggle value={loadUnit} onChange={setLoadUnit} colors={colors} />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <CardioIntensityToggle value={cardioIntensity} onChange={setCardioIntensity} colors={colors} />
                  <View style={styles.detailRow}>
                    <View style={[styles.detailField, { backgroundColor: colors.backgroundElement }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>TIME TARGET</Text>
                      <View style={styles.durationParts}>
                        <View style={styles.durationPart}>
                          <TextInput
                            accessibilityLabel="Cardio hours target"
                            value={cardioHours}
                            onChangeText={(value) => setCardioHours(value.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={2}
                            style={[styles.durationInput, { color: colors.text }]}
                          />
                          <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>hr</Text>
                        </View>
                        <View style={styles.durationPart}>
                          <TextInput
                            accessibilityLabel="Cardio minutes target"
                            value={cardioMinutes}
                            onChangeText={(value) => setCardioMinutes(value.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            maxLength={2}
                            style={[styles.durationInput, { color: colors.text }]}
                          />
                          <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>min</Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.detailField, { backgroundColor: colors.backgroundElement }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CALORIE TARGET</Text>
                      <View style={styles.inputWithSuffix}>
                        <TextInput value={cardioCalories} onChangeText={(value) => setCardioCalories(value.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={5} style={[styles.repsInput, { color: colors.text }]} />
                        <Text style={[styles.inputSuffix, { color: colors.textSecondary }]}>kcal</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              <WeeklyTargetField value={weeklyTarget} onChange={setWeeklyTarget} colors={colors} backgroundColor={colors.backgroundElement} />

              <Pressable disabled={saving || !name.trim()} onPress={add} style={[styles.addButton, (saving || !name.trim()) && { opacity: 0.45 }]}>
                {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.addButtonText}>ADD TO TRAINING</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  flex: { flex: 1 },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerSpacer: { width: 48 },
  headerLabel: { fontSize: 17, fontWeight: '700' },
  closeButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.four },
  title: { fontFamily: Type.display, fontSize: 34, lineHeight: 40, fontWeight: '700' },
  subtitle: { marginTop: Spacing.two, fontSize: 14, lineHeight: 20 },
  section: { gap: Spacing.three },
  sectionTitle: { fontFamily: Type.display, fontSize: 21, fontWeight: '700' },
  planList: { gap: Spacing.two },
  planItem: { borderRadius: 20, padding: Spacing.three, gap: Spacing.three },
  planHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  exerciseIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 14, fontWeight: '800' },
  exerciseMeta: { marginTop: 3, fontSize: 12 },
  removeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemFields: { flexDirection: 'row', gap: Spacing.two },
  compactField: { flex: 1, minHeight: 70, borderRadius: 16, padding: Spacing.two },
  compactInput: { flex: 1, padding: 0, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  loadField: { minHeight: 68, borderRadius: 16, padding: Spacing.two, paddingLeft: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  addLoadField: { minHeight: 76, borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  loadHint: { marginTop: 3, fontSize: 11 },
  progressText: { marginTop: 3, fontSize: 11, fontWeight: '700' },
  loadControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  loadInput: { minWidth: 54, padding: 0, fontSize: 19, fontWeight: '800', textAlign: 'right' },
  frequencyField: { minHeight: 72, borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.three },
  frequencyCopy: { flex: 1 }, frequencyHint: { marginTop: 3, fontSize: 11, lineHeight: 15 }, frequencyStepper: { minWidth: 116, minHeight: 44, borderRadius: 14, paddingHorizontal: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unitToggle: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  unitButton: { minWidth: 34, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  unitText: { fontSize: 12, fontWeight: '800' },
  typeToggle: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  typeButton: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  typeText: { fontSize: 14, fontWeight: '800' },
  intensityText: { fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  input: { minHeight: 56, borderRadius: 18, paddingHorizontal: Spacing.three, fontSize: 16, fontWeight: '600' },
  muscleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  muscleChip: { width: '48.5%', minHeight: 48, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  muscleText: { fontSize: 14, fontWeight: '800' },
  detailRow: { flexDirection: 'row', gap: Spacing.two },
  detailField: { flex: 1, minHeight: 78, borderRadius: 18, padding: Spacing.three },
  fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  inlineStepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  largeStep: { fontSize: 22, fontWeight: '800' },
  detailValue: { fontSize: 20, fontWeight: '900' },
  repsInput: { flex: 1, padding: 0, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  inputWithSuffix: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  durationParts: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  durationPart: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  durationInput: { minWidth: 20, padding: 0, fontSize: 17, fontWeight: '800', textAlign: 'right' },
  inputSuffix: { fontSize: 11, fontWeight: '700' },
  addButton: { minHeight: 56, borderRadius: 28, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
});
