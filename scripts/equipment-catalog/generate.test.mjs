import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { generateEntries, assertAdditive } from './generate.mjs';
const { java, facts, lookups } = JSON.parse(
  readFileSync(new URL('./source-fixture.json', import.meta.url), 'utf8'),
);
const gaps = [{ java }];
const alias = java.aliases[0];
const run = (existing = [], mappings = {}) =>
  generateEntries([java], gaps, facts, lookups, existing, mappings);

test('a registry gap becomes a cited ammo entry with Java aliases and exact per-shot mass', () => {
  const result = run();
  assert.equal(result.items[0].entry.kgPerShot, 24.99);
  assert.equal(result.items[0].entry.battleValue, 4);
  assert.equal(result.aliases[alias], result.items[0].entry.id);
  assert.equal(JSON.stringify(result), JSON.stringify(run()));
  assert(!run([], { [alias.toUpperCase()]: 'old' }).aliases[alias]);
});
test('colliding generated slugs are rejected instead of overwriting existing identities', () => {
  const id = run().items[0].entry.id;
  assert.throws(() => run([{ id }]), /collision/i);
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
  const kitFacts = structuredClone(facts);
  kitFacts[java.internalName].kind = 'miscellaneous';
  kitFacts[java.internalName].damageDivisor = 1.5;
  kitFacts[java.internalName].usedByProto = false;
  const result = generateEntries([java], [], kitFacts, lookups, [], {});
  assert.equal(result.items[0].entry.damageDivisor, 1.5);
});
test('committed generated entries conform to schemas and preserve every baseline item', () => {
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const root = 'public/data/equipment/official/';
  for (const row of read(new URL('./baseline.json', import.meta.url))) {
    const entry = read(root + row.file).items[row.index];
    assert(entry, `Removed ${row.file}:${row.id}`);
    const digest = hash('sha256', JSON.stringify(entry));
    assert.equal(digest, row.sha256, `Changed ${row.file}:${row.id}`);
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
    for (const entry of read(root + kind + '/java-registry.json').items) {
      schema.parse(entry);
    }
  }
});
