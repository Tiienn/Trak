import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/lib/auth';
import { MealsProvider } from '@/lib/store';
import { ThemeModeProvider, useAppScheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function ThemedNavigator() {
  const scheme = useAppScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="barcode"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="paywall"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="meal/[id]"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="profile"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="weight"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="insights"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <MealsProvider>
          <ThemedNavigator />
        </MealsProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
}
