import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';

export default function AuthScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const canSubmit = email.includes('@') && password.length >= 6 && !busy;

  async function submit() {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const res = mode === 'signin' ? await signIn(email, password) : await signUp(email, password);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.needsConfirm) {
        setInfo('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
        return;
      }
      router.replace('/');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.center}>
            <View style={styles.logoRow}>
              <View style={[styles.logoDot, { backgroundColor: Brand.green }]} />
              <Text style={[styles.wordmark, { color: colors.text }]}>Trak</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </Text>

            {!supabaseConfigured && (
              <Text style={styles.warn}>
                Supabase isn&apos;t configured. Add your keys to .env and restart the app.
              </Text>
            )}

            <View style={[styles.field, { backgroundColor: colors.backgroundElement }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={[styles.field, { backgroundColor: colors.backgroundElement }]}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Password (min 6 characters)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
            {!!info && <Text style={styles.info}>{info}</Text>}

            <Pressable
              style={[styles.primaryBtn, { opacity: canSubmit ? 1 : 0.4 }]}
              disabled={!canSubmit}
              onPress={submit}>
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.switchBtn}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  center: { flex: 1, justifyContent: 'center', gap: Spacing.two },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, justifyContent: 'center' },
  logoDot: { width: 22, height: 22, borderRadius: 11 },
  wordmark: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: Spacing.three },
  warn: { color: '#F97316', textAlign: 'center', fontSize: 13, marginBottom: Spacing.two },
  field: { borderRadius: 14, paddingHorizontal: Spacing.three, marginTop: Spacing.two },
  input: { fontSize: 16, paddingVertical: Spacing.three },
  error: { color: '#EF4444', fontSize: 14, marginTop: Spacing.two, textAlign: 'center' },
  info: { color: Brand.green, fontSize: 14, marginTop: Spacing.two, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
    minHeight: 54,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  switchBtn: { alignItems: 'center', paddingVertical: Spacing.three },
  switchText: { fontSize: 15 },
  switchLink: { color: Brand.green, fontWeight: '700' },
});
