import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  generateEntries,
  generateCapitalBVFacts,
  generateAliasAdditions,
} from './generate.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
// Pinned NGaussWeaponLight.java and AmmoType.java; actual extracted inputs.
const rows = read('./capital-source.json');
const names = [
  'Naval Gauss (Light)',
  'Naval Gauss (Medium)',
  'Naval Gauss (Heavy)',
];
const fixture = read('./capital-fixture.json');

test('the product-owned capital supplement matches generated facts', () => {
  const items = read('./java-additions.json').map(
    ({ native, kind, values }) => ({
      internalName: native,
      kind,
      entry: values,
    }),
  );
  const index = read('../../public/data/equipment/official/index.json');
  const originalEntries = Object.values(index.files).flatMap((group) =>
    Object.values(group)
      .filter((file) => !file.endsWith('/java-registry.json'))
      .flatMap(
        (file) => read(`../../public/data/equipment/official/${file}`).items,
      ),
  );
  assert.deepEqual(
    read('../../src/utils/construction/equipmentBV/data/capital-bv.json'),
    generateCapitalBVFacts(items, originalEntries),
  );
});

test('capital weapons and matching ammo are selected without mounted gap tokens', () => {
  const result = generateEntries(fixture.java, [], fixture.facts, {}, [], {});
  for (const name of names) {
    const weapon = result.items.find((item) => item.internalName === name);
    assert(weapon, name);
    const native = fixture.java.find((row) => row.internalName === name);
    assert.equal(weapon.entry.battleValue, native.bv);
    assert.equal(weapon.entry.heat, fixture.facts[name].heat);
    const supplement = generateCapitalBVFacts(result.items)[weapon.entry.id];
    assert.equal(supplement.isCapital, true);
    assert.deepEqual(supplement.damageByRange, rows[name].damageByRange);
    assert(weapon.entry.special[0].includes('/48fcb2f64'));
    const ammo = result.items.find(
      (item) =>
        item.kind === 'ammunition' &&
        fixture.facts[item.internalName].compatible.includes(name),
    );
    assert(ammo?.entry.compatibleWeaponIds.includes(weapon.entry.id), name);
    assert.equal(
      ammo.entry.shotsPerTon,
      fixture.facts[ammo.internalName].shots,
    );
  }
  assert.equal(
    JSON.stringify(result),
    JSON.stringify(
      generateEntries(fixture.java, [], fixture.facts, {}, [], {}),
    ),
  );
});

test('capital supplement retains native scale and damage at each range', () => {
  assert.deepEqual(rows['Naval Laser 55'].damageByRange, [5.5, 5.5, 5.5, 5.5]);
  assert.equal(rows['Naval Laser 55'].isCapital, true);
  assert.equal(rows['Sub-Capital Laser /1'].isSubCapital, true);
  assert(!Object.keys(rows).some((name) => name.endsWith(' Bay')));
});

test('existing capital IDs receive facts only when native name, BV and firing facts agree', () => {
  const legacy = {
    id: 'naval-gauss-light',
    name: 'Naval Gauss (Light)',
    category: 'Ballistic',
    battleValue: 3024,
    heat: 9,
    ranges: { short: 14, medium: 28, long: 40 },
  };
  const ammo = {
    id: 'ammo-light-n-gauss',
    name: 'Light N-Gauss Ammo',
    battleValue: 378,
    shotsPerTon: 1,
  };
  const before = [
    legacy,
    { ...legacy, id: 'wrong-heat', heat: 10 },
    ammo,
    { ...ammo, id: 'wrong-shots', shotsPerTon: 2 },
  ];
  const frozen = JSON.stringify(before);
  const result = generateEntries(
    fixture.java,
    [],
    fixture.facts,
    {},
    before,
    {},
  );
  const supplement = generateCapitalBVFacts(result.items, before);
  assert.equal(supplement[legacy.id]?.isCapital, true);
  assert.equal(supplement[legacy.id]?.ammoType, 'LIGHT_NGAUSS');
  assert.equal(supplement[ammo.id]?.ammoType, 'LIGHT_NGAUSS');
  assert.equal(supplement['wrong-heat'], undefined);
  assert.equal(supplement['wrong-shots'], undefined);
  assert.equal(JSON.stringify(before), frozen);
});

test('capital ammo quantities retain their registered bare Java identity', () => {
  const java = fixture.java.find(
    (row) => row.internalName === 'Ammo Light N-Gauss',
  );
  const lookups = {
    [java.internalName.toLowerCase()]: { default: java.internalName },
  };
  const gap = { java, inputs: [{ id: 'ammo-light-n-gauss:3' }] };
  const { aliases } = generateEntries(
    [java],
    [gap],
    fixture.facts,
    lookups,
    [],
    {},
  );
  assert.equal(aliases['ammo-light-n-gauss'], 'ammo-light-n-gauss-registry');
  assert.equal(aliases['ammo-light-n-gauss:3'], undefined);
});

test('converted native slugs resolve without gap tokens or replacing existing IDs', () => {
  const java = fixture.java.find(
    (row) => row.internalName === 'Mass Driver (Medium)',
  );
  const lookups = {
    [java.internalName.toLowerCase()]: { default: java.internalName },
  };
  const run = (before = []) =>
    generateEntries([java], [], fixture.facts, lookups, before, {});
  assert.equal(
    run().aliases['mass-driver-medium'],
    'mass-driver-medium-registry',
  );
  assert.equal(
    run([{ id: 'mass-driver-medium' }]).aliases['mass-driver-medium'],
    undefined,
  );
  assert.equal(run().aliases['invented-naval-gauss'], undefined);
});

test('alias-only generation requires existing IDs and preserves every prior target', () => {
  const before = { old: 'existing' };
  const ids = new Set(['existing', 'other']);
  assert.deepEqual(generateAliasAdditions({ new: 'existing' }, before, ids), {
    old: 'existing',
    new: 'existing',
  });
  assert.deepEqual(before, { old: 'existing' });
  assert.throws(() => generateAliasAdditions({ old: 'other' }, before, ids));
  assert.throws(() => generateAliasAdditions({ new: 'absent' }, before, ids));
});

test('punctuation-distinct Java aliases cannot assign an ambiguous converted slug', () => {
  const java = ['Mass Driver (Medium)', names[0]].map((name) => ({
    ...fixture.java.find((row) => row.internalName === name),
  }));
  java[1].aliases = [...java[1].aliases, 'Mass-Driver (Medium)'];
  const lookups = Object.fromEntries(
    java.flatMap((row) =>
      [row.internalName, ...row.aliases].map((alias) => [
        alias.toLowerCase(),
        { default: row.internalName },
      ]),
    ),
  );
  const { aliases } = generateEntries(java, [], fixture.facts, lookups, [], {});
  assert.equal(aliases['mass-driver-medium'], undefined);
});

// QKD-5M fell from Java-exact 1237 to 1227 when unrelated OS slugs were added.
test('only the audited capital spellings acquire converted aliases', () => {
  const java = fixture.java.find((row) => row.internalName === names[0]);
  const lookups = { [java.internalName.toLowerCase()]: { default: names[0] } };
  const { aliases } = generateEntries(
    [java],
    [],
    fixture.facts,
    lookups,
    [],
    {},
  );
  assert.equal(aliases['naval-gauss-light'], undefined);
});
