import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

/** Trak brand colors — a fresh, health-forward green. */
export const Brand = {
  green: '#22C55E',
  greenDark: '#16A34A',
} as const;

function Macro({
  label,
  value,
  textColor,
  secondaryColor,
}: {
  label: string;
  value: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.macroLabel, { color: secondaryColor }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Wordmark */}
        <View style={styles.logoRow}>
          <View style={[styles.logoDot, { backgroundColor: Brand.green }]} />
          <Text style={[styles.wordmark, { color: colors.text }]}>Trak</Text>
        </View>
        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
          Snap your food. Know your macros.
        </Text>

        {/* Preview of the daily card (wired up in Phase 3) */}
        <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Calories left today
          </Text>
          <Text style={[styles.calories, { color: colors.text }]}>2,000</Text>
          <View style={styles.macroRow}>
            <Macro label="Protein" value="150g" textColor={colors.text} secondaryColor={colors.textSecondary} />
            <Macro label="Carbs" value="200g" textColor={colors.text} secondaryColor={colors.textSecondary} />
            <Macro label="Fat" value="60g" textColor={colors.text} secondaryColor={colors.textSecondary} />
          </View>
        </View>

        {/* Scan button — opens the camera scanner */}
        <Pressable
          style={({ pressed }) => [
            styles.scanButton,
            { backgroundColor: pressed ? Brand.greenDark : Brand.green },
          ]}
          onPress={() => router.push('/scan')}>
          <Text style={styles.scanButtonText}>＋   Scan a meal</Text>
        </Pressable>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Tap to scan a meal with your camera
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  logoDot: { width: 22, height: 22, borderRadius: 11 },
  wordmark: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  tagline: { fontSize: 16, textAlign: 'center', marginTop: -Spacing.two },
  card: {
    alignSelf: 'stretch',
    borderRadius: 24,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardLabel: { fontSize: 14, fontWeight: '500' },
  calories: { fontSize: 52, fontWeight: '800', letterSpacing: -1 },
  macroRow: { flexDirection: 'row', gap: Spacing.five, marginTop: Spacing.two },
  macro: { alignItems: 'center' },
  macroValue: { fontSize: 18, fontWeight: '700' },
  macroLabel: { fontSize: 13, marginTop: 2 },
  scanButton: {
    alignSelf: 'stretch',
    borderRadius: 18,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  scanButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, textAlign: 'center' },
});
