import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
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

import { PillIcon } from '@/components/icons';
import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { useSupplements } from '@/lib/supplements';
import { useAppScheme } from '@/lib/theme';

/** Round tick you check off once a day — green fill when taken, outline when not. */
function CheckCircle({ checked, colors }: { checked: boolean; colors: ThemeColors }) {
  return (
    <View
      style={[
        styles.checkCircle,
        checked
          ? { backgroundColor: Brand.green, borderColor: Brand.green }
          : { borderColor: colors.backgroundSelected },
      ]}>
      {checked ? <Text style={styles.checkGlyph}>✓</Text> : null}
    </View>
  );
}

export default function SupplementsScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const { loaded, supplements, checkedToday, takenCount, streak, addSupplement, renameSupplement, removeSupplement, toggleTaken } =
    useSupplements();

  const [editingId, setEditingId] = useState<string | null>(null);
  // Draft for the row being renamed — supplements come from the hook and are
  // immutable here, so we hold the in-progress edit locally until commit. The
  // id travels WITH the text: a TextInput's onEndEditing can fire late (after
  // the user has switched to editing another row), and a bare string draft
  // would let row A commit row B's name. The pair makes the commit atomic.
  const [draft, setDraft] = useState<{ id: string; name: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  // Keep focus on the add field so the user can rattle off several in a row.
  const addInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const allDone = supplements.length > 0 && takenCount === supplements.length;

  function revealInput() {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  useEffect(() => {
    if (!adding && !editingId) return;
    const keyboardListener = Keyboard.addListener('keyboardDidShow', revealInput);
    revealInput();
    return () => keyboardListener.remove();
  }, [adding, editingId]);

  async function tap(id: string) {
    try {
      await toggleTaken(id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Please try again.');
    }
  }

  function openEdit(id: string, name: string) {
    setEditingId(id);
    setDraft({ id, name });
  }

  async function commitRename(id: string, original: string) {
    // A late onEndEditing from a row the user already left finds the draft
    // pointing elsewhere — ignore it rather than cross-commit names.
    if (!draft || draft.id !== id) return;
    const next = draft.name.trim();
    // Nothing to do if it's unchanged or empty — leave the stored name intact.
    if (!next || next === original) return;
    try {
      await renameSupplement(id, next);
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Please try again.');
    }
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert('Delete supplement', `Remove “${name}” from your list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (editingId === id) setEditingId(null);
          try {
            await removeSupplement(id);
          } catch (e: any) {
            Alert.alert('Not removed', e?.message ?? 'Please try again.');
          }
        },
      },
    ]);
  }

  async function submitAdd() {
    const name = newName.trim();
    if (!name) return;
    try {
      await addSupplement(name);
      setNewName('');
      // Refocus for quick multi-add rather than dismissing the keyboard.
      addInputRef.current?.focus();
    } catch (e: any) {
      Alert.alert('Not added', e?.message ?? 'Please try again.');
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={['bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Supplements</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Your daily vitamins, supplements, and meds — check them off each day.
        </Text>

        {streak > 0 || allDone ? (
          <View style={styles.statusRow}>
            {streak > 0 ? (
              <Text style={[styles.streakText, { color: Brand.greenDark }]}>{streak}-day streak</Text>
            ) : null}
            {allDone ? (
              <Text style={[styles.allDoneText, { color: colors.textSecondary }]}>All done today</Text>
            ) : null}
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
          {loaded && supplements.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyTile, { backgroundColor: colors.greenTint }]}>
                <PillIcon size={28} color={Brand.greenDark} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Add a vitamin or supplement and check it off each day.
              </Text>
            </View>
          ) : (
            supplements.map((s) => {
              const editing = editingId === s.id;
              return (
                <View key={s.id} style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
                  <View style={styles.cardRow}>
                    <Pressable
                      style={styles.cardInfo}
                      onPress={() => (editing ? setEditingId(null) : openEdit(s.id, s.name))}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Text style={[styles.editHint, { color: colors.textSecondary }]}>
                        {editing ? 'Editing ▲' : 'Edit ✎'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => tap(s.id)} hitSlop={8}>
                      <CheckCircle checked={!!checkedToday[s.id]} colors={colors} />
                    </Pressable>
                  </View>

                  {editing ? (
                    <View style={styles.editWrap}>
                      <Text style={[styles.editHeading, { color: colors.textSecondary }]}>NAME</Text>
                      <TextInput
                        accessibilityLabel={`Rename ${s.name}`}
                        style={[styles.nameInput, { color: colors.text, backgroundColor: colors.background }]}
                        value={draft?.id === s.id ? draft.name : s.name}
                        onChangeText={(t) => setDraft({ id: s.id, name: t })}
                        onEndEditing={() => commitRename(s.id, s.name)}
                        placeholder="Supplement name"
                        placeholderTextColor={colors.textSecondary}
                        maxLength={40}
                        onFocus={revealInput}
                      />
                      <Pressable style={styles.deleteBtn} onPress={() => confirmDelete(s.id, s.name)}>
                        <Text style={styles.deleteText}>Delete</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}

          {adding ? (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <TextInput
                accessibilityLabel="New supplement name"
                ref={addInputRef}
                style={[styles.nameInput, { color: colors.text, backgroundColor: colors.background }]}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={submitAdd}
                placeholder="e.g. Vitamin D"
                placeholderTextColor={colors.textSecondary}
                maxLength={40}
                autoFocus
                returnKeyType="done"
                onFocus={revealInput}
              />
              <View style={styles.addRow}>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setAdding(false);
                    setNewName('');
                  }}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.addConfirm, { backgroundColor: colors.greenTint }]}
                  onPress={submitAdd}>
                  <Text style={[styles.addConfirmText, { color: Brand.greenDark }]}>Add</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.addBtn, { borderColor: colors.backgroundSelected }]}
              onPress={() => setAdding(true)}>
              <Text style={[styles.addText, { color: Brand.greenDark }]}>＋ Add supplement</Text>
            </Pressable>
          )}

          <Pressable style={styles.footerLink} onPress={() => router.push('/reminders')} hitSlop={6}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Want a daily nudge? Set a reminder ›
            </Text>
          </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  closeText: { fontSize: 20, fontWeight: '600' },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.two },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginBottom: Spacing.three },
  streakText: { fontSize: 14, fontWeight: '700' },
  allDoneText: { fontSize: 14, fontWeight: '600' },

  scroll: { paddingBottom: Spacing.six, gap: Spacing.three },

  card: { borderRadius: 16, padding: Spacing.four },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  cardInfo: { flex: 1, gap: 2, paddingRight: Spacing.two },
  name: { fontSize: 16, fontWeight: '700' },
  editHint: { fontSize: 13, fontWeight: '600' },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkGlyph: { color: '#ffffff', fontSize: 15, fontWeight: '800', lineHeight: 17 },

  editWrap: { marginTop: Spacing.four, gap: Spacing.two },
  editHeading: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  nameInput: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: { alignSelf: 'flex-start', paddingVertical: Spacing.two, marginTop: Spacing.one },
  deleteText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },

  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.three, marginTop: Spacing.three },
  cancelText: { fontSize: 14, fontWeight: '600' },
  addConfirm: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 999 },
  addConfirmText: { fontSize: 14, fontWeight: '700' },

  addBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  addText: { fontSize: 15, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', paddingVertical: Spacing.six, gap: Spacing.two },
  emptyTile: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 260 },

  footerLink: { alignItems: 'center', paddingVertical: Spacing.two, marginTop: Spacing.two },
  footerText: { fontSize: 13, fontWeight: '600' },
});
