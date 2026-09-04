import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarIcon, ChevronRightIcon, CloseIcon } from '@/components/icons';
import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { dayKey, useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

const ITEM_HEIGHT = 50;
const KG_TO_LB = 2.2046226218;
const KG_VALUES = Array.from({ length: 381 }, (_, index) => index + 20);
const LB_VALUES = Array.from({ length: 838 }, (_, index) => index + 44);
const DECIMALS = Array.from({ length: 10 }, (_, index) => index);
type WeightUnit = 'kg' | 'lb';

function dateFromKey(value: string): Date {
  const [year, month, date] = value.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

function recentDates(): string[] {
  const today = new Date();
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
    date.setDate(date.getDate() - index);
    return dayKey(date);
  });
}

function formatDate(value: string): string {
  return dateFromKey(value).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function PickerColumn({ values, selected, onChange, width, colors, accessibilityLabel }: {
  values: (number | string)[];
  selected: number | string;
  onChange: (value: any) => void;
  width: number;
  colors: ThemeColors;
  accessibilityLabel: string;
}) {
  const initialIndex = Math.max(0, values.indexOf(selected));
  return (
    <View style={{ width, height: ITEM_HEIGHT * 3 }} accessibilityLabel={accessibilityLabel}>
      <View pointerEvents="none" style={[styles.selectionBand, { borderColor: colors.backgroundSelected }]} />
      <FlatList
        key={`${values[0]}-${selected}`}
        data={values}
        keyExtractor={(item) => String(item)}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        onScrollToIndexFailed={() => {}}
        onMomentumScrollEnd={(event) => {
          const index = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
          onChange(values[index]);
          void Haptics.selectionAsync();
        }}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          return <View style={styles.pickerItem}><Text style={[styles.pickerText, { color: isSelected ? colors.text : colors.textSecondary }, isSelected && styles.pickerTextSelected]}>{item}</Text></View>;
        }}
      />
    </View>
  );
}

function DateModal({ visible, selectedDate, onSelect, onClose, colors }: {
  visible: boolean;
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
  colors: ThemeColors;
}) {
  const dates = useMemo(() => recentDates(), []);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={[styles.dateSheet, { backgroundColor: colors.backgroundElement }]} edges={['bottom']}>
        <View style={styles.sheetHeader}>
          <View><Text style={[styles.sheetTitle, { color: colors.text }]}>Log date</Text><Text style={[styles.sheetCaption, { color: colors.textSecondary }]}>Choose from the last 30 days</Text></View>
          <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.backgroundSelected }]}><CloseIcon size={22} color={colors.text} /></Pressable>
        </View>
        <FlatList
          data={dates}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const selected = item === selectedDate;
            return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={item === dayKey() ? 'Today' : formatDate(item)} onPress={() => { onSelect(item); onClose(); }} style={[styles.dateOption, selected && { backgroundColor: colors.greenTint }]}><CalendarIcon size={20} color={selected ? colors.accent : colors.textSecondary} /><Text style={[styles.dateOptionText, { color: colors.text }]}>{item === dayKey() ? 'Today' : formatDate(item)}</Text>{selected ? <Text style={[styles.selectedLabel, { color: colors.accentStrong }]}>Selected</Text> : null}</Pressable>;
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

export default function WeightScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date?: string; returnTo?: string }>();
  const { weights, latestWeight, profile, loaded, loadError, retryLoad, logWeight } = useMeals();
  const requestedDate = typeof params.date === 'string' && params.date <= dayKey() ? params.date : dayKey();
  const savedForDate = weights.find((entry) => entry.date === requestedDate)?.weightKg;
  const startingKg = savedForDate ?? latestWeight ?? profile?.weightKg ?? 70;
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [whole, setWhole] = useState(Math.floor(startingKg));
  const [decimal, setDecimal] = useState(Math.round((startingKg - Math.floor(startingKg)) * 10));
  const [selectedDate, setSelectedDate] = useState(requestedDate);
  const [dateOpen, setDateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function changeUnit(next: WeightUnit) {
    if (next === unit) return;
    const displayed = whole + decimal / 10;
    const kg = unit === 'kg' ? displayed : displayed / KG_TO_LB;
    const converted = next === 'kg' ? kg : kg * KG_TO_LB;
    const rounded = Math.round(converted * 10) / 10;
    setUnit(next);
    setWhole(Math.floor(rounded));
    setDecimal(Math.round((rounded - Math.floor(rounded)) * 10));
  }

  async function save() {
    if (saving) return;
    const displayed = whole + decimal / 10;
    const kg = unit === 'kg' ? displayed : displayed / KG_TO_LB;
    if (kg < 20 || kg > 400) {
      Alert.alert('Check your weight', 'Enter a weight between 20 and 400 kg.');
      return;
    }
    setSaving(true);
    try {
      await logWeight(Math.round(kg * 10) / 10, selectedDate);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: any) {
      Alert.alert('Not saved', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return <View style={[styles.centered, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.accent} /><Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading your weight…</Text></View>;
  if (loadError) return <View style={[styles.centered, { backgroundColor: colors.background }]}><Text style={[styles.errorTitle, { color: colors.text }]}>Couldn&apos;t load your weight</Text><Pressable style={styles.addButton} onPress={retryLoad}><Text style={styles.addButtonText}>Try again</Text></Pressable></View>;

  const wholeValues = unit === 'kg' ? KG_VALUES : LB_VALUES;
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]} edges={['bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={[styles.headerLabel, { color: colors.text }]}>Weigh-in</Text>
          <Pressable accessibilityLabel="Close weigh-in" onPress={() => router.back()} style={[styles.closeButton, { backgroundColor: colors.backgroundElement }]}><CloseIcon size={24} color={colors.text} /></Pressable>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>What is your weight?</Text>
        <Pressable onPress={() => setDateOpen(true)} style={[styles.dateRow, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.dateLabel, { color: colors.text }]}>Log Date</Text>
          <View style={styles.dateValueRow}><Text style={[styles.dateValue, { color: colors.textSecondary }]}>{formatDate(selectedDate)}</Text><ChevronRightIcon size={22} color={colors.textSecondary} /></View>
        </Pressable>
        <View style={styles.pickerArea}>
          <PickerColumn values={wholeValues} selected={whole} onChange={setWhole} width={116} colors={colors} accessibilityLabel="Weight whole number" />
          <Text style={[styles.decimalPoint, { color: colors.text }]}>.</Text>
          <PickerColumn values={DECIMALS} selected={decimal} onChange={setDecimal} width={86} colors={colors} accessibilityLabel="Weight decimal" />
          <PickerColumn values={['kg', 'lb']} selected={unit} onChange={changeUnit} width={86} colors={colors} accessibilityLabel="Weight unit" />
        </View>
        <View style={styles.bottomArea}>
          <Text style={[styles.helperText, { color: colors.textSecondary }]}>Your latest weigh-in keeps calorie targets and Body Analysis recommendations current.</Text>
          <Pressable disabled={saving} onPress={save} style={[styles.addButton, saving && { opacity: 0.55 }]}>{saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.addButtonText}>ADD</Text>}</Pressable>
        </View>
      </SafeAreaView>
      <DateModal visible={dateOpen} selectedDate={selectedDate} onSelect={setSelectedDate} onClose={() => setDateOpen(false)} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safe: { flex: 1, paddingHorizontal: Spacing.four }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.three }, loadingText: { fontSize: 14 }, errorTitle: { fontSize: 20, fontWeight: '800' },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerSpacer: { width: 48 }, headerLabel: { fontSize: 17, fontWeight: '700' }, closeButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: Spacing.four, fontFamily: Type.display, fontSize: 36, lineHeight: 42, fontWeight: '700', textAlign: 'center' },
  dateRow: { minHeight: 66, borderRadius: 20, marginTop: Spacing.five, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dateLabel: { fontSize: 15, fontWeight: '700' }, dateValueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, dateValue: { fontSize: 15, fontWeight: '600' },
  pickerArea: { flex: 1, minHeight: 280, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, selectionBand: { position: 'absolute', left: 0, right: 0, top: ITEM_HEIGHT, height: ITEM_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth }, pickerItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' }, pickerText: { fontSize: 23, fontWeight: '500' }, pickerTextSelected: { fontSize: 27, fontWeight: '700' }, decimalPoint: { marginHorizontal: -4, fontSize: 30, lineHeight: 34 },
  bottomArea: { gap: Spacing.three, paddingBottom: Spacing.two }, helperText: { fontSize: 12, lineHeight: 17, textAlign: 'center' }, addButton: { minHeight: 58, borderRadius: 29, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five }, addButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 0.4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }, dateSheet: { maxHeight: '62%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.four }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three }, sheetTitle: { fontFamily: Type.display, fontSize: 25, fontWeight: '700' }, sheetCaption: { marginTop: 2, fontSize: 12 }, dateOption: { minHeight: 54, borderRadius: 15, paddingHorizontal: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, dateOptionText: { flex: 1, fontSize: 15, fontWeight: '700' }, selectedLabel: { fontSize: 12, fontWeight: '800' },
});
