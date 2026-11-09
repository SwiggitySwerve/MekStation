import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { generate, revision, writeModule } from './infantry-clip-facts.mjs';

const require = createRequire(import.meta.url);
require('tsx/cjs');

const weapon = (patch = {}) => ({
  javaClass: 'InfantrySupportMGSupportWeapon',
  internalName: 'InfantrySupportMG',
  name: 'Machine Gun (Support)',
  aliases: ['Support MG'],
  infantryWeapon: true,
  ammoType: 'INFANTRY',
  rackSize: 0,
  clipShots: 100,
  oneShot: false,
  oneShotAmmoAdmitted: true,
  admissionByYear: [[-2147483648, true]],
  ...patch,
});
const envelope = (weapons = { mg: weapon() }) => ({
  revision,
  genericAmmo: { group: 'INFANTRY:0', battleValue: 0 },
  weapons,
});

test('clip metadata is independent, deterministic and retains native admission', () => {
  const input = envelope();
  const before = JSON.stringify(input);
  assert.equal(generate(input), generate(input));
  assert.match(generate(input), /INFANTRY\|0\|100\|0\|1\|-2147483648~1/);
  assert.equal(JSON.stringify(input), before);
});

test('non-infantry collisions do not become infantry aliases', () => {
  const output = generate(
    envelope({
      mg: weapon(),
      ba: weapon({ javaClass: 'CLBALightMG', infantryWeapon: false }),
    }),
  );
  assert.match(output, /InfantrySupportMGSupportWeapon\|/);
  assert.doesNotMatch(output.split('const native =')[1], /machinegunsupport:/);
});

test('missing or invalid native facts and nonzero generic BV fail closed', () => {
  for (const field of [
    'clipShots',
    'oneShot',
    'oneShotAmmoAdmitted',
    'infantryWeapon',
  ]) {
    const row = weapon();
    delete row[field];
    assert.throws(() => generate(envelope({ mg: row })));
  }
  assert.throws(() => generate(envelope({ mg: weapon({ clipShots: 0.5 }) })));
  assert.throws(() => generate({ ...envelope(), revision: 'unverified' }));
  assert.throws(
    () =>
      generate({
        ...envelope(),
        genericAmmo: { group: 'INFANTRY:0', battleValue: 1 },
      }),
    /Nonzero/,
  );
});

test('write/check touches only its output and leaves existing native weapon flags byte-unchanged', () => {
  const flags = new URL(
    '../../src/utils/construction/equipmentBV/nativeWeaponFlags.ts',
    import.meta.url,
  );
  const before = fs.readFileSync(flags);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-clip-test-'));
  try {
    const output = path.join(temp, 'facts.ts');
    writeModule(envelope(), output);
    const bytes = fs.readFileSync(output);
    expectNativeFacts(output);
    writeModule(envelope(), output, true);
    assert.deepEqual(fs.readFileSync(output), bytes);
    assert.deepEqual(fs.readFileSync(flags), before);
    fs.appendFileSync(output, '\n// drift\n');
    assert.throws(() => writeModule(envelope(), output, true), /module drift/);
    assert.deepEqual(fs.readFileSync(flags), before);
  } finally {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true });
  }
});

function expectNativeFacts(output) {
  const { getNativeInfantryClipFacts } = require(output);
  assert.equal(getNativeInfantryClipFacts('Support MG').clipShots, 100);
  assert.equal(
    getNativeInfantryClipFacts('Support MG').oneShotAmmoAdmitted,
    true,
  );
}

test('native admission transitions retain missing-year uncertainty and exact boundaries', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-clip-years-'));
  try {
    const output = path.join(temp, 'years.ts');
    writeModule(
      envelope({
        mg: weapon({
          oneShotAmmoAdmitted: null,
          admissionByYear: [
            [-2147483648, false],
            [3015, true],
            [3100, null],
          ],
        }),
      }),
      output,
    );
    const { getNativeInfantryClipFacts: get } = require(output);
    assert.equal(get('Support MG').oneShotAmmoAdmitted, null);
    assert.equal(get('Support MG', undefined, 3014).oneShotAmmoAdmitted, false);
    assert.equal(get('Support MG', undefined, 3015).oneShotAmmoAdmitted, true);
    assert.equal(get('Support MG', undefined, 3099).oneShotAmmoAdmitted, true);
    assert.equal(get('Support MG', undefined, 3100).oneShotAmmoAdmitted, null);
    assert.equal(get('Support MG', undefined, NaN), undefined);
  } finally {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    fs.rmSync(temp, { recursive: true });
  }
});
