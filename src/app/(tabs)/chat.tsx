import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { RingMark } from '@/components/logo';
import { askTrak, type ChatTurn } from '@/lib/chat';
import { sumTotals, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { FoodAnalysis, LoggedMeal } from '@/lib/types';

/**
 * A compact "last 7 days" digest the assistant can reason about for trend
 * questions — one line per day, newest first.
 */
function weekSummary(meals: LoggedMeal[]): string {
  const byDay = new Map<string, LoggedMeal[]>();
  for (const m of meals) {
    if (!byDay.has(m.date)) byDay.set(m.date, []);
    byDay.get(m.date)!.push(m);
  }
  return [...byDay.entries()]
    .slice(0, 7)
    .map(([date, dayMeals]) => {
      const t = sumTotals(dayMeals);
      return `${date}: ${t.calories} kcal, ${t.protein_g}p ${t.carbs_g}c ${t.fat_g}f (${dayMeals.length} meals)`;
    })
    .join('\n');
}

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

/** Quick logging examples shown on a fresh, empty Chat. */
const LOG_EXAMPLES = ['1 big mac, 1 fries, 1 coke zero', '2 eggs and a slice of toast'];

/** Grouped insight prompts for the Ask panel — always available, tap to send. */
const ASK_GROUPS: { heading: string; items: string[] }[] = [
  {
    heading: 'FOR YOU',
    items: ['How am I doing today?', 'What should I focus on tomorrow?'],
  },
  {
    heading: 'DIVE DEEPER',
    items: ['Any trends in my last 7 days?', 'Is my protein spread evenly across meals?'],
  },
];

/** Both conversations persist across app launches (latest turns only). */
const CHAT_STORAGE_KEY = 'trak.chat.v1';
const ASK_STORAGE_KEY = 'trak.ask.v1';
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

type Mode = 'chat' | 'ask';

export default function ChatScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { targets, todayTotals, addMeal, calorieBias, meals } = useMeals();
  const params = useLocalSearchParams<{ mode?: string; t?: string }>();

  // Chat and Ask are two independent conversations with their own histories.
  const [chatMessages, setChatMessages] = useState<UiMessage[]>([]);
  const [askMessages, setAskMessages] = useState<UiMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('chat');
  const listRef = useRef<FlatList<UiMessage>>(null);
  // Synchronous re-entry guard: `thinking` state commits async, so a fast
  // double-tap could start two sends. A ref flips immediately.
  const sendingRef = useRef(false);

  const messages = mode === 'chat' ? chatMessages : askMessages;
  const setMessages = mode === 'chat' ? setChatMessages : setAskMessages;

  // Jumping here from the Home coaching card opens straight into Ask mode,
  // even if Chat is already mounted (tabs stay alive in the background). The
  // nonce param makes repeat taps re-fire this despite an unchanged mode value.
  useEffect(() => {
    if (params.mode === 'ask') setMode('ask');
  }, [params.mode, params.t]);

  // Restore both conversations once per app launch, then keep them saved.
  useEffect(() => {
    (async () => {
      try {
        const [chatRaw, askRaw] = await Promise.all([
          AsyncStorage.getItem(CHAT_STORAGE_KEY),
          AsyncStorage.getItem(ASK_STORAGE_KEY),
        ]);
        if (chatRaw) setChatMessages(JSON.parse(chatRaw));
        if (askRaw) setAskMessages(JSON.parse(askRaw));
      } catch {
        // A broken cache just means a fresh conversation.
      }
      setHydrated(true);
    })();
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages.slice(-CHAT_KEEP))).catch(
      () => {}
    );
  }, [chatMessages, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ASK_STORAGE_KEY, JSON.stringify(askMessages.slice(-CHAT_KEEP))).catch(
      () => {}
    );
  }, [askMessages, hydrated]);

  async function send(text: string) {
    const trimmed = text.trim();
    // The hydrated gate closes a cold-start race: a message sent before the
    // stored history loads would be overwritten (deleted) by the late restore.
    if (!trimmed || thinking || sendingRef.current || !hydrated) return;
    sendingRef.current = true;

    const userMsg: UiMessage = { id: makeId(), role: 'user', content: trimmed };
    const base = [...messages, userMsg];
    setMessages(base);
    setInput('');
    setThinking(true);

    try {
      // Only text goes back as history; meal cards stay local.
      const history: ChatTurn[] = base.map((m) => ({ role: m.role, content: m.content }));
      const reply = await askTrak(
        history,
        { targets, eaten: todayTotals, week: weekSummary(meals) },
        calorieBias
      );
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
      sendingRef.current = false;
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

        <View style={[styles.modeSwitch, { backgroundColor: colors.backgroundElement }]}>
          {(['chat', 'ask'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeBtn, mode === m && { backgroundColor: colors.background }]}
              onPress={() => setMode(m)}>
              <Text
                style={[
                  styles.modeBtnText,
                  { color: mode === m ? colors.text : colors.textSecondary },
                ]}>
                {m === 'chat' ? 'Chat' : 'Ask'}
              </Text>
            </Pressable>
          ))}
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {messages.length === 0 && mode === 'ask' ? (
            <ScrollView contentContainerStyle={styles.empty} showsVerticalScrollIndicator={false}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Ask Trak anything</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Trends, gaps, and patterns in your data — pick a question or type your own below.
              </Text>
              {ASK_GROUPS.map((group) => (
                <View key={group.heading} style={styles.suggestionGroup}>
                  <Text style={[styles.suggestionHeading, { color: colors.textSecondary }]}>
                    {group.heading}
                  </Text>
                  <View style={styles.suggestionGrid}>
                    {group.items.map((s) => (
                      <Pressable
                        key={s}
                        style={[styles.suggestion, { backgroundColor: colors.backgroundElement }]}
                        onPress={() => send(s)}>
                        <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : messages.length === 0 ? (
            <View style={[styles.empty, styles.emptyCenter]}>
              <RingMark size={40} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Tell me what you ate</Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                Describe a meal in plain words and I’ll estimate the calories.
              </Text>
              <View style={styles.suggestionGrid}>
                {LOG_EXAMPLES.map((s) => (
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
              placeholder={
                mode === 'chat' ? 'e.g. 1 big mac, 1 fries, 1 coke zero' : 'Ask about your day…'
              }
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              // Kept editable while thinking: flipping `editable` blurs the
              // input on Android, closing the keyboard after every send. The
              // send guard already prevents double submissions.
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
  title: { fontSize: 27, fontFamily: Type.display, fontWeight: '700', letterSpacing: -0.5 },

  modeSwitch: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderRadius: 999,
    padding: 3,
    gap: 2,
    marginBottom: Spacing.two,
  },
  modeBtn: { paddingVertical: 7, paddingHorizontal: 22, borderRadius: 999 },
  modeBtnText: { fontSize: 14, fontWeight: '700' },

  empty: { alignItems: 'center', gap: Spacing.two, paddingTop: Spacing.four, paddingBottom: Spacing.four },
  emptyCenter: { flex: 1, justifyContent: 'center' },
  emptyTitle: { fontSize: 24, fontFamily: Type.display, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', maxWidth: 300, lineHeight: 20 },
  suggestionGroup: { alignSelf: 'stretch', marginTop: Spacing.three, gap: Spacing.two },
  suggestionHeading: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  suggestionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  suggestion: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  suggestionText: { fontSize: 13.5, fontWeight: '600', lineHeight: 19 },

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
