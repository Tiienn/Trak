/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B1512',
    background: '#ffffff',
    backgroundElement: '#F1F4F2',
    backgroundSelected: '#E1E7E4',
    textSecondary: '#5F6B66',
    /** Soft emerald tint for tonal buttons / selected chips. */
    greenTint: '#D8F3E7',
  },
  dark: {
    text: '#F2F7F4',
    // Trak's signature near-black green — same family as the splash + app icon.
    background: '#0C1210',
    backgroundElement: '#182420',
    backgroundSelected: '#24332C',
    textSecondary: '#9DABA4',
    greenTint: '#0F2E23',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Trak brand colors — one place to change the whole app's identity. */
export const Brand = {
  /** Primary — emerald. */
  green: '#10B981',
  greenDark: '#059669',
  over: '#F97316',
} as const;

/** Structural shape shared by the light and dark palettes (safe to pass either). */
export type ThemeColors = {
  text: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  textSecondary: string;
  greenTint: string;
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
