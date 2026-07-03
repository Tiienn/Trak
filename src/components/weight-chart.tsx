import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Brand, type ThemeColors } from '@/constants/theme';
import { WeightEntry } from '@/lib/types';

const HEIGHT = 180;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;
const PAD_X = 8;

/** A simple line + soft area chart of weight over time. */
export function WeightChart({
  weights,
  colors,
  goalDown,
}: {
  weights: WeightEntry[];
  colors: ThemeColors;
  /** True when the goal is to lose weight (tints the trend accordingly). */
  goalDown?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (weights.length < 2) {
    return (
      <View style={[styles.empty, { height: HEIGHT }]} onLayout={onLayout}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Log your weight on two or more days to see your trend.
        </Text>
      </View>
    );
  }

  const values = weights.map((w) => w.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Pad the range so the line isn't glued to the edges; guard against flat lines.
  const range = max - min || 1;
  const lo = min - range * 0.2;
  const hi = max + range * 0.2;

  const innerW = Math.max(width - PAD_X * 2, 1);
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const x = (i: number) => PAD_X + (weights.length === 1 ? innerW / 2 : (i / (weights.length - 1)) * innerW);
  const y = (v: number) => PAD_TOP + (1 - (v - lo) / (hi - lo)) * innerH;

  const points = weights.map((w, i) => ({ px: x(i), py: y(w.weightKg) }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px} ${p.py}`).join(' ');
  const areaPath =
    `${linePath} L ${points[points.length - 1].px} ${PAD_TOP + innerH}` +
    ` L ${points[0].px} ${PAD_TOP + innerH} Z`;

  const last = points[points.length - 1];

  return (
    <View onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {/* baseline */}
          <Line
            x1={PAD_X}
            y1={PAD_TOP + innerH}
            x2={width - PAD_X}
            y2={PAD_TOP + innerH}
            stroke={colors.backgroundSelected}
            strokeWidth={1}
          />
          <Path d={areaPath} fill={colors.greenTint} opacity={0.6} />
          <Path
            d={linePath}
            fill="none"
            stroke={Brand.green}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map((p, i) => (
            <Circle key={i} cx={p.px} cy={p.py} r={i === points.length - 1 ? 5 : 3} fill={Brand.green} />
          ))}
          {/* latest value dot ring */}
          <Circle cx={last.px} cy={last.py} r={8} fill="none" stroke={Brand.green} strokeWidth={2} opacity={0.4} />
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}
      <View style={styles.axisRow}>
        <Text style={[styles.axisText, { color: colors.textSecondary }]}>
          {formatShort(weights[0].date)}
        </Text>
        <Text style={[styles.axisText, { color: colors.textSecondary }]}>
          {formatShort(weights[weights.length - 1].date)}
        </Text>
      </View>
    </View>
  );
}

function formatShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PAD_X },
  axisText: { fontSize: 11, fontWeight: '600' },
});
