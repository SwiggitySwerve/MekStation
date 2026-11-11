// Where facts come from: the deriver's fingerprint and the facts-meta.json that travels with the facts.
//   node --test scripts/lib/runtime-parity/facts-provenance.test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  factsDeriverBlob,
  factsMeta,
  factsProvenance,
  gitBlobSha,
  parseFactsMeta,
} from './facts-provenance.mjs';
import { FACTS_SCHEMA_VERSION } from './facts.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

test('gitBlobSha is git hash-object over the bytes', () => {
  const bytes = Buffer.from('hello\n');
  assert.equal(gitBlobSha(bytes), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

test('the deriver blob is the git blob of facts.mjs (LF-normalised), and changes when the deriver does', () => {
  const file = path.join(here, 'facts.mjs');
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(factsDeriverBlob(), gitBlobSha(Buffer.from(text)));
  // A CRLF checkout of the same file gives the same value; one changed character does not.
  assert.equal(
    gitBlobSha(Buffer.from(text.replace(/\n/g, '\r\n').replace(/\r\n/g, '\n'))),
    factsDeriverBlob(),
  );
  assert.notEqual(gitBlobSha(Buffer.from(text + ' ')), factsDeriverBlob());
  // And it is what git itself computes for the working file when the file is LF.
  if (!fs.readFileSync(file, 'utf8').includes('\r'))
    assert.equal(
      factsDeriverBlob(),
      execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim(),
    );
});

test('provenance names the facts schema version, the deriver blob and the reference sha', () => {
  const p = factsProvenance({ referenceSha256: 'a'.repeat(64) });
  assert.deepEqual(p, {
    factsSchemaVersion: FACTS_SCHEMA_VERSION,
    factsDeriverBlob: factsDeriverBlob(),
    referenceSha256: 'a'.repeat(64),
  });
  assert.throws(() => factsProvenance({ referenceSha256: 'nope' }));
});

test('facts-meta.json round-trips and a malformed one is refused by name', () => {
  const meta = factsMeta({ measure: 'load', referenceSha256: 'a'.repeat(64) });
  assert.deepEqual(parseFactsMeta(JSON.stringify(meta)), meta);
  assert.throws(() => parseFactsMeta('{nope'), /not JSON/);
  assert.throws(
    () => parseFactsMeta(JSON.stringify({ ...meta, factsDeriverBlob: 'x' })),
    /malformed/,
  );
  assert.throws(
    () => parseFactsMeta(JSON.stringify({ ...meta, extra: 1 })),
    /malformed/,
  );
});
