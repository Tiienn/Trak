import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from './auth';
import { mapBodyScan } from './body-analysis-client';
import {
  BODY_ANALYSIS_CONSENT_VERSION,
  BODY_ANALYSIS_PREFERENCES_VERSION,
  sanitizeBodyText,
  type BodyAnalysisPreferences,
  type BodyScan,
} from './body-analysis';
import { bodyPhotoRepository } from './body-photo-store';
import type { BodyPhotoSet } from './body-photo-repository';
import {
  bodyAnalysisDemoEnabled,
  deleteAllBodyAnalysisDemo,
  deleteBodyAnalysisDemoScan,
  loadBodyAnalysisDemo,
  reportBodyAnalysisDemo,
  saveBodyAnalysisDemoPreferences,
} from './body-analysis-demo';
import { cancelBodyAnalysisRecheck, scheduleBodyAnalysisRecheck } from './reminders';
import { supabase } from './supabase';

type PreferencesInput = Omit<
  BodyAnalysisPreferences,
  'userId' | 'consentAcceptedAt' | 'createdAt' | 'updatedAt'
>;

type BodyAnalysisContextValue = {
  loaded: boolean;
  available: boolean;
  loadError: boolean;
  preferences: BodyAnalysisPreferences | null;
  scans: BodyScan[];
  latestScan: BodyScan | null;
  refresh: () => Promise<void>;
  savePreferences: (input: PreferencesInput) => Promise<void>;
  localPhotos: (scanId: string) => Promise<BodyPhotoSet | null>;
  persistLocalPhotos: (scanId: string, photos: BodyPhotoSet) => Promise<void>;
  deleteLocalPhotos: (scanId: string) => Promise<void>;
  deleteScan: (scanId: string) => Promise<void>;
  deleteAllBodyData: () => Promise<void>;
  reportAnalysis: (scanId: string, category: 'inaccurate' | 'unsafe' | 'other', note?: string) => Promise<void>;
};

const BodyAnalysisContext = createContext<BodyAnalysisContextValue | null>(null);

function mapPreferences(row: any): BodyAnalysisPreferences {
  return {
    userId: String(row.user_id),
    consentVersion: row.consent_version == null ? null : Number(row.consent_version),
    consentAcceptedAt: row.consent_accepted_at ? String(row.consent_accepted_at) : null,
    trainingLocation: row.training_location,
    experience: row.experience,
    daysAvailable: Number(row.days_available),
    equipment: Array.isArray(row.equipment) ? row.equipment.map(String) : [],
    limitationsNote: row.limitations_note ? String(row.limitations_note) : undefined,
    preferencesVersion: Number(row.preferences_version) || 1,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function BodyAnalysisProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [available, setAvailable] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [preferences, setPreferences] = useState<BodyAnalysisPreferences | null>(null);
  const [scans, setScans] = useState<BodyScan[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setScans([]);
      setAvailable(true);
      setLoadError(false);
      setLoaded(true);
      return;
    }
    if (bodyAnalysisDemoEnabled) {
      const demo = await loadBodyAnalysisDemo(user.id);
      setPreferences(demo.preferences);
      setScans(demo.scans);
      setAvailable(true);
      setLoadError(false);
      setLoaded(true);
      return;
    }
    try {
      const [preferencesRes, scansRes] = await Promise.all([
        supabase.from('body_analysis_preferences').select('*').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('body_scans')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);
      if (preferencesRes.error || scansRes.error) {
        setAvailable(false);
        setLoadError(true);
        setLoaded(true);
        return;
      }
      setPreferences(preferencesRes.data ? mapPreferences(preferencesRes.data) : null);
      setScans((scansRes.data ?? []).flatMap((row) => {
        try {
          return [mapBodyScan(row)];
        } catch {
          return [];
        }
      }));
      setAvailable(true);
      setLoadError(false);
      setLoaded(true);
    } catch {
      setAvailable(false);
      setLoadError(true);
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoaded(false);
      void refresh();
    });
    return () => { active = false; };
  }, [refresh]);

  const savePreferences = useCallback(async (input: PreferencesInput) => {
    if (!user) throw new Error('Please sign in first.');
    const equipment = input.equipment
      .slice(0, 12)
      .map((item) => sanitizeBodyText(item, 60))
      .filter(Boolean);
    const limitationsNote = sanitizeBodyText(input.limitationsNote, 500);
    const acceptedAt = new Date().toISOString();
    if (bodyAnalysisDemoEnabled) {
      const demoPreferences: BodyAnalysisPreferences = {
        userId: user.id,
        consentVersion: input.consentVersion ?? BODY_ANALYSIS_CONSENT_VERSION,
        consentAcceptedAt: acceptedAt,
        trainingLocation: input.trainingLocation,
        experience: input.experience,
        daysAvailable: Math.max(2, Math.min(6, Math.round(input.daysAvailable))),
        equipment,
        ...(limitationsNote ? { limitationsNote } : {}),
        preferencesVersion: BODY_ANALYSIS_PREFERENCES_VERSION,
        createdAt: preferences?.createdAt ?? acceptedAt,
        updatedAt: acceptedAt,
      };
      await saveBodyAnalysisDemoPreferences(demoPreferences);
      setPreferences(demoPreferences);
      return;
    }
    const { data, error } = await supabase
      .from('body_analysis_preferences')
      .upsert({
        user_id: user.id,
        consent_version: input.consentVersion ?? BODY_ANALYSIS_CONSENT_VERSION,
        consent_accepted_at: acceptedAt,
        training_location: input.trainingLocation,
        experience: input.experience,
        days_available: Math.max(2, Math.min(6, Math.round(input.daysAvailable))),
        equipment,
        limitations_note: limitationsNote || null,
        preferences_version: BODY_ANALYSIS_PREFERENCES_VERSION,
        updated_at: acceptedAt,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error('Could not save Body Analysis preferences. Please try again.');
    setPreferences(mapPreferences(data));
  }, [preferences?.createdAt, user]);

  const localPhotos = useCallback(async (scanId: string) => {
    if (!user) return null;
    return bodyPhotoRepository.load(user.id, scanId);
  }, [user]);

  const persistLocalPhotos = useCallback(async (scanId: string, photos: BodyPhotoSet) => {
    if (!user) throw new Error('Please sign in first.');
    await bodyPhotoRepository.persist(user.id, scanId, photos);
  }, [user]);

  const deleteLocalPhotos = useCallback(async (scanId: string) => {
    if (!user) return;
    await bodyPhotoRepository.deleteScan(user.id, scanId);
  }, [user]);

  const deleteScan = useCallback(async (scanId: string) => {
    if (!user) return;
    const remaining = scans.filter((scan) => scan.id !== scanId);
    if (bodyAnalysisDemoEnabled) {
      await deleteBodyAnalysisDemoScan(user.id, scanId);
      await bodyPhotoRepository.deleteScan(user.id, scanId).catch(() => {});
      setScans(remaining);
      if (scans[0]?.id === scanId) {
        if (remaining[0]) await scheduleBodyAnalysisRecheck(remaining[0].id, remaining[0].createdAt, false).catch(() => false);
        else await cancelBodyAnalysisRecheck(scanId).catch(() => {});
      }
      return;
    }
    const { error } = await supabase
      .from('body_scans')
      .delete()
      .eq('id', scanId)
      .eq('user_id', user.id);
    if (error) throw new Error('Could not delete this check-in. Please try again.');
    await bodyPhotoRepository.deleteScan(user.id, scanId).catch(() => {});
    setScans(remaining);
    if (scans[0]?.id === scanId) {
      if (remaining[0]) await scheduleBodyAnalysisRecheck(remaining[0].id, remaining[0].createdAt, false).catch(() => false);
      else await cancelBodyAnalysisRecheck(scanId).catch(() => {});
    }
  }, [scans, user]);

  const deleteAllBodyData = useCallback(async () => {
    if (!user) return;
    if (bodyAnalysisDemoEnabled) {
      await deleteAllBodyAnalysisDemo(user.id);
      await bodyPhotoRepository.deleteAll(user.id).catch(() => {});
      await cancelBodyAnalysisRecheck().catch(() => {});
      setScans([]);
      setPreferences(null);
      return;
    }
    const scansRes = await supabase.from('body_scans').delete().eq('user_id', user.id);
    if (scansRes.error) throw new Error('Could not delete Body Analysis results. Please try again.');
    const preferencesRes = await supabase
      .from('body_analysis_preferences')
      .delete()
      .eq('user_id', user.id);
    if (preferencesRes.error) throw new Error('Could not delete Body Analysis preferences. Please try again.');
    await bodyPhotoRepository.deleteAll(user.id).catch(() => {});
    await cancelBodyAnalysisRecheck().catch(() => {});
    setScans([]);
    setPreferences(null);
  }, [user]);

  const reportAnalysis = useCallback(async (
    scanId: string,
    category: 'inaccurate' | 'unsafe' | 'other',
    note?: string,
  ) => {
    if (!user) throw new Error('Please sign in first.');
    if (bodyAnalysisDemoEnabled) {
      await reportBodyAnalysisDemo(user.id, scanId, category);
      return;
    }
    const { error } = await supabase.from('body_analysis_reports').insert({
      user_id: user.id,
      scan_id: scanId,
      category,
      note: sanitizeBodyText(note, 500) || null,
    });
    if (error) throw new Error('Could not send this report. Please try again.');
  }, [user]);

  const value = useMemo<BodyAnalysisContextValue>(() => ({
    loaded,
    available,
    loadError,
    preferences,
    scans,
    latestScan: scans[0] ?? null,
    refresh,
    savePreferences,
    localPhotos,
    persistLocalPhotos,
    deleteLocalPhotos,
    deleteScan,
    deleteAllBodyData,
    reportAnalysis,
  }), [
    available,
    deleteAllBodyData,
    deleteLocalPhotos,
    deleteScan,
    loadError,
    loaded,
    localPhotos,
    persistLocalPhotos,
    preferences,
    refresh,
    reportAnalysis,
    savePreferences,
    scans,
  ]);

  return <BodyAnalysisContext.Provider value={value}>{children}</BodyAnalysisContext.Provider>;
}

export function useBodyAnalysis(): BodyAnalysisContextValue {
  const value = useContext(BodyAnalysisContext);
  if (!value) throw new Error('useBodyAnalysis must be used inside BodyAnalysisProvider');
  return value;
}
