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

/** A measured plate portion — used for the Portion game. */
export function PortionIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={2} />
      <Path d="M12 3.5V12l6.1 5.9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 12 5.9 6.1" stroke={color} strokeWidth={2} strokeLinecap="round" />
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

/** Layered ingredients with an add mark — used for the Build game. */
export function BuildMealIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m4.5 9 7.5 3.8L19.5 9 12 5.2 4.5 9Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="m5.5 13 6.5 3.3 6.5-3.3M5.5 16.8 12 20l6.5-3.2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 3v4M17 5h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
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

/** Close action — kept in the shared icon set so screens never use a text glyph. */
export function CloseIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 5l14 14M19 5 5 19" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

/** Forward navigation indicator. */
export function ChevronRightIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="m9 5 7 7-7 7" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Calendar page — weekly streaks. */
export function CalendarIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M3.5 9.5h17" stroke={color} strokeWidth={2} />
      <Path d="M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Trophy cup — long streaks. */
export function TrophyIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 3.5h8V10a4 4 0 0 1-8 0V3.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M8 5H4.5v.8A3.7 3.7 0 0 0 8 9.5M16 5h3.5v.8A3.7 3.7 0 0 1 16 9.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="M12 14v6M8.5 20h7" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Bathroom scale — weight logging. */
export function ScaleIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={4} width={16} height={16} rx={4.5} stroke={color} strokeWidth={2} />
      <Path
        d="M8.8 9.6a4.4 4.4 0 0 1 6.4 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path d="m12 9.4 1.7-1.9" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Rising trend line — progress over time / gain. */
export function TrendUpIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m4 17 5-5 3.5 3.5 7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M15 8.5h4.5V13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Falling trend line — losing weight. */
export function TrendDownIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m4 7 5 5 3.5-3.5 7 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M15 15.5h4.5V11" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Balance scale — maintaining weight. */
export function BalanceIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4v16M7 20h10" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M4.5 6h15M12 5l7 1M12 5 5 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M2.8 12a2.7 2.7 0 0 0 5.4 0Zm13 0a2.7 2.7 0 0 0 5.4 0Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

/** Heart — support / thanks. */
export function HeartIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7-2.8c0 4.8-7 12-7 12Z"
        fill={color}
      />
    </Svg>
  );
}

/** Sparkles — AI magic / better recognition. */
export function SparklesIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5c.6 3.4 1.6 4.4 5 5-3.4.6-4.4 1.6-5 5-.6-3.4-1.6-4.4-5-5 3.4-.6 4.4-1.6 5-5Z"
        fill={color}
      />
      <Path d="M18.5 14c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5Z" fill={color} />
    </Svg>
  );
}

/** Medal — supporter badge. */
export function MedalIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8.5 3 12 9M15.5 3 12 9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={12} cy={15} r={5.2} stroke={color} strokeWidth={2} />
      <Path d="m12 12.4.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3.9-1.9Z" fill={color} />
    </Svg>
  );
}

/** Droplet-in-drop / water unit toggle glyph (litre bottle). */
export function BottleIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10 2.5h4v2l1.2 2.2c.5.9.8 1.9.8 3V19a2.5 2.5 0 0 1-2.5 2.5h-3A2.5 2.5 0 0 1 8 19V9.7c0-1 .3-2 .8-3L10 4.5v-2Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8 13h8" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

/** Dumbbell — workouts. */
export function DumbbellIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4.2} y={7.5} width={3.4} height={9} rx={1.4} fill={color} />
      <Rect x={16.4} y={7.5} width={3.4} height={9} rx={1.4} fill={color} />
      <Rect x={7.6} y={10.9} width={8.8} height={2.2} rx={1.1} fill={color} />
      <Rect x={1.6} y={9.4} width={1.9} height={5.2} rx={0.95} fill={color} />
      <Rect x={20.5} y={9.4} width={1.9} height={5.2} rx={0.95} fill={color} />
    </Svg>
  );
}

/** Capsule pill split into two halves — supplements / meds. */
export function PillIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* A fully-rounded (rx = half-height) capsule tilted 45° so it reads as a
          pill rather than a bar; the divider across its waist shows the join. */}
      <Rect
        x={3}
        y={8}
        width={18}
        height={8}
        rx={4}
        transform="rotate(45 12 12)"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M12 8v8" transform="rotate(45 12 12)" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Game controller — playing Trak's games. */
export function GamepadIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={7.5} width={18} height={9} rx={4.5} stroke={color} strokeWidth={2} />
      <Path d="M7.6 10.2v3.6M5.8 12h3.6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={15.4} cy={10.8} r={1.15} fill={color} />
      <Circle cx={17.7} cy={13.2} r={1.15} fill={color} />
    </Svg>
  );
}

/** Person silhouette — account and profile entry points. */
export function UserIcon({ size = 22, color = '#ffffff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={2} />
      <Path
        d="M4.8 20a7.2 7.2 0 0 1 14.4 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
