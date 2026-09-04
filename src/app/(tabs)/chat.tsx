import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { RingMark, TrakWordmark } from '@/components/logo';
import { ProfileAvatarButton } from '@/components/profile-avatar-button';
import { askTrak, type ChatTurn } from '@/lib/chat';
import { chatMealContext } from '@/lib/chat-context';
import { askHistoryContext, buildDailyHistory, personalRecords } from '@/lib/history';
import { dailyMealSuggestions, type DailyMealSuggestion } from '@/lib/meal-memory';
import { useSubscription } from '@/lib/purchases';
import { useMeals } from '@/lib/store';
import { useSupplements } from '@/lib/supplements';
import { useAppScheme } from '@/lib/theme';
import type { FoodAnalysis } from '@/lib/types';

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
  id: 'dailyMeals' | 'today' | 'coach' | 'nutrition' | 'trends';
  heading: string;
  items: DailyMealSuggestion[];
};

/** Three high-value prompts stay visible; the broader library lives in a sheet. */
const ASK_FEATURED: DailyMealSuggestion[] = [
  'How am I doing today?',
  'Plan today’s workout',
  'What should I eat next?',
].map((label) => ({
  label,
  prompt: label,
}));

const ASK_GROUPS: SuggestionGroup[] = [
  {
    id: 'today',
    heading: 'Today',
    items: ['How am I doing today?', 'What should I focus on tomorrow?', 'How balanced is today?'].map((label) => ({
      label,
      prompt: label,
    })),
  },
  {
    id: 'coach',
    heading: 'Coach',
    items: [
      'What workout should I do today?',
      'How balanced is my training?',
      'Which muscle group needs more work?',
      'How should I structure my next workout?',
      'Am I training consistently?',
      'How can I progress my sets or weights?',
    ].map((label) => ({ label, prompt: label })),
  },
  {
    id: 'nutrition',
    heading: 'Nutrition',
    items: [
      'What should I eat next?',
      'What can I eat with my calories left?',
      'Am I on track for protein?',
      'Is my protein spread evenly across meals?',
      'Which meals have the most calories?',
    ].map((label) => ({ label, prompt: label })),
  },
  {
    id: 'trends',
    heading: 'Trends',
    items: [
      'Any trends in my last 7 days?',
      'How consistent have I been?',
      'What changed this week?',
      'What are my personal records?',
      'When was my best Trak score?',
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
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale >= 1.8;
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
      <View style={[styles.mealTotalRow, largeText && styles.mealTotalRowLargeText, { borderTopColor: colors.backgroundSelected }]}>
        <Text style={[styles.mealTotalCals, { color: colors.text }]}>{meal.total.calories} kcal</Text>
        <Text style={[styles.mealMacros, { color: colors.textSecondary }]}>
          {meal.total.protein_g}p · {meal.total.carbs_g}c · {meal.total.fat_g}f
        </Text>
      </View>
      {added ? (
        <View accessibilityRole="text" accessibilityLabel="Added to today" style={[styles.addBtn, styles.addedBtn]}>
          <Text style={[styles.addedText, { color: colors.accent }]}>✓ Added to today</Text>
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Add ${meal.title} to today`} accessibilityState={{ disabled: saving, busy: saving }} style={[styles.addBtn, saving && { opacity: 0.6 }]} onPress={onAdd} disabled={saving}>
          {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.addText}>Add to today</Text>}
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
    todayMeals,
    waterHistory,
    waterGoal,
  } = useMeals();
  const { supplements, checks } = useSupplements();
  // Chat and Ask both call the model, so they're gated. History stays readable
  // either way — locking someone out of what they already wrote is hostile.
  const { capabilities } = useSubscription();
  const params = useLocalSearchParams<{ mode?: string; t?: string }>();

  // Chat and Ask are two independent conversations with their own histories.
  const [chatMessages, setChatMessages] = useState<UiMessage[]>([]);
  const [askMessages, setAskMessages] = useState<UiMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('chat');
  const hasAccess = mode === 'chat' ? capabilities.nutritionAi : capabilities.coach;
  const [chatSuggestionsOpen, setChatSuggestionsOpen] = useState(true);
  const [askSuggestionsOpen, setAskSuggestionsOpen] = useState(true);
  const [questionBrowserOpen, setQuestionBrowserOpen] = useState(false);
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
        items: dailyMealSuggestions(meals),
      },
    ],
    [meals],
  );
  const dailyHistory = useMemo(
    () =>
      buildDailyHistory({
        meals,
        exercises,
        water: waterHistory,
        supplements,
        supplementChecks: checks,
        targets,
        waterGoal,
      }),
    [meals, exercises, waterHistory, supplements, checks, targets, waterGoal],
  );
  const trackingContext = useMemo(() => askHistoryContext(dailyHistory, personalRecords(dailyHistory)), [dailyHistory]);
  function toggleChatSuggestions() {
    setChatSuggestionsOpen((current) => !current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function toggleAskSuggestions() {
    setAskSuggestionsOpen((current) => !current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function chooseSuggestion(prompt: string) {
    setQuestionBrowserOpen(false);
    if (hasAccess) send(prompt);
    else openPaywall();
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
    AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages.slice(-CHAT_KEEP))).catch(() => {});
  }, [chatMessages, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(ASK_STORAGE_KEY, JSON.stringify(askMessages.slice(-CHAT_KEEP))).catch(() => {});
  }, [askMessages, hydrated]);

  /** Every locked entry point lands here instead of silently doing nothing. */
  function openPaywall() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/paywall');
  }

  async function send(text: string) {
    // Belt-and-braces: the UI already routes locked taps to the paywall, but
    // this is the one place a request can start, so it checks too.
    if (!hasAccess) return;
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
      const history: ChatTurn[] = base.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await askTrak(
        history,
        {
          targets: { ...targets, calories: calorieBudget },
          eaten: todayTotals,
          exercise: { burned: burnedToday, credited: exerciseCreditToday },
          meals: chatMealContext(todayMeals),
          recentDays: trackingContext.recentDays,
          personalRecords: trackingContext.personalRecords,
          mode,
        },
        calorieBias,
        controller.signal,
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
    <View testID="screen-chat" style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.headerRow}>
          <View style={styles.logoRow}>
            <RingMark size={30} />
            <TrakWordmark color={colors.text} size={28} />
          </View>
          <ProfileAvatarButton colors={colors} />
        </View>

        <View accessibilityRole="tablist" accessibilityLabel="Chat sections" style={[styles.modeSwitch, { backgroundColor: colors.backgroundElement }]}>
          {(['chat', 'ask'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeBtn, mode === m && { backgroundColor: colors.background }]}
              onPress={() => setMode(m)}
              accessibilityRole="tab"
              accessibilityLabel={m === 'chat' ? 'Chat mode' : 'Ask mode'}
              accessibilityState={{ selected: mode === m }}
            >
              <Text style={[styles.modeBtnText, { color: mode === m ? colors.text : colors.textSecondary }]}>
                {m === 'chat' ? 'Chat' : 'Ask'}
              </Text>
            </Pressable>
          ))}
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {mode === 'chat' ? (
            <View style={styles.pinned}>
              {chatGroups.map((group) => (
                <View key={group.id} style={styles.suggestionGroup}>
                  <Pressable
                    style={styles.suggestionHeader}
                    onPress={toggleChatSuggestions}
                    accessibilityRole="button"
                    accessibilityLabel={`${group.heading}, ${chatSuggestionsOpen ? 'collapse' : 'expand'}`}
                    accessibilityState={{ expanded: chatSuggestionsOpen }}
                  >
                    <View style={styles.suggestionHeadingBlock}>
                      <Text style={[styles.suggestionHeading, { color: colors.text }]}>{group.heading}</Text>
                    </View>
                    <View style={[styles.expandButton, { backgroundColor: colors.backgroundElement }]}>
                      <Text style={[styles.expandButtonText, { color: colors.text }]}>
                        {chatSuggestionsOpen ? '−' : '+'}
                      </Text>
                    </View>
                  </Pressable>
                  {chatSuggestionsOpen ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.suggestionRail}
                      accessibilityLabel={`${group.heading} suggestions`}
                    >
                      {group.items.map((item) => (
                        <Pressable
                          key={item.label}
                          accessibilityRole="button"
                          accessibilityLabel={item.label}
                          style={[styles.suggestion, { backgroundColor: colors.backgroundElement }]}
                          onPress={() => chooseSuggestion(item.prompt)}
                        >
                          <Text style={[styles.suggestionText, { color: colors.text }]} numberOfLines={3}>
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
          ) : messages.length === 0 ? (
            <View style={styles.askStarter}>
              <Pressable
                style={styles.suggestionHeader}
                onPress={toggleAskSuggestions}
                accessibilityRole="button"
                accessibilityLabel={`Suggested for you, ${askSuggestionsOpen ? 'collapse' : 'expand'}`}
                accessibilityState={{ expanded: askSuggestionsOpen }}
              >
                <View style={styles.suggestionHeadingBlock}>
                  <Text style={[styles.suggestionHeading, { color: colors.text }]}>Suggested for you</Text>
                </View>
                <View style={[styles.expandButton, { backgroundColor: colors.backgroundElement }]}>
                  <Text style={[styles.expandButtonText, { color: colors.text }]}>
                    {askSuggestionsOpen ? '−' : '+'}
                  </Text>
                </View>
              </Pressable>
              {askSuggestionsOpen ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.askPromptRail}
                    accessibilityLabel="Suggested questions"
                  >
                    {ASK_FEATURED.map((item) => (
                      <Pressable
                        key={item.label}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.askPrompt,
                          {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.backgroundSelected,
                          },
                          pressed && styles.pressed,
                        ]}
                        onPress={() => chooseSuggestion(item.prompt)}
                      >
                        <Text style={[styles.askPromptText, { color: colors.text }]} numberOfLines={2}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Browse more questions"
                    style={({ pressed }) => [styles.browseQuestions, pressed && styles.pressed]}
                    onPress={() => setQuestionBrowserOpen(true)}
                  >
                    <Text style={[styles.browseQuestionsText, { color: colors.accent }]}>Browse more questions</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

          {messages.length === 0 ? (
            mode === 'ask' ? (
              <View style={styles.askEmptySpace} />
            ) : (
              <View style={[styles.empty, styles.emptyCenter]}>
                <RingMark size={36} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Tell me what you ate</Text>
                <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                  Describe a meal in plain words and I’ll estimate the calories.
                </Text>
              </View>
            )
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
                      <ActivityIndicator size="small" color={colors.accent} accessibilityLabel="Trak is thinking" />
                      <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>Trak is thinking…</Text>
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
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      item.role === 'user'
                        ? styles.userText
                        : {
                            color: item.isError ? colors.textSecondary : colors.text,
                          },
                    ]}
                  >
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

          {!hasAccess ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trial ended. See plans."
              style={[styles.lockedBar, { backgroundColor: colors.backgroundElement }]}
              onPress={openPaywall}
            >
              <Text style={[styles.lockedBarText, { color: colors.textSecondary }]}>
                Your free trial has ended. Chat and Ask need Pro.
              </Text>
              <Text style={[styles.lockedBarCta, { color: colors.accent }]}>See plans</Text>
            </Pressable>
          ) : null}

          <View style={[styles.inputRow, { backgroundColor: colors.backgroundElement }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={
                !hasAccess
                  ? 'Chat is paused'
                  : mode === 'chat'
                    ? 'e.g. 1 big mac, 1 fries, 1 coke zero'
                    : 'Ask about your day…'
              }
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => send(input)}
              returnKeyType="send"
              // Kept editable while thinking: flipping `editable` blurs the
              // input on Android, closing the keyboard after every send. The
              // send guard already prevents double submissions. `hasAccess`
              // doesn't flip mid-conversation, so gating on it is safe.
              editable={hasAccess}
              accessibilityLabel={mode === 'chat' ? 'Describe what you ate' : 'Ask Trak a question'}
              multiline={false}
            />
            {/* Locked: the button routes to the paywall. Otherwise, while Trak
                is thinking it becomes a stop control that cancels the request;
                the rest of the time it sends the typed message. */}
            <Pressable
              accessibilityRole="button"
              style={[
                styles.sendBtn,
                hasAccess && !thinking && !input.trim() && { opacity: 0.4 },
                !hasAccess && { backgroundColor: colors.backgroundSelected },
              ]}
              onPress={() => {
                if (!hasAccess) return openPaywall();
                return thinking ? stop() : send(input);
              }}
              disabled={hasAccess && !thinking && !input.trim()}
              accessibilityLabel={!hasAccess ? 'See plans' : thinking ? 'Stop' : 'Send'}
            >
              {hasAccess && thinking ? (
                <View style={styles.stopSquare} />
              ) : (
                <Text style={[styles.sendText, !hasAccess && { color: colors.textSecondary }]}>↑</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={questionBrowserOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setQuestionBrowserOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            accessibilityRole="button"
            accessibilityLabel="Close question browser"
            onPress={() => setQuestionBrowserOpen(false)}
          />
          <SafeAreaView
            edges={['bottom']}
            accessibilityViewIsModal
            style={[styles.questionSheet, { backgroundColor: colors.background }]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.backgroundSelected }]} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>More questions</Text>
                <Text style={[styles.sheetBody, { color: colors.textSecondary }]}>
                  Choose a prompt to start a conversation.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close more questions"
                style={({ pressed }) => [
                  styles.sheetClose,
                  { backgroundColor: colors.backgroundElement },
                  pressed && styles.pressed,
                ]}
                onPress={() => setQuestionBrowserOpen(false)}
              >
                <Text style={[styles.sheetCloseText, { color: colors.text }]}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              {ASK_GROUPS.map((group) => (
                <View key={group.id} style={styles.sheetGroup}>
                  <Text style={[styles.sheetGroupTitle, { color: colors.text }]}>{group.heading}</Text>
                  <View style={styles.sheetPromptGrid}>
                    {group.items.map((item) => (
                      <Pressable
                        key={item.label}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.sheetPrompt,
                          {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.backgroundSelected,
                          },
                          pressed && styles.pressed,
                        ]}
                        onPress={() => chooseSuggestion(item.prompt)}
                      >
                        <Text style={[styles.sheetPromptText, { color: colors.text }]}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

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

  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  emptyCenter: { flex: 1, justifyContent: 'center' },
  emptyTitle: { fontSize: 24, fontFamily: Type.display, fontWeight: '700' },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  askStarter: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  askPromptRail: { gap: Spacing.two, paddingRight: Spacing.four },
  askPrompt: {
    width: 184,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askPromptText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  browseQuestions: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  browseQuestionsText: { fontSize: 13.5, fontWeight: '800' },
  askEmptySpace: { flex: 1 },
  pinned: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
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
  memoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.green,
  },
  memoryText: { fontSize: 11, fontWeight: '600' },
  pressed: { opacity: 0.68 },

  listContent: { paddingVertical: Spacing.two, gap: Spacing.two },
  bubble: {
    maxWidth: '85%',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Brand.green,
    borderBottomRightRadius: 6,
  },
  trakBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#ffffff' },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  thinkingText: { fontSize: 14 },

  mealCard: {
    borderRadius: 14,
    padding: Spacing.three,
    marginTop: Spacing.two,
    gap: 6,
    minWidth: 230,
  },
  mealTitle: { fontSize: 15, fontWeight: '800' },
  mealItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
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
  mealTotalRowLargeText: { flexDirection: 'column', alignItems: 'flex-start' },
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
  addedText: { fontSize: 14, fontWeight: '700' },

  lockedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: Spacing.two,
  },
  lockedBarText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  lockedBarCta: { fontSize: 13, fontWeight: '800' },

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
  stopSquare: {
    width: 13,
    height: 13,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18, 20, 15, 0.48)',
  },
  questionSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: Spacing.four,
  },
  sheetHandle: {
    width: 42,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  sheetHeaderCopy: { flex: 1, gap: 4 },
  sheetTitle: {
    fontFamily: Type.display,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: '700',
  },
  sheetBody: { fontSize: 13.5, lineHeight: 19 },
  sheetClose: {
    minWidth: 64,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sheetCloseText: { fontSize: 13, fontWeight: '800' },
  sheetScroll: { marginTop: Spacing.three },
  sheetContent: { gap: Spacing.four, paddingBottom: Spacing.four },
  sheetGroup: { gap: 10 },
  sheetGroupTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  sheetPromptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sheetPrompt: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '48%',
    flexGrow: 1,
    justifyContent: 'center',
  },
  sheetPromptText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
