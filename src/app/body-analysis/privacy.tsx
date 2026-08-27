import { router } from 'expo-router';
import { Alert, StyleSheet, Text } from 'react-native';

import {
  BodyButton,
  BodyCard,
  BodyHeader,
  BodyScreen,
  BodySectionTitle,
} from '@/components/body-analysis-ui';
import { Colors } from '@/constants/theme';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { useAppScheme } from '@/lib/theme';

export default function BodyAnalysisPrivacyScreen() {
  const colors = Colors[useAppScheme()];
  const { deleteAllBodyData } = useBodyAnalysis();

  const removeEverything = () => {
    Alert.alert(
      'Delete all Body Analysis data?',
      'Every written check-in, preference, report connection, and local progress photo will be permanently deleted. Your profile, meals, and the rest of Trak will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => void deleteAllBodyData()
            .then(() => {
              Alert.alert('Body Analysis data deleted');
              router.replace('/body-analysis');
            })
            .catch((error: any) => Alert.alert('Could not delete', error?.message ?? 'Please try again.')),
        },
      ],
    );
  };

  return (
    <BodyScreen>
      <BodyHeader title="Photo privacy" subtitle="What happens to your photos and analysis data." />

      <BodyCard>
        <BodySectionTitle>When you analyze</BodySectionTitle>
        <Text selectable style={[styles.body, { color: colors.textSecondary }]}>
          Your front, side, and back photos are resized on your device and sent securely through Trak to Google’s Gemini API for this one analysis. Trak also sends limited context needed for useful guidance: your goal, recent weight trend, optional waist measurement, training preferences, summarized nutrition evidence, and an earlier written check-in when available. The photos are not added to Trak’s database or application logs.
        </Text>
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>What Trak stores</BodySectionTitle>
        <Text selectable style={[styles.body, { color: colors.textSecondary }]}>
          Trak stores the written analysis, the goal and measurements used for that check-in, and privacy-safe technical metadata such as the model and prompt version. This lets you open your history and lets Trak safely compare later check-ins.
        </Text>
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>Photos on this device</BodySectionTitle>
        <Text selectable style={[styles.body, { color: colors.textSecondary }]}>
          The progress-photo copies shown in Trak stay in this app’s private cache on this device. They are excluded from device backup, do not sync to another phone, and are not uploaded for storage. Your phone may clear cached copies when it needs space. Clearing app data, uninstalling Trak, or deleting the photos here also removes them.
        </Text>
      </BodyCard>

      <BodyCard>
        <BodySectionTitle>Your controls</BodySectionTitle>
        <Text selectable style={[styles.body, { color: colors.textSecondary }]}>
          You can delete just the local photos while keeping a written result, delete one complete check-in, or erase every Body Analysis result and preference. Deleting your Trak account also removes server-side Body Analysis data and best-effort local copies.
        </Text>
        <BodyButton title="Delete all Body Analysis data" variant="destructive" onPress={removeEverything} />
      </BodyCard>

      <Text selectable style={[styles.note, { color: colors.textSecondary }]}>
        Body Analysis offers visual estimates and general wellness guidance only. It is not medical advice, diagnosis, or treatment.
      </Text>
    </BodyScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 22 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
