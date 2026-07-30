import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { RingMark, TrakWordmark } from '@/components/logo';
import { askTrak, type ChatTurn } from '@/lib/chat';
import { calorieBudgetForDay, caloriesBurnedForDay, creditedExerciseCalories } from '@/lib/exercise';
import { dailyMealSuggestions, type DailyMealSuggestion } from '@/lib/meal-memory';
import { sumTotals, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import type { ExerciseEntry, FoodAnalysis, LoggedMeal } from '@/lib/types';

/**
 * A compact "last 7 days" digest the assistant can reason about for trend
 * questions — one line per day, newest first.
 */
function weekSummary(
  meals: LoggedMeal[],
  exercises: ExerciseEntry[],
  baseCalorieTarget: number
): string {
  const byDay = new Map<string, LoggedMeal[]>();
  for (const m of meals) {
    if (!byDay.has(m.date)) byDay.set(m.date, []);
    byDay.get(m.date)!.push(m);
  }
  const dates = new Set([...byDay.keys(), ...exercises.map((exercise) => exercise.date)]);
  return [...dates]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 7)
    .map((date) => {
      const dayMeals = byDay.get(date) ?? [];
      const t = sumTotals(dayMeals);
      const burned = caloriesBurnedForDay(exercises, date);
      const credit = creditedExerciseCalories(burned);
      const budget = calorieBudgetForDay(baseCalorieTarget, burned);
      return `${date}: ate ${t.calories}/${budget} kcal, ${t.protein_g}p ${t.carbs_g}c ${t.fat_g}f (${dayMeals.length} meals); exercise ${burned} kcal burned, ${credit} credited`;
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

type SuggestionGroup = {
  id: 'dailyMeals' | 'forYou' | 'diveDeeper';
  heading: string;
  helper?: string;
  items: DailyMealSuggestion[];
};

/** Grouped insight prompts for the Ask panel — always available, tap to send. */
const ASK_GROUPS: SuggestionGroup[] = [
  {
    id: 'forYou',
    heading: 'For you',
    items: [
      'How am I doing today?',
      'What should I focus on tomorrow?',
      'What can I eat with my calories left?',
      'Am I on track for protein?',
      'How balanced is today?',
    ].map((label) => ({ label, prompt: label })),
  },
  {
    id: 'diveDeeper',
    heading: 'Dive deeper',
    items: [
      'Any trends in my last 7 days?',
      'Is my protein spread evenly across meals?',
      'Which meals are most calorie-dense?',
      'How consistent have I been?',
      'What changed this week?',
    ].map((label) => ({ label, prompt: label })),
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
  const {
    targets,
    todayTotals,
    addMeal,
    calorieBias,
    meals,
    exercises,
    burnedToday,
    exerciseCreditToday,
    calorieBudget,
  } = useMeals();
  const params = useLocalSearchParams<{ mode?: string; t?: string }>();

  // Chat and Ask are two independent conversations with their own histories.
  const [chatMessages, setChatMessages] = useState<UiMessage[]>([]);
  const [askMessages, setAskMessages] = useState<UiMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('chat');
  const [expandedSections, setExpandedSections] = useState({
    dailyMeals: true,
    forYou: true,
    diveDeeper: false,
  });
  const listRef = useRef<FlatList<UiMessage>>(null);
  // Synchronous re-entry guard: `thinking` state commits async, so a fast
  // double-tap could start two sends. A ref flips immediately.
  const sendingRef = useRef(false);
  // Aborts the in-flight request when the user taps the send button (now a
  // stop button) while Trak is thinking.
  const abortRef = useRef<AbortController | null>(null);

  const messages = mode === 'chat' ? chatMessages : askMessages;
  const setMessages = mode === 'chat' ? setChatMessages : setAskMessages;
  const chatGroups = useMemo<SuggestionGroup[]>(
    () => [
      {
        id: 'dailyMeals',
        heading: 'Daily meals',
        helper: 'Your most logged meals appear first',
        items: dailyMealSuggestions(meals),
      },
    ],
    [meals],
  );
  const suggestionGroups = mode === 'ask' ? ASK_GROUPS : chatGroups;

  function toggleSection(id: SuggestionGroup['id']) {
    setExpandedSections((current) => ({ ...current, [id]: !current[id] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  // Home coaching cards can target either conversation even when this tab is
  // already mounted in the background. The nonce makes repeat taps re-fire.
  useEffect(() => {
    if (params.mode === 'chat' || params.mode === 'ask') setMode(params.mode);
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
    const controller = new AbortController();
    abortRef.current = controller;

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
        {
          targets: { ...targets, calories: calorieBudget },
          eaten: todayTotals,
          exercise: { burned: burnedToday, credited: exerciseCreditToday },
          week: weekSummary(meals, exercises, targets.calories),
        },
        calorieBias,
        controller.signal
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
      // A user-initiated cancel isn't an error: leave their message in place
      // and show nothing, matching how chat apps handle "stop".
      if (!controller.signal.aborted) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: (e as Error).message ?? 'Something went wrong. Please try again.',
            isError: true,
          },
        ]);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      sendingRef.current = false;
      setThinking(false);
    }
  }

  /** Cancel the in-flight request. The user's message stays in the thread. */
  function stop() {
    abortRef.current?.abort();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
          <TrakWordmark color={colors.text} size={28} />
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
          {/* Suggestions stay pinned above the thread — the conversation
              scrolls in its own area and can never cover them. */}
          <View style={styles.pinned}>
            {suggestionGroups.map((group) => (
              <View key={group.id} style={styles.suggestionGroup}>
                <Pressable
                  style={styles.suggestionHeader}
                  onPress={() => toggleSection(group.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${group.heading}, ${expandedSections[group.id] ? 'collapse' : 'expand'}`}
                  accessibilityState={{ expanded: expandedSections[group.id] }}>
                  <View style={styles.suggestionHeadingBlock}>
                    <Text style={[styles.suggestionHeading, { color: colors.text }]}>
                      {group.heading}
                    </Text>
                    {group.helper ? (
                      <Text style={[styles.suggestionHelper, { color: colors.textSecondary }]}>
                        {group.helper}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.expandButton,
                      { backgroundColor: colors.backgroundElement },
                    ]}>
                    <Text style={[styles.expandButtonText, { color: colors.text }]}>
                      {expandedSections[group.id] ? '−' : '+'}
                    </Text>
                  </View>
                </Pressable>
                {expandedSections[group.id] ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionRail}
                    accessibilityLabel={`${group.heading} suggestions`}>
                    {group.items.map((item) => (
                      <Pressable
                        key={item.label}
                        style={[styles.suggestion, { backgroundColor: colors.backgroundElement }]}
                        onPress={() => send(item.prompt)}>
                        <Text
                          style={[styles.suggestionText, { color: colors.text }]}
                          numberOfLines={3}>
                          {item.label}
                        </Text>
                        {item.logCount ? (
                          <View style={styles.memoryBadge}>
                            <View style={styles.memoryDot} />
                            <Text style={[styles.memoryText, { color: colors.textSecondary }]}>
                              Logged {item.logCount}×
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </View>
            ))}
          </View>

          {messages.length === 0 ? (
            <View style={[styles.empty, styles.emptyCenter]}>
              <RingMark size={36} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {mode === 'ask' ? 'Ask Trak anything' : 'Tell me what you ate'}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                {mode === 'ask'
                  ? 'Trends, gaps, and patterns in your data — pick a question above or type your own.'
                  : 'Describe a meal in plain words and I’ll estimate the calories.'}
              </Text>
            </View>
          ) : (
            <FlatList
              style={styles.flex}
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
            {/* While Trak is thinking the button becomes a stop control that
                cancels the request; otherwise it sends the typed message. */}
            <Pressable
              style={[styles.sendBtn, !thinking && !input.trim() && { opacity: 0.4 }]}
              onPress={() => (thinking ? stop() : send(input))}
              disabled={!thinking && !input.trim()}
              accessibilityLabel={thinking ? 'Stop' : 'Send'}>
              {thinking ? (
                <View style={styles.stopSquare} />
              ) : (
                <Text style={styles.sendText}>↑</Text>
              )}
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
  pinned: { paddingTop: Spacing.two, paddingBottom: Spacing.two, gap: Spacing.two },
  suggestionGroup: { alignSelf: 'stretch', gap: Spacing.two },
  suggestionHeader: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  suggestionHeadingBlock: { flex: 1, gap: 2 },
  suggestionHeading: { fontSize: 15, fontWeight: '800' },
  suggestionHelper: { fontSize: 11.5, lineHeight: 15 },
  expandButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonText: { fontSize: 20, lineHeight: 22, fontWeight: '500' },
  suggestionRail: { gap: Spacing.two, paddingRight: Spacing.four },
  suggestion: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    width: 186,
    minHeight: 76,
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  suggestionText: { fontSize: 13.5, fontWeight: '600', lineHeight: 19 },
  memoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  memoryDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Brand.green },
  memoryText: { fontSize: 11, fontWeight: '600' },

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
  stopSquare: { width: 13, height: 13, borderRadius: 3, backgroundColor: '#ffffff' },
});
