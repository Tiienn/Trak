// Metro selects the Android implementation only for Android builds. Keeping
// registration in a platform-specific module prevents Android widget code
// from being included in the iOS bundle.
import './src/register-widget';
import 'expo-router/entry';
