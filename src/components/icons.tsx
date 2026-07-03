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
