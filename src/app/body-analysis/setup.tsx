import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  BodyButton,
  BodyCard,
  BodyHeader,
  BodyScreen,
  BodySectionTitle,
  BodySegment,
  BodyState,
} from '@/components/body-analysis-ui';
import { Brand, Colors, Spacing } from '@/constants/theme';
import {
  BODY_ANALYSIS_CONSENT_VERSION,
  BODY_ANALYSIS_PREFERENCES_VERSION,
  bodyAnalysisEligibility,
  waistCmFromInput,
  type TrainingExperience,
  type TrainingLocation,
} from '@/lib/body-analysis';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { bodyAnalysisDemoEnabled } from '@/lib/body-analysis-demo';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/purchases';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

const EQUIPMENT = ['None', 'Dumbbells', 'Barbell', 'Machines', 'Bands', 'Pull-up bar', 'Bench', 'Backpack'];

export default function BodyAnalysisSetupScreen() {
  const colors = Colors[useAppScheme()];
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { user } = useAuth();
  const {
    profile,
    latestWeight,
    loaded: mealsLoaded,
    loadError: mealsLoadError,
    retryLoad: retryMeals,
    refresh: refreshMeals,
  } = useMeals();
  const { capabilities, loading: accessLoading } = useSubscription();
  const { loaded, available, preferences, savePreferences } = useBodyAnalysis();
  const editing = edit === '1';

  const [location, setLocation] = useState<TrainingLocation>(preferences?.trainingLocation ?? 'gym');
  const [experience, setExperience] = useState<TrainingExperience>(preferences?.experience ?? 'beginner');
  const [days, setDays] = useState(preferences?.daysAvailable ?? 3);
  const [equipment, setEquipment] = useState<string[]>(preferences?.equipment ?? []);
  const [limitations, setLimitations] = useState(preferences?.limitationsNote ?? '');
  const [waist, setWaist] = useState('');
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  const [consented, setConsented] = useState(false);
  const [saving, setSaving] = useState(false);
  const requiresConsent = preferences?.consentVersion !== BODY_ANALYSIS_CONSENT_VERSION;

  useEffect(() => {
    if (!preferences) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLocation(preferences.trainingLocation);
      setExperience(preferences.experience);
      setDays(preferences.daysAvailable);
      setEquipment(preferences.equipment);
      setLimitations(preferences.limitationsNote ?? '');
    });
    return () => { active = false; };
  }, [preferences]);

  // The weight editor is presented above this screen. Re-read the confirmed
  // server state when it closes so the starting point never shows stale data.
  useFocusEffect(useCallback(() => {
    if (mealsLoaded && !mealsLoadError) void refreshMeals();
  }, [mealsLoaded, mealsLoadError, refreshMeals]));

  const eligibility = bodyAnalysisEligibility({
    signedIn: Boolean(user),
    profileAge: profile?.age ?? null,
    capability: capabilities.bodyAnalysis,
    consentVersion: preferences?.consentVersion ?? null,
  });

  if (!loaded || !mealsLoaded || accessLoading) {
    return <BodyScreen><BodyHeader title="Set up Body Analysis" /><BodyState colors={colors} title="Loading…" body="Preparing your settings." /></BodyScreen>;
  }
  if (mealsLoadError) {
    return <BodyScreen><BodyHeader title="Set up Body Analysis" /><BodyState colors={colors} title="Couldn’t load your starting point" body="Check your connection and try again." action="Try again" onAction={retryMeals} /></BodyScreen>;
  }
  if (!available) {
    return <BodyScreen><BodyHeader title="Set up Body Analysis" /><BodyState colors={colors} title="Not available yet" body="Try again after the latest Trak update is enabled." /></BodyScreen>;
  }
  if (eligibility === 'locked') {
    return <BodyScreen><BodyHeader title="Set up Body Analysis" /><BodyState colors={colors} title="Body Analysis with Trak Pro" body="This check-in is part of Trak Pro." action="See Trak Pro" onAction={() => router.replace('/paywall')} /></BodyScreen>;
  }
  if (eligibility === 'underage') {
    return <BodyScreen><BodyHeader title="Set up Body Analysis" /><BodyState colors={colors} title="Available for adults" body="Body Analysis is only available to people aged 18 or older." /></BodyScreen>;
  }

  const toggleEquipment = (item: string) => {
    setEquipment((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current.filter((value) => value !== 'None'), item]);
  };

  const submit = async () => {
    if (requiresConsent && !consented) {
      Alert.alert('Review photo consent', 'Please confirm how your photos will be handled before continuing.');
      return;
    }
    const waistCm = waist.trim() ? waistCmFromInput(waist, unit) : null;
    if (waist.trim() && waistCm == null) {
      Alert.alert('Check waist measurement', `Enter a waist between ${unit === 'metric' ? '40 and 200 cm' : '16 and 79 in'}, or leave it blank.`);
      return;
    }
    setSaving(true);
    try {
      await savePreferences({
        consentVersion: BODY_ANALYSIS_CONSENT_VERSION,
        trainingLocation: location,
        experience,
        daysAvailable: days,
        equipment,
        limitationsNote: limitations,
        preferencesVersion: BODY_ANALYSIS_PREFERENCES_VERSION,
      });
      if (editing) router.back();
      else router.replace({ pathname: '/body-analysis/capture', params: waistCm ? { waistCm: String(waistCm) } : {} });
    } catch (error: any) {
      Alert.alert('Not saved', error?.message ?? 'Could not save your preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BodyScreen keyboardShouldPersistTaps="handled">
        <BodyHeader
          title={editing ? 'Training preferences' : 'Set up your check-in'}
          subtitle="These details help Trak keep recommendations realistic for you."
        />

        <BodyCard>
          <BodySectionTitle>Your starting point</BodySectionTitle>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Goal: <Text style={{ color: colors.text, fontWeight: '700' }}>{profile?.goal ?? 'Not set'}</Text></Text>
          <Pressable
            onPress={() => router.push({ pathname: '/weight', params: { returnTo: 'body-analysis' } })}
            style={[styles.inlineRow, { backgroundColor: colors.background }]}>
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>CURRENT WEIGHT</Text>
              <Text style={[styles.inlineValue, { color: colors.text }]}>{latestWeight ?? profile?.weightKg ?? '—'} kg</Text>
            </View>
            <Text style={[styles.edit, { color: colors.accent }]}>Update</Text>
          </Pressable>
          {!editing ? (
            <>
              <BodySegment
                accessibilityLabel="Waist measurement unit"
                value={unit}
                onChange={setUnit}
                options={[{ value: 'metric', label: 'cm' }, { value: 'imperial', label: 'in' }]}
              />
              <TextInput
                accessibilityLabel="Optional waist measurement"
                keyboardType="decimal-pad"
                placeholder={`Optional waist (${unit === 'metric' ? 'cm' : 'in'})`}
                placeholderTextColor={colors.textSecondary}
                value={waist}
                onChangeText={setWaist}
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              />
              <Text style={[styles.hint, { color: colors.textSecondary }]}>Optional. Measure around your waist without pulling the tape tight.</Text>
            </>
          ) : null}
        </BodyCard>

        <BodyCard>
          <BodySectionTitle>How you train</BodySectionTitle>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>LOCATION</Text>
          <BodySegment
            value={location}
            onChange={setLocation}
            options={[{ value: 'home', label: 'Home' }, { value: 'gym', label: 'Gym' }, { value: 'both', label: 'Both' }]}
          />
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EXPERIENCE</Text>
          <BodySegment
            value={experience}
            onChange={setExperience}
            options={[{ value: 'beginner', label: 'Beginner' }, { value: 'intermediate', label: 'Regular' }, { value: 'advanced', label: 'Advanced' }]}
          />
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DAYS AVAILABLE</Text>
          <View style={styles.dayRow}>
            {[2, 3, 4, 5, 6].map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: days === value }}
                onPress={() => setDays(value)}
                style={[styles.day, { backgroundColor: days === value ? colors.greenTint : colors.background }]}>
                <Text style={[styles.dayText, { color: days === value ? Brand.greenDark : colors.textSecondary }]}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>EQUIPMENT</Text>
          <View style={styles.chips}>
            {EQUIPMENT.map((item) => {
              const selected = equipment.includes(item);
              return (
                <Pressable
                  key={item}
                  onPress={() => item === 'None' ? setEquipment(selected ? [] : ['None']) : toggleEquipment(item)}
                  style={[styles.chip, { backgroundColor: selected ? colors.greenTint : colors.background }]}>
                  <Text style={[styles.chipText, { color: selected ? Brand.greenDark : colors.textSecondary }]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            accessibilityLabel="Injuries or movement limitations"
            multiline
            maxLength={500}
            placeholder="Optional injuries, pain, or movements to avoid"
            placeholderTextColor={colors.textSecondary}
            value={limitations}
            onChangeText={setLimitations}
            style={[styles.input, styles.multiline, { backgroundColor: colors.background, color: colors.text }]}
          />
          <Text style={[styles.hint, { color: colors.textSecondary }]}>{limitations.length}/500 · Trak does not diagnose injuries.</Text>
        </BodyCard>

        {requiresConsent ? (
          <BodyCard>
            <BodySectionTitle>Before you continue</BodySectionTitle>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {bodyAnalysisDemoEnabled
                ? 'This preview uses placeholder photos and sample guidance. It does not perform a real Body Analysis.'
                : 'Your three photos are sent securely to Trak’s AI provider for this analysis. Trak does not store them on its server. If you keep progress copies, they stay only on this device and do not sync.'}
            </Text>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consented }} onPress={() => setConsented((value) => !value)} style={styles.consentRow}>
              <View style={[styles.checkbox, { borderColor: consented ? Brand.green : colors.textSecondary, backgroundColor: consented ? Brand.green : 'transparent' }]}>
                {consented ? <Text style={styles.check}>✓</Text> : null}
              </View>
              <Text style={[styles.consentText, { color: colors.text }]}>{bodyAnalysisDemoEnabled ? 'I’m 18 or older and want to try this preview.' : 'I’m 18 or older and consent to this photo analysis.'}</Text>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="Read photo privacy details" onPress={() => router.push('/body-analysis/privacy')}><Text style={[styles.privacyLink, { color: colors.accent }]}>Read photo privacy details</Text></Pressable>
          </BodyCard>
        ) : null}

        <BodyButton title={editing ? 'Save preferences' : 'Continue to photos'} loading={saving} onPress={() => void submit()} />
      </BodyScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { fontSize: 14, lineHeight: 21 },
  fieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  inlineRow: { minHeight: 64, borderRadius: 14, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inlineValue: { fontSize: 17, fontWeight: '700', marginTop: Spacing.one },
  edit: { fontSize: 14, fontWeight: '800' },
  input: { minHeight: 52, borderRadius: 14, paddingHorizontal: Spacing.three, fontSize: 16 },
  multiline: { minHeight: 104, paddingTop: Spacing.three, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 17 },
  dayRow: { flexDirection: 'row', gap: Spacing.two },
  day: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { borderRadius: 99, paddingVertical: 10, paddingHorizontal: 13 },
  chipText: { fontSize: 13, fontWeight: '700' },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  checkbox: { width: 26, height: 26, borderWidth: 2, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  check: { color: '#fff', fontSize: 16, fontWeight: '900' },
  consentText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  privacyLink: { fontSize: 14, fontWeight: '800' },
});
