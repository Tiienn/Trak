import assert from 'node:assert/strict';
import test from 'node:test';

import { createBodyPhotoRepository } from '../src/lib/body-photo-repository.ts';

function memoryDeps({ failCopyAt = 0 } = {}) {
  const files = new Set();
  const manifests = new Map();
  let copies = 0;
  return {
    files,
    manifests,
    deps: {
      documentDirectory: 'file:///docs/',
      async readManifest(key) { return manifests.get(key) ?? null; },
      async writeManifest(key, value) { manifests.set(key, value); },
      async removeManifest(key) { manifests.delete(key); },
      async makeDirectory() {},
      async copy(from, to) {
        copies += 1;
        if (copies === failCopyAt) throw new Error('copy failed');
        files.add(to);
      },
      async move(from, to) {
        for (const file of [...files]) {
          if (file.startsWith(from)) {
            files.delete(file);
            files.add(`${to}${file.slice(from.length)}`);
          }
        }
      },
      async remove(path) {
        for (const file of [...files]) if (file.startsWith(path)) files.delete(file);
      },
      async exists(path) { return files.has(path); },
    },
  };
}

const photos = { front: 'file:///cache/front.jpg', side: 'file:///cache/side.jpg', back: 'file:///cache/back.jpg' };

test('photo manifests are isolated per user and verified against the file system', async () => {
  const state = memoryDeps();
  const repo = createBodyPhotoRepository(state.deps);
  await repo.persist('user-a', 'scan-a', photos);
  assert.ok(await repo.load('user-a', 'scan-a'));
  assert.equal(await repo.load('user-b', 'scan-a'), null);

  const saved = await repo.load('user-a', 'scan-a');
  state.files.delete(saved.front);
  assert.equal(await repo.load('user-a', 'scan-a'), null);
});

test('a partial write never creates a complete manifest', async () => {
  const state = memoryDeps({ failCopyAt: 2 });
  const repo = createBodyPhotoRepository(state.deps);
  await assert.rejects(() => repo.persist('user-a', 'scan-a', photos));
  assert.equal(await repo.load('user-a', 'scan-a'), null);
  assert.equal(state.manifests.size, 0);
});

test('local-only scan and per-user delete paths remove files and manifest entries', async () => {
  const state = memoryDeps();
  const repo = createBodyPhotoRepository(state.deps);
  await repo.persist('user-a', 'scan-a', photos);
  await repo.persist('user-a', 'scan-b', photos);
  await repo.persist('user-b', 'scan-c', photos);
  await repo.deleteScan('user-a', 'scan-a');
  assert.equal(await repo.load('user-a', 'scan-a'), null);
  assert.ok(await repo.load('user-a', 'scan-b'));
  await repo.deleteAll('user-a');
  assert.equal(await repo.load('user-a', 'scan-b'), null);
  assert.ok(await repo.load('user-b', 'scan-c'));
});
