import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Colors, type ThemeColors } from '@/constants/theme';
import { BarcodeProduct, barcodeToAnalysis, lookupBarcode } from '@/lib/barcode';
import { useMeals } from '@/lib/store';
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] as const;

type Phase = 'scanning' | 'looking' | 'result' | 'notfound' | 'error';

function Macro({ label, value, colors }: { label: string; value: number; colors: ThemeColors }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.macroPillValue, { color: colors.text }]}>{value}g</Text>
      <Text style={[styles.macroPillLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

export default function BarcodeScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const [permission, requestPermission] = useCameraPermissions();
  const { addMeal } = useMeals();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [servings, setServings] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const busyRef = useRef(false); // guard against the camera firing repeatedly

  async function handleCode(code: string) {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('looking');
    try {
      const p = await lookupBarcode(code);
      if (!p) {
        setPhase('notfound');
        return;
      }
      setProduct(p);
      setServings(1);
      setPhase('result');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Something went wrong. Please try again.');
      setPhase('error');
    }
  }

  async function onPickBarcodePhoto() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const results = await scanFromURLAsync(res.assets[0].uri, [...BARCODE_TYPES]);
      if (!results?.length) {
        setErrorMsg('No barcode found in that photo. Try a clearer one.');
        setPhase('error');
        return;
      }
      await handleCode(results[0].data);
    } catch (e: any) {
      Alert.alert('Barcode', e?.message ?? 'Could not read that photo.');
    }
  }

  function reset() {
    busyRef.current = false;
    setProduct(null);
    setErrorMsg('');
    setPhase('scanning');
  }

  async function addAndClose() {
    if (!product || saving) return; // guard against double taps
    setSaving(true);
    try {
      await addMeal(barcodeToAnalysis(product, servings));
      router.back();
    } catch (e: any) {
      Alert.alert('Not saved', e?.message ?? 'Could not save your meal. Please try again.');
      setSaving(false);
    }
  }

  if (!permission) return <View style={styles.black} />;

  // Camera permission is only needed for live scanning; the photo path works regardless.
  if (phase === 'scanning' && !permission.granted) {
    return (
      <SafeAreaView style={styles.permWrap}>
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>Trak needs your camera to scan barcodes.</Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={onPickBarcodePhoto}>
          <Text style={styles.link}>Or choose a barcode photo</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.back()}>
          <Text style={styles.linkMuted}>Close</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      {phase === 'scanning' && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={({ data }) => handleCode(data)}
        />
      )}

      {phase === 'scanning' && (
        <View style={styles.reticleWrap} pointerEvents="none">
          <View style={styles.reticle} />
        </View>
      )}

      <SafeAreaView style={styles.topBar}>
        <Pressable style={styles.closeBtn} onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </SafeAreaView>

      {phase === 'scanning' && (
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Text style={styles.hint}>Point at a barcode</Text>
          <Pressable style={styles.galleryBtn} onPress={onPickBarcodePhoto}>
            <Text style={styles.galleryBtnText}>Choose a photo</Text>
          </Pressable>
        </SafeAreaView>
      )}

      {phase === 'looking' && (
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.analyzingText}>Looking up product…</Text>
        </View>
      )}

      {phase === 'notfound' && (
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Product not found</Text>
          <Text style={[styles.sheetBody, { color: colors.textSecondary }]}>
            That barcode isn&apos;t in the Open Food Facts database yet. Try photo‑scanning the meal
            instead.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Scan again</Text>
          </Pressable>
        </View>
      )}

      {phase === 'error' && (
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            Hmm, that didn&apos;t work
          </Text>
          <Text style={[styles.sheetBody, { color: colors.textSecondary }]}>{errorMsg}</Text>
          <Pressable style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {phase === 'result' && product && (
        <View style={[styles.resultSheet, { backgroundColor: colors.background }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          {!!product.brand && (
            <Text style={[styles.resultBrand, { color: colors.textSecondary }]}>
              {product.brand}
            </Text>
          )}
          <Text style={[styles.perLabel, { color: colors.textSecondary }]}>{product.perLabel}</Text>

          <View style={styles.qtyRow}>
            <Text style={[styles.qtyLabel, { color: colors.text }]}>Servings</Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={() => setServings((s) => Math.max(0.5, Math.round((s - 0.5) * 2) / 2))}>
                <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
              </Pressable>
              <Text style={[styles.qtyValue, { color: colors.text }]}>{servings}</Text>
              <Pressable
                style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}
                onPress={() => setServings((s) => Math.round((s + 0.5) * 2) / 2)}>
                <Text style={[styles.stepBtnText, { color: colors.text }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.bigCalories, { color: colors.text }]}>
            {Math.round(product.calories * servings).toLocaleString()}
          </Text>
          <Text style={[styles.calLabel, { color: colors.textSecondary }]}>calories</Text>

          <View style={styles.macroRow}>
            <Macro label="Protein" value={Math.round(product.protein_g * servings)} colors={colors} />
            <Macro label="Carbs" value={Math.round(product.carbs_g * servings)} colors={colors} />
            <Macro label="Fat" value={Math.round(product.fat_g * servings)} colors={colors} />
          </View>

          <View style={styles.resultButtons}>
            <Pressable
              style={[styles.secondaryBtn, { backgroundColor: colors.backgroundElement }]}
              onPress={reset}
              disabled={saving}>
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Rescan</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtnFlex, saving && styles.btnBusy]}
              onPress={addAndClose}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Add to today</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000000' },

  permWrap: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  permTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  permBody: { color: '#B0B4BA', fontSize: 15, textAlign: 'center', marginBottom: 8 },

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

  reticleWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  reticle: {
    width: 270,
    height: 160,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },

  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: 24, gap: 16, alignItems: 'center' },
  hint: { color: '#ffffff', textAlign: 'center', fontSize: 15, fontWeight: '600' },
  galleryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  galleryBtnText: { color: '#ffffff', fontWeight: '700' },

  centerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 16 },
  analyzingText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },

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

  resultSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
    alignItems: 'center',
  },
  resultTitle: { fontSize: 22, fontWeight: '800', color: '#111111', textAlign: 'center' },
  resultBrand: { fontSize: 14, color: '#8A8F98', marginTop: 2 },
  perLabel: { fontSize: 13, color: '#8A8F98', marginTop: 4 },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 16,
  },
  qtyLabel: { fontSize: 16, fontWeight: '600', color: '#111111' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, fontWeight: '700', color: '#111111' },
  qtyValue: { fontSize: 18, fontWeight: '800', color: '#111111', minWidth: 34, textAlign: 'center' },

  bigCalories: { fontSize: 52, fontWeight: '800', color: '#111111', marginTop: 16, letterSpacing: -1 },
  calLabel: { fontSize: 15, color: '#8A8F98', marginTop: -4 },
  macroRow: { flexDirection: 'row', gap: 12, marginTop: 18, alignSelf: 'stretch' },
  macroPill: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  macroPillValue: { fontSize: 20, fontWeight: '800', color: '#111111' },
  macroPillLabel: { fontSize: 13, color: '#8A8F98', marginTop: 2 },

  resultButtons: { flexDirection: 'row', gap: 12, marginTop: 22, alignSelf: 'stretch' },

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
  btnBusy: { opacity: 0.7 },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  secondaryBtnText: { color: '#111111', fontSize: 16, fontWeight: '700' },
  linkBtn: { paddingVertical: 8 },
  link: { color: Brand.green, fontSize: 15, fontWeight: '600' },
  linkMuted: { color: '#8A8F98', fontSize: 15 },
});
