import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expectJavaCatalogAddition } from '@/__tests__/helpers/equipmentJavaAdditions.test-helpers';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { mapCapitalDefinitionToView } from '@/services/units/unitLoaderService/capitalShipView';
import { getUnitTypeRegistry } from '@/services/units/UnitTypeRegistry';
import { UnitContract } from '@/types/contracts';
import { aerospaceBays } from '@/utils/construction/aerospace/sourceBays';
import { validateAerospaceSource } from '@/utils/construction/aerospace/sourceValidation';
import {
  aerospaceSourceWeight,
  sourceArmor,
  type Source,
} from '@/utils/construction/aerospace/sourceWeight';
import { getEquipmentEntry } from '@/utils/construction/equipmentBVResolver';

import { initializeUnitTypeHandlers } from '../initializeHandlers';
import fixtures from './fixtures/aerospace-capital-validity.json';

beforeAll(() => initializeUnitTypeHandlers());
const parser = new BlkParserService();
it.each(fixtures.rows)(
  'matches pinned Java validity and reason: $path',
  (row) => {
    expect(createHash('sha256').update(row.content).digest('hex')).toBe(
      row.sha256,
    );
    const parsedDocument = parser.parse(row.content);
    if (!parsedDocument.success)
      throw new Error(JSON.stringify(parsedDocument.error));
    const handler = getUnitTypeRegistry().getHandlerForDocument(
      parsedDocument.data.document,
    );
    if (!handler) throw new Error(row.path);
    const parsed = handler.parse(parsedDocument.data.document);
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    const validation = handler.validate(parsed.data.unit);
    expect(validation.isValid).toBe(row.valid);
    for (const diagnostic of row.diagnostics.split('\n').filter(Boolean))
      expect(validation.errors.join('\n')).toContain(diagnostic);
    expect(parsed.data.unit.isValid).toBe(validation.isValid);
    expect(parsed.data.unit.validationErrors).toEqual(validation.errors);
  },
);

const capitals = readdirSync('public/data/units/capital')
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) =>
    JSON.parse(readFileSync(join('public/data/units/capital', f), 'utf8')),
  );
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
it.each(
  fixtures.rows.filter((r) =>
    /^(dropships|jumpships|warship|spacestation)\//.test(r.path),
  ),
)('projects Java diagnostics into the read-only viewer: $path', (row) => {
  const result = parser.parse(row.content);
  if (!result.success) throw new Error(row.path);
  const d = result.data.document;
  const definition = capitals.find(
    (c) => key(c.chassis + c.model) === key(d.name + d.model),
  );
  expect(definition).toBeDefined();
  const before = JSON.stringify(definition);
  const view = mapCapitalDefinitionToView(
    UnitContract.parse(definition),
    'test-view',
  );
  for (const diagnostic of row.diagnostics.split('\n').filter(Boolean))
    expect(view.constructionErrors?.join('\n')).toContain(diagnostic);
  expect(Object.isFrozen(view.constructionErrors)).toBe(true);
  expect(JSON.stringify(definition)).toBe(before);
});
const ship = (overrides: Partial<Source> = {}): Source => ({
  unitType: 'Warship',
  tonnage: 1000,
  year: 3000,
  type: 'IS Level 2',
  armor: [0, 0, 0, 0, 0, 0],
  rawTags: {},
  crew: 6,
  officers: 1,
  transporters: ['crewquarters:42:0:1'],
  ...overrides,
});
it('charges no fighter SI mass above the derived default (Thrush Maximillian)', () => {
  // TestAero.java:1099-1118, MegaMek 48fcb2f64: no fighter SI component.
  const fighter: Source = {
    unitType: 'AeroSpaceFighter',
    tonnage: 25,
    safeThrust: 15,
    year: 3000,
    type: 'IS Level 2',
    armor: [0, 0, 0, 0],
    rawTags: {},
    structuralIntegrity: 15,
  };
  expect(aerospaceSourceWeight(fighter)).toBe(26.5);
  expect(aerospaceSourceWeight({ ...fighter, structuralIntegrity: 3 })).toBe(
    aerospaceSourceWeight(fighter),
  );
});
it('rounds officers up after deducting bay personnel', () => {
  expect(
    validateAerospaceSource(
      ship({ crew: 8, transporters: ['asfbay:1:1:1', 'crewquarters:42:0:2'] }),
    ),
  ).toEqual([]);
  expect(
    validateAerospaceSource(
      ship({ crew: 7, transporters: ['crewquarters:49:0:1'] }),
    ),
  ).toContain('Requires at least 2 officers');
});
it('counts passengers, marines and battle armor but floors each quarters bay separately', () => {
  expect(
    validateAerospaceSource(
      ship({
        passengers: 1,
        marines: 1,
        battlearmor: 1,
        transporters: ['crewquarters:63:0:1'],
      }),
    ),
  ).toEqual([]);
  expect(
    validateAerospaceSource(
      ship({ transporters: ['crewquarters:20:0:1', 'crewquarters:22:0:2'] }),
    ),
  ).toContain('Requires quarters for 6 crew but only has 5');
  expect(
    validateAerospaceSource(
      ship({
        unitType: 'SmallCraft',
        tonnage: 25,
        crew: 99,
        officers: 0,
        transporters: [],
      }),
    ),
  ).toEqual([]);
});
it('requires the last berth for transported passengers and troops', () => {
  expect(
    validateAerospaceSource(
      ship({
        passengers: 1,
        marines: 1,
        battlearmor: 1,
        transporters: ['crewquarters:62:0:1'],
      }),
    ),
  ).toContain('Requires quarters for 9 crew but only has 8');
});

it('checks repair facings and shared placement for both BLK encodings', () => {
  expect(
    aerospaceBays(
      ['navalrepairpressurized:100:1:1:f3', 'dropshuttlebay:100:1:2::-1:0'],
      false,
    ).errors,
  ).toContain('dropshuttlebay is not assigned a legal armor facing.');
  expect(
    aerospaceBays(
      ['navalrepairpressurized:100:1:1:f3', 'dropshuttlebay:100:1:2::3:0'],
      false,
    ).errors,
  ).toContain(
    'Exceeds maximum of one repair facility or drop shuttle bay per armor facing.',
  );
  expect(
    aerospaceBays(
      ['navalrepairpressurized:100:1:1:f3', 'dropshuttlebay:100:1:2::4:0'],
      false,
    ).errors,
  ).toEqual([]);
});
it('preserves Java flooring at the one-point ferro-aluminum boundary', () => {
  const s = ship({
    unitType: 'Dropship',
    tonnage: 18000,
    structuralIntegrity: 25,
    motionType: 'Spheroid',
    type: 'Clan Level 3',
    armorType: 19,
    armor: [1936],
  });
  expect(sourceArmor(s)).toMatchObject({ mass: 90, available: 1935 });
  expect(sourceArmor({ ...s, armor: [1935] })).toMatchObject({
    mass: 90,
    available: 1935,
  });
});
it.each(fixtures.rows.filter((r) => r.diagnostics.startsWith('Weight:')))(
  'includes the omitted native mass terms: $path',
  (row) => {
    const parsed = parser.parse(row.content);
    if (!parsed.success) throw new Error(row.path);
    expect(aerospaceSourceWeight(parsed.data.document)).toBe(
      Number(/^Weight: ([\d.]+)/.exec(row.diagnostics)![1]),
    );
  },
);

it('rejects repair facilities at the first broadside facing', () => {
  expect(
    aerospaceBays(['navalrepairpressurized:100:1:1::7:0'], false).errors,
  ).toContain('navalrepairpressurized is not assigned a legal armor facing.');
});

it.each(fixtures.validCapitalKeys)(
  'checks the supplied canonical facts for Java-valid source %s',
  (name) => {
    const definition = capitals.find((c) => key(c.chassis + c.model) === name);
    expect(definition).toBeDefined();
    const disagreements: Readonly<Record<string, readonly string[]>> =
      fixtures.viewerCatalogDisagreements;
    const errors = mapCapitalDefinitionToView(
      UnitContract.parse(definition),
      'valid-view',
    ).constructionErrors;
    if (name === 'eaglefrigate') {
      // CAT-Q1b corrected ammo-heavy-n-gauss to Java's 0.5 t/shot; no overweight exception remains.
      for (const native of [
        'Naval Laser 35',
        'Naval Laser 45',
        'Naval Autocannon (NAC/35)',
      ])
        expectJavaCatalogAddition(getEquipmentEntry(native), 'bv');
      expect(errors).toEqual([]);
    }
    expect(errors).toEqual(disagreements[name] ?? []);
  },
);
