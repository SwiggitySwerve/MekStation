import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  readJson,
  readRows,
  parseRows,
  sha256,
  verifySha256,
} from './parity-scoreboard-io.cjs';

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
