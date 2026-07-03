import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { WeightChart } from '@/components/weight-chart';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

function formatWhen(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function WeightScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { weights, latestWeight, profile, logWeight } = useMeals();

  const [input, setInput] = useState(latestWeight ? String(Math.round(latestWeight * 10) / 10) : '');
  const [saving, setSaving] = useState(false);

  // Net change since the first logged weight.
  const change =
    weights.length >= 2 ? weights[weights.length - 1].weightKg - weights[0].weightKg : null;
  const goalDown = profile?.goal === 'lose';

  async function save() {
    const kg = parseFloat(input);
    if (!Number.isFinite(kg) || kg <= 0 || saving) return;
    setSaving(true);
    try {
      await logWeight(kg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Weight</Text>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Current + change */}
            <View style={[styles.currentCard, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
                {latestWeight != null ? 'Current weight' : 'No weight logged yet'}
              </Text>
              {latestWeight != null ? (
                <Text style={[styles.currentValue, { color: colors.text }]}>
                  {Math.round(latestWeight * 10) / 10} kg
                </Text>
              ) : null}
              {change != null ? (
                <Text
                  style={[
                    styles.change,
                    { color: change === 0 ? colors.textSecondary : Brand.greenDark },
                  ]}>
                  {change > 0 ? '▲' : change < 0 ? '▼' : ''} {Math.abs(Math.round(change * 10) / 10)} kg
                  {' '}since {formatWhen(weights[0].date)}
                </Text>
              ) : null}
            </View>

            {/* Chart */}
            <View style={[styles.chartCard, { backgroundColor: colors.backgroundElement }]}>
              <WeightChart weights={weights} colors={colors} goalDown={goalDown} />
            </View>

            {/* Log input */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                LOG TODAY&apos;S WEIGHT
              </Text>
              <View style={styles.inputRow}>
                <View style={[styles.inputBox, { backgroundColor: colors.backgroundElement }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    keyboardType="numeric"
                    value={input}
                    onChangeText={setInput}
                    placeholder="kg"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={5}
                  />
                  <Text style={[styles.unit, { color: colors.textSecondary }]}>kg</Text>
                </View>
                <Pressable
                  style={[styles.logBtn, { opacity: parseFloat(input) > 0 && !saving ? 1 : 0.4 }]}
                  onPress={save}
                  disabled={!(parseFloat(input) > 0) || saving}>
                  {saving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.logBtnText}>Log</Text>
                  )}
                </Pressable>
              </View>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Logging again today updates it. Your calorie targets adjust to your latest weight.
              </Text>
            </View>

            {/* History list */}
            {weights.length > 0 ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HISTORY</Text>
                <View style={[styles.historyCard, { backgroundColor: colors.backgroundElement }]}>
                  {[...weights].reverse().map((w, i, arr) => (
                    <View
                      key={w.date}
                      style={[
                        styles.historyRow,
                        i < arr.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.backgroundSelected,
                        },
                      ]}>
                      <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                        {formatWhen(w.date)}
                      </Text>
                      <Text style={[styles.historyValue, { color: colors.text }]}>
                        {Math.round(w.weightKg * 10) / 10} kg
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
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

  scroll: { paddingBottom: Spacing.four, gap: Spacing.four },

  currentCard: { borderRadius: 20, padding: Spacing.four, alignItems: 'center', gap: 4 },
  currentLabel: { fontSize: 13, fontWeight: '600' },
  currentValue: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  change: { fontSize: 13, fontWeight: '700' },

  chartCard: { borderRadius: 20, padding: Spacing.three },

  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  inputRow: { flexDirection: 'row', gap: Spacing.two },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, fontSize: 20, fontWeight: '700', paddingVertical: Spacing.three },
  unit: { fontSize: 15, fontWeight: '600' },
  logBtn: {
    backgroundColor: Brand.green,
    borderRadius: 14,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17 },

  historyCard: { borderRadius: 16, paddingHorizontal: Spacing.three },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  historyDate: { fontSize: 14 },
  historyValue: { fontSize: 15, fontWeight: '700' },
});
