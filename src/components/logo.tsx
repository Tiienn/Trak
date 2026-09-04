import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Brand, Type } from '@/constants/theme';

type WordmarkProps = {
  color: string;
  size?: number;
  style?: StyleProp<TextStyle>;
};

/** Trak's original progress-ring mark, shared by the icon and product UI. */
export function RingMark({ size = 28, color = Brand.green }: { size?: number; color?: string }) {
  const scale = size / 400;
  const radius = 118 * scale;
  const stroke = 38 * scale;
  const dotPosition = 83.5 * scale;
  const dotRadius = 19 * scale;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * (295 / 360);
  const gap = circumference - arc;

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${arc} ${gap}`}
        transform={`rotate(-12.5 ${center} ${center})`}
      />
      <Circle
        cx={center + dotPosition}
        cy={center - dotPosition}
        r={dotRadius}
        fill={color}
      />
    </Svg>
  );
}

/** Trak's editorial wordmark face, shared by every product header and lockup. */
export function TrakWordmark({ color, size = 28, style }: WordmarkProps) {
  return (
    <Text allowFontScaling={false} accessibilityRole="text" style={[styles.wordmark, { color, fontSize: size, lineHeight: size * 1.02 }, style]}>
      Trak
    </Text>
  );
}

export function TrakLogo({
  color,
  markSize = 72,
  wordmarkSize = 46,
  style,
}: {
  color: string;
  markSize?: number;
  wordmarkSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.lockup, style]}>
      <RingMark size={markSize} />
      <TrakWordmark color={color} size={wordmarkSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center', gap: 5 },
  wordmark: {
    fontFamily: Type.brand,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
});
