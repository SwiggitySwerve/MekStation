// Where facts come from: the per-family deriver fingerprints and the facts-meta.json that travels with the facts.
//   node --test scripts/lib/runtime-parity/facts-provenance.test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  coreDeriverSha,
  factsMeta,
  factsProvenance,
  familyDeriverFile,
  familyDeriverSha,
  gitBlobSha,
  parseFactsMeta,
} from './facts-provenance.mjs';
import { FACTS_SCHEMA_VERSION, FACT_FAMILIES } from './facts.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

test('gitBlobSha is git hash-object over the bytes', () => {
  const bytes = Buffer.from('hello\n');
  assert.equal(gitBlobSha(bytes), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

/** The fingerprint of a sibling file, recomputed here from its LF bytes. */
const blobOf = (name) =>
  gitBlobSha(
    Buffer.from(
      fs.readFileSync(path.join(here, name), 'utf8').replace(/\r\n/g, '\n'),
    ),
  );

test('the core sha is the git blob of facts-core.mjs and each family sha the blob of facts-<family>.mjs (LF-normalised)', () => {
  assert.equal(coreDeriverSha(), blobOf('facts-core.mjs'));
  for (const family of FACT_FAMILIES) {
    assert.equal(familyDeriverFile(family), `facts-${family}.mjs`);
    assert.equal(familyDeriverSha(family), blobOf(`facts-${family}.mjs`));
  }
  // The families' fingerprints are their own: two families never share one, and none is the core's.
  const shas = FACT_FAMILIES.map(familyDeriverSha);
  assert.equal(new Set([...shas, coreDeriverSha()]).size, shas.length + 1);
  // One changed character changes the fingerprint; a CRLF checkout of the same file does not.
  const text = fs
    .readFileSync(path.join(here, 'facts-core.mjs'), 'utf8')
    .replace(/\r\n/g, '\n');
  assert.notEqual(gitBlobSha(Buffer.from(text + ' ')), coreDeriverSha());
  assert.equal(
    gitBlobSha(Buffer.from(text.replace(/\n/g, '\r\n').replace(/\r\n/g, '\n'))),
    coreDeriverSha(),
  );
  // And each is what git itself computes for the working file when the file is LF.
  for (const name of ['facts-core.mjs', 'facts-battlemechs.mjs']) {
    const file = path.join(here, name);
    if (!fs.readFileSync(file, 'utf8').includes('\r'))
      assert.equal(
        blobOf(name),
        execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim(),
      );
  }
});

test('a family file is found by its name only: a name outside [a-z] is refused, never resolved', () => {
  for (const bad of ['../facts', 'core/x', 'Battlemechs', '', 'a.b'])
    assert.throws(() => familyDeriverFile(bad), /not a family name/);
  // The same family-id rule as the registry (family-names.mjs): digits and dashes are allowed.
  assert.equal(familyDeriverFile('battle-armor'), 'facts-battle-armor.mjs');
  // The registry (facts.mjs) is not part of any fingerprint.
  assert.notEqual(coreDeriverSha(), blobOf('facts.mjs'));
});

test('provenance names the facts schema version, the core and family shas and the reference sha', () => {
  const p = factsProvenance({
    family: 'battlemechs',
    referenceSha256: 'a'.repeat(64),
  });
  assert.deepEqual(p, {
    factsSchemaVersion: FACTS_SCHEMA_VERSION,
    coreDeriverSha: coreDeriverSha(),
    familyDeriverSha: familyDeriverSha('battlemechs'),
    referenceSha256: 'a'.repeat(64),
  });
  assert.notEqual(
    factsProvenance({ family: 'vehicles', referenceSha256: 'a'.repeat(64) })
      .familyDeriverSha,
    p.familyDeriverSha,
  );
  assert.throws(() =>
    factsProvenance({ family: 'battlemechs', referenceSha256: 'nope' }),
  );
});

test('facts-meta.json round-trips with its family, and a malformed or single-fingerprint one is refused by name', () => {
  const meta = factsMeta({
    measure: 'load',
    family: 'vehicles',
    referenceSha256: 'a'.repeat(64),
  });
  assert.deepEqual(Object.keys(meta), [
    'schemaVersion',
    'measure',
    'family',
    'factsSchemaVersion',
    'coreDeriverSha',
    'familyDeriverSha',
    'referenceSha256',
  ]);
  assert.deepEqual(parseFactsMeta(JSON.stringify(meta)), meta);
  assert.throws(() => parseFactsMeta('{nope'), /not JSON/);
  assert.throws(
    () => parseFactsMeta(JSON.stringify({ ...meta, coreDeriverSha: 'x' })),
    /malformed/,
  );
  assert.throws(
    () => parseFactsMeta(JSON.stringify({ ...meta, extra: 1 })),
    /malformed/,
  );
  const { family: _family, ...noFamily } = meta;
  assert.throws(() => parseFactsMeta(JSON.stringify(noFamily)), /malformed/);
  // The V0 shape (schemaVersion 1, one factsDeriverBlob) is no longer read.
  assert.throws(
    () =>
      parseFactsMeta(
        JSON.stringify({
          schemaVersion: 1,
          measure: 'load',
          family: 'battlemechs',
          factsSchemaVersion: FACTS_SCHEMA_VERSION,
          factsDeriverBlob: '1'.repeat(40),
          referenceSha256: 'a'.repeat(64),
        }),
      ),
    /malformed/,
  );
});
