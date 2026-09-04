import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RingMark, TrakWordmark } from '@/components/logo';
import { Brand, Colors, Spacing, Type } from '@/constants/theme';
import { deleteAccount } from '@/lib/account';
import { adultEligibilityForAge, MAXIMUM_TRAK_AGE } from '@/lib/adult-eligibility';
import { useAuth } from '@/lib/auth';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

const PRIVACY_URL = 'https://tqhgdnmzhuczuyyrmvzx.supabase.co/functions/v1/privacy';
const SUPPORT_EMAIL = 'support.trakapp@gmail.com';

function AdultOnlyNotice() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  async function runDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (error: any) {
      setDeleting(false);
      Alert.alert('Could not delete account', error?.message ?? 'Please try again.');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently erases your Trak account and its server-side data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete forever', style: 'destructive', onPress: runDelete },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.logoRow} accessibilityLabel="Trak">
          <RingMark size={32} />
          <TrakWordmark color={colors.text} size={30} />
        </View>

        <View style={[styles.noticeCard, { backgroundColor: colors.backgroundElement }]}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>AGE REQUIREMENT</Text>
          <Text style={[styles.title, { color: colors.text }]}>Trak is currently for adults</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Trak&apos;s calorie, weight, workout, and AI coaching features are designed for people
            aged 18 and over. We can&apos;t provide access for this account right now.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete my account and data"
            disabled={deleting}
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: pressed ? '#B83D3D' : '#C94A4A', opacity: deleting ? 0.6 : 1 },
            ]}>
            {deleting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Delete my data</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => signOut()}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundSelected,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Sign out</Text>
          </Pressable>

          <View style={styles.linkRow}>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)}>
              <Text style={[styles.linkText, { color: colors.accent }]}>Privacy policy</Text>
            </Pressable>
            <Text style={[styles.linkDivider, { color: colors.textSecondary }]}>·</Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
              <Text style={[styles.linkText, { color: colors.accent }]}>Contact support</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function AgeConfirmation() {
  const scheme = useAppScheme();
  const colors = Colors[scheme];
  const { profile, saveProfile } = useMeals();
  const [age, setAge] = useState('');
  const [saving, setSaving] = useState(false);
  const [underage, setUnderage] = useState(false);

  if (underage) return <AdultOnlyNotice />;

  async function submit() {
    if (!profile || saving) return;
    const parsed = Number(age);
    const eligibility = adultEligibilityForAge(parsed);
    if (eligibility === 'unknown') {
      Alert.alert('Check your age', `Enter a whole number between 1 and ${MAXIMUM_TRAK_AGE}.`);
      return;
    }
    if (eligibility === 'underage') {
      setUnderage(true);
      return;
    }
    setSaving(true);
    try {
      await saveProfile({ ...profile, age: parsed });
    } catch (error: any) {
      Alert.alert('Not saved', error?.message ?? 'Could not confirm your age. Please try again.');
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.logoRow} accessibilityLabel="Trak">
          <RingMark size={32} />
          <TrakWordmark color={colors.text} size={30} />
        </View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.confirmWrap}>
          <View style={[styles.noticeCard, { backgroundColor: colors.backgroundElement }]}>
            <Text style={[styles.title, { color: colors.text }]}>Confirm your age</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>Enter your age to continue.</Text>
            <View style={[styles.ageField, { backgroundColor: colors.background }]}>
              <TextInput
                accessibilityLabel="Age in years"
                autoFocus
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={setAge}
                placeholder="Age"
                placeholderTextColor={colors.textSecondary}
                returnKeyType="done"
                style={[styles.ageInput, { color: colors.text }]}
                value={age}
              />
              <Text style={[styles.ageUnit, { color: colors.textSecondary }]}>years</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={saving || age.length === 0}
              onPress={submit}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: pressed ? Brand.greenDark : Brand.green, opacity: saving || !age ? 0.45 : 1 },
              ]}>
              {saving ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function AdultEligibilityGate({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth();
  const { profile, loaded, loadError } = useMeals();

  // Authentication, first-time onboarding, and offline recovery keep their
  // existing navigation. A persisted profile is gated only after it loads.
  if (authLoading) return null;
  if (!user) return children;
  if (!loaded) return null;
  if (loadError || !profile) return children;

  const eligibility = adultEligibilityForAge(profile.age);
  if (eligibility === 'underage') return <AdultOnlyNotice />;
  if (eligibility === 'unknown') return <AgeConfirmation />;
  return children;
}

export { AdultOnlyNotice };

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: Spacing.three,
  },
  noticeCard: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.two,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontFamily: Type.display, fontSize: 32, fontWeight: '700', lineHeight: 38 },
  body: { fontSize: 16, lineHeight: 24 },
  actions: { gap: Spacing.two, paddingBottom: Spacing.three },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '800' },
  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.two },
  linkText: { fontSize: 14, fontWeight: '800', paddingVertical: Spacing.two },
  linkDivider: { fontSize: 18 },
  confirmWrap: { flex: 1 },
  ageField: {
    minHeight: 58,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.two,
    marginBottom: Spacing.two,
  },
  ageInput: { flex: 1, fontSize: 22, fontWeight: '700', paddingVertical: Spacing.three },
  ageUnit: { fontSize: 14, fontWeight: '600' },
});
