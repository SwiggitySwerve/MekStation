import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  assertPinnedInputs,
  assignSlots,
  insertField,
  motiveCompatibility,
  vehicleSlots,
} from './vehicle-slots.mjs';

const fact = (tankSlots, supportVehicleSlots, kind = 'weapons', flags) => ({
  kind,
  tankSlots,
  supportVehicleSlots,
  flags,
});
const row = (internalName, tech = 'ALL', aliases = []) => ({
  internalName,
  name: internalName,
  aliases,
  tech,
});

test('Java slot facts become the record field, keeping unit-dependent nulls', () => {
  assert.deepEqual(vehicleSlots(fact(1, 7)), { tank: 1, supportVehicle: 7 });
  assert.deepEqual(vehicleSlots(fact(null, null)), {
    tank: null,
    supportVehicle: null,
  });
  assert.throws(() => vehicleSlots({ kind: 'weapons' }));
});

test('records get slots only when every Java type behind them agrees', () => {
  const registry = [
    row('A', 'ALL', ['a1']),
    ...['B', 'C', 'D', 'D Ammo'].map((name) => row(name)),
  ];
  const facts = {
    A: fact(1, 7),
    B: fact(1, 7),
    C: fact(0, 1),
    D: fact(1, 2),
    'D Ammo': fact(0, 1, 'ammunition'),
  };
  const ids = { A: 'ab', a1: 'ab', B: 'ab', C: 'cd', D: 'cd', 'D Ammo': 'd' };
  const items = ['ab', 'cd', 'd', 'none'].map((id) => ({ id }));
  const { assigned, skipped } = assignSlots(
    items,
    registry,
    facts,
    (name) => ids[name],
  );
  assert.deepEqual(assigned.get('ab'), {
    slots: { tank: 1, supportVehicle: 7 },
    java: ['A', 'B'],
  });
  assert.deepEqual(
    skipped.map(({ id, reason }) => [id, reason]),
    [
      ['cd', 'disagree'],
      ['d', 'unmatched'],
      ['none', 'unmatched'],
    ],
  );
});

test('only Java types of the record tech base that mount on vehicles count', () => {
  // Shared names: Ultra AC/2 IS 3 crits vs Clan 2; a BA laser beside the vehicle one.
  const registry = [
    row('ISUltraAC2', 'IS'),
    row('CLUltraAC2', 'CLAN'),
    row('Medium Laser', 'IS'),
    row('ISBAMediumLaser', 'IS'),
    row('Mek Only', 'IS'),
    row('Mek Only Too', 'IS'),
  ];
  const tank = ['F_TANK_WEAPON'];
  const facts = {
    ISUltraAC2: fact(1, 3, 'weapons', tank),
    CLUltraAC2: fact(1, 2, 'weapons', tank),
    'Medium Laser': fact(1, 1, 'weapons', tank),
    ISBAMediumLaser: fact(1, 2, 'weapons', ['F_BA_WEAPON']),
    'Mek Only': fact(1, 2, 'miscellaneous', []),
    'Mek Only Too': fact(1, 2, 'miscellaneous', []),
  };
  const ids = {
    ISUltraAC2: 'uac-2',
    CLUltraAC2: 'uac-2',
    'Medium Laser': 'medium-laser',
    ISBAMediumLaser: 'medium-laser',
    'Mek Only': 'mek',
    'Mek Only Too': 'mek',
  };
  const { assigned } = assignSlots(
    [
      { id: 'uac-2', techBase: 'INNER_SPHERE' },
      { id: 'medium-laser', techBase: 'BOTH' },
      { id: 'mek', techBase: 'INNER_SPHERE' },
    ],
    registry,
    facts,
    (name) => ids[name],
  );
  assert.deepEqual(assigned.get('uac-2').java, ['ISUltraAC2']);
  assert.deepEqual(assigned.get('medium-laser').java, ['Medium Laser']);
  assert.deepEqual(assigned.get('mek').java, ['Mek Only', 'Mek Only Too']);
});

test('the field is inserted after criticalSlots, once, and nothing else moves', () => {
  const text = `{\n  "items": [\n    {\n      "id": "x",\n      "criticalSlots": 2,\n      "ranges": {\n        "short": 1\n      }\n    },\n    {\n      "id": "y",\n      "criticalSlots": 1,\n      "weight": 1\n    }\n  ]\n}\n`;
  const once = insertField(text, 'x', { tank: null, supportVehicle: 2 });
  assert.equal(
    once,
    text.replace(
      '"criticalSlots": 2,\n',
      '"criticalSlots": 2,\n      "vehicleSlots": { "tank": null, "supportVehicle": 2 },\n',
    ),
  );
  assert.equal(insertField(once, 'x', { tank: null, supportVehicle: 2 }), once);
  assert.throws(
    () => insertField(once, 'x', { tank: 1, supportVehicle: 2 }),
    /Conflicting x/,
  );
  assert.throws(() => insertField(text, 'z', { tank: 1, supportVehicle: 1 }));
  // miscellaneous/other.json holds two records with id "cargo".
  const twice = text.replace('"id": "y"', '"id": "x"');
  const both = insertField(twice, 'x', { tank: 1, supportVehicle: null });
  assert.equal(both.match(/"vehicleSlots"/g).length, 2);
  assert.equal(insertField(both, 'x', { tank: 1, supportVehicle: null }), both);
});

test('committed records carry pinned Java vehicle slots; ammunition never does', () => {
  const root = 'public/data/equipment/official/';
  const index = JSON.parse(readFileSync(root + 'index.json', 'utf8'));
  const items = (kind) =>
    Object.values(index.files[kind]).flatMap(
      (file) => JSON.parse(readFileSync(root + file, 'utf8')).items,
    );
  assert(!items('ammunition').some((item) => 'vehicleSlots' in item));
  const byId = new Map(
    ['weapons', 'electronics', 'miscellaneous']
      .flatMap(items)
      .map((item) => [item.id, item]),
  );
  // Pinned MegaMek 48fcb2f6: defaults tankSlots = 1, svSlots = criticalSlots
  // (EquipmentType.java:172-173, :433-442).
  for (const [id, tank, supportVehicle] of [
    ['arrow-iv-launcher', 1, 7], // ISArrowIV.java:62
    ['clan-arrow-iv-launcher', 1, 6], // CLArrowIV.java:66
    ['long-tom', 1, 15], // LongTom.java:73
    ['basic-fire-control', 0, 0], // MiscType.java:6529-6530
    // Vehicles mount VehicleJumpJet, not the Mek Jump Jet (tankSlots 0).
    ['jump-jet', 1, 1], // MiscType.java:2010-2012
    ['laser-rifle-registry', 0, 1], // InfantryWeapon.java:95, :288-291
    // Locations - 1 on the unit (MiscType.java:1276-1283, :1315-1320).
    ['blue-shield-particle-field-damper', null, null],
  ])
    assert.deepEqual(byId.get(id)?.vehicleSlots, { tank, supportVehicle }, id);
});

test('Java motive restrictions become motiveCompatibility, unrestricted items none', () => {
  const restricted = {
    motiveIncompatible: ['WHEELED'],
    motiveIncompatibleSupport: [],
  };
  assert.deepEqual(motiveCompatibility(restricted), {
    incompatibleCombat: ['WHEELED'],
    incompatibleSupport: [],
  });
  assert.equal(
    motiveCompatibility({
      motiveIncompatible: [],
      motiveIncompatibleSupport: [],
    }),
    null,
  );
  assert.throws(() => motiveCompatibility({ kind: 'weapons' }));
  const text = `{\n  "items": [\n    {\n      "id": "x",\n      "criticalSlots": 1,\n      "vehicleSlots": { "tank": 1, "supportVehicle": 1 },\n      "weight": 1\n    }\n  ]\n}\n`;
  const value = motiveCompatibility(restricted);
  const once = insertField(text, 'x', value, 'motiveCompatibility');
  assert.match(
    once,
    /"vehicleSlots": \{[^}]*\},\n {6}"motiveCompatibility": \{"incompatibleCombat":\["WHEELED"\],"incompatibleSupport":\[\]\},\n {6}"weight"/,
  );
  assert.equal(insertField(once, 'x', value, 'motiveCompatibility'), once);
});

test('committed imagers carry the pinned Java motive restrictions', () => {
  const items = JSON.parse(
    readFileSync(
      'public/data/equipment/official/miscellaneous/java-registry.json',
      'utf8',
    ),
  ).items.concat(
    JSON.parse(
      readFileSync(
        'public/data/equipment/official/miscellaneous/other.json',
        'utf8',
      ),
    ).items,
  );
  // MiscType.java:6437 (F_INFRARED_IMAGER); TestTank.java:522-526 allows it only
  // on VTOLs and aerodynes, so every other ground mode is incompatible.
  const ground =
    'TRACKED WHEELED HOVER NAVAL HYDROFOIL SUBMARINE WIGE RAIL MAGLEV'.split(
      ' ',
    );
  assert.deepEqual(
    items.find((item) => item.id === 'infraredimager')?.motiveCompatibility,
    {
      incompatibleCombat: ground,
      incompatibleSupport: ground,
    },
  );
});

// Follow-up 112: only one sweep-facts extraction reproduces the committed
// catalog, so vehicle-slots.mjs checks its inputs against source-pins.json the
// way generate.mjs does, and the generator's provenance records the same pins.
const pins = JSON.parse(
  readFileSync(new URL('./source-pins.json', import.meta.url), 'utf8'),
);

test('the sweep facts that reproduce the catalog are pinned', () => {
  assert.equal(
    pins['sweep-facts-3.json'],
    '2bec8e4219ad3ff34689a40259ce4fd350f22535de2843cfb76066e192e55e49',
  );
});

test('a vehicle-slots input that differs from its pin is rejected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vehicle-slots-pins-'));
  const file = join(dir, 'sweep-facts-3.json');
  writeFileSync(file, '{}');
  assert.throws(
    () => assertPinnedInputs([file], pins),
    /Pinned input changed: sweep-facts-3.json/,
  );
  assert.throws(
    () => assertPinnedInputs([join(dir, 'unpinned.json')], pins),
    /Pinned input changed: unpinned.json/,
  );
});

test('the generator provenance records exactly the pinned inputs', () => {
  const provenance = JSON.parse(
    readFileSync(new URL('./provenance.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(provenance.inputs, pins);
});
