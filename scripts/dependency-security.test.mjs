import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('Expo Router query parsing keeps its CommonJS contract and bounds malformed URI work', () => {
  const script = `
    const assert = require('node:assert/strict');
    const queryString = require('query-string');
    assert.deepEqual(
      { ...queryString.parse('screen=progress&focus=chest') },
      { focus: 'chest', screen: 'progress' },
    );
    assert.equal(queryString.parse('meal=rice+and+chicken').meal, 'rice and chicken');
    assert.equal(queryString.parse('value=%E0%A4%A').value, '%E0%A4%A');
    const malformed = 'value=' + '%C0'.repeat(50_000) + '%';
    assert.equal(typeof queryString.parse(malformed).value, 'string');
  `;
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 2_000,
  });

  assert.equal(result.error?.code, undefined, 'malformed URI parsing exceeded the 2-second bound');
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
