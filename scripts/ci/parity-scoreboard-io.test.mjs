import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  readJson,
  readRows,
  parseRows,
  sha256,
  verifySha256,
  loadReference,
  compareText,
} from './parity-scoreboard-io.cjs';

test('artifact ordering is case-sensitive and independent of machine locale', () => {
  const values = ['é', 'z', 'a', 'Z', 'A', ''];
  assert.deepEqual(values.sort(compareText), ['', 'A', 'Z', 'a', 'z', 'é']);
  assert.equal(compareText('same', 'same'), 0);
});

test('committed reference loading verifies compressed, payload and sidecar bytes without external tools', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reference-bytes-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const bytes = Buffer.from('{"path":"meks/a.mtf"}\n');
  const sidecar = Buffer.from('{"provenance":true}\r\n');
  const compressed = gzipSync(bytes);
  fs.writeFileSync(path.join(root, 'reference.gz'), compressed);
  fs.writeFileSync(path.join(root, 'reference.provenance.json'), sidecar);
  const artifact = {
    file: 'reference.gz',
    gzipSha256: sha256(compressed),
    sha256: sha256(bytes),
    sidecar: 'reference.provenance.json',
    sidecarSha256: sha256(sidecar),
  };
  assert.deepEqual(loadReference(root, artifact), { bytes, sidecar });
  for (const key of ['gzipSha256', 'sha256', 'sidecarSha256'])
    assert.throws(
      () => loadReference(root, { ...artifact, [key]: '0'.repeat(64) }),
      /SHA-256 mismatch/,
    );
});

test('shared artifact I/O preserves Unicode, NDJSON ordering, and strict JSON errors', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'scoreboard-io-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const file = path.join(out, 'rows.jsonl');
  fs.writeFileSync(file, '{"name":"Dökkálfar"}\r\n\r\n{"model":""}\n');
  assert.deepEqual(readRows(file), [{ name: 'Dökkálfar' }, { model: '' }]);
  assert.deepEqual(parseRows(fs.readFileSync(file)), readRows(file));
  fs.writeFileSync(file, '{"name":"Götterdämmerung"}');
  assert.deepEqual(readJson(file), { name: 'Götterdämmerung' });
  fs.writeFileSync(file, ' \n');
  assert.throws(() => readRows(file), SyntaxError);
});

test('shared SHA verification hashes physical bytes and rejects wrong or malformed digests', () => {
  const digest =
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  assert.equal(sha256(Buffer.from('abc')), digest);
  assert.equal(sha256('abc'), digest);
  assert.notEqual(sha256('a\r\nb'), sha256('a\nb'));
  assert.doesNotThrow(() => verifySha256(Buffer.from('abc'), digest, 'input'));
  for (const wrong of ['b'.repeat(64), digest.toUpperCase(), 'bad']) {
    assert.throws(
      () => verifySha256(Buffer.from('abc'), wrong, 'input'),
      /input SHA-256 mismatch/,
    );
  }
});
