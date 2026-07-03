import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { CalorieWidget, type WidgetData } from './calorie-widget';

/** AsyncStorage key the app writes today's summary to for the widget. */
export const WIDGET_DATA_KEY = 'trak.widget.v1';

const FALLBACK: WidgetData = { left: 0, eaten: 0, budget: 0 };

async function readData(): Promise<WidgetData> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    if (raw) return { ...FALLBACK, ...JSON.parse(raw) };
  } catch {
    // Fall through to defaults on any storage/parse error.
  }
  return FALLBACK;
}

/** Handles all widget lifecycle actions by re-rendering with the latest data. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await readData();
      props.renderWidget(<CalorieWidget {...data} />);
      break;
    }
    // WIDGET_CLICK with clickAction "OPEN_APP" is handled natively (opens Trak).
    // WIDGET_DELETED needs no work.
    default:
      break;
  }
}
