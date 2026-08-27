import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing, Type, type ThemeColors } from '@/constants/theme';
import { useAppScheme } from '@/lib/theme';

export function BodyScreen({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode }) {
  const colors = Colors[useAppScheme()];
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          {...props}
          contentContainerStyle={[styles.scroll, contentContainerStyle]}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function BodyHeader({ title, subtitle, close = true }: { title: string; subtitle?: string; close?: boolean }) {
  const colors = Colors[useAppScheme()];
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {close ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.close, { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.65 : 1 }]}>
          <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function BodyCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = Colors[useAppScheme()];
  return <View style={[styles.card, { backgroundColor: colors.backgroundElement }, style]}>{children}</View>;
}

export function BodySectionTitle({ children }: { children: ReactNode }) {
  const colors = Colors[useAppScheme()];
  return <Text style={[styles.sectionTitle, { color: colors.text }]}>{children}</Text>;
}

export function BodyButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'tonal' | 'ghost' | 'destructive';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const colors = Colors[useAppScheme()];
  const backgroundColor =
    variant === 'primary'
      ? Brand.green
      : variant === 'tonal'
        ? colors.greenTint
        : variant === 'destructive'
          ? '#8F2D2D'
          : 'transparent';
  const color = variant === 'primary' || variant === 'destructive' ? '#ffffff' : variant === 'tonal' ? Brand.greenDark : colors.textSecondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled || loading ? 0.45 : pressed ? 0.7 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={color} /> : <Text style={[styles.buttonText, { color }]}>{title}</Text>}
    </Pressable>
  );
}

export function BodySegment<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  const colors = Colors[useAppScheme()];
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.segmentWrap, { backgroundColor: colors.background }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && { backgroundColor: colors.greenTint }]}>
            <Text style={[styles.segmentText, { color: active ? Brand.greenDark : colors.textSecondary }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BodyState({
  title,
  body,
  action,
  onAction,
  colors,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
  colors: ThemeColors;
}) {
  return (
    <BodyCard style={styles.stateCard}>
      <Text style={[styles.stateTitle, { color: colors.text }]}>{title}</Text>
      <Text selectable style={[styles.stateBody, { color: colors.textSecondary }]}>{body}</Text>
      {action && onAction ? <BodyButton title={action} onPress={onAction} /> : null}
    </BodyCard>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three, paddingTop: Spacing.two },
  headerText: { flex: 1, gap: Spacing.one },
  title: { fontFamily: Type.display, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, fontWeight: '700' },
  card: { borderRadius: 20, padding: Spacing.four, gap: Spacing.three },
  sectionTitle: { fontFamily: Type.display, fontSize: 20, fontWeight: '700' },
  button: { minHeight: 54, borderRadius: 16, paddingHorizontal: Spacing.four, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  segmentWrap: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 2 },
  segment: { flex: 1, minHeight: 44, borderRadius: 11, paddingHorizontal: Spacing.two, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13, fontWeight: '700' },
  stateCard: { alignItems: 'stretch' },
  stateTitle: { fontSize: 18, fontWeight: '700' },
  stateBody: { fontSize: 14, lineHeight: 21 },
});
