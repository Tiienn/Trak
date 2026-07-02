import Svg, { Circle, G } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The Trak "Ring" brand mark — identical geometry to the app icon
 * (scripts/generate-icon-assets.js): ring r=118/400, stroke 38, 65° gap at the
 * top-right with the Trak dot sitting in it.
 */
export function RingMark({ size = 28, color = Brand.green }: { size?: number; color?: string }) {
  const s = size / 400;
  const r = 118 * s;
  const stroke = 38 * s;
  const dotPos = 83.5 * s;
  const dotR = 19 * s;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * (295 / 360);
  const gap = circumference - arc;

  return (
    <Svg width={size} height={size}>
      <G origin={`${c}, ${c}`} x={c} y={c}>
        <Circle
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${gap}`}
          rotation={-12.5}
          origin="0, 0"
        />
        <Circle cx={dotPos} cy={-dotPos} r={dotR} fill={color} />
      </G>
    </Svg>
  );
}
