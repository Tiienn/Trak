import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Spacing, type ThemeColors } from '@/constants/theme';

export type DateStripItem = {
  date: Date;
  key: string;
  weekday: string;
  day: number;
  isFuture: boolean;
};

type Props = {
  accessibilityLabel: string;
  colors: ThemeColors;
  dates: DateStripItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared Home/Progress date ribbon.
 *
 * The number of visible dates and circle height adapt to Dynamic Type. Each
 * date also exposes increment/decrement actions, so VoiceOver and TalkBack
 * users can move through history without relying on a horizontal swipe.
 */
export function DateStrip({
  accessibilityLabel,
  colors,
  dates,
  selectedDate,
  onSelectDate,
  style,
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  const visibleDates = fontScale >= 1.8 ? 4 : fontScale >= 1.35 ? 5 : 7;
  const availableWidth = width - Spacing.four * 2;
  const itemWidth = availableWidth / visibleDates;
  const circleSize = 36 + Math.min(20, Math.round(Math.max(0, fontScale - 1) * 18));
  const stripHeight = 82 + Math.min(36, Math.round(Math.max(0, fontScale - 1) * 32));
  const selectedIndex = useMemo(
    () => Math.max(0, dates.findIndex((item) => item.key === selectedDate)),
    [dates, selectedDate],
  );
  const selectedItem = dates[selectedIndex];
  const selectedDateLabel = selectedItem?.date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const canMoveBack = selectedIndex > 0;
  const canMoveForward = selectedIndex < dates.length - 1 && !dates[selectedIndex + 1]?.isFuture;
  const listRef = useRef<FlatList<DateStripItem>>(null);

  useEffect(() => {
    listRef.current?.scrollToIndex({ index: selectedIndex, animated: false, viewPosition: 0.5 });
  }, [itemWidth, selectedIndex]);

  function selectIndex(index: number) {
    const item = dates[index];
    if (!item || item.isFuture) return;
    void Haptics.selectionAsync();
    onSelectDate(item.key);
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }

  return (
    <View
      style={[styles.strip, { height: stripHeight }, style]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: selectedDateLabel }}
      accessibilityHint="Swipe up or down to move one day. Double tap a visible date to select it without a screen reader."
      accessibilityActions={[
        ...(canMoveForward ? [{ name: 'increment' as const, label: 'Next day' }] : []),
        ...(canMoveBack ? [{ name: 'decrement' as const, label: 'Previous day' }] : []),
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') selectIndex(selectedIndex + 1);
        if (event.nativeEvent.actionName === 'decrement') selectIndex(selectedIndex - 1);
      }}>
      <FlatList
        ref={listRef}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        horizontal
        data={dates}
        keyExtractor={(item) => item.key}
        initialScrollIndex={Math.max(0, dates.length - 7)}
        getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        disableIntervalMomentum
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({ offset: itemWidth * index, animated: false });
        }}
        renderItem={({ item, index }) => {
          const selected = item.key === selectedDate;
          return (
            <Pressable
              disabled={item.isFuture}
              onPress={() => selectIndex(index)}
              style={({ pressed }) => [
                styles.item,
                { width: itemWidth, minHeight: stripHeight },
                selected && {
                  backgroundColor: colors.backgroundElement,
                  borderColor: colors.backgroundSelected,
                },
                pressed && !item.isFuture && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.weekday,
                  { color: item.isFuture ? colors.textSecondary : colors.text },
                  selected && styles.selectedWeekday,
                ]}>
                {item.weekday}
              </Text>
              <View
                style={[
                  styles.circle,
                  {
                    width: circleSize,
                    height: circleSize,
                    borderRadius: circleSize / 2,
                    borderColor: item.isFuture ? colors.backgroundSelected : colors.textSecondary,
                  },
                  selected && { borderColor: colors.accent, borderStyle: 'solid' },
                ]}>
                <Text
                  style={[
                    styles.number,
                    { color: item.isFuture ? colors.textSecondary : colors.text },
                    selected && { color: colors.accent },
                  ]}>
                  {item.day}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { width: '100%' },
  item: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 22,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekday: { fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  selectedWeekday: { fontWeight: '900' },
  circle: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.65 },
});
