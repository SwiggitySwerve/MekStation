/**
 * Installed combat-vehicle engine weights.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md
 * Independent arithmetic: MegaMek 48fcb2f64a1b Engine.java:396-460.
 * These fixtures are combat vehicles, not support vehicles.
 */

import {
  EngineType,
  VehicleOnlyEngineType,
} from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import {
  computeSupportVehicleEngineWeight,
  computeVehicleEngineWeight,
  isVehicleFusionEngine,
  validateVehicleEngine,
} from '../engine';
import { requiresPowerAmplifiers } from '../powerAmplifier';

const TRACKED = { tonnage: 50, motionType: GroundMotionType.TRACKED };

describe('computeVehicleEngineWeight', () => {
  it.each([
    [EngineType.STANDARD, 13],
    [EngineType.XL_IS, 7],
    [EngineType.XL_CLAN, 7],
    [EngineType.LIGHT, 10],
    [EngineType.XXL, 4.5],
    [EngineType.COMPACT, 19.5],
    [EngineType.ICE, 17],
    [EngineType.FUEL_CELL, 10.5],
    [EngineType.FISSION, 22.5],
    // No case in Java's combat switch: base weight, unshielded.
    [VehicleOnlyEngineType.STEAM, 8.5],
    [VehicleOnlyEngineType.BATTERY, 8.5],
    [VehicleOnlyEngineType.NONE, 0],
  ])('installs rating 200 %s at %s tons', (engineType, expected) => {
    expect(computeVehicleEngineWeight(200, engineType, TRACKED)).toBe(expected);
  });

  it('rounds the modified XL weight before applying shielding', () => {
    // 8.5 * 0.5 = 4.25 -> 4.5; 4.5 * 1.5 = 6.75 -> 7 (not 6.5).
    expect(computeVehicleEngineWeight(200, EngineType.XL_IS, TRACKED)).toBe(7);
  });

  it('enforces the 5-ton fission minimum before shielding', () => {
    expect(computeVehicleEngineWeight(25, EngineType.FISSION, TRACKED)).toBe(
      7.5,
    );
  });

  it.each([EngineType.ICE, EngineType.FUEL_CELL])(
    'does not add fusion shielding to %s',
    (engineType) => {
      expect(computeVehicleEngineWeight(25, engineType, TRACKED)).toBe(1);
    },
  );

  it('looks up a rating between table entries at the next multiple of 5', () => {
    // 52 t at cruise 3 = 156, treated as 160: 6 * 1.5 = 9.
    expect(computeVehicleEngineWeight(156, EngineType.STANDARD, TRACKED)).toBe(
      9,
    );
    expect(computeVehicleEngineWeight(160, EngineType.STANDARD, TRACKED)).toBe(
      9,
    );
  });

  it('preserves the minimum lookup rating of 10 before shielding', () => {
    expect(computeVehicleEngineWeight(7, EngineType.STANDARD, TRACKED)).toBe(1);
  });

  it('matches the loaded Tamerlane Magna 155 installed engine term', () => {
    // Pinned runtime-reference/pinned-results/Tamerlane Strike Sled (Flamer).json:
    // engineRating 155, engineWeight 8.5. This does not prove its total weight.
    expect(
      computeVehicleEngineWeight(155, EngineType.STANDARD, {
        tonnage: 20,
        motionType: GroundMotionType.HOVER,
      }),
    ).toBe(8.5);
  });

  it.each([EngineType.STANDARD, EngineType.ICE, EngineType.FUEL_CELL])(
    'enforces the rounded hover minimum for %s',
    (engineType) => {
      expect(
        computeVehicleEngineWeight(25, engineType, {
          tonnage: 52,
          motionType: GroundMotionType.HOVER,
        }),
      ).toBe(10.5);
    },
  );

  it('keeps an installed engine heavier than the hover minimum', () => {
    expect(
      computeVehicleEngineWeight(200, EngineType.STANDARD, {
        tonnage: 50,
        motionType: GroundMotionType.HOVER,
      }),
    ).toBe(13);
  });

  it('does not apply the hover minimum to VTOL combat vehicles', () => {
    expect(
      computeVehicleEngineWeight(25, EngineType.STANDARD, {
        tonnage: 30,
        motionType: GroundMotionType.VTOL,
      }),
    ).toBe(1);
  });

  it('returns the installed hover weight through vehicle engine validation', () => {
    expect(
      validateVehicleEngine(50, 1, EngineType.STANDARD, GroundMotionType.HOVER)
        .engineWeight,
    ).toBe(10);
  });
});

describe('computeSupportVehicleEngineWeight', () => {
  const M = GroundMotionType;
  it.each([
    // [unit, engine, tech, tons, motion, cruise MP, Java getWeightEngine]
    ['Small Steamer', VehicleOnlyEngineType.STEAM, 1, 2.5, M.NAVAL, 2, 0.28],
    ['Hoverpod', VehicleOnlyEngineType.BATTERY, 2, 0.25, M.HOVER, 5, 0.05],
    [
      'Lesseps Dump Truck',
      VehicleOnlyEngineType.BATTERY,
      3,
      50,
      M.WHEELED,
      3,
      6,
    ],
    ['Beast Riot Car', EngineType.STANDARD, 3, 4.054, M.WHEELED, 3, 0.25],
    ['Adelante train', EngineType.STANDARD, 3, 600, M.RAIL, 12, 312],
    ['TGV railcar', VehicleOnlyEngineType.NONE, 5, 120, M.RAIL, 0, 0],
  ] as const)(
    'matches the pinned Java oracle for %s',
    (
      _unit,
      engineType,
      engineTechRating,
      tonnage,
      motionType,
      cruiseMP,
      java,
    ) => {
      expect(
        computeSupportVehicleEngineWeight(0, engineType, {
          tonnage,
          motionType,
          cruiseMP,
          engineTechRating,
        }),
      ).toBe(java);
    },
  );

  it.each([
    // 0.013 * (4 + 1) * multiplier * 20 t, before minima (Engine.java:464-468)
    [EngineType.STANDARD, 2, 5],
    [EngineType.FISSION, 2, 5],
    [EngineType.STANDARD, 3, 1.5],
  ] as const)(
    'applies the %s minimum at tech rating %s',
    (engine, tech, tons) => {
      const context = { tonnage: 20, motionType: M.TRACKED, cruiseMP: 1 };
      expect(
        computeSupportVehicleEngineWeight(0, engine, {
          ...context,
          engineTechRating: tech,
        }),
      ).toBe(tons);
    },
  );

  it('defaults to tech rating D and sends non-support engines to the combat formula', () => {
    const context = { tonnage: 50, motionType: M.WHEELED, cruiseMP: 3 };
    expect(
      computeSupportVehicleEngineWeight(
        0,
        VehicleOnlyEngineType.BATTERY,
        context,
      ),
    ).toBe(6);
    expect(
      computeSupportVehicleEngineWeight(150, EngineType.XL_IS, context),
    ).toBe(computeVehicleEngineWeight(150, EngineType.XL_IS, context));
  });
});

it.each(Object.values(VehicleOnlyEngineType))(
  'treats %s as non-fusion, needing power amplifiers (Engine.isFusion)',
  (engineType) => {
    expect(isVehicleFusionEngine(engineType)).toBe(false);
    expect(requiresPowerAmplifiers(engineType)).toBe(true);
  },
);

it('validates a NONE engine as engineless (TestSupportVehicle.java:1015)', () => {
  const none = VehicleOnlyEngineType.NONE;
  expect(
    validateVehicleEngine(10, 0, none, GroundMotionType.HOVER),
  ).toMatchObject({ isValid: true, engineRating: 0, engineWeight: 0 });
  expect(
    validateVehicleEngine(10, 1, none, GroundMotionType.TRACKED).errors,
  ).toEqual([
    expect.objectContaining({
      message: 'An absent engine (NONE) cannot provide positive cruise MP',
    }),
  ]);
});

// Java has no motion-type engine rule (Engine.isValidEngine, TestTank,
// CVChassisView.getAvailableEngines); the corpus has ICE, Fuel Cell and
// Fission hovers, ICE VTOLs and ICE WiGEs. Support vehicles are checked by
// SVEngine.isValidFor, which is not about fusion either.
it.each([
  GroundMotionType.HOVER,
  GroundMotionType.VTOL,
  GroundMotionType.WIGE,
  GroundMotionType.HYDROFOIL,
])('reports no fusion error for non-fusion engines on %s', (motionType) => {
  for (const engineType of [
    EngineType.ICE,
    EngineType.FUEL_CELL,
    EngineType.FISSION,
    VehicleOnlyEngineType.BATTERY,
    VehicleOnlyEngineType.STEAM,
  ]) {
    expect(validateVehicleEngine(20, 4, engineType, motionType).errors).toEqual(
      [],
    );
  }
});
