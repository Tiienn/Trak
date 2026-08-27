import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { UserIcon } from '@/components/icons';
import { Brand, type ThemeColors } from '@/constants/theme';

export function ProfileAvatarButton({ colors }: { colors: ThemeColors }) {
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
          borderColor: colors.backgroundSelected,
          opacity: pressed ? 0.72 : 1,
        },
      ]}>
      <UserIcon size={22} color={Brand.green} />
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
});
