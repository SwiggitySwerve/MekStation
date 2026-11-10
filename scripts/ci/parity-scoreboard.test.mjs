import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';

import {
  assertClean,
  assertDetailedRan,
  prepareReference,
  readCensusResults,
  verifySha256,
} from './parity-scoreboard.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const temporary = (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-scoreboard-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
};

test('committed oracle sidecar retains its original SHA-256 and CRLF bytes', () => {
  const bytes = fs.readFileSync(
    'config/reference/reference-full.jsonl.provenance.json',
  );
  assert.equal(
    sha(bytes),
    'eaebbd8208d0075f63d862d762d8fea48a8adb8e932791eea8d7fac977f97c9a',
  );
  assert.ok(bytes.includes(Buffer.from('\r\n')));
});

test('only detailed exits 0 and 1 mean ran; errors, signals and exit 2 fail', () => {
  for (const status of [0, 1])
    assert.doesNotThrow(() => assertDetailedRan({ status }));
  for (const result of [
    { status: 2 },
    { status: 137 },
    { status: null },
    { status: 0, error: new Error('spawn failed') },
    { status: 1, signal: 'SIGTERM' },
  ])
    assert.throws(() => assertDetailedRan(result), /Detailed execution failed/);
});

test('SHA verification rejects altered bytes', () => {
  assert.doesNotThrow(() =>
    verifySha256(Buffer.from('oracle'), sha('oracle'), 'reference'),
  );
  assert.throws(
    () => verifySha256(Buffer.from('changed'), sha('oracle'), 'reference'),
    /reference.*SHA-256/,
  );
});

test('reference preparation verifies gzip, decompressed data and unmodified sidecar', (t) => {
  const root = temporary(t),
    out = path.join(root, 'out');
  const data = Buffer.from('{"path":"mek/test"}\n'),
    compressed = gzipSync(data);
  const sidecar = Buffer.from('{"version":1}\n');
  fs.writeFileSync(path.join(root, 'reference-full.jsonl.gz'), compressed);
  fs.writeFileSync(
    path.join(root, 'reference-full.jsonl.provenance.json'),
    sidecar,
  );
  const reference = {
    file: 'reference-full.jsonl.gz',
    gzipSha256: sha(compressed),
    sha256: sha(data),
    sidecar: 'reference-full.jsonl.provenance.json',
    sidecarSha256: sha(sidecar),
  };
  const file = prepareReference(root, out, reference);
  assert.deepEqual(fs.readFileSync(file), data);
  assert.deepEqual(fs.readFileSync(file + '.provenance.json'), sidecar);
  assert.throws(
    () => prepareReference(root, out, { ...reference, sha256: sha('wrong') }),
    /reference.*SHA-256/,
  );
  assert.throws(
    () =>
      prepareReference(root, out, { ...reference, gzipSha256: sha('wrong') }),
    /gzip.*SHA-256/,
  );
  fs.writeFileSync(path.join(root, reference.sidecar), 'changed');
  assert.throws(
    () => prepareReference(root, out, reference),
    /sidecar.*SHA-256/,
  );
});

test('dirty-tree refusal covers tracked changes and untracked files', (t) => {
  const root = temporary(t);
  execFileSync('git', ['init', '--quiet', root]);
  assert.doesNotThrow(() => assertClean(root));
  fs.writeFileSync(path.join(root, 'input'), 'original');
  assert.throws(() => assertClean(root), /Dirty checkout/);
  execFileSync('git', ['-C', root, 'add', 'input']);
  assert.throws(() => assertClean(root), /Dirty checkout/);
});

test('missing census output and rejected trust cannot count as a completed run', (t) => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, 'terms'));
  assert.throws(
    () => readCensusResults(root, { head: 'a', tree: 'b' }),
    /ENOENT/,
  );
  fs.writeFileSync(
    path.join(root, 'terms/reference-provenance-report.json'),
    '{"ok":false}',
  );
  assert.throws(
    () => readCensusResults(root, { head: 'a', tree: 'b' }),
    /Reference trust rejected/,
  );
});
