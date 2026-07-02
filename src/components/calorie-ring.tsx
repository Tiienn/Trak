import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Brand, type ThemeColors } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 210;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * The big daily calorie ring — echoes Trak's "Ring" brand mark.
 * Fills clockwise as the user eats; turns orange when over target.
 */
export function CalorieRing({
  consumed,
  target,
  colors,
}: {
  consumed: number;
  target: number;
  colors: ThemeColors;
}) {
  const remaining = target - consumed;
  const over = remaining < 0;
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;

  // Animate the arc towards the new percentage whenever it changes.
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: pct,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // strokeDashoffset is not a native-driver prop
    }).start();
  }, [pct, progress]);

  const dashOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={colors.backgroundSelected}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress arc — starts at 12 o'clock */}
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={over ? Brand.over : Brand.green}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.value, { color: over ? Brand.over : colors.text }]}>
          {Math.abs(remaining).toLocaleString()}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {over ? 'kcal over' : 'kcal left'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});
