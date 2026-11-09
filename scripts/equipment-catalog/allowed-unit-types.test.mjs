import assert from 'node:assert/strict';
import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { before, test } from 'node:test';

import source from './allowed-unit-types-source.json' with { type: 'json' };
import {
  appendUnitTypeField,
  planUnitTypeUpdates,
  updateBaselineText,
} from './allowed-unit-types.mjs';

const require = createRequire(import.meta.url);
require('tsx/cjs/api').register();
const {
  EquipmentLoaderService,
} = require('../../src/services/equipment/EquipmentLoaderService.ts');
const { UnitType } = require('../../src/types/unit/BattleMechInterfaces.ts');
const {
  isUnitTypeAllowed,
} = require('../../src/services/validation/rules/equipment/EquipmentUnitTypeRuleTypes.ts');
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const root = resolve('public/data/equipment/official');
const baseline = read(new URL('./baseline.json', import.meta.url));
const loader = new EquipmentLoaderService();
const unitTypes = Object.values(UnitType);

before(async () => {
  const result = await loader.loadOfficialEquipment();
  assert.equal(result.success, true, JSON.stringify(result));
});

function example() {
  const entry = structuredClone(source.entries[0]);
  const item = {
    id: entry.id,
    weight: 0,
    battleValue: -1,
    special: ['preserve'],
  };
  const other = { id: 'untouched', rulesLevel: 'INTRODUCTORY' };
  const documents = new Map([[entry.file, { items: [item, other] }]]);
  const freeze = (value, index) => ({
    id: value.id,
    file: entry.file,
    index,
    item: structuredClone(value),
    sha256: hash('sha256', JSON.stringify(value)),
  });
  return {
    manifest: { ...source, entries: [entry] },
    facts: Object.fromEntries(
      entry.javaNames.map((name) => [
        name,
        { kind: 'weapons', allowedUnitTypes: entry.allowedUnitTypes },
      ]),
    ),
    documents,
    baseline: [freeze(item, 0), freeze(other, 1)],
  };
}

const plan = ({ manifest, facts, documents, baseline }) =>
  planUnitTypeUpdates(manifest, facts, documents, baseline);

test('field insertion preserves inline quantities and rejects ambiguous records', () => {
  const original =
    '{\n  "items": [\n    {\n      "id": "x",\n      "ranges": { "short": 3 },\n      "weight": 1\n    }\n  ]\n}\n';
  const result = appendUnitTypeField(original, 'x', ['Infantry']);
  assert.equal(
    result,
    original.replace(
      '"weight": 1',
      '"weight": 1,\n      "allowedUnitTypes": ["Infantry"]',
    ),
  );
  assert.throws(
    () => appendUnitTypeField(original, 'unknown', ['Infantry']),
    /Ambiguous item/,
  );
  assert.throws(
    () => appendUnitTypeField(original + original, 'x', ['Infantry']),
    /Ambiguous item/,
  );
});

test('baseline rendering distinguishes weapon and ammunition records sharing an id', () => {
  const weapon = {
    file: 'weapons/ballistic-autocannon.json',
    index: 0,
    id: 'shared',
    sha256: 'weapon-before',
    item: { id: 'shared', weight: 1 },
  };
  const ammo = {
    ...weapon,
    file: 'ammunition/autocannon.json',
    sha256: 'ammo-before',
  };
  const after = {
    ...weapon,
    sha256: 'weapon-after',
    item: { ...weapon.item, allowedUnitTypes: ['Infantry'] },
  };
  const original = JSON.stringify([weapon, ammo], null, 2);
  const rendered = updateBaselineText(original, weapon, after, ['Infantry']);
  assert.deepEqual(JSON.parse(rendered), [after, ammo]);
  assert(
    rendered.includes(
      JSON.stringify(ammo, null, 2)
        .split('\n')
        .slice(1, -1)
        .map((line) => '  ' + line)
        .join('\n'),
    ),
  );
});

test('the field update preserves other records and values, and reruns are no-ops', () => {
  const input = example();
  const before = structuredClone(input);
  const result = plan(input);
  assert.deepEqual(input, before, 'Planning must not mutate its inputs');
  const entry = input.manifest.entries[0];
  const changed = result.documents.get(entry.file).items[0];
  const { allowedUnitTypes, ...unchanged } = changed;
  assert.deepEqual(unchanged, input.documents.get(entry.file).items[0]);
  assert.deepEqual(allowedUnitTypes, entry.allowedUnitTypes);
  assert.deepEqual(result.baseline[1], input.baseline[1]);
  assert.deepEqual(result.baseline[0].item, changed);
  assert.equal(
    result.baseline[0].sha256,
    hash('sha256', JSON.stringify(changed)),
  );
  const again = plan({ ...input, ...result });
  assert.deepEqual(again.changed, []);
  assert.deepEqual(again.documents, result.documents);
  assert.deepEqual(again.baseline, result.baseline);
});

for (const [label, mutate, error] of [
  [
    'wrong revision',
    (x) => {
      x.manifest.revision = 'wrong';
    },
    /Wrong Java revision/,
  ],
  [
    'unknown id',
    (x) => {
      x.manifest.entries[0].id = 'absent';
    },
    /catalog id/,
  ],
  [
    'duplicate id',
    (x) => {
      x.manifest.entries.push(x.manifest.entries[0]);
    },
    /Duplicate approved id/,
  ],
  [
    'held empty list',
    (x) => {
      x.manifest.entries[0].allowedUnitTypes = [];
    },
    /Held empty list/,
  ],
  [
    'missing identity',
    (x) => {
      x.manifest.entries[0].javaNames = [];
    },
    /Missing Java identity/,
  ],
  [
    'non-weapon',
    (x) => {
      Object.values(x.facts)[0].kind = 'ammunition';
    },
    /Not a pinned WeaponType/,
  ],
  [
    'conflicting flags',
    (x) => {
      Object.values(x.facts)[0].allowedUnitTypes = ['Infantry'];
    },
    /Conflicting pinned flags/,
  ],
  [
    'stale baseline',
    (x) => {
      x.baseline[0].item.weight = 10;
    },
    /Stale baseline/,
  ],
  [
    'invalid baseline hash',
    (x) => {
      x.baseline[0].sha256 = 'bad';
    },
    /Invalid baseline hash/,
  ],
  [
    'escaped catalog path',
    (x) => {
      x.manifest.entries[0].file = '../outside.json';
    },
    /Unapproved catalog path/,
  ],
]) {
  test(`reject ${label} before mutating inputs`, () => {
    const input = example();
    mutate(input);
    const before = structuredClone(input);
    assert.throws(() => plan(input), error);
    assert.deepEqual(input, before);
  });
}

test('the pinned applicability manifest has unique nonempty weapon lists', () => {
  assert(source.entries.length > 0);
  const ids = new Set();
  for (const entry of source.entries) {
    assert(!ids.has(entry.id), `Duplicate ${entry.id}`);
    ids.add(entry.id);
    assert(entry.allowedUnitTypes.length > 0, `Held empty list: ${entry.id}`);
    assert(entry.allowedUnitTypes.every((type) => unitTypes.includes(type)));
    assert(entry.javaNames.length > 0 && entry.source.length > 0);
    assert(entry.source.every((citation) => citation.lines.length > 0));
  }
});

for (const entry of source.entries) {
  test(`${entry.id} retains pinned applicability in catalog, baseline and runtime`, () => {
    const item = read(resolve(root, entry.file)).items.find(
      (candidate) => candidate.id === entry.id,
    );
    const flags = entry.allowedUnitTypes;
    assert.deepEqual(
      item?.allowedUnitTypes,
      flags,
      `${entry.javaNames.join(', ')} at ${source.revision}: ${JSON.stringify(entry.source)}`,
    );
    const frozen = baseline.find(
      (row) => row.file === entry.file && row.id === entry.id,
    );
    assert(frozen, `Missing baseline: ${entry.id}`);
    assert.deepEqual(frozen.item, item);
    assert.equal(frozen.sha256, hash('sha256', JSON.stringify(item)));
    const electronics = entry.file.startsWith('electronics/');
    const parsed = electronics
      ? loader.getElectronicsById(entry.id)
      : loader.getWeaponById(entry.id);
    assert(parsed, `Loader omitted ${entry.id}`);
    assert.deepEqual(parsed.allowedUnitTypes, flags);
    for (const unitType of unitTypes) {
      const admitted = (
        electronics
          ? loader.searchElectronics({ unitType })
          : loader.searchWeapons({ unitType })
      ).some((candidate) => candidate.id === entry.id);
      assert.equal(admitted, flags.includes(unitType), unitType);
      assert.equal(
        isUnitTypeAllowed(unitType, parsed.allowedUnitTypes),
        flags.includes(unitType),
        `${entry.id} validation on ${unitType}`,
      );
    }
  });
}
