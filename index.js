// Custom entry: load expo-router's app entry, then register the Android
// widget task handler so the home-screen widget can render in the background.
import 'expo-router/entry';

import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widgets/widget-task-handler';

if (process.env.EXPO_OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
}
