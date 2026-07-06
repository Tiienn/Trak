/**
 * Trak's design system — warm, editorial, premium.
 * Cream paper backgrounds, white cards, deep forest-green actions, terracotta /
 * lime / gold macro colors, and a serif display face for big numbers + titles.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2B2721',
    // Warm cream "paper" — the app's canvas.
    background: '#F5F2E9',
    // Cards float as soft white on the cream.
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECE7DB',
    textSecondary: '#8A8274',
    /** Soft sage tint for tonal buttons / selected chips. */
    greenTint: '#E3EAD7',
  },
  dark: {
    text: '#F3F1E9',
    // Warm espresso-green near-black.
    background: '#12140F',
    backgroundElement: '#1D2018',
    backgroundSelected: '#2A2E22',
    textSecondary: '#A6A192',
    greenTint: '#25301D',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Trak brand colors — one place to change the whole app's identity. */
export const Brand = {
  /** Primary — deep forest green. */
  green: '#3D6B4F',
  greenDark: '#2C5039',
  over: '#D97843',
} as const;

/** Macro identity colors — used for rings, bubbles, and chips. */
export const MacroColors = {
  protein: '#DE7A3D',
  carbs: '#9CB53E',
  fat: '#E6BE4C',
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

/** Display face for hero numbers and screen titles — warm editorial serif. */
export const Type = {
  display: Platform.select({ ios: 'Georgia', default: 'serif' }) as string,
} as const;

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
