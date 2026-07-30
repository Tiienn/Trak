import { LeagueSpartan_700Bold } from '@expo-google-fonts/league-spartan/700Bold';
import { LeagueSpartan_800ExtraBold } from '@expo-google-fonts/league-spartan/800ExtraBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/lib/auth';
import { PurchasesProvider, useSubscription } from '@/lib/purchases';
import { bootstrapReminders } from '@/lib/reminders';
import { MealsProvider, useMeals } from '@/lib/store';
import { SupplementsProvider } from '@/lib/supplements';
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
        <Stack.Screen
          name="exercise"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="achievements"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="quick-add"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="reminders"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="supplements"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="history"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="score"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="macro/[key]"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="game"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="higher-lower"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="portion-guess"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

function SubscriptionGate({ children }: { children: ReactNode }) {
  const segments = useSegments() as string[];
  const { loaded, hasProfile } = useMeals();
  const { hasAccess, loading } = useSubscription();
  const root = segments[0];

  useEffect(() => {
    if (!loaded || !hasProfile || loading || hasAccess) return;
    // Authentication, onboarding, purchase restoration, and account deletion
    // must remain reachable even without an active subscription.
    if (root === 'auth' || root === 'onboarding' || root === 'paywall' || root === 'profile') {
      return;
    }
    router.replace('/paywall');
  }, [hasAccess, hasProfile, loaded, loading, root]);

  return children;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    LeagueSpartan_700Bold,
    LeagueSpartan_800ExtraBold,
  });

  // Re-apply saved meal reminders on launch (no-op unless enabled + permitted).
  useEffect(() => {
    bootstrapReminders();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeModeProvider>
      <AuthProvider>
        <PurchasesProvider>
          <MealsProvider>
            <SupplementsProvider>
              <SubscriptionGate>
                <ThemedNavigator />
              </SubscriptionGate>
            </SupplementsProvider>
          </MealsProvider>
        </PurchasesProvider>
      </AuthProvider>
    </ThemeModeProvider>
  );
}
