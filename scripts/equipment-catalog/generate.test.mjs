import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { generateEntries, assertAdditive } from './generate.mjs';
const java = {
  internalName: 'CLTest Ammo',
  name: 'Test Ammo',
  javaClass: 'AmmoType',
  tech: 'CLAN',
  bv: 7,
  tons: 1,
  aliases: ['CLTest Ammo', 'Test rounds'],
};
const facts = {
  'CLTest Ammo': {
    kind: 'ammunition',
    criticalSlots: 1,
    cost: 1000,
    rulesLevel: 'STANDARD',
    introductionYear: 3050,
    extinctionYear: -1,
    shots: 20,
    kgPerShot: 24.99,
    ammoType: 'LRM',
    category: 'LRM',
    rackSize: 3,
    isExplosive: true,
    munitions: ['M_STANDARD'],
  },
};
const gaps = [{ java }];
const lookups = {
  'cltest ammo': { default: java.internalName },
  'test rounds': { default: java.internalName },
};
const run = (existing = [], mappings = {}) =>
  generateEntries([java], gaps, facts, lookups, existing, mappings);

test('a registry gap becomes a cited ammo entry with Java aliases and exact per-shot mass', () => {
  const result = run();
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].entry.kgPerShot, 24.99);
  assert.equal(result.items[0].entry.battleValue, 7);
  assert.equal(result.aliases['Test rounds'], result.items[0].entry.id);
  assert.equal(JSON.stringify(result), JSON.stringify(run()));
  assert.equal(
    run([], { 'test ROUNDS': 'old' }).aliases['Test rounds'],
    undefined,
  );
});
test('colliding generated slugs are rejected instead of overwriting existing identities', () => {
  assert.throws(() => run([{ id: 'cltest-ammo-registry' }]), /collision/i);
});
test('every pre-existing entry must retain its complete serialized value', () => {
  const before = [{ id: 'old', battleValue: 8, special: ['original'] }];
  assert.throws(
    () => assertAdditive(before, [{ ...before[0], battleValue: 7 }]),
    /changed/i,
  );
  assert.throws(() => assertAdditive(before, []), /removed/i);
  assert.doesNotThrow(() => assertAdditive(before, [...before, { id: 'new' }]));
});
test('intrinsic kit protection is generated even without a gap token', () => {
  const kitFacts = {
    [java.internalName]: {
      ...facts[java.internalName],
      kind: 'miscellaneous',
      damageDivisor: 1.5,
    },
  };
  const result = generateEntries([java], [], kitFacts, lookups, [], {});
  assert.equal(result.items[0].entry.damageDivisor, 1.5);
});
test('committed generated entries conform to schemas and preserve every baseline item', () => {
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  for (const row of read(new URL('./baseline.json', import.meta.url))) {
    const entry = read(`public/data/equipment/official/${row.file}`).items[
      row.index
    ];
    assert(entry, `Removed ${row.file}:${row.id}`);
    const hash = createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');
    assert([row.sha256].flat().includes(hash), `Changed ${row.file}:${row.id}`);
  }
  const require = createRequire(import.meta.url);
  require('tsx/cjs');
  for (const [kind, stem, contract] of [
    ['weapons', 'weapon', 'WeaponContract'],
    ['ammunition', 'ammunition', 'AmmunitionContract'],
    ['miscellaneous', 'misc-equipment', 'MiscEquipmentContract'],
  ]) {
    const schema = require(
      `../../src/types/contracts/generated/${stem}.zod.ts`,
    )[contract];
    for (const entry of read(
      `public/data/equipment/official/${kind}/java-registry.json`,
    ).items) {
      schema.parse(entry);
    }
  }
});
