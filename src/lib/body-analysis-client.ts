import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  normalizeBodyAnalysisResult,
  type BodyAnalysisResult,
  type BodyPose,
  type BodyScan,
} from './body-analysis';
import type { BodyPhotoSet } from './body-photo-repository';
import {
  bodyAnalysisDemoEnabled,
  createBodyAnalysisDemoScan,
  waitForBodyAnalysisDemo,
} from './body-analysis-demo';
import type { Goal } from './types';
import { supabase } from './supabase';

export type SelectedBodyPhoto = {
  uri: string;
  width?: number;
  height?: number;
};

export type SelectedBodyPhotos = Record<BodyPose, SelectedBodyPhoto>;

async function bodyAnalysisError(error: any): Promise<string> {
  try {
    if (error?.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    }
  } catch {
    // Fall through to the transport message.
  }
  return error?.message ?? 'Could not reach Body Analysis. Check your connection and try again.';
}

function aborted(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

function mapBodyScan(row: any): BodyScan {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    createdAt: String(row.created_at),
    previousScanId: row.previous_scan_id ? String(row.previous_scan_id) : undefined,
    goalSnapshot: row.goal_snapshot,
    weightKg: row.weight_kg_snapshot == null ? undefined : Number(row.weight_kg_snapshot),
    waistCm: row.waist_cm_snapshot == null ? undefined : Number(row.waist_cm_snapshot),
    nutritionEvidence:
      row.nutrition_evidence_snapshot && typeof row.nutrition_evidence_snapshot === 'object'
        ? row.nutrition_evidence_snapshot
        : {},
    result: normalizeBodyAnalysisResult(row.result),
    schemaVersion: Number(row.schema_version) || 1,
    modelVersion: String(row.model_version ?? ''),
    promptVersion: String(row.prompt_version ?? ''),
  };
}

async function preparePhoto(photo: SelectedBodyPhoto) {
  let width = Number(photo.width) || 0;
  let height = Number(photo.height) || 0;
  if (!(width > 0 && height > 0)) {
    const probe = await ImageManipulator.manipulate(photo.uri).renderAsync();
    width = probe.width;
    height = probe.height;
  }
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(width, height) > 1280) {
    if (width >= height) context.resize({ width: 1280, height: null });
    else context.resize({ width: null, height: 1280 });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.72,
    base64: true,
  });
  if (!saved.base64 || saved.base64.length > 2_400_000) {
    throw new Error('One photo is too large to analyze. Try a clearer, more tightly framed photo.');
  }
  return { uri: saved.uri, base64: saved.base64 };
}

export async function analyzeBodyPhotos(input: {
  photos: SelectedBodyPhotos;
  waistCm?: number;
  previousScanId?: string;
  previousPhotos?: BodyPhotoSet;
  demo?: { userId: string; goal: Goal; weightKg?: number };
  signal?: AbortSignal;
}): Promise<{
  result: BodyAnalysisResult;
  scan: BodyScan | null;
  localPhotos: BodyPhotoSet;
}> {
  const prepared = await Promise.all(
    (['front', 'side', 'back'] as const).map(async (pose) => ({
      pose,
      ...(await preparePhoto(input.photos[pose])),
    })),
  );
  if (prepared.reduce((total, photo) => total + photo.base64.length, 0) > 6_000_000) {
    throw new Error('The three photos are too large to analyze. Try clearer, more tightly framed photos.');
  }
  if (input.signal?.aborted) throw aborted();

  if (bodyAnalysisDemoEnabled) {
    if (!input.demo) throw new Error('The local Body Analysis demo is missing its profile context.');
    await waitForBodyAnalysisDemo(input.signal);
    const scan = await createBodyAnalysisDemoScan({
      ...input.demo,
      ...(input.waistCm ? { waistCm: input.waistCm } : {}),
      ...(input.previousScanId ? { previousScanId: input.previousScanId } : {}),
    });
    return {
      result: scan.result,
      scan,
      localPhotos: Object.fromEntries(
        prepared.map(({ pose, uri }) => [pose, uri]),
      ) as BodyPhotoSet,
    };
  }

  const previousPrepared = input.previousPhotos
    ? await Promise.all(
        (['front', 'side', 'back'] as const).map(async (pose) => ({
          pose,
          ...(await preparePhoto({ uri: input.previousPhotos![pose] })),
        })),
      )
    : null;
  if (input.signal?.aborted) throw aborted();

  const { data, error } = await supabase.functions.invoke('analyze-body', {
    body: {
      images: prepared.map(({ pose, base64 }) => ({ pose, mimeType: 'image/jpeg', base64 })),
      ...(input.waistCm ? { waistCm: input.waistCm } : {}),
      ...(input.previousScanId ? { previousScanId: input.previousScanId } : {}),
      ...(previousPrepared
        ? {
            previousImages: previousPrepared.map(({ pose, base64 }) => ({
              pose,
              mimeType: 'image/jpeg',
              base64,
            })),
          }
        : {}),
    },
    signal: input.signal,
  });
  if (input.signal?.aborted) throw aborted();
  if (error) throw new Error(await bodyAnalysisError(error));
  if (data?.error) throw new Error(String(data.error));
  const result = normalizeBodyAnalysisResult(data?.result);
  const scan = data?.scan ? mapBodyScan(data.scan) : null;
  if (result.status === 'usable' && !scan) {
    throw new Error('The analysis finished but was not saved. Please try again.');
  }
  return {
    result,
    scan,
    localPhotos: Object.fromEntries(
      prepared.map(({ pose, uri }) => [pose, uri]),
    ) as BodyPhotoSet,
  };
}

export { mapBodyScan };
