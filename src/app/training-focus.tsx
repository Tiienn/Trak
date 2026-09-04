import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { dayKey, useMeals } from '@/lib/store';
import { MUSCLE_GROUPS, muscleLabel } from '@/lib/training-catalog';
import { muscleScores } from '@/lib/training-progress';
import { useAppScheme } from '@/lib/theme';
import { useWorkoutFocusPreferences } from '@/lib/workout-focus-preferences';
import { PRIORITY_MUSCLES, type PriorityMuscle } from '@/lib/workout-focus-settings';

export default function TrainingFocusScreen() {
  const colors = Colors[useAppScheme()];
  const { exercises } = useMeals();
  const { preferences } = useBodyAnalysis();
  const focus = useWorkoutFocusPreferences();
  const [draftSelection, setDraftSelection] = useState<PriorityMuscle | null | undefined>(undefined);
  const selected = draftSelection === undefined ? focus.settings.priorityMuscle : draftSelection;
  const scores = useMemo(() => muscleScores(exercises, dayKey()), [exercises]);
  const choices = MUSCLE_GROUPS.filter((item) => PRIORITY_MUSCLES.includes(item.key as PriorityMuscle));

  async function save() {
    const baseline = selected ? scores.find((score) => score.key === selected)?.sets ?? 0 : 0;
    try {
      await focus.saveFocus(selected, baseline);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (error) {
      Alert.alert('Not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  const experienceCopy = preferences?.experience === 'beginner'
    ? 'Trak will prioritise exercise choice while keeping beginner volume balanced.'
    : 'Trak will prioritise this muscle and add a small amount of controlled weekly volume.';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Muscle focus</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close muscle focus" onPress={() => router.back()} style={[styles.close, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>×</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: colors.text }]}>Which muscle would you like to develop more?</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Choose one focus for a six-week block. Trak still keeps the rest of your training balanced.</Text>

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === null }}
          onPress={() => setDraftSelection(null)}
          style={[styles.balance, { backgroundColor: selected === null ? colors.greenTint : colors.backgroundElement, borderColor: selected === null ? Brand.green : colors.backgroundSelected }]}>
          <View style={styles.choiceCopy}>
            <Text style={[styles.choiceTitle, { color: colors.text }]}>Balanced training</Text>
            <Text style={[styles.choiceBody, { color: colors.textSecondary }]}>No extra muscle priority</Text>
          </View>
          {selected === null ? <View style={styles.check}><CheckIcon size={15} color="#fff" /></View> : null}
        </Pressable>

        <View style={styles.grid}>
          {choices.map((choice) => {
            const active = selected === choice.key;
            const sets = scores.find((score) => score.key === choice.key)?.sets ?? 0;
            return (
              <Pressable
                key={choice.key}
                accessibilityRole="radio"
                accessibilityLabel={`${choice.label}, ${sets} sets in the last seven days`}
                accessibilityState={{ checked: active }}
                onPress={() => setDraftSelection(choice.key as PriorityMuscle)}
                style={[styles.choice, { backgroundColor: active ? colors.greenTint : colors.backgroundElement, borderColor: active ? choice.color : colors.backgroundSelected }]}>
                <View style={[styles.dot, { backgroundColor: choice.color }]} />
                <Text style={[styles.choiceTitle, { color: colors.text }]}>{choice.label}</Text>
                <Text style={[styles.choiceBody, { color: colors.textSecondary }]}>{sets} sets · last 7 days</Text>
                {active ? <View style={styles.smallCheck}><CheckIcon size={12} color="#fff" /></View> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.note, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>{selected ? `${muscleLabel(selected)} focus` : 'Balanced training'}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{selected ? experienceCopy : 'Recommendations will continue to follow your goal, recovery, recent training, and available equipment.'}</Text>
        </View>
      </ScrollView>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: focus.saving || !focus.loaded }} disabled={focus.saving || !focus.loaded} onPress={() => void save()} style={[styles.save, (focus.saving || !focus.loaded) && styles.disabled]}>
        {focus.saving || !focus.loaded ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save muscle focus</Text>}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: Type.display, fontSize: 34, lineHeight: 40, fontWeight: '700' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 29, lineHeight: 31, fontWeight: '300' },
  scroll: { padding: Spacing.four, paddingBottom: 120, gap: Spacing.three },
  lead: { fontFamily: Type.display, fontSize: 25, lineHeight: 31, fontWeight: '700', marginTop: Spacing.two },
  body: { fontSize: 14, lineHeight: 20 },
  balance: { minHeight: 72, borderRadius: 18, borderWidth: 1, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  choiceCopy: { flex: 1 },
  choiceTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  choiceBody: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  check: { width: 25, height: 25, borderRadius: 13, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choice: { width: '48.5%', minHeight: 104, borderRadius: 18, borderWidth: 1, padding: Spacing.three, justifyContent: 'flex-end' },
  dot: { width: 10, height: 10, borderRadius: 5, marginBottom: Spacing.two },
  smallCheck: { position: 'absolute', top: 12, right: 12, width: 21, height: 21, borderRadius: 11, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  note: { borderRadius: 18, padding: Spacing.three, gap: Spacing.one },
  noteTitle: { fontSize: 15, fontWeight: '800' },
  save: { position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: Spacing.four, minHeight: 56, borderRadius: 18, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
