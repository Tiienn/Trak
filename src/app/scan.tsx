import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { analyzeFood } from '@/lib/analyzeFood';
import { FoodAnalysis } from '@/lib/types';

const Brand = { green: '#22C55E', greenDark: '#16A34A' } as const;

type Phase = 'camera' | 'analyzing' | 'result' | 'error';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function runAnalysis(uri: string) {
    setPhotoUri(uri);
    setPhase('analyzing');
    try {
      const result = await analyzeFood(uri);
      setAnalysis(result);
      setPhase('result');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
      setPhase('error');
    }
  }

  async function onCapture() {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
      if (photo?.uri) await runAnalysis(photo.uri);
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Could not take the photo.');
      setPhase('error');
    }
  }

  async function onPickFromGallery() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        await runAnalysis(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert('Photos', e?.message ?? 'Could not open your photos. Please try again.');
    }
  }

  function reset() {
    setAnalysis(null);
    setPhotoUri(null);
    setErrorMsg('');
    setPhase('camera');
  }

  // Permission status still loading
  if (!permission) {
    return <View style={styles.black} />;
  }

  // Permission not yet granted
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>Trak needs your camera to scan meals.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={onPickFromGallery}>
          <Text style={styles.linkText}>Or choose a photo instead</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkTextMuted}>Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      {phase === 'camera' ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      ) : photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFill}
          blurRadius={phase === 'analyzing' ? 6 : 18}
        />
      ) : null}

      {/* Close button */}
      <SafeAreaView style={styles.topBar}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </SafeAreaView>

      {/* Camera controls */}
      {phase === 'camera' && (
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Text style={styles.cameraHint}>Point at your meal, then tap to scan</Text>
          <View style={styles.controlRow}>
            <Pressable style={styles.galleryBtn} onPress={onPickFromGallery}>
              <Text style={styles.galleryBtnText}>Gallery</Text>
            </Pressable>
            <Pressable style={styles.shutter} onPress={onCapture}>
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.controlSpacer} />
          </View>
        </SafeAreaView>
      )}

      {/* Analyzing */}
      {phase === 'analyzing' && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.analyzingText}>Analyzing your meal…</Text>
        </View>
      )}

      {/* Error */}
      {phase === 'error' && (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Hmm, that didn&apos;t work</Text>
          <Text style={styles.sheetBody}>{errorMsg}</Text>
          <Pressable style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {/* Result */}
      {phase === 'result' && analysis && (
        <ResultSheet
          analysis={analysis}
          onRetake={reset}
          onDone={() =>
            Alert.alert(
              'Nice!',
              'Saving to your daily log arrives in Phase 3 — for now, here is your estimate.',
              [{ text: 'OK', onPress: () => router.back() }]
            )
          }
        />
      )}
    </View>
  );
}

function MacroPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillValue}>{value}g</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
  );
}

function ResultSheet({
  analysis,
  onRetake,
  onDone,
}: {
  analysis: FoodAnalysis;
  onRetake: () => void;
  onDone: () => void;
}) {
  if (!analysis.isFood) {
    return (
      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>No food detected</Text>
        <Text style={styles.sheetBody}>
          {analysis.notes ?? "I couldn't find food in that photo."}
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onRetake}>
          <Text style={styles.primaryBtnText}>Try another photo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.resultSheet}>
      <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultTitle}>{analysis.title}</Text>
        <Text style={styles.confidenceText}>
          AI estimate · {Math.round(analysis.confidence * 100)}% confident
        </Text>

        <Text style={styles.bigCalories}>{analysis.total.calories.toLocaleString()}</Text>
        <Text style={styles.calLabel}>calories</Text>

        <View style={styles.macroRow}>
          <MacroPill label="Protein" value={analysis.total.protein_g} />
          <MacroPill label="Carbs" value={analysis.total.carbs_g} />
          <MacroPill label="Fat" value={analysis.total.fat_g} />
        </View>

        {analysis.items.length > 0 && (
          <View style={styles.itemsBox}>
            {analysis.items.map((it, i) => (
              <View
                key={i}
                style={[styles.itemRow, i === analysis.items.length - 1 && styles.itemRowLast]}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{it.name}</Text>
                  {!!it.quantity && <Text style={styles.itemQty}>{it.quantity}</Text>}
                </View>
                <Text style={styles.itemCals}>{it.calories} cal</Text>
              </View>
            ))}
          </View>
        )}

        {!!analysis.notes && <Text style={styles.notes}>{analysis.notes}</Text>}
      </ScrollView>

      <View style={styles.resultButtons}>
        <Pressable style={styles.secondaryBtn} onPress={onRetake}>
          <Text style={styles.secondaryBtnText}>Retake</Text>
        </Pressable>
        <Pressable style={styles.primaryBtnFlex} onPress={onDone}>
          <Text style={styles.primaryBtnText}>Add to today</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000000' },

  // Permission gate
  permissionWrap: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  permTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  permBody: { color: '#B0B4BA', fontSize: 15, textAlign: 'center', marginBottom: 8 },

  // Top bar
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16 },
  closeBtn: {
    marginTop: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  // Camera controls
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 16, gap: 16 },
  cameraHint: { color: '#ffffff', textAlign: 'center', fontSize: 15, fontWeight: '600' },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  controlSpacer: { width: 90 },
  galleryBtn: {
    width: 90,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  galleryBtnText: { color: '#ffffff', fontWeight: '700' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: Brand.green },

  // Analyzing
  centerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  analyzingText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },

  // Generic bottom sheet (error / no-food)
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111111' },
  sheetBody: { fontSize: 15, color: '#444444', lineHeight: 21 },

  // Result sheet
  resultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '78%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
  },
  resultScroll: { paddingHorizontal: 24, paddingBottom: 12, alignItems: 'center' },
  resultTitle: { fontSize: 24, fontWeight: '800', color: '#111111', textAlign: 'center' },
  confidenceText: { fontSize: 13, color: '#8A8F98', marginTop: 4 },
  bigCalories: { fontSize: 60, fontWeight: '800', color: '#111111', marginTop: 12, letterSpacing: -1 },
  calLabel: { fontSize: 15, color: '#8A8F98', marginTop: -4 },
  macroRow: { flexDirection: 'row', gap: 12, marginTop: 20, alignSelf: 'stretch' },
  macroPill: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  macroPillValue: { fontSize: 20, fontWeight: '800', color: '#111111' },
  macroPillLabel: { fontSize: 13, color: '#8A8F98', marginTop: 2 },
  itemsBox: { alignSelf: 'stretch', marginTop: 20, backgroundColor: '#F9FAFB', borderRadius: 16 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  itemRowLast: { borderBottomWidth: 0 },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111111' },
  itemQty: { fontSize: 13, color: '#8A8F98', marginTop: 2 },
  itemCals: { fontSize: 15, fontWeight: '700', color: '#111111' },
  notes: { fontSize: 13, color: '#8A8F98', marginTop: 16, textAlign: 'center', fontStyle: 'italic' },

  resultButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
  },

  // Buttons
  primaryBtn: {
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  primaryBtnFlex: {
    flex: 1,
    backgroundColor: Brand.green,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryBtnText: { color: '#111111', fontSize: 16, fontWeight: '700' },
  linkBtn: { paddingVertical: 8 },
  linkText: { color: Brand.green, fontSize: 15, fontWeight: '600' },
  linkTextMuted: { color: '#8A8F98', fontSize: 15 },
});
