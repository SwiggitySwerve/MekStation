import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { createUnitSession } from '../createUnitSession';
import { normalizeUnitConfiguration } from '../normalizeUnitConfiguration';
import { parseUnit } from '../unitContractAdapter';

it('normalizes the same source deterministically before assigning editor identity', () => {
  const definition = parseUnit(atlas);
  const first = normalizeUnitConfiguration(definition, []);
  const second = normalizeUnitConfiguration(definition, []);
  expect(first).toEqual(second);
  expect(first).toMatchObject({
    chassis: 'Atlas',
    model: 'AS7-D',
    tonnage: 100,
    engineType: EngineType.STANDARD,
    engineRating: 300,
  });
  expect(first).not.toHaveProperty('id');
  expect(first).not.toHaveProperty('createdAt');
});

it('creates independent editor sessions while retaining one source identity', () => {
  const configuration = normalizeUnitConfiguration(parseUnit(atlas), []);
  const reference = { source: 'canonical' as const, id: atlas.id };
  const one = createUnitSession(
    configuration,
    { id: 'editor-one', createdAt: 100 },
    reference,
  );
  const two = createUnitSession(
    configuration,
    { id: 'editor-two', createdAt: 200 },
    reference,
  );
  expect(one).toMatchObject({
    id: 'editor-one',
    createdAt: 100,
    lastModifiedAt: 100,
    isModified: false,
    sourceDefinition: reference,
  });
  expect(two).toMatchObject({
    id: 'editor-two',
    createdAt: 200,
    sourceDefinition: reference,
  });
  one.armorAllocation[MechLocation.HEAD] = 1;
  expect(two.armorAllocation[MechLocation.HEAD]).toBe(9);
  expect(configuration.armorAllocation[MechLocation.HEAD]).toBe(9);
  expect(one.sourceDefinition).not.toBe(reference);
});

// MegaMek 48fcb2f64 MtfFile.java:387-392: a Mixed mek's engine side is its own
// fact. The editor state carries the stated side; the XL token keeps precedence.
it.each([
  ['XXL', { chassis: 'INNER_SPHERE', engine: 'CLAN' }, 'Clan'],
  ['XXL', { chassis: 'CLAN', engine: 'INNER_SPHERE' }, 'Inner Sphere'],
  ['CLAN_XL', { chassis: 'INNER_SPHERE' }, 'Clan'],
  ['XL', { chassis: 'CLAN', engine: 'CLAN' }, 'Inner Sphere'],
] as const)(
  'loads a Mixed %s engine with %j on the %s side',
  (type, componentTechBases, side) => {
    const configuration = normalizeUnitConfiguration(
      parseUnit({
        ...atlas,
        techBase: 'MIXED',
        engine: { ...atlas.engine, type },
        componentTechBases,
      }),
      [],
    );
    expect(configuration.componentTechBases.engine).toBe(side);
  },
);
