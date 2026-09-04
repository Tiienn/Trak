import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarcodeIcon } from '@/components/icons';
import { ServingInput } from '@/components/serving-input';
import { Brand, Colors, type ThemeColors } from '@/constants/theme';
import { analyzeFood } from '@/lib/analyzeFood';
import { askTrak } from '@/lib/chat';
import { foodCorrectionPrompt, removeFoodItem, replaceFoodItem } from '@/lib/food-correction';
import { correctFoodServing, foodServing, formatServingQuantity, parseServingAmount } from '@/lib/food-servings';
import { loadGameStats, recordScanGuess } from '@/lib/game';
import { useAuth } from '@/lib/auth';
import { photoMealMemory } from '@/lib/meal-memory';
import { useSubscription } from '@/lib/purchases';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';
import { FoodAnalysis } from '@/lib/types';

/** Quick-tap calorie guesses shown while the AI analyzes. */
const GUESS_CHIPS = [250, 400, 550, 700, 900, 1200];

type Phase = 'camera' | 'analyzing' | 'result' | 'error';

export default function ScanScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  const { addMeal, calorieBias, meals } = useMeals();
  const { user } = useAuth();
  const { capabilities } = useSubscription();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  // Guess-before-you-scan: an optional quick guess made while the AI thinks.
  const [guess, setGuess] = useState<number | null>(null);
  const guessRef = useRef<number | null>(null);
  // In-flight analysis request, so leaving the analyzing state can cancel it.
  const abortRef = useRef<AbortController | null>(null);

  /** Cancel the in-flight analysis (if any). A cancel is never an error. */
  function cancelAnalysis() {
    abortRef.current?.abort();
  }

  // Unmounting (back gesture, navigation, etc.) must not leave a request alive.
  useEffect(() => () => abortRef.current?.abort(), []);

  function pickGuess(v: number) {
    guessRef.current = v;
    setGuess(v);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  /**
   * Camera/picker URIs point into the app CACHE directory, which Android may
   * trim at any time — photos silently vanished from the log. Copy the file
   * into the persistent document directory when the meal is saved; on any
   * failure, fall back to the original URI (worst case: the old behavior).
   */
  async function persistPhoto(uri: string): Promise<string> {
    try {
      const dir = `${FileSystem.documentDirectory}meal-photos/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      const dest = `${dir}${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      return dest;
    } catch {
      return uri;
    }
  }

  async function onAddToToday() {
    if (!analysis || saving || correcting) return; // guard against double taps / mid-correction logs
    setSaving(true);
    try {
      await addMeal(analysis, photoUri ? await persistPhoto(photoUri) : undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Could not save your meal. Please try again.');
      setSaving(false);
    }
  }

  async function onCorrectItem(index: number, name: string, quantity: string) {
    if (!analysis || correcting) return;
    const current = analysis.items[index];
    if (!current) return;

    const resized = correctFoodServing(analysis, index, name, quantity);
    if (resized) {
      setAnalysis(resized);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return;
    }

    setCorrecting(true);
    try {
      const reply = await askTrak(
        [
          {
            role: 'user',
            content: foodCorrectionPrompt(name, quantity, current.grams),
          },
        ],
        {
          targets: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
          eaten: { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        },
        calorieBias,
      );

      if (reply.kind !== 'meal' || reply.analysis.items.length === 0) {
        throw new Error('Could not find nutrition for that food. Try a more specific name.');
      }

      setAnalysis((latest) =>
        latest ? replaceFoodItem(latest, index, reply.analysis.items) : latest,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('Could not update food', e?.message ?? 'Please check the food and try again.');
      throw e;
    } finally {
      setCorrecting(false);
    }
  }

  async function runAnalysis(uri: string) {
    setPhotoUri(uri);
    setPhase('analyzing');
    guessRef.current = null;
    setGuess(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await analyzeFood(uri, calorieBias, photoMealMemory(meals), controller.signal);
      if (controller.signal.aborted) return;
      setAnalysis(result);
      setPhase('result');
      // Score the quick guess (if one was made in time) as a game round.
      const g = guessRef.current;
      if (g != null && result.isFood && result.total.calories > 0) {
        const errPct = Math.round((Math.abs(g - result.total.calories) / result.total.calories) * 100);
        loadGameStats(user?.id)
          .then((s) => recordScanGuess(errPct, s, user?.id))
          .catch(() => {});
      }
    } catch (e: any) {
      // A user-initiated cancel is not an error — don't show the error sheet.
      if (!controller.signal.aborted) {
        setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
        setPhase('error');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function onCapture() {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) await runAnalysis(photo.uri);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Could not take the photo.');
      setPhase('error');
    }
  }

  async function onPickFromGallery() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        await runAnalysis(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Photos', e?.message ?? 'Could not open your photos. Please try again.');
    }
  }

  function reset() {
    cancelAnalysis();
    setAnalysis(null);
    setPhotoUri(null);
    setErrorMsg('');
    guessRef.current = null;
    setGuess(null);
    setCorrecting(false);
    setPhase('camera');
  }

  // AI photo scan is the paid feature. Show the lock INSTEAD of the camera —
  // letting someone frame and shoot a meal only to be blocked afterwards
  // wastes their time (and asks for a camera permission we won't use).
  if (!capabilities.nutritionAi) {
    return (
      <View style={styles.black}>
        <SafeAreaView style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.closeBtn}
            onPress={() => router.back()}
            hitSlop={12}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </SafeAreaView>
        <View style={styles.lockedWrap}>
          <Text style={styles.lockedTitle}>AI scan is a Pro feature</Text>
          <Text style={styles.lockedBody}>
            Your free trial has ended. Barcode and quick-add logging are still free.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.primaryBtn}
            onPress={() => router.push('/paywall')}>
            <Text style={styles.primaryBtnText}>See plans</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.linkBtn}
            onPress={() => router.push('/barcode')}>
            <Text style={[styles.linkText, { color: colors.accent }]}>Scan a barcode instead</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Permission status still loading
  if (!permission) {
    return <View style={styles.black} />;
  }

  // Only require camera permission while the live camera is showing. The
  // gallery/analyzing/result phases must render even if the camera is denied.
  if (phase === 'camera' && !permission.granted) {
    const cameraAccessBlocked = permission.canAskAgain === false;

    return (
      <SafeAreaView style={styles.permissionWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>
          {cameraAccessBlocked
            ? "Camera access isn't available. You can still scan a meal from a photo."
            : 'Trak uses your camera to scan meals and estimate their nutrition.'}
        </Text>
        {cameraAccessBlocked ? (
          <>
            <Pressable
              accessibilityRole="button"
              style={styles.primaryBtn}
              onPress={onPickFromGallery}>
              <Text style={styles.primaryBtnText}>Choose a photo</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.linkBtn}
              onPress={() => {
                cancelAnalysis();
                router.back();
              }}>
              <Text style={styles.linkTextMuted}>Close</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={styles.primaryBtn}
            onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      {phase === 'camera' ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          blurRadius={phase === 'analyzing' ? 6 : 18}
        />
      ) : null}

      {/* Close button */}
      <SafeAreaView style={styles.topBar}>
        <Pressable
          style={styles.closeBtn}
          onPress={() => {
            cancelAnalysis();
            router.back();
          }}
          hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </SafeAreaView>

      {/* Camera controls */}
      {phase === 'camera' && (
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Text style={styles.cameraHint}>Point at your meal, then tap to scan</Text>
          <View style={styles.controlRow}>
            <Pressable style={styles.galleryBtn} onPress={onPickFromGallery}>
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </Pressable>
            <Pressable style={styles.shutter} onPress={onCapture}>
              <View style={styles.shutterInner} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scan a barcode"
              style={styles.galleryBtn}
              onPress={() => router.push('/barcode')}>
              <BarcodeIcon size={20} color="#ffffff" />
              <Text style={styles.galleryBtnText}>Scan</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      )}

      {/* Analyzing — with the guess-before-you-scan mini-game */}
      {phase === 'analyzing' && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.analyzingText}>Analyzing your meal…</Text>
          <View style={styles.guessBox}>
            {guess == null ? (
              <>
                <Text style={styles.guessTitle}>Quick — how many calories?</Text>
                <View style={styles.guessChips}>
                  {GUESS_CHIPS.map((v) => (
                    <Pressable key={v} style={styles.guessChip} onPress={() => pickGuess(v)}>
                      <Text style={styles.guessChipText}>{v}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.guessLocked}>You guessed {guess} kcal ✓</Text>
            )}
          </View>
        </View>
      )}

      {/* Error */}
      {phase === 'error' && (
        <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: 40 + insets.bottom }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Hmm, that didn&apos;t work
          </Text>
          <Text style={[styles.sheetBody, { color: colors.textSecondary }]}>{errorMsg}</Text>
          <Pressable style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {/* Result */}
      {phase === 'result' && analysis && (
        <ResultSheet
          analysis={analysis}
          guess={guess}
          saving={saving}
          correcting={correcting}
          colors={colors}
          onRetake={reset}
          onDone={onAddToToday}
          onCorrectItem={onCorrectItem}
          onRemoveItem={(index) => setAnalysis((latest) => latest ? removeFoodItem(latest, index) : latest)}
        />
      )}
    </View>
  );
}

function MacroPill({ label, value, colors }: { label: string; value: number; colors: ThemeColors }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.macroPillValue, { color: colors.text }]}>{value}g</Text>
      <Text style={[styles.macroPillLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function ResultSheet({
  analysis,
  guess,
  saving,
  correcting,
  colors,
  onRetake,
  onDone,
  onCorrectItem,
  onRemoveItem,
}: {
  analysis: FoodAnalysis;
  guess: number | null;
  saving: boolean;
  correcting: boolean;
  colors: ThemeColors;
  onRetake: () => void;
  onDone: () => void;
  onCorrectItem: (index: number, name: string, quantity: string) => Promise<void>;
  onRemoveItem: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const validServing = parseServingAmount(editAmount) != null && !!editUnit.trim();

  function startEditing(index: number) {
    const item = analysis.items[index];
    if (!item || saving || correcting) return;
    setEditingIndex(index);
    setEditName(item.name);
    const serving = foodServing(item);
    setEditAmount(String(serving.amount));
    setEditUnit(serving.unit);
  }

  function cancelEditing() {
    if (correcting) return;
    Keyboard.dismiss();
    setEditingIndex(null);
    setEditName('');
    setEditAmount('');
    setEditUnit('');
  }

  async function saveCorrection() {
    const amount = parseServingAmount(editAmount);
    if (editingIndex == null || !editName.trim() || !validServing || amount == null || correcting) return;
    try {
      await onCorrectItem(editingIndex, editName.trim(), formatServingQuantity(amount, editUnit));
      Keyboard.dismiss();
      setEditingIndex(null);
      setEditName('');
      setEditAmount('');
      setEditUnit('');
    } catch {
      // The parent shows the actionable error and keeps the editor open.
    }
  }

  function confirmRemoveCurrent() {
    if (editingIndex == null) return;
    const item = analysis.items[editingIndex];
    if (!item) return;
    const discardScan = analysis.items.length === 1;
    Alert.alert(
      discardScan ? 'Discard scan?' : 'Remove food?',
      discardScan
        ? `Discard the ${item.name} result and take another photo?`
        : `Remove ${item.name} from this scan? Calories and macros will be updated.`,
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: discardScan ? 'Discard' : 'Remove',
        style: 'destructive',
        onPress: () => {
          if (discardScan) onRetake();
          else onRemoveItem(editingIndex);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          cancelEditing();
        },
      },
    ]);
  }
  // How the user's quick guess compares to the AI estimate.
  const actual = analysis.total.calories;
  const guessErr =
    guess != null && actual > 0 ? Math.round((Math.abs(guess - actual) / actual) * 100) : null;
  if (!analysis.isFood) {
    return (
      <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: 40 + insets.bottom }]}>
        <Text style={[styles.sheetTitle, { color: colors.text }]}>No food detected</Text>
        <Text style={[styles.sheetBody, { color: colors.textSecondary }]}>
          {analysis.notes ?? "I couldn't find food in that photo."}
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onRetake}>
          <Text style={styles.primaryBtnText}>Try another photo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.resultSheet, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        enabled={editingIndex != null}
        extraKeyboardSpace={insets.bottom}
        style={styles.keyboardAwareScroll}
        contentContainerStyle={styles.resultScroll}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled">
        <Text style={[styles.resultTitle, { color: colors.text }]}>{analysis.title}</Text>
        <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
          AI estimate · {Math.round(analysis.confidence * 100)}% confident
        </Text>

        {guess != null && guessErr != null && (
          <View style={[styles.guessResult, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.guessResultText, { color: colors.text }]}>
              {guessErr <= 10
                ? `Great eye! You guessed ${guess} — only ${guessErr}% off.`
                : `You guessed ${guess} kcal — ${guessErr}% ${guess > actual ? 'over' : 'under'}.`}
            </Text>
          </View>
        )}

        <Text style={[styles.bigCalories, { color: colors.text }]}>
          {analysis.total.calories.toLocaleString()}
        </Text>
        <Text style={[styles.calLabel, { color: colors.textSecondary }]}>calories</Text>

        <View style={styles.macroRow}>
          <MacroPill label="Protein" value={analysis.total.protein_g} colors={colors} />
          <MacroPill label="Carbs" value={analysis.total.carbs_g} colors={colors} />
          <MacroPill label="Fat" value={analysis.total.fat_g} colors={colors} />
        </View>

        {analysis.items.length > 0 && (
          <View style={[styles.itemsBox, { backgroundColor: colors.backgroundElement }]}>
            {analysis.items.map((it, i) =>
              editingIndex === i ? (
                <View
                  key={`edit-${i}`}
                  style={[
                    styles.itemEditor,
                    { borderBottomColor: colors.backgroundSelected },
                    i === analysis.items.length - 1 && styles.itemRowLast,
                  ]}>
                  <Text style={[styles.editorLabel, { color: colors.textSecondary }]}>Edit food & serving</Text>
                  <TextInput
                    accessibilityLabel="Food name"
                    autoFocus
                    autoCapitalize="sentences"
                    autoCorrect
                    maxLength={100}
                    placeholder="Food name, e.g. grilled fish"
                    placeholderTextColor={colors.textSecondary}
                    style={[
                      styles.editorInput,
                      { color: colors.text, backgroundColor: colors.backgroundSelected },
                    ]}
                    value={editName}
                    onChangeText={setEditName}
                    editable={!correcting}
                  />
                  <ServingInput
                    amount={editAmount}
                    unit={editUnit}
                    onChangeAmount={setEditAmount}
                    onChangeUnit={setEditUnit}
                    colors={colors}
                    disabled={correcting}
                    foodName={it.name}
                  />
                  <View style={styles.editorActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={analysis.items.length === 1 ? 'Discard scan' : `Remove ${it.name} from scan`}
                      style={styles.editorRemove}
                      onPress={confirmRemoveCurrent}
                      disabled={correcting}>
                      <Text style={styles.editorRemoveText}>
                        {analysis.items.length === 1 ? 'Discard scan' : 'Remove food'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.editorCancel}
                      onPress={cancelEditing}
                      disabled={correcting}>
                      <Text style={[styles.editorCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={[
                        styles.editorSave,
                        (!editName.trim() || !validServing || correcting) && styles.btnBusy,
                      ]}
                      onPress={saveCorrection}
                      disabled={!editName.trim() || !validServing || correcting}>
                      {correcting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.editorSaveText}>Update nutrition</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${it.name}`}
                  key={`${it.name}-${i}`}
                  style={[
                    styles.itemRow,
                    { borderBottomColor: colors.backgroundSelected },
                    i === analysis.items.length - 1 && styles.itemRowLast,
                  ]}
                  onPress={() => startEditing(i)}
                  disabled={saving || correcting}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{it.name}</Text>
                    {!!it.quantity && (
                      <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                        {it.quantity}
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemMeta}>
                    <Text style={[styles.itemCals, { color: colors.text }]}>{it.calories} cal</Text>
                    <Text style={[styles.itemEdit, { color: colors.accent }]}>Edit serving / food</Text>
                  </View>
                </Pressable>
              ),
            )}
          </View>
        )}

        {!!analysis.notes && (
          <Text style={[styles.notes, { color: colors.textSecondary }]}>{analysis.notes}</Text>
        )}
      </KeyboardAwareScrollView>

      {editingIndex == null && (
        <View
          style={[
            styles.resultButtons,
            { borderTopColor: colors.backgroundSelected, paddingBottom: 16 + insets.bottom },
          ]}>
          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: colors.backgroundElement }]}
            onPress={onRetake}
            disabled={saving || correcting}>
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Retake</Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtnFlex, (saving || correcting) && styles.btnBusy]}
            onPress={onDone}
            disabled={saving || correcting}>
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Add to today</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000000' },

  // Permission gate
  permissionWrap: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  permTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  permBody: { color: '#B0B4BA', fontSize: 15, textAlign: 'center', marginBottom: 8 },

  // Locked state (no subscription / trial expired) — replaces the camera.
  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  lockedTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  lockedBody: {
    color: '#B0B4BA',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: 300,
  },

  // Top bar
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  closeBtn: {
    marginTop: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  // Camera controls
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 16, gap: 16 },
  cameraHint: { color: '#ffffff', textAlign: 'center', fontSize: 15, fontWeight: '600' },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  galleryBtn: {
    width: 90,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBtnText: { color: '#ffffff', fontWeight: '700' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: Brand.green },

  // Analyzing
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  analyzingText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  guessBox: { alignItems: 'center', gap: 12, marginTop: 24, paddingHorizontal: 24 },
  guessTitle: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  guessChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  guessChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  guessChipText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  guessLocked: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  guessResult: { alignSelf: 'stretch', borderRadius: 14, padding: 14, marginTop: 14 },
  guessResultText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Generic bottom sheet (error / no-food)
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111111' },
  sheetBody: { fontSize: 15, color: '#444444', lineHeight: 21 },

  // Result sheet
  resultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '78%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
  },
  keyboardAwareScroll: { flexShrink: 1 },
  resultScroll: { paddingHorizontal: 24, paddingBottom: 12, alignItems: 'center' },
  resultTitle: { fontSize: 24, fontWeight: '800', color: '#111111', textAlign: 'center' },
  confidenceText: { fontSize: 13, color: '#8A8F98', marginTop: 4 },
  bigCalories: { fontSize: 60, fontWeight: '800', color: '#111111', marginTop: 12, letterSpacing: -1 },
  calLabel: { fontSize: 15, color: '#8A8F98', marginTop: -4 },
  macroRow: { flexDirection: 'row', gap: 12, marginTop: 20, alignSelf: 'stretch' },
  macroPill: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  macroPillValue: { fontSize: 20, fontWeight: '800', color: '#111111' },
  macroPillLabel: { fontSize: 13, color: '#8A8F98', marginTop: 2 },
  itemsBox: { alignSelf: 'stretch', marginTop: 20, backgroundColor: '#F9FAFB', borderRadius: 16 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  itemRowLast: { borderBottomWidth: 0 },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111111' },
  itemQty: { fontSize: 13, color: '#8A8F98', marginTop: 2 },
  itemCals: { fontSize: 15, fontWeight: '700', color: '#111111' },
  itemMeta: { alignItems: 'flex-end', gap: 3 },
  itemEdit: { fontSize: 12, fontWeight: '700' },
  itemEditor: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 9,
  },
  editorLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  editorInput: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10 },
  editorRemove: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 4, marginRight: 'auto' },
  editorRemoveText: { color: '#D84A4A', fontSize: 13, fontWeight: '800' },
  editorCancel: { paddingHorizontal: 10, paddingVertical: 10 },
  editorCancelText: { fontSize: 14, fontWeight: '700' },
  editorSave: {
    minWidth: 142,
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.green,
  },
  editorSaveText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  notes: { fontSize: 13, color: '#8A8F98', marginTop: 16, textAlign: 'center', fontStyle: 'italic' },

  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
  },

  // Buttons
  primaryBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  primaryBtnFlex: {
    flex: 1,
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnBusy: { opacity: 0.7 },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryBtnText: { color: '#111111', fontSize: 16, fontWeight: '700' },
  linkBtn: { paddingVertical: 8 },
  linkText: { fontSize: 15, fontWeight: '600' },
  linkTextMuted: { color: '#8A8F98', fontSize: 15 },
});
