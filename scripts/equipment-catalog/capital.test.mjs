import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as generator from './generate.mjs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url)));
// Pinned NGaussWeaponLight.java and AmmoType.java; actual extracted inputs.
const rows = read('./capital-source.json');
const names = [
  'Naval Gauss (Light)',
  'Naval Gauss (Medium)',
  'Naval Gauss (Heavy)',
];
const fixture = read('./capital-fixture.json');

test('capital weapons and matching ammo are selected without mounted gap tokens', () => {
  const result = generator.generateEntries(
    fixture.java,
    [],
    fixture.facts,
    {},
    [],
    {},
  );
  for (const name of names) {
    const weapon = result.items.find((item) => item.internalName === name);
    assert(weapon, name);
    const native = fixture.java.find((row) => row.internalName === name);
    assert.equal(weapon.entry.battleValue, native.bv);
    assert.equal(weapon.entry.heat, fixture.facts[name].heat);
    const supplement = generator.generateCapitalBVFacts(result.items)[
      weapon.entry.id
    ];
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
      generator.generateEntries(fixture.java, [], fixture.facts, {}, [], {}),
    ),
  );
});

test('capital supplement retains native scale and damage at each range', () => {
  assert.deepEqual(rows['Naval Laser 55'].damageByRange, [5.5, 5.5, 5.5, 5.5]);
  assert.equal(rows['Naval Laser 55'].isCapital, true);
  assert.equal(rows['Sub-Capital Laser /1'].isSubCapital, true);
  assert(!Object.keys(rows).some((name) => name.endsWith(' Bay')));
});
