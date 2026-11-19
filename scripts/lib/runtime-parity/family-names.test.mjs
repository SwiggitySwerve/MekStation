// The one owner of family names and baseline file names, and the registry's agreement with it.
//   node --test scripts/lib/runtime-parity/family-names.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { setFactNames } from './facts.mjs';
import {
  BASELINE_DIR,
  DEFAULT_FAMILY,
  FAMILY_ID_PATTERN,
  RESERVED_FAMILY_IDS,
  assertFamilyId,
  baselinePath,
  baselineSetsPath,
  isFamilyId,
} from './family-names.mjs';
import * as gate from './gate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

test('a family id is lowercase letters, digits and dashes, starting with a letter', () => {
  assert.equal(FAMILY_ID_PATTERN.source, '^[a-z][a-z0-9-]*$');
  for (const good of ['battlemechs', 'vehicles', 'battle-armor', 'aero2'])
    assert.equal(isFamilyId(good), true, good);
  for (const bad of [
    '',
    'Battlemechs',
    '2aero',
    '-x',
    'a.b',
    '../x',
    'a/b',
    'a b',
    null,
    7,
  ])
    assert.equal(isFamilyId(bad), false, String(bad));
  assert.throws(() => assertFamilyId('../x'), /not a family name/);
});

test('core and provenance are never family ids: their facts-<name>.mjs files are not family derivers', () => {
  assert.deepEqual([...RESERVED_FAMILY_IDS], ['core', 'provenance']);
  for (const reserved of RESERVED_FAMILY_IDS) {
    assert.equal(FAMILY_ID_PATTERN.test(reserved), true);
    assert.equal(isFamilyId(reserved), false, reserved);
    assert.throws(() => assertFamilyId(reserved), /not a family name/);
    assert.throws(() => baselinePath('load', reserved), /not a family name/);
  }
});

test('baseline names: the default family keeps its old names, every other family carries its id', () => {
  assert.equal(DEFAULT_FAMILY, 'battlemechs');
  assert.equal(baselinePath('load'), `${BASELINE_DIR}/baseline-load.json`);
  assert.equal(
    baselineSetsPath('reopen', DEFAULT_FAMILY),
    `${BASELINE_DIR}/baseline-reopen.sets.ndjson`,
  );
  assert.equal(
    baselinePath('reopen', 'vehicles'),
    `${BASELINE_DIR}/baseline-vehicles-reopen.json`,
  );
  assert.equal(
    baselineSetsPath('load', 'battle-armor'),
    `${BASELINE_DIR}/baseline-battle-armor-load.sets.ndjson`,
  );
  // A name that is not a family id never becomes a path.
  assert.throws(() => baselinePath('load', '../../etc'), /not a family name/);
  // The gate re-exports the same functions: there is no second rule.
  assert.equal(gate.baselinePath, baselinePath);
  assert.equal(gate.baselineSetsPath, baselineSetsPath);
  assert.equal(gate.BASELINE_DIR, BASELINE_DIR);
});

test('the module imports nothing, so the registry plan step (no npm ci) can import it', () => {
  const text = fs.readFileSync(path.join(here, 'family-names.mjs'), 'utf8');
  assert.equal(/^\s*import\b/m.test(text), false);
  assert.equal(/\brequire\(/.test(text), false);
});

test('the hosted family registry names the same baseline files as the owner', () => {
  const registry = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'config/parity-runtime/families.json'),
      'utf8',
    ),
  );
  for (const [family, entry] of Object.entries(registry.families)) {
    assert.equal(isFamilyId(family), true, family);
    if (entry.baselines === null) continue;
    for (const [measure, files] of Object.entries(entry.baselines)) {
      assert.equal(
        files.main,
        baselinePath(measure, family),
        `${family} ${measure}`,
      );
      // A sidecar exists exactly for a measure with set facts.
      assert.equal(
        files.sets,
        setFactNames(measure, family).length
          ? baselineSetsPath(measure, family)
          : null,
        `${family} ${measure} sets`,
      );
    }
  }
});
