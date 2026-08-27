import type { BodyPose } from './body-analysis';

export type BodyPhotoSet = Record<BodyPose, string>;

type Manifest = Record<string, BodyPhotoSet>;

export type BodyPhotoDependencies = {
  documentDirectory: string | null;
  readManifest: (key: string) => Promise<string | null>;
  writeManifest: (key: string, value: string) => Promise<void>;
  removeManifest: (key: string) => Promise<void>;
  makeDirectory: (path: string) => Promise<void>;
  copy: (from: string, to: string) => Promise<void>;
  move: (from: string, to: string) => Promise<void>;
  remove: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
};

function safeSegment(value: string): string {
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(value)) throw new Error('Invalid local photo path.');
  return value;
}

function manifestKey(userId: string): string {
  return `trak.bodyPhotos.v1.${safeSegment(userId)}`;
}

function parseManifest(value: string | null): Manifest {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function createBodyPhotoRepository(deps: BodyPhotoDependencies) {
  const rootFor = (userId: string) => {
    if (!deps.documentDirectory) throw new Error('Private device storage is unavailable.');
    return `${deps.documentDirectory}body-analysis/${safeSegment(userId)}/`;
  };

  async function read(userId: string): Promise<Manifest> {
    return parseManifest(await deps.readManifest(manifestKey(userId)));
  }

  async function persist(userId: string, scanId: string, photos: BodyPhotoSet): Promise<BodyPhotoSet> {
    const root = rootFor(userId);
    const safeScanId = safeSegment(scanId);
    const target = `${root}${safeScanId}/`;
    const staging = `${root}.tmp-${safeScanId}-${Date.now()}-${Math.random().toString(16).slice(2)}/`;
    const saved = {
      front: `${target}front.jpg`,
      side: `${target}side.jpg`,
      back: `${target}back.jpg`,
    } satisfies BodyPhotoSet;

    await deps.makeDirectory(root);
    await deps.remove(staging).catch(() => {});
    await deps.makeDirectory(staging);
    try {
      for (const pose of ['front', 'side', 'back'] as const) {
        await deps.copy(photos[pose], `${staging}${pose}.jpg`);
      }
      for (const pose of ['front', 'side', 'back'] as const) {
        if (!(await deps.exists(`${staging}${pose}.jpg`))) throw new Error('A local photo copy is missing.');
      }
      await deps.remove(target).catch(() => {});
      await deps.move(staging, target);
      for (const pose of ['front', 'side', 'back'] as const) {
        if (!(await deps.exists(saved[pose]))) throw new Error('A saved local photo is missing.');
      }
      const manifest = await read(userId);
      manifest[safeScanId] = saved;
      await deps.writeManifest(manifestKey(userId), JSON.stringify(manifest));
      return saved;
    } catch (error) {
      await deps.remove(staging).catch(() => {});
      await deps.remove(target).catch(() => {});
      throw error;
    }
  }

  async function load(userId: string, scanId: string): Promise<BodyPhotoSet | null> {
    const manifest = await read(userId);
    const photos = manifest[safeSegment(scanId)];
    if (!photos) return null;
    const complete = await Promise.all(
      (['front', 'side', 'back'] as const).map((pose) => deps.exists(photos[pose])),
    );
    return complete.every(Boolean) ? photos : null;
  }

  async function deleteScan(userId: string, scanId: string): Promise<void> {
    const manifest = await read(userId);
    const safeScanId = safeSegment(scanId);
    await deps.remove(`${rootFor(userId)}${safeScanId}/`).catch(() => {});
    delete manifest[safeScanId];
    await deps.writeManifest(manifestKey(userId), JSON.stringify(manifest));
  }

  async function deleteAll(userId: string): Promise<void> {
    await deps.remove(rootFor(userId)).catch(() => {});
    await deps.removeManifest(manifestKey(userId)).catch(() => {});
  }

  return { persist, load, deleteScan, deleteAll };
}
