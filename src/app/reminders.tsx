import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import {
  applyReminders,
  ensurePermission,
  loadReminders,
  makeReminder,
  type Reminder,
} from '@/lib/reminders';
import { useAppScheme } from '@/lib/theme';

function formatTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(minute).padStart(2, '0')} ${ampm}`;
}

// Preferred order for the built-in categories; anything else (e.g. Custom)
// falls to the end, preserving first-seen order among the stragglers.
const CATEGORY_ORDER = ['Meals', 'Hydration', 'Supplements', 'Progress'];

function groupByCategory(list: Reminder[]): { category: string; items: Reminder[] }[] {
  const groups = new Map<string, Reminder[]>();
  for (const r of list) {
    const arr = groups.get(r.category) ?? [];
    arr.push(r);
    groups.set(r.category, arr);
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...groups.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([category, items]) => ({ category, items }));
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
  // Label edits only persist on blur — closing the screen with the keyboard
  // still up skipped that commit. Track dirtiness and flush on unmount.
  const remindersRef = useRef<Reminder[]>([]);
  const dirtyRef = useRef(false);

  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  useEffect(() => {
    loadReminders().then(setReminders);
    return () => {
      if (dirtyRef.current) applyReminders(remindersRef.current).catch(() => {});
    };
  }, []);

  async function commit(next: Reminder[]) {
    setReminders(next);
    dirtyRef.current = false;
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
    commit(
      reminders.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          hour: (r.hour + dHour + 24) % 24,
          minute: (r.minute + dMinute + 60) % 60,
        };
      })
    );
  }

  function setLabel(id: string, label: string) {
    // Update label locally as the user types; persist happens on blur/toggle
    // (or on unmount, via dirtyRef, if the screen closes mid-edit).
    dirtyRef.current = true;
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, label } : r)));
  }

  async function addReminder() {
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
    const r = makeReminder(9, 0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await commit([...reminders, r]);
    setEditingId(r.id);
  }

  function deleteReminder(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (editingId === id) setEditingId(null);
    commit(reminders.filter((r) => r.id !== id));
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
          Gentle nudges to log meals, drink water, and stay on track. Reminders
          repeat every day.
        </Text>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {groupByCategory(reminders).map((group) => (
            <View key={group.category} style={styles.group}>
              <Text style={[styles.groupHeading, { color: colors.textSecondary }]}>
                {group.category.toUpperCase()}
              </Text>
              {group.items.map((r) => {
                const editing = editingId === r.id;
                return (
                  <View key={r.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.cardRow}>
                      <Pressable
                        style={styles.cardInfo}
                        onPress={() => setEditingId(editing ? null : r.id)}>
                        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
                          {r.label || 'Reminder'}
                        </Text>
                        <Text
                          style={[styles.time, { color: r.enabled ? Brand.greenDark : colors.textSecondary }]}>
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
                      <View style={styles.editWrap}>
                        <Text style={[styles.editHeading, { color: colors.textSecondary }]}>NAME</Text>
                        <TextInput
                          style={[styles.nameInput, { color: colors.text, backgroundColor: colors.background }]}
                          value={r.label}
                          onChangeText={(t) => setLabel(r.id, t)}
                          onEndEditing={() => commit(reminders)}
                          placeholder="Reminder name"
                          placeholderTextColor={colors.textSecondary}
                          maxLength={30}
                        />

                        <View style={styles.editLine}>
                          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Hour</Text>
                          <Stepper
                            colors={colors}
                            value={
                              String(r.hour % 12 === 0 ? 12 : r.hour % 12) + (r.hour < 12 ? ' AM' : ' PM')
                            }
                            onDown={() => changeTime(r.id, -1, 0)}
                            onUp={() => changeTime(r.id, 1, 0)}
                          />
                        </View>
                        <View style={styles.editLine}>
                          <Text style={[styles.editLabel, { color: colors.textSecondary }]}>Minute</Text>
                          <Stepper
                            colors={colors}
                            value={String(r.minute).padStart(2, '0')}
                            onDown={() => changeTime(r.id, 0, -5)}
                            onUp={() => changeTime(r.id, 0, 5)}
                          />
                        </View>

                        <Pressable style={styles.deleteBtn} onPress={() => deleteReminder(r.id)}>
                          <Text style={styles.deleteText}>Delete reminder</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}

          <Pressable
            style={[styles.addBtn, { borderColor: colors.backgroundSelected }]}
            onPress={addReminder}>
            <Text style={[styles.addText, { color: Brand.greenDark }]}>＋ Add reminder</Text>
          </Pressable>
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

  scroll: { paddingBottom: Spacing.six, gap: Spacing.four },
  group: { gap: Spacing.three },
  groupHeading: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8, marginBottom: Spacing.one },
  card: { borderRadius: 16, padding: Spacing.four },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flex: 1, gap: 2, paddingRight: Spacing.two },
  label: { fontSize: 16, fontWeight: '700' },
  time: { fontSize: 14, fontWeight: '600' },

  editWrap: { marginTop: Spacing.four, gap: Spacing.two },
  editHeading: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  nameInput: { borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, fontSize: 15, fontWeight: '600' },
  editLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  editLabel: { fontSize: 14, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 22, fontWeight: '800' },
  stepValue: { fontSize: 16, fontWeight: '800', minWidth: 64, textAlign: 'center' },

  deleteBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.two, marginTop: Spacing.one },
  deleteText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },

  addBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  addText: { fontSize: 15, fontWeight: '800' },
});
