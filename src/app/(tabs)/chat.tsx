import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, type ThemeColors } from '@/constants/theme';
import { RingMark } from '@/components/logo';
import { askTrak, type ChatTurn } from '@/lib/chat';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { FoodAnalysis } from '@/lib/types';

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Present when Trak estimated a loggable meal. */
  meal?: FoodAnalysis;
  /** True once the meal was added to today. */
  added?: boolean;
  /** True for error bubbles (rendered slightly muted). */
  isError?: boolean;
};

const SUGGESTIONS = [
  '1 big mac, 1 fries, 1 coke zero',
  '2 eggs and a slice of toast',
  'How much protein do I have left today?',
];

/** Conversation persists across app launches (latest turns only). */
const CHAT_STORAGE_KEY = 'trak.chat.v1';
const CHAT_KEEP = 40;

let nextId = 1;
function makeId(): string {
  return `msg-${Date.now()}-${nextId++}`;
}

/** The estimate card Trak shows for a described meal, with an Add button. */
function MealCard({
  meal,
  added,
  saving,
  onAdd,
  colors,
}: {
  meal: FoodAnalysis;
  added: boolean;
  saving: boolean;
  onAdd: () => void;
  colors: ThemeColors;
}) {
  return (
    <View style={[styles.mealCard, { backgroundColor: colors.background }]}>
      <Text style={[styles.mealTitle, { color: colors.text }]} numberOfLines={2}>
        {meal.title}
      </Text>
      {meal.items.map((it, i) => (
        <View key={i} style={styles.mealItemRow}>
          <Text style={[styles.mealItemName, { color: colors.textSecondary }]} numberOfLines={1}>
            {it.name}
            {it.quantity ? ` · ${it.quantity}` : ''}
          </Text>
          <Text style={[styles.mealItemCals, { color: colors.textSecondary }]}>{it.calories}</Text>
        </View>
      ))}
      <View style={[styles.mealTotalRow, { borderTopColor: colors.backgroundSelected }]}>
        <Text style={[styles.mealTotalCals, { color: colors.text }]}>
          {meal.total.calories} kcal
        </Text>
        <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
          {meal.total.protein_g}p · {meal.total.carbs_g}c · {meal.total.fat_g}f
        </Text>
      </View>
      {added ? (
        <View style={[styles.addBtn, styles.addedBtn]}>
          <Text style={styles.addedText}>✓ Added to today</Text>
        </View>
      ) : (
        <Pressable style={[styles.addBtn, saving && { opacity: 0.6 }]} onPress={onAdd} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.addText}>Add to today</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { targets, todayTotals, addMeal, calorieBias } = useMeals();

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const listRef = useRef<FlatList<UiMessage>>(null);

  // Restore the conversation once per app launch, then keep it saved.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (raw) setMessages(JSON.parse(raw));
      } catch {
        // A broken cache just means a fresh conversation.
      }
      setHydrated(true);
    })();
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-CHAT_KEEP))).catch(
      () => {}
    );
  }, [messages, hydrated]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;

    const userMsg: UiMessage = { id: makeId(), role: 'user', content: trimmed };
    const base = [...messages, userMsg];
    setMessages(base);
    setInput('');
    setThinking(true);

    try {
      // Only text goes back as history; meal cards stay local.
      const history: ChatTurn[] = base.map((m) => ({ role: m.role, content: m.content }));
      const reply = await askTrak(history, { targets, eaten: todayTotals }, calorieBias);
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: reply.reply,
          meal: reply.kind === 'meal' ? reply.analysis : undefined,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: (e as Error).message ?? 'Something went wrong. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  async function handleAdd(msg: UiMessage) {
    if (!msg.meal || savingId) return;
    setSavingId(msg.id);
    try {
      await addMeal(msg.meal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, added: true } : m)));
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: (e as Error).message ?? 'Could not save the meal. Please try again.',
          isError: true,
        },
      ]);
    } finally {
      setSavingId(null);
    }
  }

  // Inverted list = newest at the bottom, auto-stays pinned like a chat app.
  const listData = [...messages].reverse();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <RingMark size={30} />
          <Text style={[styles.title, { color: colors.text }]}>Trak</Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <RingMark size={40} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Tell me what you ate
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Describe a meal in plain words and I’ll estimate the calories — or ask me about
                your day.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    style={[styles.suggestion, { backgroundColor: colors.backgroundElement }]}
                    onPress={() => send(s)}>
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={listData}
              inverted
              keyExtractor={(m) => m.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                thinking ? (
                  <View style={[styles.bubble, styles.trakBubble, { backgroundColor: colors.backgroundElement }]}>
                    <View style={styles.thinkingRow}>
                      <ActivityIndicator size="small" color={Brand.green} />
                      <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>
                        Trak is thinking…
                      </Text>
                    </View>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.bubble,
                    item.role === 'user'
                      ? styles.userBubble
                      : [styles.trakBubble, { backgroundColor: colors.backgroundElement }],
                  ]}>
                  <Text
                    style={[
                      styles.bubbleText,
                      item.role === 'user'
                        ? styles.userText
                        : { color: item.isError ? colors.textSecondary : colors.text },
                    ]}>
                    {item.content}
                  </Text>
                  {item.meal ? (
                    <MealCard
                      meal={item.meal}
                      added={!!item.added}
                      saving={savingId === item.id}
                      onAdd={() => handleAdd(item)}
                      colors={colors}
                    />
                  ) : null}
                </View>
              )}
            />
          )}

          <View style={[styles.inputRow, { backgroundColor: colors.backgroundElement }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. 1 big mac, 1 fries, 1 coke zero"
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              editable={!thinking}
              multiline={false}
            />
            <Pressable
              style={[styles.sendBtn, (!input.trim() || thinking) && { opacity: 0.4 }]}
              onPress={() => send(input)}
              disabled={!input.trim() || thinking}>
              <Text style={styles.sendText}>↑</Text>
            </Pressable>
          </View>
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
    gap: Spacing.two,
    paddingTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyBody: { fontSize: 14, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  suggestions: { gap: Spacing.two, marginTop: Spacing.three, alignSelf: 'stretch' },
  suggestion: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
  suggestionText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  listContent: { paddingVertical: Spacing.two, gap: Spacing.two },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: Brand.green, borderBottomRightRadius: 6 },
  trakBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#ffffff' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thinkingText: { fontSize: 14 },

  mealCard: { borderRadius: 14, padding: Spacing.three, marginTop: Spacing.two, gap: 6, minWidth: 230 },
  mealTitle: { fontSize: 15, fontWeight: '800' },
  mealItemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  mealItemName: { fontSize: 13, flexShrink: 1 },
  mealItemCals: { fontSize: 13, fontWeight: '600' },
  mealTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginTop: 2,
  },
  mealTotalCals: { fontSize: 17, fontWeight: '800' },
  mealMacros: { fontSize: 13, fontWeight: '600' },
  addBtn: {
    backgroundColor: Brand.green,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  addedBtn: { backgroundColor: 'transparent' },
  addText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  addedText: { color: Brand.green, fontSize: 14, fontWeight: '700' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 6 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Brand.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
});
