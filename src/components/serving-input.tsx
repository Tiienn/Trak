import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Spacing, type ThemeColors } from '@/constants/theme';
import { parseServingAmount } from '@/lib/food-servings';

export function ServingInput({ amount, unit, onChangeAmount, onChangeUnit, colors, disabled, foodName }: {
  amount: string;
  unit: string;
  onChangeAmount: (value: string) => void;
  onChangeUnit?: (value: string) => void;
  colors: ThemeColors;
  disabled?: boolean;
  foodName: string;
}) {
  const invalid = parseServingAmount(amount) == null;
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Serving amount</Text>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel={`Serving amount for ${foodName}`}
          style={[styles.input, styles.amount, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={onChangeAmount}
          placeholder="1"
          placeholderTextColor={colors.textSecondary}
          selectTextOnFocus
          maxLength={9}
          editable={!disabled}
        />
        {onChangeUnit ? (
          <TextInput
            accessibilityLabel="Serving unit"
            style={[styles.input, styles.unit, { color: colors.text, backgroundColor: colors.backgroundSelected }]}
            value={unit}
            onChangeText={onChangeUnit}
            placeholder="slice, cup, g…"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            maxLength={80}
            editable={!disabled}
          />
        ) : <Text style={[styles.unit, { color: colors.text }]}>{unit}</Text>}
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {invalid ? 'Enter an amount greater than 0 (up to 10,000).' : 'Calories and macros adjust with the amount.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  label: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  input: { minHeight: 48, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16 },
  amount: { width: 88, textAlign: 'center', fontWeight: '700' },
  unit: { flex: 1, fontSize: 15 },
  hint: { fontSize: 12, lineHeight: 17 },
});
