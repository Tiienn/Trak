import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BodyButton,
  BodyCard,
  BodyHeader,
  BodyScreen,
  BodySectionTitle,
  BodyState,
} from '@/components/body-analysis-ui';
import { Brand, Colors, Spacing } from '@/constants/theme';
import {
  bodyAnalysisEligibility,
  type BodyAnalysisResult,
  type BodyPose,
} from '@/lib/body-analysis';
import { analyzeBodyPhotos, type SelectedBodyPhoto, type SelectedBodyPhotos } from '@/lib/body-analysis-client';
import { useBodyAnalysis } from '@/lib/body-analysis-store';
import { bodyAnalysisDemoEnabled } from '@/lib/body-analysis-demo';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/purchases';
import { scheduleBodyAnalysisRecheck } from '@/lib/reminders';
import { useMeals } from '@/lib/store';
import { useAppScheme } from '@/lib/theme';

const POSES: { key: BodyPose; label: string; cue: string }[] = [
  { key: 'front', label: 'Front', cue: 'Face forward with arms relaxed slightly away from your sides.' },
  { key: 'side', label: 'Side', cue: 'Turn fully sideways. Keep a natural stance and look straight ahead.' },
  { key: 'back', label: 'Back', cue: 'Face away from the camera with arms relaxed and feet visible.' },
];

type CaptureState = 'guide' | 'camera' | 'review' | 'ready' | 'analyzing' | 'retake' | 'unsupported';

function asCompletePhotos(photos: Partial<SelectedBodyPhotos>): SelectedBodyPhotos | null {
  if (!photos.front || !photos.side || !photos.back) return null;
  return { front: photos.front, side: photos.side, back: photos.back };
}

export default function BodyCaptureScreen() {
  const colors = Colors[useAppScheme()];
  const { waistCm: waistParam } = useLocalSearchParams<{ waistCm?: string }>();
  const { user } = useAuth();
  const { profile } = useMeals();
  const { capabilities, loading: accessLoading } = useSubscription();
  const {
    loaded,
    available,
    preferences,
    latestScan,
    localPhotos,
    persistLocalPhotos,
    refresh,
  } = useBodyAnalysis();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const captureStateRef = useRef<CaptureState>('guide');
  const [captureState, setCaptureState] = useState<CaptureState>('guide');
  const [poseIndex, setPoseIndex] = useState(0);
  const [photos, setPhotos] = useState<Partial<SelectedBodyPhotos>>({});
  const [pendingPhoto, setPendingPhoto] = useState<SelectedBodyPhoto | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [taking, setTaking] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<BodyAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    captureStateRef.current = captureState;
  }, [captureState]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setCountdown(null);
  };

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stopTimer();
        if (captureStateRef.current === 'camera') setCaptureState('guide');
      }
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
      stopTimer();
      abortRef.current?.abort();
    };
  }, []);

  const eligibility = bodyAnalysisEligibility({
    signedIn: Boolean(user),
    profileAge: profile?.age ?? null,
    capability: capabilities.bodyAnalysis,
    consentVersion: preferences?.consentVersion ?? null,
  });

  if (!loaded || accessLoading) {
    return <BodyScreen><BodyHeader title="Progress photos" /><BodyState colors={colors} title="Loading…" body="Preparing your check-in." /></BodyScreen>;
  }
  if (!available) {
    return <BodyScreen><BodyHeader title="Progress photos" /><BodyState colors={colors} title="Not available yet" body="Try again after the latest Trak update is enabled." /></BodyScreen>;
  }
  if (eligibility !== 'ready') {
    return (
      <BodyScreen>
        <BodyHeader title="Progress photos" />
        <BodyState
          colors={colors}
          title="Set up Body Analysis first"
          body="Review consent and training preferences before taking any photos."
          action="Open setup"
          onAction={() => router.replace('/body-analysis/setup')}
        />
      </BodyScreen>
    );
  }

  const currentPose = POSES[poseIndex];

  const openCamera = async () => {
    setError(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setCaptureState('camera');
  };

  const pickFromGallery = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPendingPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    setCaptureState('review');
  };

  const takePhoto = async () => {
    if (!cameraRef.current || taking) return;
    setTaking(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo || !mountedRef.current) return;
      setPendingPhoto({ uri: photo.uri, width: photo.width, height: photo.height });
      setCaptureState('review');
    } catch {
      if (mountedRef.current) setError('Could not take that photo. Please try again.');
    } finally {
      if (mountedRef.current) setTaking(false);
    }
  };

  const startTimer = () => {
    if (countdown != null || taking) return;
    let next = 5;
    setCountdown(next);
    timerRef.current = setInterval(() => {
      next -= 1;
      if (next <= 0) {
        stopTimer();
        void takePhoto();
      } else {
        setCountdown(next);
      }
    }, 1000);
  };

  const usePendingPhoto = () => {
    if (!pendingPhoto) return;
    const next = { ...photos, [currentPose.key]: pendingPhoto };
    setPhotos(next);
    setPendingPhoto(null);
    if (poseIndex === POSES.length - 1) setCaptureState('ready');
    else {
      setPoseIndex((value) => value + 1);
      setCaptureState('guide');
    }
  };

  const retakePose = (pose: BodyPose) => {
    const index = POSES.findIndex((item) => item.key === pose);
    setPoseIndex(index < 0 ? 0 : index);
    setPendingPhoto(null);
    setAnalysisResult(null);
    setCaptureState('guide');
  };

  const analyze = async () => {
    const complete = asCompletePhotos(photos);
    if (!complete || captureState === 'analyzing') return;
    setError(null);
    setCaptureState('analyzing');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const previousPhotos = latestScan ? await localPhotos(latestScan.id) : null;
      const response = await analyzeBodyPhotos({
        photos: complete,
        ...(waistParam && Number.isFinite(Number(waistParam)) ? { waistCm: Number(waistParam) } : {}),
        ...(latestScan ? { previousScanId: latestScan.id } : {}),
        ...(previousPhotos ? { previousPhotos } : {}),
        demo: { userId: user!.id, goal: profile!.goal, weightKg: profile!.weightKg },
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      setAnalysisResult(response.result);
      if (response.result.status === 'retake') {
        setCaptureState('retake');
        return;
      }
      if (response.result.status === 'unsupported') {
        setCaptureState('unsupported');
        return;
      }
      if (!response.scan) throw new Error('Your analysis could not be saved. Please try again.');
      // The server result is already durable. A device-storage failure must not
      // invite a retry that creates a duplicate cloud check-in.
      await persistLocalPhotos(response.scan.id, response.localPhotos).catch(() => {});
      await refresh();
      // The permission prompt appears at the moment the reminder has clear
      // context: immediately after a successful check-in.
      await scheduleBodyAnalysisRecheck(response.scan.id, response.scan.createdAt, true).catch(() => false);
      router.replace(`/body-analysis/result/${response.scan.id}`);
    } catch (caught: any) {
      if (caught?.name !== 'AbortError' && mountedRef.current) {
        setError(caught?.message ?? 'Body Analysis could not finish. Please try again.');
        setCaptureState('ready');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const useDemoPhotos = () => {
    const demoPhotos: SelectedBodyPhotos = {
      front: { uri: Image.resolveAssetSource(require('../../../assets/images/games/deck-protein.png')).uri },
      side: { uri: Image.resolveAssetSource(require('../../../assets/images/games/deck-everyday.png')).uri },
      back: { uri: Image.resolveAssetSource(require('../../../assets/images/games/deck-personal.png')).uri },
    };
    setPhotos(demoPhotos);
    setPoseIndex(2);
    setCaptureState('ready');
  };

  if (captureState === 'camera') {
    return (
      <View style={styles.cameraScreen}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraType} mode="picture" />
        <View style={styles.cameraShade} pointerEvents="none" />
        <View style={styles.cameraTop}>
          <Pressable accessibilityLabel="Close camera" onPress={() => { stopTimer(); setCaptureState('guide'); }} style={styles.cameraCircle}><Text style={styles.cameraIcon}>✕</Text></Pressable>
          <View style={styles.posePill}><Text style={styles.posePillText}>{currentPose.label} · {poseIndex + 1} of 3</Text></View>
          <Pressable accessibilityLabel="Switch camera" onPress={() => setCameraType((value) => value === 'back' ? 'front' : 'back')} style={styles.cameraCircle}><Text style={styles.cameraIcon}>↻</Text></Pressable>
        </View>
        <View style={styles.guideFrame} pointerEvents="none"><View style={styles.headGuide} /><View style={styles.bodyGuide} /></View>
        {countdown != null ? <Text accessibilityLiveRegion="assertive" style={styles.countdown}>{countdown}</Text> : null}
        <View style={styles.cameraBottom}>
          <Text style={styles.cameraCue}>{currentPose.cue}</Text>
          <View style={styles.shutterRow}>
            <Pressable accessibilityLabel="Start five second timer" onPress={startTimer} style={styles.timerButton}><Text style={styles.timerText}>5s</Text></Pressable>
            <Pressable accessibilityLabel={`Take ${currentPose.label.toLowerCase()} photo`} disabled={taking || countdown != null} onPress={() => void takePhoto()} style={styles.shutter}><View style={styles.shutterInner} /></Pressable>
            <View style={styles.timerButton} />
          </View>
        </View>
      </View>
    );
  }

  if (captureState === 'review' && pendingPhoto) {
    return (
      <BodyScreen>
        <BodyHeader title={`Review ${currentPose.label.toLowerCase()} photo`} subtitle="Make sure your full body is visible and the image is clear." />
        <Image source={{ uri: pendingPhoto.uri }} resizeMode="contain" style={[styles.reviewImage, { backgroundColor: colors.backgroundElement }]} />
        <View style={styles.twoButtons}>
          <BodyButton style={styles.flexButton} variant="ghost" title="Retake" onPress={() => { setPendingPhoto(null); setCaptureState('guide'); }} />
          <BodyButton style={styles.flexButton} title="Use photo" onPress={usePendingPhoto} />
        </View>
      </BodyScreen>
    );
  }

  if (captureState === 'retake' || captureState === 'unsupported') {
    const issues = analysisResult?.capture.issues ?? [];
    const firstBadPose = analysisResult?.capture.poseChecks.find((item) => !item.usable)?.pose ?? 'front';
    return (
      <BodyScreen>
        <BodyHeader title={captureState === 'retake' ? 'Let’s retake a photo' : 'We can’t analyze these photos'} />
        <BodyCard>
          <BodySectionTitle>{captureState === 'retake' ? 'A clearer photo will help' : 'No result was saved'}</BodySectionTitle>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {issues.join(' ') || 'Use clear, fully clothed adult progress photos with one person visible.'}
          </Text>
          {captureState === 'retake' ? <BodyButton title={`Retake ${firstBadPose}`} onPress={() => retakePose(firstBadPose)} /> : <BodyButton title="Start again" onPress={() => { setPhotos({}); setPoseIndex(0); setAnalysisResult(null); setCaptureState('guide'); }} />}
        </BodyCard>
      </BodyScreen>
    );
  }

  if (captureState === 'ready' || captureState === 'analyzing') {
    const complete = asCompletePhotos(photos)!;
    return (
      <BodyScreen>
        <BodyHeader title="Review your check-in" subtitle="These are the three photos that will be sent when you tap Analyze securely." />
        <View style={styles.previewRow}>
          {POSES.map((pose) => (
            <Pressable key={pose.key} onPress={() => retakePose(pose.key)} style={styles.previewWrap}>
              <Image source={{ uri: complete[pose.key].uri }} style={styles.previewImage} />
              <Text style={[styles.previewLabel, { color: colors.text }]}>{pose.label}</Text>
              <Text style={[styles.previewRetake, { color: colors.accent }]}>Retake</Text>
            </Pressable>
          ))}
        </View>
        <BodyCard>
          <BodySectionTitle>Private by design</BodySectionTitle>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {bodyAnalysisDemoEnabled
              ? 'Demo mode is local. These placeholders are not uploaded and the result is not an assessment.'
              : 'Sent securely for this analysis. Trak’s server does not store your photos. Device copies do not sync.'}
          </Text>
        </BodyCard>
        {error ? <Text selectable style={[styles.error, { color: Brand.over }]}>{error}</Text> : null}
        <BodyButton title={bodyAnalysisDemoEnabled ? 'Generate demo analysis' : 'Analyze securely'} loading={captureState === 'analyzing'} onPress={() => void analyze()} />
      </BodyScreen>
    );
  }

  return (
    <BodyScreen>
      <BodyHeader title={`${currentPose.label} photo`} subtitle={`${poseIndex + 1} of 3 · Keep the same clothing, lighting, and distance for every check-in.`} />
      <BodyCard style={styles.poseCard}>
        <View style={[styles.poseFigure, { backgroundColor: colors.greenTint }]}><Text style={[styles.poseFigureText, { color: colors.accentStrong }]}>{currentPose.label.slice(0, 1)}</Text></View>
        <BodySectionTitle>{currentPose.cue}</BodySectionTitle>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Wear fitted clothing, include head to feet, use even light, and keep the camera around waist height. Do not submit nudity.</Text>
      </BodyCard>
      {permission && !permission.granted && permission.canAskAgain === false ? (
        <BodyState colors={colors} title="Camera access is off" body="You can still complete every pose by choosing photos from your library." />
      ) : null}
      {error ? <Text selectable style={[styles.error, { color: Brand.over }]}>{error}</Text> : null}
      {bodyAnalysisDemoEnabled ? <BodyButton title="Use demo photos" variant="tonal" onPress={useDemoPhotos} /> : null}
      <BodyButton title="Use camera" onPress={openCamera} />
      <BodyButton title="Choose from library" variant="tonal" onPress={() => void pickFromGallery()} />
    </BodyScreen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21 },
  poseCard: { alignItems: 'center' },
  poseFigure: { width: 96, height: 160, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  poseFigureText: { fontSize: 42, fontWeight: '800' },
  error: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  cameraShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.12)' },
  cameraTop: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cameraCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  cameraIcon: { color: '#fff', fontSize: 20, fontWeight: '800' },
  posePill: { backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 99 },
  posePillText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  guideFrame: { position: 'absolute', top: 135, bottom: 215, left: '18%', right: '18%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', borderRadius: 120, alignItems: 'center' },
  headGuide: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)', marginTop: 15 },
  bodyGuide: { flex: 1, width: '58%', marginVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', borderRadius: 60 },
  countdown: { position: 'absolute', top: '41%', alignSelf: 'center', color: '#fff', fontSize: 84, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 10 },
  cameraBottom: { position: 'absolute', left: 24, right: 24, bottom: 42, alignItems: 'center', gap: Spacing.three },
  cameraCue: { color: '#fff', fontSize: 14, lineHeight: 19, fontWeight: '700', textAlign: 'center', textShadowColor: '#000', textShadowRadius: 5 },
  shutterRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  timerButton: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  timerText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', padding: 6 },
  shutterInner: { flex: 1, borderRadius: 32, borderWidth: 2, borderColor: '#000' },
  reviewImage: { width: '100%', height: 470, borderRadius: 20 },
  twoButtons: { flexDirection: 'row', gap: Spacing.two },
  flexButton: { flex: 1 },
  previewRow: { flexDirection: 'row', gap: Spacing.two },
  previewWrap: { flex: 1, alignItems: 'center', gap: Spacing.one },
  previewImage: { width: '100%', aspectRatio: 0.66, borderRadius: 14, backgroundColor: '#ddd' },
  previewLabel: { fontSize: 13, fontWeight: '800' },
  previewRetake: { fontSize: 12, fontWeight: '800' },
});
