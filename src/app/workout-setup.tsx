import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, type StyleProp, StyleSheet, Text, TextInput, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { useAppScheme } from '@/lib/theme';
import { useWorkoutCoachPreferences } from '@/lib/workout-coach-preferences';
import {
  DEFAULT_WORKOUT_COACH_SETTINGS,
  DEFAULT_GYM_EQUIPMENT,
  WORKOUT_EQUIPMENT,
  WORKOUT_ROUTINES,
  equipmentForWorkoutSettings,
  type WorkoutCoachSettings,
} from '@/lib/workout-coach-settings';

function Choice<T extends string | number>({ value, selected, label, onPress, style, showCheck = true }: { value: T; selected: T; label: string; onPress: (value: T) => void; style?: StyleProp<ViewStyle>; showCheck?: boolean }) {
  const colors = Colors[useAppScheme()];
  const active = value === selected;
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => onPress(value)} style={[styles.choice, style, { backgroundColor: active ? colors.greenTint : colors.background, borderColor: active ? Brand.green : colors.backgroundSelected }]}>
      <Text style={[styles.choiceText, { color: colors.text }]}>{label}</Text>
      {active && showCheck ? <View style={styles.check}><CheckIcon size={12} color="#fff" /></View> : null}
    </Pressable>
  );
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3);
}

function DurationInput({ value, onChange, onValidityChange }: { value: number; onChange: (value: number) => void; onValidityChange: (valid: boolean) => void }) {
  const colors = Colors[useAppScheme()];
  const [hours, setHours] = useState(String(Math.floor(value / 60)));
  const [minutes, setMinutes] = useState(String(value % 60));
  const lastEmittedValue = useRef(value);

  useEffect(() => {
    if (value === lastEmittedValue.current) return;
    setHours(String(Math.floor(value / 60)));
    setMinutes(String(value % 60));
    lastEmittedValue.current = value;
    onValidityChange(true);
  }, [onValidityChange, value]);

  const update = (nextHours: string, nextMinutes: string) => {
    const parsedHours = nextHours === '' ? 0 : Number(nextHours);
    const parsedMinutes = nextMinutes === '' ? 0 : Number(nextMinutes);
    const total = (parsedHours * 60) + parsedMinutes;
    const valid = !(nextHours === '' && nextMinutes === '')
      && parsedMinutes <= 59
      && total >= 5
      && total <= 180;
    onValidityChange(valid);
    if (valid) {
      lastEmittedValue.current = total;
      onChange(total);
    }
  };

  const changeHours = (text: string) => {
    const next = digitsOnly(text).slice(0, 1);
    setHours(next);
    update(next, minutes);
  };
  const changeMinutes = (text: string) => {
    const next = digitsOnly(text).slice(0, 2);
    setMinutes(next);
    update(hours, next);
  };

  return (
    <View style={styles.durationRow}>
      <View style={[styles.durationField, { backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}>
        <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>Hours</Text>
        <View style={styles.durationValueRow}>
          <TextInput
            accessibilityLabel="Workout hours"
            keyboardType="number-pad"
            maxLength={1}
            onChangeText={changeHours}
            selectTextOnFocus
            style={[styles.durationInput, { color: colors.text }]}
            value={hours}
          />
          <Text style={[styles.durationUnit, { color: colors.textSecondary }]}>hr</Text>
        </View>
      </View>
      <View style={[styles.durationField, { backgroundColor: colors.background, borderColor: colors.backgroundSelected }]}>
        <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>Minutes</Text>
        <View style={styles.durationValueRow}>
          <TextInput
            accessibilityLabel="Workout minutes"
            keyboardType="number-pad"
            maxLength={2}
            onChangeText={changeMinutes}
            selectTextOnFocus
            style={[styles.durationInput, { color: colors.text }]}
            value={minutes}
          />
          <Text style={[styles.durationUnit, { color: colors.textSecondary }]}>min</Text>
        </View>
      </View>
    </View>
  );
}

export default function WorkoutSetupScreen() {
  const colors = Colors[useAppScheme()];
  const coach = useWorkoutCoachPreferences();
  const { preferences: analysisPreferences } = useBodyAnalysis();
  const starting = useMemo<WorkoutCoachSettings>(() => {
    const base = coach.settings.configured ? coach.settings : {
      ...DEFAULT_WORKOUT_COACH_SETTINGS,
      ...(analysisPreferences ? {
        trainingLocation: analysisPreferences.trainingLocation,
        experience: analysisPreferences.experience,
        daysPerWeek: analysisPreferences.daysAvailable,
        equipment: analysisPreferences.equipment,
        limitationsNote: analysisPreferences.limitationsNote ?? '',
      } : {}),
    };
    return { ...base, equipment: equipmentForWorkoutSettings(base) };
  }, [analysisPreferences, coach.settings]);
  const [draftOverride, setDraft] = useState<WorkoutCoachSettings | null>(null);
  const [durationValid, setDurationValid] = useState(true);
  const draft = draftOverride ?? starting;
  const patch = <K extends keyof WorkoutCoachSettings>(key: K, value: WorkoutCoachSettings[K]) => setDraft((current) => ({ ...(current ?? starting), [key]: value }));
  const changeLocation = (trainingLocation: WorkoutCoachSettings['trainingLocation']) => setDraft((current) => {
    const base = current ?? starting;
    return { ...base, trainingLocation, equipment: trainingLocation === 'gym' && base.equipment.length === 0 ? DEFAULT_GYM_EQUIPMENT : base.equipment };
  });
  const toggleEquipment = (item: string) => {
    if (item === 'Bodyweight') {
      patch('equipment', ['Bodyweight']);
      return;
    }
    const withoutBodyweight = draft.equipment.filter((value) => value !== 'Bodyweight');
    const next = withoutBodyweight.includes(item) ? withoutBodyweight.filter((value) => value !== item) : [...withoutBodyweight, item];
    patch('equipment', next.length > 0 ? next : ['Bodyweight']);
  };

  async function save() {
    if (!durationValid) {
      Alert.alert('Check workout time', 'Enter a typical workout time between 5 minutes and 3 hours.');
      return;
    }
    try {
      await coach.save({ ...draft, configured: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (error) {
      Alert.alert('Not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Workout setup</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close workout setup" onPress={() => router.back()} style={[styles.close, { backgroundColor: colors.backgroundElement }]}><Text style={[styles.closeText, { color: colors.textSecondary }]}>×</Text></Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: colors.text }]}>Tell Trak how you train. No photos needed.</Text>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>Your goal already comes from your profile. These choices help the coach recommend exercises you can actually do, then completed workouts guide what comes next.</Text>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Where do you train?</Text>
          <View style={styles.inlineChoices}>{([['home', 'Home'], ['gym', 'Gym'], ['both', 'Both']] as const).map(([value, label]) => <Choice key={value} value={value} selected={draft.trainingLocation} label={label} onPress={changeLocation} />)}</View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Experience</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>This changes exercise complexity and coaching—not your effort or potential.</Text>
          {([['beginner', 'Beginner'], ['intermediate', 'Regular'], ['advanced', 'Advanced']] as const).map(([value, label]) => <Choice key={value} value={value} selected={draft.experience} label={label} onPress={(next) => patch('experience', next)} />)}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your week</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>How often do you want to train, and how long is a typical workout?</Text>
          <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>DAYS PER WEEK</Text>
          <View style={styles.daysRow}>{[1, 2, 3, 4, 5, 6, 7].map((value) => <Choice key={value} value={value} selected={draft.daysPerWeek} label={String(value)} onPress={(next) => patch('daysPerWeek', next)} showCheck={false} style={styles.dayChoice} />)}</View>
          <Text style={[styles.smallLabel, { color: colors.textSecondary }]}>TIME PER SESSION</Text>
          <DurationInput value={draft.sessionMinutes} onChange={(next) => patch('sessionMinutes', next)} onValidityChange={setDurationValid} />
          {!durationValid ? <Text style={styles.durationError}>Enter 5 minutes to 3 hours.</Text> : null}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Routine</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Trak rotates the next session from what you actually complete. You can change this anytime.</Text>
          {WORKOUT_ROUTINES.map((routine) => {
            const active = draft.routine === routine.key;
            return <Pressable key={routine.key} accessibilityRole="radio" accessibilityState={{ checked: active }} onPress={() => patch('routine', routine.key)} style={[styles.routine, { backgroundColor: active ? colors.greenTint : colors.background, borderColor: active ? Brand.green : colors.backgroundSelected }]}><View style={styles.flex}><Text style={[styles.routineTitle, { color: colors.text }]}>{routine.label}</Text><Text style={[styles.body, { color: colors.textSecondary }]}>{routine.detail}</Text></View>{active ? <View style={styles.check}><CheckIcon size={12} color="#fff" /></View> : null}</Pressable>;
          })}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Equipment available</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Choose what you can use for most workouts. Gym starts with common equipment selected; you can remove anything unavailable.</Text>
          <View style={styles.equipmentGrid}>{WORKOUT_EQUIPMENT.map((item) => { const active = draft.equipment.includes(item); return <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggleEquipment(item)} style={[styles.equipmentChoice, { backgroundColor: active ? colors.greenTint : colors.background, borderColor: active ? Brand.green : colors.backgroundSelected }]}><Text style={[styles.equipmentText, { color: colors.text }]}>{item}</Text>{active ? <View style={styles.check}><CheckIcon size={12} color="#fff" /></View> : null}</Pressable>; })}</View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Anything Trak should avoid?</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Optional. Mention pain, injuries, balance concerns, or movements your clinician told you to avoid.</Text>
          <TextInput value={draft.limitationsNote} onChangeText={(value) => patch('limitationsNote', value)} placeholder="e.g. Avoid overhead pressing" placeholderTextColor={colors.textSecondary} multiline maxLength={240} style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.backgroundSelected }]} />
        </View>

        <View style={[styles.note, { backgroundColor: colors.greenTint }]}><Text style={[styles.noteTitle, { color: colors.text }]}>Body Analysis stays optional</Text><Text style={[styles.body, { color: colors.textSecondary }]}>If you use it later, the visual check-in can refine your focus. These workout choices remain the base coach setup.</Text></View>
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: coach.saving || !coach.loaded || !durationValid }} disabled={coach.saving || !coach.loaded || !durationValid} onPress={() => void save()} style={[styles.save, (coach.saving || !coach.loaded || !durationValid) && styles.disabled]}>{coach.saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save workout setup</Text>}</Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: Type.display, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 29, lineHeight: 31, fontWeight: '300' },
  scroll: { padding: Spacing.four, paddingBottom: 120, gap: Spacing.three },
  lead: { fontFamily: Type.display, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  intro: { fontSize: 14, lineHeight: 20, marginTop: -Spacing.two },
  card: { borderRadius: 20, padding: Spacing.three, gap: Spacing.two },
  sectionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 18 },
  smallLabel: { fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8, marginTop: Spacing.one },
  inlineChoices: { flexDirection: 'row', gap: Spacing.two },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayChoice: { flex: 1, minWidth: 0, paddingHorizontal: 0, justifyContent: 'center' },
  choice: { minHeight: 48, borderRadius: 15, borderWidth: 1, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexGrow: 1 },
  choiceText: { fontSize: 14, fontWeight: '700' },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.green },
  routine: { minHeight: 68, borderRadius: 16, borderWidth: 1, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  routineTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  durationRow: { flexDirection: 'row', gap: Spacing.two },
  durationField: { flex: 1, minHeight: 78, borderRadius: 17, borderWidth: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, justifyContent: 'space-between' },
  durationLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
  durationValueRow: { minHeight: 38, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: Spacing.two },
  durationInput: { flex: 1, minWidth: 0, padding: 0, fontFamily: Type.display, fontSize: 29, lineHeight: 34, fontWeight: '700' },
  durationUnit: { paddingBottom: 4, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  durationError: { color: '#B45309', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  equipmentChoice: { width: '48.5%', minHeight: 50, borderRadius: 15, borderWidth: 1, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  equipmentText: { flex: 1, fontSize: 13, fontWeight: '700' },
  input: { minHeight: 88, borderRadius: 16, borderWidth: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  note: { borderRadius: 20, padding: Spacing.three, gap: Spacing.one },
  noteTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  save: { position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: Spacing.four, minHeight: 56, borderRadius: 18, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
