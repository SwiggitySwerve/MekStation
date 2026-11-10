import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { generateEntries } from './generate.mjs';
import { retainNativeTechnologyReferences } from './technology-advancement.mjs';
function assertAdditive(before, after) {
  const byId = (items, id) =>
    JSON.stringify(items.filter((entry) => entry.id === id));
  for (const id of new Set(before.map((entry) => entry.id)))
    assert.equal(
      byId(after, id),
      byId(before, id),
      `Changed or removed existing id ${id}`,
    );
}

const { java, facts, lookups, intrinsicExamples } = JSON.parse(
  readFileSync(new URL('./source-fixture.json', import.meta.url), 'utf8'),
);
const gaps = [{ java }];
const alias = java.aliases[0];
const run = (existing = [], mappings = {}) =>
  generateEntries([java], gaps, facts, lookups, existing, mappings);

test('metadata-absent registry regeneration retains the complete old result', () => {
  const result = run();
  const before = structuredClone(result);
  result.items = retainNativeTechnologyReferences(
    result.items,
    new Map([
      [
        'ammunition/java-registry.json',
        { items: result.items.map((row) => row.entry) },
      ],
    ]),
  );
  assert.deepEqual(result, before);
});

test('metadata preflight precedes every full-generation write and leaves aliases-only alone', () => {
  const source = readFileSync(
    new URL('./generate.mjs', import.meta.url),
    'utf8',
  );
  const full = source.slice(source.indexOf('  const documents = new Map('));
  assert(
    full.indexOf('result.items = retainNativeTechnologyReferences') <
      full.indexOf('write(expectationsFile'),
  );
  assert(
    source.indexOf("process.argv.includes('--aliases-only')") <
      source.indexOf('  const documents = new Map('),
  );
});

test('a registry gap becomes a cited ammo entry with Java aliases and exact per-shot mass', () => {
  const result = run();
  assert.equal(result.items[0].entry.kgPerShot, 24.99);
  assert.equal(result.items[0].entry.battleValue, 4);
  assert.equal(result.aliases[alias], result.items[0].entry.id);
  assert.equal(JSON.stringify(result), JSON.stringify(run()));
  assert(
    !run([{ id: 'old' }], { [alias.toUpperCase()]: 'old' }).aliases[alias],
  );
  const id = result.items[0].entry.id;
  assert.equal(
    run([], { [alias]: id }).aliases[alias],
    id,
    'previously emitted aliases are regenerated',
  );
  assert.equal(
    run([], { [alias]: 'unrepresented-placeholder' }).aliases[alias],
    id,
  );
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
test('kits need no gap tokens and represented prototypes keep their Java values', () => {
  for (const { java, facts, techBase, damageDivisor } of intrinsicExamples) {
    const { items } = generateEntries(
      [java],
      facts[java.internalName]?.isPrototype ? [{ java }] : [],
      facts,
      {},
      [],
      {},
    );
    assert.equal(items[0]?.entry.battleValue, java.bv);
    assert.equal(items[0]?.entry.techBase, techBase);
    assert.equal(items[0]?.entry.damageDivisor, damageDivisor);
  }
});
test('Java case variants do not create duplicate alias keys', () => {
  const variant = { ...java, aliases: [...java.aliases, alias.toUpperCase()] };
  const { aliases } = generateEntries([variant], gaps, facts, lookups, [], {});
  const keys = Object.keys(aliases).map((key) => key.toLowerCase());
  assert.equal(new Set(keys).size, keys.length);
});

test('unregistered gap tokens never become Java lookup aliases', () => {
  const invented = `1-${alias}`;
  const { aliases } = generateEntries(
    [java],
    [{ java, inputs: [{ id: invented }] }],
    facts,
    lookups,
    [],
    {},
  );
  assert.equal(aliases[invented], undefined);
});

test('committed generated entries conform to schemas and preserve every baseline item', () => {
  const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
  const root = 'public/data/equipment/official/';
  const index = read(root + 'index.json');
  const weapons = Object.values(index.files.weapons).flatMap(
    (file) => read(root + file).items,
  );
  assert.equal(
    index.totalItems.weapons,
    weapons.filter((item) => item.ranges).length,
    'weapon count retains the existing ranged-only index contract',
  );
  const baseline = read(new URL('./baseline.json', import.meta.url));
  assertAdditive(
    baseline.map((row) => row.item),
    baseline.map((row) => read(root + row.file).items[row.index]),
  );
  for (const row of baseline) {
    assert.equal(hash('sha256', JSON.stringify(row.item)), row.sha256);
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

test('Java weapon compatibility never points at a similarly valued misc record', () => {
  // Pinned Java registry ISAPDS: BV 64, tons 3; ISAPDS Ammo must not reference misc-only risc-apds.
  const weapon = {
    internalName: 'ISAPDS',
    name: 'RISC Advanced Point Defense System',
    aliases: ['ISAPDS'],
    javaClass: 'megamek.common.weapons.other.innerSphere.ISAPDS',
    tech: 'IS',
    bv: 64,
    tons: 3,
  };
  const sourceFacts = {
    ...facts,
    [java.internalName]: {
      ...facts[java.internalName],
      compatible: ['ISAPDS'],
    },
    ISAPDS: { kind: 'weapons' },
  };
  const { items } = generateEntries(
    [java, weapon],
    gaps,
    sourceFacts,
    lookups,
    [
      {
        id: 'risc-apds',
        name: weapon.name,
        battleValue: 64,
        weight: 3,
        techBase: 'INNER_SPHERE',
      },
    ],
    { ISAPDS: 'risc-apds' },
  );
  assert.deepEqual(items[0].entry.compatibleWeaponIds, []);
});

test('Java weapon aliases are case-insensitive and ALL technology accepts the represented IS record', () => {
  // Pinned CLLRM15 is BV 164 / 3.5 t; IS LRM 15 is BV 136 / 7 t with Java tech ALL.
  for (const [internalName, alias, tech, bv, tons, id, techBase] of [
    ['CLLRM15', 'CLLRM15', 'CLAN', 164, 3.5, 'clan-lrm-15', 'CLAN'],
    ['LRM 15', 'ISLRM15', 'ALL', 136, 7, 'lrm-15', 'INNER_SPHERE'],
  ]) {
    const weapon = {
      internalName,
      name: 'LRM 15',
      aliases: [alias],
      javaClass: 'megamek.common.weapons.lrms.' + alias,
      tech,
      bv,
      tons,
    };
    const sourceFacts = {
      ...facts,
      [java.internalName]: {
        ...facts[java.internalName],
        compatible: [internalName],
      },
      [internalName]: { kind: 'weapons' },
    };
    for (const mappings of [{ [alias.toLowerCase()]: id }, {}]) {
      const { items } = generateEntries(
        [java, weapon],
        gaps,
        sourceFacts,
        lookups,
        [
          {
            id,
            battleValue: bv,
            weight: tons,
            techBase,
            ranges: { short: 7, medium: 14, long: 21 },
          },
        ],
        mappings,
      );
      assert.deepEqual(items[0].entry.compatibleWeaponIds, [id]);
    }
  }
});

test('Java ALL technology does not put one-shot launchers ahead of standard ammo pools', () => {
  const rows = JSON.parse(
    readFileSync(
      'public/data/equipment/official/ammunition/java-registry.json',
    ),
  ).items;
  // Pinned registry: IS Ammo LRM-15 Artemis-capable; Clan Ammo LRM-15/20.
  for (const [id, weapon, bv, shots] of [
    ['is-ammo-lrm-15-artemis-capable-registry', 'lrm-15', 17, 8],
    ['clan-ammo-lrm-15-registry', 'clan-lrm-15', 21, 8],
    ['clan-ammo-lrm-20-registry', 'clan-lrm-20', 27, 6],
  ]) {
    const row = rows.find((row) => row.id === id);
    assert.equal(row.compatibleWeaponIds[0], weapon, id);
    assert.equal(row.battleValue, bv);
    assert.equal(row.weight, 1);
    assert.equal(row.shotsPerTon, shots);
  }
});

test('cannon ammo retains its exact weapon identity despite separately tracked legacy mass errors', () => {
  // Pinned SniperCannon.java:76-78 and ThumperCannon.java:76-78;
  // existing records stay unchanged while their new ammo references them.
  for (const [id, name, bv, tons, existingTons] of [
    ['sniper-cannon', 'Sniper Cannon', 77, 15, 20],
    ['thumper-cannon', 'Thumper Cannon', 41, 10, 15],
  ]) {
    const weapon = {
      internalName: name,
      name,
      aliases: [name],
      tech: 'IS',
      bv,
      tons,
    };
    const before = [
      {
        id,
        name,
        battleValue: bv,
        weight: existingTons,
        techBase: 'INNER_SPHERE',
        ranges: { short: 4, medium: 8, long: 12 },
      },
    ];
    const original = JSON.stringify(before);
    const { items } = generateEntries(
      [java, weapon],
      gaps,
      {
        ...facts,
        [java.internalName]: {
          ...facts[java.internalName],
          compatible: [name],
        },
        [name]: { kind: 'weapons' },
      },
      lookups,
      before,
      { [name]: id },
    );
    assert.deepEqual(items[0].entry.compatibleWeaponIds, [id]);
    assert.equal(JSON.stringify(before), original);
  }
});

test('Java BA ammo records gain only per-shot mass; unrepresented types are not added', () => {
  // AmmoType.F_BATTLEARMOR (AmmoType.java:282) ammo is valued per shot,
  // BattleArmorBVCalculator.java:329-331 and AmmoType.java:17103-17105.
  const name = java.internalName;
  const baFacts = (battleArmor) => ({
    ...facts,
    [name]: { ...facts[name], usedByProto: false, battleArmor },
  });
  const existing = [
    {
      id: 'old-ba-ammo',
      name: java.name,
      battleValue: 4,
      weight: 1,
      techBase: 'CLAN',
    },
  ];
  const mappings = { [name]: 'old-ba-ammo' };
  const run = (battleArmor, before) =>
    generateEntries(
      [java],
      [],
      baFacts(battleArmor),
      lookups,
      before,
      mappings,
    );
  const represented = run(true, existing);
  assert.deepEqual(represented.items, []);
  assert.deepEqual(represented.perShot, { 'old-ba-ammo': 24.99 });
  const missing = run(true, []);
  assert.deepEqual([missing.items, missing.perShot], [[], {}]);
  const notBA = run(false, existing);
  assert.deepEqual([notBA.items, notBA.perShot], [[], {}]);
});

test('committed BA ammo records carry the pinned Java per-shot mass', () => {
  const rows = ['srm.json', 'mrm.json'].flatMap(
    (file) =>
      JSON.parse(
        readFileSync(`public/data/equipment/official/ammunition/${file}`),
      ).items,
  );
  // AmmoType.java BA SRM-2/SRM-4 (20/40 kg) and IS MRM 1 Ammo (5 kg).
  for (const [id, kg] of [
    ['ba-srm2', 20],
    ['ba-srm4', 40],
    ['mrm-1', 5],
  ])
    assert.equal(rows.find((row) => row.id === id)?.kgPerShot, kg, id);
});
