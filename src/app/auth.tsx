import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TrakLogo } from '@/components/logo';
import { Brand, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
import { useAppScheme } from '@/lib/theme';

type BusyAction = 'email' | 'apple' | 'google' | null;

export default function AuthScreen() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { signIn, signInWithApple, signInWithGoogle, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<BusyAction>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Android keyboards often append a space after autocomplete; a trailing
  // space passes the '@' check but makes Supabase reject the credentials.
  const cleanEmail = email.trim();
  const canSubmit = cleanEmail.includes('@') && password.length >= 6 && busy === null;

  async function submit() {
    setError('');
    setInfo('');
    setBusy('email');
    try {
      const result =
        mode === 'signin'
          ? await signIn(cleanEmail, password)
          : await signUp(cleanEmail, password);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.needsConfirm) {
        setInfo('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
        return;
      }
      router.replace('/');
    } finally {
      setBusy(null);
    }
  }

  async function continueWithGoogle() {
    setError('');
    setInfo('');
    setBusy('google');
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.cancelled) router.replace('/');
    } finally {
      setBusy(null);
    }
  }

  async function continueWithApple() {
    setError('');
    setInfo('');
    setBusy('apple');
    try {
      const result = await signInWithApple();
      if (result.error) {
        setError(result.error);
        return;
      }
      if (!result.cancelled) router.replace('/');
    } finally {
      setBusy(null);
    }
  }

  const appleDisabled = !supabaseConfigured || busy !== null;
  const googleDisabled = !supabaseConfigured || busy !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <TrakLogo color={colors.text} markSize={94} wordmarkSize={52} />

              <View style={styles.intro}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {mode === 'signin' ? 'Welcome' : 'Create your account'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {mode === 'signin'
                    ? 'See your meals clearly. Understand your progress. Choose what’s next.'
                    : 'Track food with a scan, a barcode, or a quick chat.'}
                </Text>
              </View>

              {!supabaseConfigured && (
                <Text style={styles.warn}>
                  Supabase isn&apos;t configured. Add your keys to .env and restart the app.
                </Text>
              )}

              <View style={styles.socialButtons}>
                {Platform.OS === 'ios' && (
                  <View
                    pointerEvents={appleDisabled ? 'none' : 'auto'}
                    style={{ opacity: appleDisabled ? 0.45 : 1 }}>
                    {busy === 'apple' ? (
                      <View
                        style={[
                          styles.appleLoadingButton,
                          { backgroundColor: scheme === 'dark' ? '#ffffff' : '#000000' },
                        ]}>
                        <ActivityIndicator color={scheme === 'dark' ? '#000000' : '#ffffff'} />
                      </View>
                    ) : (
                      <AppleAuthentication.AppleAuthenticationButton
                        accessibilityLabel="Continue with Apple"
                        buttonStyle={
                          scheme === 'dark'
                            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                        }
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                        cornerRadius={16}
                        onPress={continueWithApple}
                        style={styles.appleButton}
                      />
                    )}
                  </View>
                )}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  disabled={googleDisabled}
                  onPress={continueWithGoogle}
                  style={({ pressed }) => [
                    styles.googleButton,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.backgroundSelected,
                      opacity: googleDisabled ? 0.45 : pressed ? 0.82 : 1,
                    },
                  ]}>
                  {busy === 'google' ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <>
                      <Image
                        source={require('@/assets/images/google-g-logo.png')}
                        style={styles.googleIcon}
                      />
                      <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
                <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or use email</Text>
                <View style={[styles.divider, { backgroundColor: colors.backgroundSelected }]} />
              </View>

              <View style={styles.form}>
                <View style={[styles.field, { backgroundColor: colors.backgroundElement }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Email"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <View style={[styles.field, { backgroundColor: colors.backgroundElement }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor={colors.textSecondary}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    textContentType={mode === 'signin' ? 'password' : 'newPassword'}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={() => {
                      if (canSubmit) submit();
                    }}
                  />
                </View>
              </View>

              {!!error && <Text style={styles.error}>{error}</Text>}
              {!!info && <Text style={styles.info}>{info}</Text>}

              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.primaryButton,
                  { opacity: canSubmit ? (pressed ? 0.82 : 1) : 0.4 },
                ]}
                disabled={!canSubmit}
                onPress={submit}>
                {busy === 'email' ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {mode === 'signin' ? 'Sign in' : 'Create account'}
                  </Text>
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                style={styles.switchButton}
                onPress={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError('');
                  setInfo('');
                }}>
                <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                  {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={styles.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  intro: { alignItems: 'center', marginTop: Spacing.three, marginBottom: Spacing.four },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.45, textAlign: 'center' },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: Spacing.two, maxWidth: 330 },
  warn: { color: '#C65D25', textAlign: 'center', fontSize: 13, marginBottom: Spacing.three },
  socialButtons: { gap: 12 },
  appleButton: { width: '100%', height: 54 },
  appleLoadingButton: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleIcon: { width: 20, height: 20 },
  googleButtonText: { fontSize: 17, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: Spacing.three },
  divider: { height: StyleSheet.hairlineWidth, flex: 1 },
  dividerText: { fontSize: 13 },
  form: { gap: 12 },
  field: { borderRadius: 14, paddingHorizontal: Spacing.three },
  input: { fontSize: 16, paddingVertical: Spacing.three },
  error: { color: '#D14B45', fontSize: 14, marginTop: Spacing.three, textAlign: 'center' },
  info: { color: Brand.green, fontSize: 14, marginTop: Spacing.three, textAlign: 'center' },
  primaryButton: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
  },
  primaryButtonText: { color: '#ffffff', fontFamily: 'LeagueSpartan_700Bold', fontSize: 17 },
  switchButton: { alignItems: 'center', paddingVertical: Spacing.three },
  switchText: { fontSize: 15 },
  switchLink: { color: Brand.green, fontWeight: '700' },
});
