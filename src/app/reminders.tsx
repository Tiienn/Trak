import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { applyReminders, ensurePermission, loadReminders, type Reminder } from '@/lib/reminders';
import { useAppScheme } from '@/lib/theme';

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function Stepper({
  onDown,
  onUp,
  value,
  colors,
}: {
  onDown: () => void;
  onUp: () => void;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable hitSlop={6} onPress={onDown} style={[styles.stepBtn, { backgroundColor: colors.background }]}>
        <Text style={[styles.stepText, { color: colors.text }]}>−</Text>
      </Pressable>
      <Text style={[styles.stepValue, { color: colors.text }]}>{value}</Text>
      <Pressable hitSlop={6} onPress={onUp} style={[styles.stepBtn, { backgroundColor: colors.background }]}>
        <Text style={[styles.stepText, { color: colors.text }]}>+</Text>
      </Pressable>
    </View>
  );
}

export default function RemindersScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadReminders().then(setReminders);
  }, []);

  // Persist + reschedule whenever the list changes (after initial load).
  async function commit(next: Reminder[]) {
    setReminders(next);
    await applyReminders(next);
  }

  async function toggle(id: string, on: boolean) {
    if (on) {
      const ok = await ensurePermission();
      if (!ok) {
        Alert.alert(
          'Notifications are off',
          'Turn on notifications for Trak in your phone settings to get meal reminders.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    await commit(reminders.map((r) => (r.id === id ? { ...r, enabled: on } : r)));
  }

  function changeTime(id: string, dHour: number, dMinute: number) {
    const next = reminders.map((r) => {
      if (r.id !== id) return r;
      const hour = (r.hour + dHour + 24) % 24;
      const minute = (r.minute + dMinute + 60) % 60;
      return { ...r, hour, minute };
    });
    commit(next);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Reminders</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Get a gentle nudge to log your meals. Reminders repeat every day.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {reminders.map((r) => {
            const editing = editingId === r.id;
            return (
              <View key={r.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.cardRow}>
                  <Pressable
                    style={styles.cardInfo}
                    onPress={() => setEditingId(editing ? null : r.id)}>
                    <Text style={[styles.label, { color: colors.text }]}>{r.label}</Text>
                    <Text style={[styles.time, { color: r.enabled ? Brand.greenDark : colors.textSecondary }]}>
                      {formatTime(r.hour, r.minute)} {editing ? '▲' : '✎'}
                    </Text>
                  </Pressable>
                  <Switch
                    value={r.enabled}
                    onValueChange={(v) => toggle(r.id, v)}
                    trackColor={{ false: colors.backgroundSelected, true: Brand.green }}
                    thumbColor="#ffffff"
                  />
                </View>

                {editing ? (
                  <View style={styles.editRow}>
                    <View style={styles.editGroup}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Hour</Text>
                      <Stepper
                        colors={colors}
                        value={String(r.hour % 12 === 0 ? 12 : r.hour % 12) + (r.hour < 12 ? ' AM' : ' PM')}
                        onDown={() => changeTime(r.id, -1, 0)}
                        onUp={() => changeTime(r.id, 1, 0)}
                      />
                    </View>
                    <View style={styles.editGroup}>
                      <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Minute</Text>
                      <Stepper
                        colors={colors}
                        value={String(r.minute).padStart(2, '0')}
                        onDown={() => changeTime(r.id, 0, -5)}
                        onUp={() => changeTime(r.id, 0, 5)}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  intro: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.four },

  scroll: { paddingBottom: Spacing.four, gap: Spacing.three },
  card: { borderRadius: 16, padding: Spacing.four },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: '700' },
  time: { fontSize: 14, fontWeight: '600' },

  editRow: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.four },
  editGroup: { gap: 6 },
  editLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, fontWeight: '800' },
  stepValue: { fontSize: 15, fontWeight: '800', minWidth: 54, textAlign: 'center' },
});
