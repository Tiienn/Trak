import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import { useFatLossPreferences } from '@/lib/fat-loss-preferences';
import { buildFatLossWeek } from '@/lib/fat-loss-plan';
import {
  CARDIO_MODES,
  cardioTargetForSettings,
  type CardioMode,
  type CardioToleranceMinutes,
  type FatLossActivityBaseline,
  type FatLossPhase,
  type FatLossSettings,
} from '@/lib/fat-loss-settings';
import { useAppScheme } from '@/lib/theme';
import { useBodyAnalysis } from '@/lib/body-analysis-store';

function Choice<T extends string | number>({ value, selected, label, onPress }: {
  value: T;
  selected: T;
  label: string;
  onPress: (value: T) => void;
}) {
  const colors = Colors[useAppScheme()];
  const active = value === selected;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={() => onPress(value)}
      style={[styles.choice, { backgroundColor: active ? colors.greenTint : colors.backgroundElement, borderColor: active ? Brand.green : colors.backgroundSelected }]}>
      <Text style={[styles.choiceText, { color: active ? colors.accentStrong : colors.text }]}>{label}</Text>
      {active ? <View style={styles.check}><CheckIcon size={12} color="#fff" /></View> : null}
    </Pressable>
  );
}

export default function FatLossSettingsScreen() {
  const colors = Colors[useAppScheme()];
  const preferences = useFatLossPreferences();
  const { preferences: trainingPreferences } = useBodyAnalysis();
  const [draftOverride, setDraft] = useState<FatLossSettings | null>(null);
  const draft = draftOverride ?? preferences.settings;

  const patch = <K extends keyof FatLossSettings>(key: K, value: FatLossSettings[K]) => {
    setDraft((current) => ({ ...(current ?? preferences.settings), [key]: value }));
  };
  const toggleMode = (mode: CardioMode) => {
    setDraft((current) => {
      const base = current ?? preferences.settings;
      const selected = base.preferredCardioModes.includes(mode);
      if (selected && base.preferredCardioModes.length === 1) return base;
      return {
        ...base,
        preferredCardioModes: selected
          ? base.preferredCardioModes.filter((item) => item !== mode)
          : [...base.preferredCardioModes, mode],
      };
    });
  };

  async function save() {
    try {
      await preferences.save(draft);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (error) {
      Alert.alert('Not saved', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  const target = cardioTargetForSettings(draft);
  const weeklyPlan = buildFatLossWeek(draft, trainingPreferences?.daysAvailable ?? 3);
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Fat-loss activity</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close fat-loss activity settings" onPress={() => router.back()} style={[styles.close, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>×</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.lead, { color: colors.text }]}>Start where you are. Trak will build activity gradually instead of chasing 150 minutes immediately.</Text>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Current activity</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Choose the closest description of a normal recent week.</Text>
          {([
            ['inactive', 'Mostly inactive'],
            ['some', 'Some weekly activity'],
            ['active', 'Consistently active'],
          ] as [FatLossActivityBaseline, string][]).map(([value, label]) => (
            <Choice key={value} value={value} selected={draft.activityBaseline} label={label} onPress={(next) => patch('activityBaseline', next)} />
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Comfortable cardio time</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>How long can you currently continue at an easy or conversational pace?</Text>
          <View style={styles.grid}>
            {([5, 10, 20, 30] as CardioToleranceMinutes[]).map((value) => (
              <Choice key={value} value={value} selected={draft.comfortableCardioMinutes} label={`${value}${value === 30 ? '+' : ''} min`} onPress={(next) => patch('comfortableCardioMinutes', next)} />
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Activities you would repeat</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Trak will favour these when they match your location and limitations.</Text>
          <View style={styles.chips}>
            {CARDIO_MODES.map((mode) => {
              const active = draft.preferredCardioModes.includes(mode.key);
              return (
                <Pressable key={mode.key} accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => toggleMode(mode.key)} style={[styles.chip, { backgroundColor: active ? colors.greenTint : colors.background, borderColor: active ? Brand.green : colors.backgroundSelected }]}>
                  <Text style={[styles.chipText, { color: active ? colors.accentStrong : colors.textSecondary }]}>{mode.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Comfort and safety</Text>
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Standing from a chair feels comfortable</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Used before suggesting sit-to-stands.</Text>
            </View>
            <Switch value={draft.chairStandComfortable} onValueChange={(value) => patch('chairStandComfortable', value)} trackColor={{ true: Brand.green }} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>I have balance concerns</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Trak will avoid unsupported or choreography-heavy choices.</Text>
            </View>
            <Switch value={draft.balanceConcern} onValueChange={(value) => patch('balanceConcern', value)} trackColor={{ true: Brand.green }} />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text style={[styles.switchTitle, { color: colors.text }]}>Suggest movement breaks</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>Optional light movement; it does not earn points or inflate cardio progress.</Text>
            </View>
            <Switch value={draft.movementBreaks} onValueChange={(value) => patch('movementBreaks', value)} trackColor={{ true: Brand.green }} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Phase</Text>
          {([['loss', 'Losing weight'], ['maintenance', 'Maintaining weight']] as [FatLossPhase, string][]).map(([value, label]) => (
            <Choice key={value} value={value} selected={draft.phase} label={label} onPress={(next) => patch('phase', next)} />
          ))}
          <Text style={[styles.plan, { color: colors.accentStrong }]}>Current staged target: {target} moderate-equivalent min/week. This can build toward 150 as completion and recovery allow.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Suggested weekly structure</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Use these as flexible sessions, not fixed calendar obligations. Missed sessions are rescheduled or reduced—not repaid.</Text>
          {weeklyPlan.map((session) => (
            <View key={session.index} style={[styles.planRow, { borderTopColor: colors.backgroundSelected }]}>
              <Text style={[styles.planDay, { color: colors.textSecondary }]}>SESSION {session.index}</Text>
              <Text style={[styles.planSession, { color: colors.text }]}>{session.kind === 'mixed' ? 'Full-body strength + cardio' : session.kind === 'strength' ? 'Full-body strength' : 'Preferred cardio'}{session.cardioMinutes > 0 ? ` · ${session.cardioMinutes} min cardio` : ''}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.safety, { color: colors.textSecondary }]}>Stop and seek medical evaluation for exertional chest pain or pressure, fainting or lightheadedness, or severe or unusual shortness of breath. Recorded medical limitations always override these preferences.</Text>
      </ScrollView>
      <Pressable accessibilityRole="button" disabled={!preferences.loaded || preferences.saving} onPress={() => void save()} style={[styles.save, (!preferences.loaded || preferences.saving) && styles.disabled]}>
        {preferences.saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save activity preferences</Text>}
      </Pressable>
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
  lead: { fontFamily: Type.display, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  card: { borderRadius: 20, padding: Spacing.three, gap: Spacing.two },
  sectionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  body: { fontSize: 13, lineHeight: 18 },
  choice: { minHeight: 50, borderRadius: 15, borderWidth: 1, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choiceText: { fontSize: 14, fontWeight: '700' },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.green },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  chipText: { fontSize: 13, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  divider: { height: StyleSheet.hairlineWidth },
  plan: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  planRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two, gap: 2 },
  planDay: { fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 0.8 },
  planSession: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  safety: { fontSize: 12, lineHeight: 17 },
  save: { position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: Spacing.four, minHeight: 56, borderRadius: 18, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
