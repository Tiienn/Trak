import { LeagueSpartan_700Bold } from '@expo-google-fonts/league-spartan/700Bold';
import { LeagueSpartan_800ExtraBold } from '@expo-google-fonts/league-spartan/800ExtraBold';
import * as Sentry from '@sentry/react-native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AdultEligibilityGate } from '@/components/adult-eligibility-gate';
import { AuthProvider } from '@/lib/auth';
import { BodyAnalysisProvider } from '@/lib/body-analysis-store';
import { initializeCrashReporting } from '@/lib/crash-reporting';
import { ExerciseResponsePreferencesProvider } from '@/lib/exercise-response-preferences';
import { FatLossPreferencesProvider } from '@/lib/fat-loss-preferences';
import { PurchasesProvider } from '@/lib/purchases';
import { bootstrapReminders } from '@/lib/reminders';
import { MealsProvider } from '@/lib/store';
import { MuscleScorePreferencesProvider } from '@/lib/muscle-score-preferences';
import { SupplementsProvider } from '@/lib/supplements';
import { ThemeModeProvider, useAppScheme } from '@/lib/theme';
import { TrakPointsProvider } from '@/lib/trak-points';
import { TrainingPlanProvider } from '@/lib/training-plan';
import { WorkoutFocusPreferencesProvider } from '@/lib/workout-focus-preferences';
import { WorkoutCoachPreferencesProvider } from '@/lib/workout-coach-preferences';

SplashScreen.preventAutoHideAsync();
initializeCrashReporting();

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
          name="body-analysis"
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
          name="account"
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
          name="training-plan"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="training-focus"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="workout-setup"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="fat-loss-settings"
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
          name="manual-meal"
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
          name="rewards"
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

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    LeagueSpartan_700Bold,
    LeagueSpartan_800ExtraBold,
  });

  // Re-apply saved meal reminders on launch (no-op unless enabled + permitted).
  useEffect(() => {
    bootstrapReminders();
  }, []);

  useEffect(() => {
    const openBodyAnalysis = (response: Notifications.NotificationResponse | null) => {
      if (response?.notification.request.content.data?.route !== '/body-analysis') return;
      router.push('/body-analysis');
      void Notifications.clearLastNotificationResponseAsync();
    };
    void Notifications.getLastNotificationResponseAsync().then(openBodyAnalysis);
    const subscription = Notifications.addNotificationResponseReceivedListener(openBodyAnalysis);
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <KeyboardProvider>
      <ThemeModeProvider>
        <AuthProvider>
          <MealsProvider>
            <AdultEligibilityGate>
              <PurchasesProvider>
              {/* No app-wide subscription gate: paid AI capabilities gate
                  themselves at their entry screens; all core tracking remains
                  available independently. */}
              <TrakPointsProvider>
                <BodyAnalysisProvider>
                  <SupplementsProvider>
                    <TrainingPlanProvider>
                      <WorkoutCoachPreferencesProvider>
                        <WorkoutFocusPreferencesProvider>
                          <FatLossPreferencesProvider>
                            <ExerciseResponsePreferencesProvider>
                              <MuscleScorePreferencesProvider>
                                <ThemedNavigator />
                              </MuscleScorePreferencesProvider>
                            </ExerciseResponsePreferencesProvider>
                          </FatLossPreferencesProvider>
                        </WorkoutFocusPreferencesProvider>
                      </WorkoutCoachPreferencesProvider>
                    </TrainingPlanProvider>
                  </SupplementsProvider>
                </BodyAnalysisProvider>
              </TrakPointsProvider>
              </PurchasesProvider>
            </AdultEligibilityGate>
          </MealsProvider>
        </AuthProvider>
      </ThemeModeProvider>
    </KeyboardProvider>
  );
}

export default Sentry.wrap(RootLayout);
