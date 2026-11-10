import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { before, test } from 'node:test';

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const catalog = read('public/data/equipment/official/miscellaneous/other.json');
const mappings = read('public/data/equipment/name-mappings.json');
const baseline = read(new URL('./baseline.json', import.meta.url));
const require = createRequire(import.meta.url);
require('tsx/cjs/api').register();
const {
  getEquipmentRegistry,
} = require('../../src/services/equipment/EquipmentRegistry.ts');
const {
  getEquipmentLookupService,
} = require('../../src/services/equipment/EquipmentLookupService.ts');
const {
  parseCriticalSlotToken,
  resolveEquipmentId,
} = require('../../src/services/units/unitLoaderService/equipmentResolution.ts');
const { TechBase } = require('../../src/types/enums/TechBase.ts');
const {
  TechBaseMode,
} = require('../../src/types/construction/TechBaseConfiguration.ts');

before(async () => {
  globalThis.fetch = async (input) => ({
    ok: true,
    status: 200,
    json: async () =>
      read(
        resolve(
          'public',
          '.' + new URL(String(input), 'http://local').pathname,
        ),
      ),
  });
  assert.equal(await getEquipmentRegistry().initialize(), 'ready');
  await getEquipmentLookupService().initialize();
  assert.equal(getEquipmentLookupService().getDataSource(), 'json');
});

// MiscType.java:4839-4869, MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587.
// Native getter probe: CLCASEII; the display name is its native Clan lookup name.
test('Clan CASE II has the pinned native identity, mass and fixed properties', () => {
  const item = catalog.items.find((entry) => entry.id === 'clan-caseii');
  assert.ok(item, 'Missing plain Clan CASE II identity');
  assert.deepEqual(
    Object.fromEntries(
      [
        'id',
        'name',
        'category',
        'techBase',
        'rulesLevel',
        'weight',
        'criticalSlots',
        'costCBills',
        'battleValue',
        'introductionYear',
      ].map((key) => [key, item[key]]),
    ),
    {
      id: 'clan-caseii',
      name: 'Clan CASE II',
      category: 'Miscellaneous',
      techBase: 'CLAN',
      rulesLevel: 'STANDARD',
      weight: 0.5,
      criticalSlots: 1,
      costCBills: 175000,
      battleValue: 0,
      introductionYear: 3062,
    },
  );
});

test('the added plain identity has exactly one frozen baseline row', () => {
  const index = catalog.items.findIndex((item) => item.id === 'clan-caseii');
  const rows = baseline.filter((row) => row.id === 'clan-caseii');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].file, 'miscellaneous/other.json');
  assert.equal(rows[0].index, index);
  assert.deepEqual(rows[0].item, catalog.items[index]);
  assert.equal(
    rows[0].sha256,
    hash('sha256', JSON.stringify(catalog.items[index])),
  );
});

test('IS CASE II and its generic name retain the original one-ton identity', () => {
  const item = catalog.items.find((entry) => entry.id === 'caseii');
  assert.equal(item.techBase, 'INNER_SPHERE');
  assert.equal(item.weight, 1);
  assert.equal(mappings['CASE II'], 'caseii');
  assert.equal(mappings.ISCASEII, 'caseii');
  assert.deepEqual(baseline.find((row) => row.id === 'caseii').item, item);
});

for (const name of ['CLCASEII', 'Clan CASE II']) {
  test(`the existing name owner gives ${name} its Clan identity`, () =>
    assert.equal(mappings[name], 'clan-caseii'));
}

const check = (name, techBase, mode, slots, expectedId, expectedMass) => {
  const token = parseCriticalSlotToken(name).lookupToken;
  const result = resolveEquipmentId(token, techBase, mode, slots);
  assert.equal(result.equipmentDef?.id, expectedId);
  assert.equal(result.equipmentDef?.weight, expectedMass);
};

for (const [name, tech, mode, id, mass] of [
  ['ISCASEII', TechBase.INNER_SPHERE, TechBaseMode.INNER_SPHERE, 'caseii', 1],
  ['CLCASEII', TechBase.CLAN, TechBaseMode.CLAN, 'clan-caseii', 0.5],
  ['Clan CASE II', TechBase.CLAN, TechBaseMode.CLAN, 'clan-caseii', 0.5],
  ['CASE II', TechBase.INNER_SPHERE, TechBaseMode.INNER_SPHERE, 'caseii', 1],
  ['CASE II', TechBase.CLAN, TechBaseMode.CLAN, 'clan-caseii', 0.5],
  ['caseii', TechBase.CLAN, TechBaseMode.CLAN, 'clan-caseii', 0.5],
]) {
  for (const slots of [undefined, [name]]) {
    test(`existing variants select ${name} in ${mode}, slots=${Boolean(slots)}`, () =>
      check(name, tech, mode, slots, id, mass));
  }
}

for (const tech of [TechBase.INNER_SPHERE, TechBase.CLAN]) {
  for (const [native, id, mass] of [
    ['ISCASEII', 'caseii', 1],
    ['CLCASEII', 'clan-caseii', 0.5],
  ]) {
    for (const suffix of ['', ' (OMNIPOD)']) {
      test(`mixed ${tech} preserves ${native}${suffix} through native slot hints`, () => {
        const slots = [native + suffix];
        check(native + suffix, tech, TechBaseMode.MIXED, slots, id, mass);
        check('caseii', tech, TechBaseMode.MIXED, slots, id, mass);
      });
    }
  }
}

test('direct lookup of the canonical Clan identity retains the half-ton mass', () => {
  assert.equal(getEquipmentLookupService().getById('clan-caseii')?.weight, 0.5);
});
