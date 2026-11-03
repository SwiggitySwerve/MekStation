import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';
import { UNIT_FAMILIES } from '@/types/unit/UnitIndex';
import {
  migratePortableUnitDocument,
  serializePortableUnitDocument,
} from '@/utils/serialization/portableUnitDocument';

import atlas from '../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { generatePortableUnitExamples } from '../../../../scripts/generate-portable-unit-examples';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string, base: string) =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public', base.replace(/^\/+/, ''), file),
        'utf8',
      ),
    ),
}));

it('migrates an unversioned family-less reference as a BattleMech without mutating input', () => {
  const before = JSON.stringify(atlas);
  const result = migratePortableUnitDocument(atlas, atlas.id);
  expect(result).toMatchObject({
    schemaVersion: '1.0.0',
    family: 'battlemechs',
    id: atlas.id,
  });
  expect(JSON.stringify(atlas)).toBe(before);
  expect(migratePortableUnitDocument(result, atlas.id)).toEqual(result);
});

it.each(['vehicles', 'aerospace'] as const)(
  'requires explicit %s identity and refuses conflicting references',
  (family) => {
    const source = {
      id: 'same-id',
      unitType: family === 'vehicles' ? 'Vehicle' : 'Aerospace',
    };
    expect(
      migratePortableUnitDocument(source, { id: source.id, family }),
    ).toMatchObject({ family });
    expect(() => migratePortableUnitDocument(source, source.id)).toThrow(
      /family/i,
    );
    expect(() =>
      migratePortableUnitDocument(source, { id: 'other', family }),
    ).toThrow(/identity/i);
    expect(() =>
      migratePortableUnitDocument(
        { ...source, family: 'capital' },
        { id: source.id, family },
      ),
    ).toThrow(/family/i);
  },
);

it('retires only cached turret weights and retains live and unknown extension values', () => {
  const live = { type: 'Single', rotationArc: 180, 'org.example:note': 3 };
  const turret = { ...live, currentWeight: 'stale', maxWeight: -1 };
  const source = {
    id: 'tank',
    unitType: 'Vehicle',
    turret,
    vehicleEditor: { turret, secondaryTurret: turret },
  };
  const result = migratePortableUnitDocument(source, 'vehicles:tank');
  expect(result).toMatchObject({
    turret: live,
    vehicleEditor: { turret: live, secondaryTurret: live },
  });
  expect(JSON.stringify(result)).not.toMatch(/currentWeight|maxWeight/);
  expect(source.turret.currentWeight).toBe('stale');
});

it.each(['flat', 'root allocation', 'display type'])(
  'wraps older Mech %s armor without changing points',
  (kind) => {
    const { armor, ...rest } = atlas;
    const legacy =
      kind !== 'root allocation'
        ? {
            ...rest,
            armor: armor.allocation,
            armorType: kind === 'display type' ? 'Standard' : armor.type,
          }
        : { ...rest, armorAllocation: armor.allocation, armorType: armor.type };
    const result = migratePortableUnitDocument(legacy, atlas.id);
    expect(result.armor).toEqual(armor);
    expect(result).not.toHaveProperty('armorAllocation');
    expect(result).not.toHaveProperty('armorType');
  },
);

it.each(['vehicles', 'aerospace'] as const)(
  'migrates older %s allocation and BAR identity',
  (family) => {
    const field = family === 'vehicles' ? 'byLocation' : 'byArc';
    const source = {
      id: 'bar',
      unitType: family === 'vehicles' ? 'Support Vehicle' : 'Aerospace',
      subType: 'FixedWingSupport',
      armor: { type: 'BAR_7', allocation: { BODY: 0, FRONT: 9 } },
    };
    expect(
      migratePortableUnitDocument(source, { id: 'bar', family }).armor,
    ).toEqual({ type: 'BAR', barRating: 7, [field]: { BODY: 0, FRONT: 9 } });
  },
);

it('lifts an explicit legacy BAR rating, retaining zero armor points', () => {
  const source = {
    id: 'bar',
    unitType: 'Support Vehicle',
    barRating: 4,
    armor: { type: 'BAR', byLocation: { FRONT: 0 } },
  };
  const result = migratePortableUnitDocument(source, 'vehicles:bar');
  expect(result.armor).toEqual({
    type: 'BAR',
    barRating: 4,
    byLocation: { FRONT: 0 },
  });
  expect(result).not.toHaveProperty('barRating');
});

it('retains an unknown legacy BAR rating without substituting zero', () => {
  const source = {
    id: 'unknown-bar',
    unitType: 'Support Vehicle',
    barRating: null,
    armor: { type: 'BAR', byLocation: { FRONT: 0 } },
    vehicleEditor: { barRating: null },
  };
  expect(
    migratePortableUnitDocument(source, 'vehicles:unknown-bar').armor,
  ).not.toHaveProperty('barRating');
  expect(
    migratePortableUnitDocument(
      { ...source, armor: { ...source.armor, barRating: 7 } },
      'vehicles:unknown-bar',
    ).armor,
  ).toHaveProperty('barRating', 7);
});

it('rejects conflicting or unusable legacy facts rather than silently replacing them', () => {
  for (const armor of [
    { type: 'BAR_7', barRating: 6, byLocation: { FRONT: 1 } },
    { type: 'BAR', barRating: 0, byLocation: { FRONT: 1 } },
    { type: 'STANDARD', allocation: { FRONT: 2 }, byLocation: { FRONT: 1 } },
  ])
    expect(() =>
      migratePortableUnitDocument(
        { id: 'bad', unitType: 'Support Vehicle', armor },
        'vehicles:bad',
      ),
    ).toThrow();
});

it('retains compatible newer versions and opaque fields on read, and stamps current on write', () => {
  const source = {
    ...atlas,
    schemaVersion: '1.99.2',
    'org.example:data': { value: 0 },
  };
  expect(migratePortableUnitDocument(source, atlas.id)).toMatchObject(source);
  expect(
    JSON.parse(serializePortableUnitDocument(source, atlas.id)),
  ).toMatchObject({ schemaVersion: '1.0.0', 'org.example:data': { value: 0 } });
});

it.each(['2.0.0', '0.9.0', '1.0.0-beta'])(
  'rejects %s before migration',
  (schemaVersion) => {
    expect(() =>
      migratePortableUnitDocument({ ...atlas, schemaVersion }, atlas.id),
    ).toThrow(/schemaVersion.*supported major 1/);
  },
);

it('fills only a missing legacy armor type and refuses a conflicting declared type', () => {
  expect(
    migratePortableUnitDocument(
      { ...atlas, armor: { allocation: atlas.armor.allocation } },
      atlas.id,
    ).armor,
  ).toEqual(atlas.armor);
  expect(() =>
    migratePortableUnitDocument({ ...atlas, armorType: 'HARDENED' }, atlas.id),
  ).toThrow(/Conflicting/);
});

it('accepts equivalent armor maps regardless of JSON object order', () => {
  const source = {
    id: 'tank',
    unitType: 'Vehicle',
    armor: {
      type: 'STANDARD',
      byLocation: { FRONT: 1, REAR: 0 },
      allocation: { REAR: 0, FRONT: 1 },
    },
  };
  expect(migratePortableUnitDocument(source, 'vehicles:tank').armor).toEqual({
    type: 'STANDARD',
    byLocation: { FRONT: 1, REAR: 0 },
  });
});

it('reproduces all seven catalog-derived examples and their portable round trips', async () => {
  const examples = await generatePortableUnitExamples();
  expect(await generatePortableUnitExamples()).toEqual(examples);
  expect(Object.keys(examples).sort()).toEqual([...UNIT_FAMILIES].sort());
  for (const family of UNIT_FAMILIES) {
    const document = JSON.parse(examples[family]);
    const committed = fs.readFileSync(
      path.join(process.cwd(), 'docs/data/examples', `${family}.json`),
      'utf8',
    );
    expect(committed).toBe(examples[family]);
    expect(UnitContract.safeParse(document).success).toBe(true);
    const reference = { family, id: document.id };
    expect(migratePortableUnitDocument(document, reference)).toEqual(document);
    expect(
      JSON.parse(serializePortableUnitDocument(document, reference)),
    ).toEqual(document);
  }
});
