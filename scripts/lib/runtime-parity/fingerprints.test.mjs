// The deriver fingerprints' one owner: the values the census writes, callable on a bare checkout before npm ci.
//   node --test scripts/lib/runtime-parity/fingerprints.test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { factsMeta, factsProvenance } from './facts-provenance.mjs';
import * as provenance from './facts-provenance.mjs';
import { FACT_FAMILIES } from './facts.mjs';
import {
  coreDeriverSha,
  familyDeriverFile,
  familyDeriverSha,
} from './fingerprints.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Every module specifier a file imports statically or re-exports. */
const specifiers = (file) =>
  [
    ...fs
      .readFileSync(file, 'utf8')
      .matchAll(/^\s*(?:import|export)\b[^;'"]*?from\s+['"]([^'"]+)['"]/gm),
  ].map((m) => m[1]);

test('fingerprints.mjs and everything it imports use only Node built-ins (no package, so no npm ci needed)', () => {
  const seen = new Set();
  const visit = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const spec of specifiers(path.join(here, name))) {
      if (spec.startsWith('./')) visit(spec.slice(2));
      else assert.match(spec, /^node:/, `${name} imports the package ${spec}`);
    }
  };
  visit('fingerprints.mjs');
  assert.deepEqual([...seen].sort(), ['family-names.mjs', 'fingerprints.mjs']);
});

test('the fingerprints are the census values: what facts-meta.json and the baseline header carry', () => {
  // facts-provenance re-exports the owner's functions: one hash path.
  assert.equal(provenance.coreDeriverSha, coreDeriverSha);
  assert.equal(provenance.familyDeriverSha, familyDeriverSha);
  for (const family of FACT_FAMILIES) {
    const meta = factsMeta({
      measure: 'load',
      family,
      referenceSha256: 'a'.repeat(64),
    });
    assert.equal(meta.coreDeriverSha, coreDeriverSha(), family);
    assert.equal(meta.familyDeriverSha, familyDeriverSha(family), family);
    const header = factsProvenance({ family, referenceSha256: 'a'.repeat(64) });
    assert.equal(header.coreDeriverSha, coreDeriverSha(), family);
    assert.equal(header.familyDeriverSha, familyDeriverSha(family), family);
  }
});

test('each fingerprint is git hash-object of its file in the checkout', () => {
  for (const [name, value] of [
    ['facts-core.mjs', coreDeriverSha()],
    ...FACT_FAMILIES.map((family) => [
      familyDeriverFile(family),
      familyDeriverSha(family),
    ]),
  ]) {
    const file = path.join(here, name);
    if (fs.readFileSync(file, 'utf8').includes('\r')) continue; // a CRLF checkout: git would hash the CRLF bytes
    assert.equal(
      value,
      execFileSync('git', ['hash-object', file], { encoding: 'utf8' }).trim(),
      name,
    );
  }
});

test('familyDeriverSha refuses a name that is not a family id, and a family with no deriver file', () => {
  assert.throws(() => familyDeriverSha('../facts-core'), /not a family name/);
  assert.throws(() => familyDeriverSha('Vehicles'), /not a family name/);
  assert.throws(
    () => familyDeriverSha('aerospace'),
    /family aerospace has no deriver \(facts-aerospace\.mjs\)/,
  );
});

test('a bare copy with no node_modules anywhere gives the same values (as before npm ci)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fingerprints-'));
  try {
    for (const name of [
      'fingerprints.mjs',
      'family-names.mjs',
      'facts-core.mjs',
      ...FACT_FAMILIES.map(familyDeriverFile),
    ])
      fs.copyFileSync(path.join(here, name), path.join(dir, name));
    const script = `import('./fingerprints.mjs').then((m) => console.log(JSON.stringify({ core: m.coreDeriverSha(), families: ${JSON.stringify(FACT_FAMILIES)}.map((f) => m.familyDeriverSha(f)) })))`;
    const out = JSON.parse(
      execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, NODE_PATH: '' },
      }),
    );
    assert.deepEqual(out, {
      core: coreDeriverSha(),
      families: FACT_FAMILIES.map(familyDeriverSha),
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
