/** @spec openspec/changes/establish-all-unit-data-parity/specs/customizer-tabs/spec.md */
import fs from 'fs';
import path from 'path';

import * as armorExtractor from '@/services/printing/recordsheet/dataExtractors.armor';
import * as structureExtractor from '@/services/printing/recordsheet/dataExtractors.structure';
import { UnitContract } from '@/types/contracts';

import {
  catalog,
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

jest.mock('@/services/printing/recordsheet/dataExtractors.armor', () => {
  const actual = jest.requireActual<typeof armorExtractor>(
    '@/services/printing/recordsheet/dataExtractors.armor',
  );
  return { ...actual, extractArmor: jest.fn(actual.extractArmor) };
});
jest.mock('@/services/printing/recordsheet/dataExtractors.structure', () => {
  const actual = jest.requireActual<typeof structureExtractor>(
    '@/services/printing/recordsheet/dataExtractors.structure',
  );
  return { ...actual, extractStructure: jest.fn(actual.extractStructure) };
});

const entries = catalog('battlemechs');
function fixture(id = 'atlas-as7-d') {
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing catalog fixture: ${id}`);
  const source = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/battlemechs', entry.path),
        'utf8',
      ),
    ),
  );
  if (id !== 'atlas-as7-d') return { entry, source };
  // Distinct values expose compensating swaps without editing catalog files.
  return {
    entry,
    source: {
      ...source,
      armor: {
        ...source.armor,
        allocation: {
          ...source.armor?.allocation,
          LEFT_ARM: 11,
          RIGHT_ARM: 13,
          LEFT_TORSO: { front: 17, rear: 3 },
          RIGHT_TORSO: { front: 19, rear: 5 },
        },
      },
    },
  };
}
const { extractArmor } = jest.requireActual<typeof armorExtractor>(
  '@/services/printing/recordsheet/dataExtractors.armor',
);
const { extractStructure } = jest.requireActual<typeof structureExtractor>(
  '@/services/printing/recordsheet/dataExtractors.structure',
);
const verify = (id?: string) => {
  const { entry, source } = fixture(id);
  return verifyCatalogUnit('battlemechs', entry, () => JSON.stringify(source));
};
const fields = (id?: string) => {
  const row = verify(id);
  expect(row.rejection).toBeUndefined();
  return row.differences.map(({ field }) => field);
};

describe('BattleMech catalog location identity acceptance', () => {
  beforeAll(initializeEquipment);
  beforeEach(() => {
    jest.mocked(armorExtractor.extractArmor).mockImplementation(extractArmor);
    jest
      .mocked(structureExtractor.extractStructure)
      .mockImplementation(extractStructure);
  });

  it.each([
    'atlas-as7-d',
    'scorpion-scp-1n',
    'ares-ars-v1-zeus',
    'phoenix-hawk-lam-phx-hk2',
    'boreas-prime',
  ])('accepts the domain locations for %s', (id) => {
    // Keep non-biped fixtures unmodified so inactive arm allocations stay absent.
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry) throw new Error(`Missing catalog fixture: ${id}`);
    const row = verifyCatalogUnit('battlemechs', entry);
    expect(row.rejection).toBeUndefined();
    expect(row.differences).toEqual([]);
  });

  it('accepts asymmetric front and rear domain armor', () => {
    expect(fields()).toEqual([]);
  });

  it('rejects left/right armor swaps even when the total is unchanged', () => {
    jest.mocked(armorExtractor.extractArmor).mockImplementation((unit) => {
      const armor = extractArmor(unit);
      return {
        ...armor,
        locations: armor.locations.map((location) => ({
          ...location,
          current:
            location.location === 'Left Arm'
              ? 13
              : location.location === 'Right Arm'
                ? 11
                : location.current,
        })),
      };
    });
    expect(fields()).toEqual(['armor.Left Arm', 'armor.Right Arm']);
  });

  it('rejects rear torso swaps even when the total is unchanged', () => {
    jest.mocked(armorExtractor.extractArmor).mockImplementation((unit) => {
      const armor = extractArmor(unit);
      return {
        ...armor,
        locations: armor.locations.map((location) => ({
          ...location,
          rear:
            location.location === 'Left Torso'
              ? 5
              : location.location === 'Right Torso'
                ? 3
                : location.rear,
        })),
      };
    });
    expect(fields()).toEqual([
      'armor.Left Torso (Rear)',
      'armor.Right Torso (Rear)',
    ]);
  });

  describe.each(['armor', 'structure'] as const)(
    'required %s locations',
    (kind) => {
      it.each([
        ['atlas-as7-d', 'Left Arm'],
        ['scorpion-scp-1n', 'Front Left Leg'],
        ['ares-ars-v1-zeus', 'Center Leg'],
        ['boreas-prime', 'Rear Right Leg'],
      ])('rejects missing %s / %s', (id, missing) => {
        if (kind === 'armor') {
          jest
            .mocked(armorExtractor.extractArmor)
            .mockImplementation((unit) => {
              const armor = extractArmor(unit);
              return {
                ...armor,
                locations: armor.locations.filter(
                  (l) => l.location !== missing,
                ),
              };
            });
        } else {
          jest
            .mocked(structureExtractor.extractStructure)
            .mockImplementation((unit) => {
              const structure = extractStructure(unit);
              return {
                ...structure,
                locations: structure.locations.filter(
                  (l) => l.location !== missing,
                ),
              };
            });
        }
        expect(fields(id)).toEqual([
          `${kind}.locations`,
          `${kind}.${missing}`,
          `${kind}.${missing}.abbreviation`,
        ]);
      });
    },
  );

  it('rejects structure values swapped between unequal locations', () => {
    jest
      .mocked(structureExtractor.extractStructure)
      .mockImplementation((unit) => {
        const structure = extractStructure(unit);
        return {
          ...structure,
          locations: structure.locations.map((location) => ({
            ...location,
            points:
              location.location === 'Center Torso'
                ? 17
                : location.location === 'Left Arm'
                  ? 31
                  : location.points,
          })),
        };
      });
    expect(fields()).toEqual(['structure.Center Torso', 'structure.Left Arm']);
  });

  it.each(['armor', 'structure'] as const)(
    'rejects a duplicate %s location',
    (kind) => {
      if (kind === 'armor') {
        jest.mocked(armorExtractor.extractArmor).mockImplementation((unit) => {
          const armor = extractArmor(unit);
          return {
            ...armor,
            locations: [...armor.locations, armor.locations[0]],
          };
        });
      } else {
        jest
          .mocked(structureExtractor.extractStructure)
          .mockImplementation((unit) => {
            const structure = extractStructure(unit);
            return {
              ...structure,
              locations: [...structure.locations, structure.locations[0]],
            };
          });
      }
      expect(fields()).toEqual([`${kind}.locations`]);
    },
  );

  it('rejects a wrong location abbreviation', () => {
    jest.mocked(armorExtractor.extractArmor).mockImplementation((unit) => {
      const armor = extractArmor(unit);
      return {
        ...armor,
        locations: armor.locations.map((location) => ({
          ...location,
          abbreviation:
            location.location === 'Left Arm' ? 'RA' : location.abbreviation,
        })),
      };
    });
    expect(fields()).toEqual(['armor.Left Arm.abbreviation']);
  });
});
