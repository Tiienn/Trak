import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Camera with a rounded body and lens — used on the primary scan button. */
export function CameraIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.4 5.2 9.3 3.9C9.67 3.34 10.3 3 11 3h2c.67 0 1.3.34 1.68.9l.9 1.3H18a3 3 0 0 1 3 3V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.2a3 3 0 0 1 3-3h2.4Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12.4} r={3.4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

/** Water droplet — filled or outline. */
export function DropletIcon({
  size = 22,
  color = '#ffffff',
  filled = true,
}: {
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.2 C12 3.2 5.5 10 5.5 14.5 a6.5 6.5 0 0 0 13 0 C18.5 10 12 3.2 12 3.2 Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Classic barcode stripes — used on the barcode button. */
export function BarcodeIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={2} height={14} rx={1} fill={color} />
      <Rect x={7} y={5} width={1.4} height={14} rx={0.7} fill={color} />
      <Rect x={10.4} y={5} width={2.6} height={14} rx={1} fill={color} />
      <Rect x={15} y={5} width={1.4} height={14} rx={0.7} fill={color} />
      <Rect x={19} y={5} width={2} height={14} rx={1} fill={color} />
    </Svg>
  );
}

/** Concentric target — daily challenge / accuracy. */
export function TargetIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.2} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={4.4} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={1.4} fill={color} />
    </Svg>
  );
}

/** Die with five pips — free play / randomness. */
export function DiceIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={3.5} width={17} height={17} rx={4.5} stroke={color} strokeWidth={2} />
      <Circle cx={8.6} cy={8.6} r={1.3} fill={color} />
      <Circle cx={15.4} cy={8.6} r={1.3} fill={color} />
      <Circle cx={12} cy={12} r={1.3} fill={color} />
      <Circle cx={8.6} cy={15.4} r={1.3} fill={color} />
      <Circle cx={15.4} cy={15.4} r={1.3} fill={color} />
    </Svg>
  );
}

/** Paired up/down arrows — the Higher or Lower game. */
export function ArrowsUpDownIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 18.5V6M8 6 4.6 9.4M8 6l3.4 3.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 5.5V18m0 0 3.4-3.4M16 18l-3.4-3.4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Flame — streaks. */
export function FlameIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c2.9 2.7 5.2 6 5.2 9.2a5.2 5.2 0 0 1-10.4 0c0-1.6.55-3.1 1.5-4.6.35 1.05 1 1.9 1.9 2.3C10 8 10.7 5.2 12 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Arrow rising out of a tray — share. */
export function ShareIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13.5v4A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M12 14.5V4m0 0L8.4 7.6M12 4l3.6 3.6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Finish-line pennant — game over. */
export function FlagIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 21V4m0 0h11.5l-3 4 3 4H6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Dinner plate — building and serving a meal. */
export function PlateIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} />
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

/** Chevron pointing up — "more". */
export function ChevronUpIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5.5 14.5 6.5-6.5 6.5 6.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Chevron pointing down — "fewer". */
export function ChevronDownIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5.5 9.5 6.5 6.5 6.5-6.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Simple check — completed states. */
export function CheckIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m5 12.5 4.6 4.5L19 7"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
