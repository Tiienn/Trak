import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { UserIcon } from '@/components/icons';
import { Brand, type ThemeColors } from '@/constants/theme';
import { useTrakPoints } from '@/lib/trak-points';

export function ProfileAvatarButton({ colors }: { colors: ThemeColors }) {
  const { catalog, equipment } = useTrakPoints();
  const frame = catalog.find((item) => item.key === equipment.frameKey);
  const hasBadge = equipment.badgeKey != null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      hitSlop={6}
      onPress={() => router.push('/account')}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: frame?.accent ?? colors.backgroundSelected,
          borderWidth: frame ? 3 : 1,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <UserIcon size={22} color={colors.accent} />
      {hasBadge ? <View style={[styles.badge, { backgroundColor: Brand.green, borderColor: colors.background }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
