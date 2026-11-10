import { renderHook } from '@testing-library/react';

import type { ISerializedStructure } from '@/types/unit/UnitSerialization';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { createDefaultComponentSelections } from '@/stores/useMultiUnitStore.helpers';
import {
  InternalStructureType,
  INTERNAL_STRUCTURE_DEFINITIONS,
} from '@/types/construction/InternalStructureType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import {
  calculateInternalStructure,
  calculateStructuralWeight as constructionWeight,
} from '@/utils/construction/constructionRules';
import { calculateStructureWeight } from '@/utils/construction/structureCalculations';
import {
  calculateStructuralWeight as validationWeight,
  getStructureWeight,
} from '@/utils/validation/weightValidationUtils';

const tonnages = [10, 15, 35, 50, 55, 100, 105, 200];
const cases: readonly [InternalStructureType, readonly number[]][] = [
  [InternalStructureType.STANDARD, [1, 1.5, 3.5, 5, 5.5, 10, 21, 40]],
  [InternalStructureType.ENDO_STEEL_IS, [0.5, 1, 2, 2.5, 3, 5, 10.5, 20]],
  [InternalStructureType.ENDO_STEEL_CLAN, [0.5, 1, 2, 2.5, 3, 5, 10.5, 20]],
  [InternalStructureType.ENDO_COMPOSITE, [1, 1.5, 3, 4, 4.5, 7.5, 16, 30]],
  [InternalStructureType.REINFORCED, [2, 3, 7, 10, 11, 20, 21, 40]],
  [InternalStructureType.COMPOSITE, [0.5, 1, 2, 2.5, 3, 5, 5.5, 10]],
  [InternalStructureType.INDUSTRIAL, [2, 3, 7, 10, 11, 20, 42, 80]],
];

function measure(
  tonnage: number,
  internalStructureType: InternalStructureType,
) {
  const selections = {
    ...createDefaultComponentSelections(tonnage),
    engineRating: 200,
    internalStructureType,
  };
  const { result, unmount } = renderHook(() =>
    useUnitCalculations(tonnage, selections),
  );
  const hookWeight = result.current.structureWeight;
  unmount();
  return {
    hookWeight,
    step: calculateInternalStructure(tonnage, internalStructureType),
    lookup: getStructureWeight(tonnage, internalStructureType),
    validation: validationWeight({ ...selections, tonnage, armorTonnage: 0 }),
    construction: constructionWeight({
      ...selections,
      tonnage,
      totalArmorPoints: 0,
      totalHeatSinks: 10,
      jumpMP: 0,
    }),
  };
}

describe('structure mass caller characterization', () => {
  it.each(cases)(
    'shares native %s mass across contextless and configuration-aware callers',
    (type, weights) => {
      for (const [index, tonnage] of tonnages.entries()) {
        const actual = measure(tonnage, type);
        const standard = measure(tonnage, InternalStructureType.STANDARD);
        const expected = weights[index];
        const delta = expected - standard.lookup;
        expect(actual.hookWeight).toBe(expected);
        expect(calculateStructureWeight(tonnage, type)).toBe(expected);
        expect(actual.lookup).toBe(expected);
        expect(actual.step.weight).toBe(expected);
        expect(actual.step.isValid).toBe(true);
        expect(actual.validation).toBe(standard.validation + delta);
        expect(actual.construction).toBe(standard.construction + delta);
      }
    },
  );

  it('preserves the step rejection and other callers’ Standard fallback', () => {
    const unknown = 'Unknown structure' as InternalStructureType;
    const actual = measure(50, unknown);
    const standard = measure(50, InternalStructureType.STANDARD);
    expect(actual.step).toMatchObject({
      weight: 0,
      criticalSlots: 0,
      isValid: false,
      errors: ['Unknown internal structure type: Unknown structure'],
    });
    expect(actual.hookWeight).toBe(5);
    expect(calculateStructureWeight(50, unknown)).toBe(5);
    expect(actual.lookup).toBe(5);
    expect(actual.validation).toBe(standard.validation);
    expect(actual.construction).toBe(standard.construction);
  });
});

// Literal observations from pinned MegaMek 48fcb2f64 Structure.java:65-108.
// Provenance: parity-3.1-b/pr3-preflight/donor-matrix-provenance.json (72 cases).
describe('configuration-aware native structure mass', () => {
  it.each([
    [InternalStructureType.STANDARD, 35, MechConfiguration.BIPED, 3.5],
    [InternalStructureType.STANDARD, 35, MechConfiguration.TRIPOD, 4.0],
    [InternalStructureType.STANDARD, 50, MechConfiguration.BIPED, 5.0],
    [InternalStructureType.STANDARD, 50, MechConfiguration.TRIPOD, 5.5],
    [InternalStructureType.STANDARD, 65, MechConfiguration.BIPED, 6.5],
    [InternalStructureType.STANDARD, 65, MechConfiguration.TRIPOD, 7.5],
    [InternalStructureType.STANDARD, 100, MechConfiguration.BIPED, 10.0],
    [InternalStructureType.STANDARD, 100, MechConfiguration.TRIPOD, 11.0],
    [InternalStructureType.STANDARD, 105, MechConfiguration.BIPED, 21.0],
    [InternalStructureType.STANDARD, 105, MechConfiguration.TRIPOD, 23.5],
    [InternalStructureType.STANDARD, 125, MechConfiguration.BIPED, 25.0],
    [InternalStructureType.STANDARD, 125, MechConfiguration.TRIPOD, 28.0],
    [InternalStructureType.ENDO_STEEL_IS, 35, MechConfiguration.BIPED, 2.0],
    [InternalStructureType.ENDO_STEEL_IS, 35, MechConfiguration.TRIPOD, 2.0],
    [InternalStructureType.ENDO_STEEL_IS, 50, MechConfiguration.BIPED, 2.5],
    [InternalStructureType.ENDO_STEEL_IS, 50, MechConfiguration.TRIPOD, 3.0],
    [InternalStructureType.ENDO_STEEL_IS, 65, MechConfiguration.BIPED, 3.5],
    [InternalStructureType.ENDO_STEEL_IS, 65, MechConfiguration.TRIPOD, 4.0],
    [InternalStructureType.ENDO_STEEL_IS, 100, MechConfiguration.BIPED, 5.0],
    [InternalStructureType.ENDO_STEEL_IS, 100, MechConfiguration.TRIPOD, 5.5],
    [InternalStructureType.ENDO_STEEL_IS, 105, MechConfiguration.BIPED, 10.5],
    [InternalStructureType.ENDO_STEEL_IS, 105, MechConfiguration.TRIPOD, 12.0],
    [InternalStructureType.ENDO_STEEL_IS, 125, MechConfiguration.BIPED, 12.5],
    [InternalStructureType.ENDO_STEEL_IS, 125, MechConfiguration.TRIPOD, 14.0],
    [InternalStructureType.ENDO_COMPOSITE, 35, MechConfiguration.BIPED, 3.0],
    [InternalStructureType.ENDO_COMPOSITE, 35, MechConfiguration.TRIPOD, 3.0],
    [InternalStructureType.ENDO_COMPOSITE, 50, MechConfiguration.BIPED, 4.0],
    [InternalStructureType.ENDO_COMPOSITE, 50, MechConfiguration.TRIPOD, 4.5],
    [InternalStructureType.ENDO_COMPOSITE, 65, MechConfiguration.BIPED, 5.0],
    [InternalStructureType.ENDO_COMPOSITE, 65, MechConfiguration.TRIPOD, 5.5],
    [InternalStructureType.ENDO_COMPOSITE, 100, MechConfiguration.BIPED, 7.5],
    [InternalStructureType.ENDO_COMPOSITE, 100, MechConfiguration.TRIPOD, 8.5],
    [InternalStructureType.ENDO_COMPOSITE, 105, MechConfiguration.BIPED, 16.0],
    [InternalStructureType.ENDO_COMPOSITE, 105, MechConfiguration.TRIPOD, 17.5],
    [InternalStructureType.ENDO_COMPOSITE, 125, MechConfiguration.BIPED, 19.0],
    [InternalStructureType.ENDO_COMPOSITE, 125, MechConfiguration.TRIPOD, 21.0],
    [InternalStructureType.REINFORCED, 35, MechConfiguration.BIPED, 7.0],
    [InternalStructureType.REINFORCED, 35, MechConfiguration.TRIPOD, 8.0],
    [InternalStructureType.REINFORCED, 50, MechConfiguration.BIPED, 10.0],
    [InternalStructureType.REINFORCED, 50, MechConfiguration.TRIPOD, 11.0],
    [InternalStructureType.REINFORCED, 65, MechConfiguration.BIPED, 13.0],
    [InternalStructureType.REINFORCED, 65, MechConfiguration.TRIPOD, 14.5],
    [InternalStructureType.REINFORCED, 100, MechConfiguration.BIPED, 20.0],
    [InternalStructureType.REINFORCED, 100, MechConfiguration.TRIPOD, 22.0],
    [InternalStructureType.REINFORCED, 105, MechConfiguration.BIPED, 21.0],
    [InternalStructureType.REINFORCED, 105, MechConfiguration.TRIPOD, 23.5],
    [InternalStructureType.REINFORCED, 125, MechConfiguration.BIPED, 25.0],
    [InternalStructureType.REINFORCED, 125, MechConfiguration.TRIPOD, 28.0],
    [InternalStructureType.COMPOSITE, 35, MechConfiguration.BIPED, 2.0],
    [InternalStructureType.COMPOSITE, 35, MechConfiguration.TRIPOD, 2.0],
    [InternalStructureType.COMPOSITE, 50, MechConfiguration.BIPED, 2.5],
    [InternalStructureType.COMPOSITE, 50, MechConfiguration.TRIPOD, 3.0],
    [InternalStructureType.COMPOSITE, 65, MechConfiguration.BIPED, 3.5],
    [InternalStructureType.COMPOSITE, 65, MechConfiguration.TRIPOD, 4.0],
    [InternalStructureType.COMPOSITE, 100, MechConfiguration.BIPED, 5.0],
    [InternalStructureType.COMPOSITE, 100, MechConfiguration.TRIPOD, 5.5],
    [InternalStructureType.COMPOSITE, 105, MechConfiguration.BIPED, 5.5],
    [InternalStructureType.COMPOSITE, 105, MechConfiguration.TRIPOD, 6.0],
    [InternalStructureType.COMPOSITE, 125, MechConfiguration.BIPED, 6.5],
    [InternalStructureType.COMPOSITE, 125, MechConfiguration.TRIPOD, 7.0],
    [InternalStructureType.INDUSTRIAL, 35, MechConfiguration.BIPED, 7.0],
    [InternalStructureType.INDUSTRIAL, 35, MechConfiguration.TRIPOD, 8.0],
    [InternalStructureType.INDUSTRIAL, 50, MechConfiguration.BIPED, 10.0],
    [InternalStructureType.INDUSTRIAL, 50, MechConfiguration.TRIPOD, 11.0],
    [InternalStructureType.INDUSTRIAL, 65, MechConfiguration.BIPED, 13.0],
    [InternalStructureType.INDUSTRIAL, 65, MechConfiguration.TRIPOD, 14.5],
    [InternalStructureType.INDUSTRIAL, 100, MechConfiguration.BIPED, 20.0],
    [InternalStructureType.INDUSTRIAL, 100, MechConfiguration.TRIPOD, 22.0],
    [InternalStructureType.INDUSTRIAL, 105, MechConfiguration.BIPED, 42.0],
    [InternalStructureType.INDUSTRIAL, 105, MechConfiguration.TRIPOD, 46.5],
    [InternalStructureType.INDUSTRIAL, 125, MechConfiguration.BIPED, 50.0],
    [InternalStructureType.INDUSTRIAL, 125, MechConfiguration.TRIPOD, 55.5],
  ] as const)(
    'matches Java full donor %s / %st / %s = %st',
    (type, tonnage, configuration, expected) => {
      expect(calculateStructureWeight(tonnage, type, { configuration })).toBe(
        expected,
      );
    },
  );
  it.each([
    [
      'Omega SHP-5R',
      150,
      InternalStructureType.STANDARD,
      MechConfiguration.BIPED,
      30.0,
    ],
    [
      'Ares ARS-V1 Aphrodite',
      135,
      InternalStructureType.ENDO_COMPOSITE,
      MechConfiguration.TRIPOD,
      22.5,
    ],
    [
      'Ares ARS-V1 Hades',
      135,
      InternalStructureType.ENDO_COMPOSITE,
      MechConfiguration.TRIPOD,
      22.5,
    ],
    [
      'Ares ARS-V1 Hephaestus',
      135,
      InternalStructureType.ENDO_COMPOSITE,
      MechConfiguration.TRIPOD,
      22.5,
    ],
    [
      'Ares ARS-V1 Hera',
      135,
      InternalStructureType.ENDO_COMPOSITE,
      MechConfiguration.TRIPOD,
      22.5,
    ],
    [
      'Ares ARS-V1 Zeus',
      135,
      InternalStructureType.ENDO_COMPOSITE,
      MechConfiguration.TRIPOD,
      22.5,
    ],
    [
      'Poseidon PSD-V2',
      125,
      InternalStructureType.ENDO_STEEL_IS,
      MechConfiguration.TRIPOD,
      14.0,
    ],
    [
      'Ares ARS-V1E Apollo',
      135,
      InternalStructureType.ENDO_COMPOSITE,
      MechConfiguration.TRIPOD,
      22.5,
    ],
    [
      'OMEGA SHP-4X',
      150,
      InternalStructureType.ENDO_STEEL_IS,
      MechConfiguration.BIPED,
      15.0,
    ],
    [
      'Orca OC-1X',
      200,
      InternalStructureType.STANDARD,
      MechConfiguration.BIPED,
      40.0,
    ],
    [
      'Triskelion TRK-4V',
      75,
      InternalStructureType.ENDO_COMPOSITE,
      MechConfiguration.TRIPOD,
      6.5,
    ],
    [
      "'Battle Tripod' R_H3L-2X",
      60,
      InternalStructureType.STANDARD,
      MechConfiguration.TRIPOD,
      7.0,
    ],
    [
      "'Harvester Tripod' R_H3L-3X",
      90,
      InternalStructureType.STANDARD,
      MechConfiguration.TRIPOD,
      10.0,
    ],
    [
      "'Scout Tripod' R_H3L-1X",
      30,
      InternalStructureType.ENDO_STEEL_IS,
      MechConfiguration.TRIPOD,
      2.0,
    ],
    [
      'Malice MAL-Y-SH-RISC',
      105,
      InternalStructureType.ENDO_STEEL_IS,
      MechConfiguration.BIPED,
      10.5,
    ],
  ] as const)(
    'matches the S1/S2 Java observation for %s',
    (_name, tonnage, type, configuration, expected) => {
      expect(calculateStructureWeight(tonnage, type, { configuration })).toBe(
        expected,
      );
    },
  );
});
const nativeLocations = [
  'HEAD',
  'CENTER_TORSO',
  'RIGHT_TORSO',
  'LEFT_TORSO',
  'RIGHT_ARM',
  'LEFT_ARM',
  'RIGHT_LEG',
  'LEFT_LEG',
] as const;
const uniformDonors = (
  tonnage: number,
  type = 'STANDARD',
): ISerializedStructure => ({
  type: 'STANDARD',
  typeByLocation: Object.fromEntries(
    nativeLocations.map((location) => [location, type]),
  ),
  locationTonnage: Object.fromEntries(
    nativeLocations.map((location) => [location, tonnage]),
  ),
});
const weighted = (
  structure: ISerializedStructure,
  configuration = MechConfiguration.BIPED,
  tonnage = 50,
) =>
  calculateStructureWeight(tonnage, InternalStructureType.STANDARD, {
    configuration,
    frankenStructure: structure,
  });
describe('native section weighting and compatibility boundary', () => {
  it.each([
    [
      'Hybrid Rifleman RFL-3N (Sneede II)',
      60,
      {
        type: 'STANDARD',
        locationTonnage: {
          LEFT_ARM: 70,
          RIGHT_ARM: 60,
          LEFT_TORSO: 65,
          RIGHT_TORSO: 60,
          CENTER_TORSO: 60,
          HEAD: 60,
          LEFT_LEG: 60,
          RIGHT_LEG: 60,
        },
        typeByLocation: {
          LEFT_ARM: 'STANDARD',
          RIGHT_ARM: 'STANDARD',
          LEFT_TORSO: 'STANDARD',
          RIGHT_TORSO: 'STANDARD',
          CENTER_TORSO: 'STANDARD',
          HEAD: 'STANDARD',
          LEFT_LEG: 'STANDARD',
          RIGHT_LEG: 'STANDARD',
        },
      },
      6.5,
    ],
    [
      'Hybrid Rifleman RFL-3N (Sneede)',
      60,
      {
        type: 'STANDARD',
        locationTonnage: {
          LEFT_ARM: 70,
          RIGHT_ARM: 60,
          LEFT_TORSO: 65,
          RIGHT_TORSO: 60,
          CENTER_TORSO: 60,
          HEAD: 60,
          LEFT_LEG: 60,
          RIGHT_LEG: 60,
        },
        typeByLocation: {
          LEFT_ARM: 'STANDARD',
          RIGHT_ARM: 'STANDARD',
          LEFT_TORSO: 'STANDARD',
          RIGHT_TORSO: 'STANDARD',
          CENTER_TORSO: 'STANDARD',
          HEAD: 'STANDARD',
          LEFT_LEG: 'STANDARD',
          RIGHT_LEG: 'STANDARD',
        },
      },
      6.5,
    ],
    [
      'Temax Cat Ninjabolt TMC-NB',
      65,
      {
        type: 'STANDARD',
        locationTonnage: {
          LEFT_ARM: 65,
          RIGHT_ARM: 65,
          LEFT_TORSO: 65,
          RIGHT_TORSO: 65,
          CENTER_TORSO: 65,
          HEAD: 65,
          LEFT_LEG: 65,
          RIGHT_LEG: 90,
        },
        typeByLocation: {
          LEFT_ARM: 'STANDARD',
          RIGHT_ARM: 'ENDO_STEEL',
          LEFT_TORSO: 'STANDARD',
          RIGHT_TORSO: 'STANDARD',
          CENTER_TORSO: 'STANDARD',
          HEAD: 'STANDARD',
          LEFT_LEG: 'ENDO_STEEL',
          RIGHT_LEG: 'ENDO_STEEL',
        },
      },
      6.0,
    ],
    [
      'Schwerer Gustav',
      100,
      {
        type: 'STANDARD',
        locationTonnage: {
          LEFT_ARM: 65,
          RIGHT_ARM: 65,
          LEFT_TORSO: 100,
          RIGHT_TORSO: 70,
          CENTER_TORSO: 100,
          HEAD: 100,
          LEFT_LEG: 100,
          RIGHT_LEG: 100,
        },
        typeByLocation: {
          LEFT_ARM: 'ENDO_STEEL',
          RIGHT_ARM: 'ENDO_STEEL',
          LEFT_TORSO: 'STANDARD',
          RIGHT_TORSO: 'ENDO_STEEL',
          CENTER_TORSO: 'STANDARD',
          HEAD: 'STANDARD',
          LEFT_LEG: 'STANDARD',
          RIGHT_LEG: 'STANDARD',
        },
      },
      8.0,
    ],
    [
      "Hunchback HBK-LGN-Pin 'Anastasia'",
      50,
      {
        type: 'STANDARD',
        locationTonnage: {
          LEFT_ARM: 50,
          RIGHT_ARM: 50,
          LEFT_TORSO: 50,
          RIGHT_TORSO: 50,
          CENTER_TORSO: 50,
          HEAD: 50,
          LEFT_LEG: 50,
          RIGHT_LEG: 50,
        },
        typeByLocation: {
          LEFT_ARM: 'ENDO_STEEL_CLAN',
          RIGHT_ARM: 'ENDO_STEEL_CLAN',
          LEFT_TORSO: 'ENDO_STEEL',
          RIGHT_TORSO: 'STANDARD',
          CENTER_TORSO: 'STANDARD',
          HEAD: 'ENDO_STEEL_CLAN',
          LEFT_LEG: 'ENDO_STEEL',
          RIGHT_LEG: 'ENDO_STEEL',
        },
      },
      3.5,
    ],
    [
      "Hunchback HBK-LGN-Pin 'Drizella'",
      50,
      {
        type: 'STANDARD',
        locationTonnage: {
          LEFT_ARM: 50,
          RIGHT_ARM: 50,
          LEFT_TORSO: 50,
          RIGHT_TORSO: 50,
          CENTER_TORSO: 50,
          HEAD: 50,
          LEFT_LEG: 50,
          RIGHT_LEG: 50,
        },
        typeByLocation: {
          LEFT_ARM: 'STANDARD',
          RIGHT_ARM: 'STANDARD',
          LEFT_TORSO: 'ENDO_STEEL_CLAN',
          RIGHT_TORSO: 'ENDO_STEEL_CLAN',
          CENTER_TORSO: 'ENDO_STEEL',
          HEAD: 'ENDO_STEEL',
          LEFT_LEG: 'STANDARD',
          RIGHT_LEG: 'STANDARD',
        },
      },
      3.5,
    ],
  ] as const)(
    'matches the Java FrankenMek %s',
    (_name, tonnage, structure, expected) => {
      expect(weighted(structure, MechConfiguration.BIPED, tonnage)).toBe(
        expected,
      );
    },
  );
  it('rounds each donor first, then accumulates in native order, then rounds the sum', () => {
    expect(weighted(uniformDonors(35))).toBe(4);
    expect(weighted(uniformDonors(105))).toBe(21.5);
    expect(weighted(uniformDonors(105), MechConfiguration.TRIPOD)).toBe(24);
    expect(weighted(uniformDonors(35), MechConfiguration.BIPED, 150)).toBe(4);
  });
  it('keeps tonnage-only saves global and defaults contextless calls to Biped', () => {
    expect(calculateStructureWeight(35, InternalStructureType.STANDARD)).toBe(
      3.5,
    );
    expect(calculateStructureWeight(150, InternalStructureType.STANDARD)).toBe(
      30,
    );
    expect(
      weighted({
        type: 'STANDARD',
        locationTonnage: uniformDonors(35).locationTonnage,
      }),
    ).toBe(5);
    expect(
      calculateStructureWeight(150, InternalStructureType.STANDARD, {}),
    ).toBe(30);
  });
  it('distinguishes an absent map, empty map, explicit scalar Standard and ignored scalar Hybrid', () => {
    expect(
      weighted(
        { type: 'STANDARD', typeByLocation: {} },
        MechConfiguration.BIPED,
        35,
      ),
    ).toBe(4);
    expect(
      weighted({
        type: 'STANDARD',
        typeByLocation: {},
        locationTonnage: uniformDonors(35).locationTonnage,
      }),
    ).toBe(5);
    expect(weighted(uniformDonors(35))).toBe(4);
    expect(weighted({ type: 'ENDO_STEEL', typeByLocation: {} })).toBe(2.5);
  });
  it('uses host defaults for omitted types despite retained Hybrid donor tonnages', () => {
    expect(
      weighted({
        type: 'STANDARD',
        typeByLocation: { HEAD: 'ENDO_STEEL', CENTER_TORSO: 'ENDO_STEEL' },
        locationTonnage: { HEAD: 35, CENTER_TORSO: 35, LEFT_ARM: 200 },
      }),
    ).toBe(4.5);
  });
  it('accepts the donor-only Clan Endo-Composite identity without changing old global fallback', () => {
    expect(weighted(uniformDonors(50, 'ENDO_COMPOSITE_CLAN'))).toBe(4);
  });
  it.each([MechConfiguration.QUAD, MechConfiguration.QUADVEE])(
    'uses native limb indices with the effective %s locations',
    (configuration) => {
      const structure: ISerializedStructure = {
        type: 'STANDARD',
        typeByLocation: {
          FRONT_RIGHT_LEG: 'STANDARD',
          FRONT_LEFT_LEG: 'STANDARD',
          REAR_RIGHT_LEG: 'STANDARD',
          REAR_LEFT_LEG: 'STANDARD',
        },
        locationTonnage: {
          FRONT_RIGHT_LEG: 70,
          FRONT_LEFT_LEG: 35,
          REAR_RIGHT_LEG: 65,
          REAR_LEFT_LEG: 50,
        },
      };
      expect(weighted(structure, configuration)).toBe(5.5);
      expect(weighted(uniformDonors(35), configuration)).toBe(4);
      expect(
        weighted(
          {
            ...structure,
            typeByLocation: {
              ...structure.typeByLocation,
              RIGHT_ARM: 'INDUSTRIAL',
            },
            locationTonnage: { ...structure.locationTonnage, RIGHT_ARM: 200 },
          },
          configuration,
        ),
      ).toBe(5.5);
      expect(weighted(structure, MechConfiguration.BIPED)).toBe(5);
    },
  );
  it('does not invent a ninth share for the tripod center leg or count unrelated locations', () => {
    expect(
      weighted(
        {
          type: 'STANDARD',
          typeByLocation: { CENTER_LEG: 'INDUSTRIAL', NOSE: 'INDUSTRIAL' },
          locationTonnage: { CENTER_LEG: 200, NOSE: 200 },
        },
        MechConfiguration.TRIPOD,
      ),
    ).toBe(5.5);
  });
  it('retains material-specific superheavy behavior and the strict 100t boundary', () => {
    expect(
      calculateStructureWeight(100, InternalStructureType.STANDARD, {
        configuration: MechConfiguration.BIPED,
      }),
    ).toBe(10);
    expect(
      calculateStructureWeight(105, InternalStructureType.REINFORCED, {
        configuration: MechConfiguration.BIPED,
      }),
    ).toBe(21);
    expect(
      calculateStructureWeight(105, InternalStructureType.COMPOSITE, {
        configuration: MechConfiguration.BIPED,
      }),
    ).toBe(5.5);
  });
});

describe('single structure-mass owner for contextless callers', () => {
  it.each(Object.values(InternalStructureType))(
    '%s uses the native Biped rule without context',
    (type) => {
      for (let tonnage = 10; tonnage <= 200; tonnage += 5) {
        const expected = calculateStructureWeight(tonnage, type, {
          configuration: MechConfiguration.BIPED,
        });
        expect(calculateStructureWeight(tonnage, type)).toBe(expected);
        expect(getStructureWeight(tonnage, type)).toBe(expected);
        expect(calculateInternalStructure(tonnage, type).weight).toBe(expected);
      }
    },
  );
});

it('uses Java division at an Endo-Composite half-ton boundary', () => {
  expect(
    calculateStructureWeight(
      60.00000000000001,
      InternalStructureType.ENDO_COMPOSITE,
    ),
  ).toBe(5);
});
it('keeps weight factors out of structure metadata definitions', () => {
  for (const definition of INTERNAL_STRUCTURE_DEFINITIONS)
    expect(definition).not.toHaveProperty('weightMultiplier');
});
