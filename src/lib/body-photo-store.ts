import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { createBodyPhotoRepository } from './body-photo-repository';

export type { BodyPhotoDependencies, BodyPhotoSet } from './body-photo-repository';
export { createBodyPhotoRepository } from './body-photo-repository';

export const bodyPhotoRepository = createBodyPhotoRepository({
  // Cache files remain app-private and are excluded from device backups. The
  // OS may reclaim them, which is why load() treats a missing set as normal and
  // the written cloud result remains independently usable.
  documentDirectory: FileSystem.cacheDirectory,
  readManifest: (key) => AsyncStorage.getItem(key),
  writeManifest: (key, value) => AsyncStorage.setItem(key, value),
  removeManifest: (key) => AsyncStorage.removeItem(key),
  makeDirectory: (path) =>
    FileSystem.makeDirectoryAsync(path, { intermediates: true }).catch((error) => {
      throw error;
    }),
  copy: (from, to) => FileSystem.copyAsync({ from, to }),
  move: (from, to) => FileSystem.moveAsync({ from, to }),
  remove: (path) => FileSystem.deleteAsync(path, { idempotent: true }),
  exists: async (path) => (await FileSystem.getInfoAsync(path)).exists,
});
