import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { require as tsxRequire } from 'tsx/cjs/api';

const schemaPath = 'public/data/equipment/_schema/misc-equipment-schema.json';
const catalog = JSON.parse(
  readFileSync(
    'public/data/equipment/official/miscellaneous/other.json',
    'utf8',
  ),
);
const base = catalog.items.find(
  (item) => item.id === 'harjel-repair-systems-harjel-ii',
);
const cases = [
  ...[-2, -1, 0].map((battleValue) => ({
    item: { ...base, battleValue },
    valid: true,
  })),
  { item: { ...base, battleValue: -3 }, valid: false },
  ...[
    'weight',
    'criticalSlots',
    'costCBills',
    'introductionYear',
    'extinctionYear',
    'reintroductionYear',
    'damageDivisor',
  ].map((field) => ({
    item: { ...base, battleValue: 0, [field]: -1 },
    valid: false,
  })),
  ...['tank', 'supportVehicle'].map((field) => ({
    item: {
      ...base,
      battleValue: 0,
      vehicleSlots: { ...base.vehicleSlots, [field]: -1 },
    },
    valid: false,
  })),
];

test('misc JSON Schema admits HarJel negative BV only, down to -2', () => {
  const actual = JSON.parse(
    execFileSync(
      'python',
      [
        '-B',
        '-c',
        'import json,sys; from jsonschema import Draft7Validator; v=Draft7Validator(json.load(open(sys.argv[1]))); print(json.dumps([v.is_valid(x) for x in json.loads(sys.argv[2])]))',
        schemaPath,
        JSON.stringify(cases.map(({ item }) => item)),
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 },
    ),
  );
  assert.deepEqual(
    actual,
    cases.map(({ valid }) => valid),
  );
});

test('the generated misc contract preserves the same numeric constraints', () => {
  const { MiscEquipmentContract } = tsxRequire(
    '../../src/types/contracts/generated/misc-equipment.zod.ts',
    import.meta.url,
  );
  assert.deepEqual(
    cases.map(({ item }) => MiscEquipmentContract.safeParse(item).success),
    cases.map(({ valid }) => valid),
  );
});
