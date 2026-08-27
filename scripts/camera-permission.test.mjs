import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const permissionScreens = [
  { path: 'src/app/scan.tsx', action: /onPress={requestPermission}/ },
  { path: 'src/app/barcode.tsx', action: /onPress={requestPermission}/ },
  { path: 'src/app/body-analysis/capture.tsx', action: /onPress={openCamera}/ },
];

test('camera denial screens respect the user decision', async () => {
  for (const { path, action } of permissionScreens) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

    assert.doesNotMatch(source, /Linking\.openSettings\s*\(/, `${path} must not open Settings`);
    assert.doesNotMatch(source, /Open settings/i, `${path} must not direct denied users to Settings`);
    assert.doesNotMatch(source, /Enable it in Settings/i, `${path} must not pressure denied users`);
    assert.match(source, /canAskAgain === false/, `${path} must distinguish a blocked permission`);
    assert.match(source, action, `${path} must request only from an explicit user action`);
  }
});
