'use no memo';

import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetData = {
  left: number;
  eaten: number;
  budget: number;
  /** Optional water progress for the second line. */
  water?: number;
  waterGoal?: number;
};

const BG = '#0C1210';
const TEXT = '#F2F7F4';
const MUTED = '#9DABA4';
const GREEN = '#10B981';
const OVER = '#F97316';

/** Home-screen widget: today's calories at a glance. Tapping opens Trak. */
export function CalorieWidget({ left, eaten, budget, water, waterGoal }: WidgetData) {
  const over = left < 0;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: BG,
        borderRadius: 24,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget
          style={{ height: 10, width: 10, borderRadius: 5, backgroundColor: GREEN, marginRight: 6 }}
        />
        <TextWidget text="Trak" style={{ fontSize: 13, fontWeight: 'bold', color: TEXT }} />
      </FlexWidget>
      <TextWidget
        text={`${Math.abs(left).toLocaleString()}`}
        style={{ fontSize: 34, fontWeight: 'bold', color: over ? OVER : TEXT, marginTop: 2 }}
      />
      <TextWidget
        text={over ? 'kcal over' : 'kcal left'}
        style={{ fontSize: 12, color: MUTED }}
      />
      <TextWidget
        text={`${eaten.toLocaleString()} / ${budget.toLocaleString()} kcal`}
        style={{ fontSize: 11, color: MUTED, marginTop: 6 }}
      />
      {typeof water === 'number' && typeof waterGoal === 'number' ? (
        <TextWidget
          text={`💧 ${water}/${waterGoal} glasses`}
          style={{ fontSize: 11, color: MUTED, marginTop: 2 }}
        />
      ) : (
        <FlexWidget style={{ height: 0, width: 0 }} />
      )}
    </FlexWidget>
  );
}
