import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { CalorieWidget } from '@/widgets/calorie-widget';
import type { WidgetData } from '@/widgets/widget-data';
import { WIDGET_DATA_KEY } from '@/widgets/widget-task-handler';

/**
 * Persist today's summary for the home-screen widget and ask any placed
 * widgets to re-render. Safe to call anytime — failures (e.g. the native
 * module missing before a rebuild) are swallowed so the app never breaks.
 */
export async function syncWidget(data: WidgetData) {
  try {
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
    await requestWidgetUpdate({
      widgetName: 'Calorie',
      renderWidget: () => CalorieWidget(data),
      widgetNotFound: () => {
        // No widget placed on the home screen — nothing to update.
      },
    });
  } catch {
    // Widget module unavailable or storage error — ignore.
  }
}
