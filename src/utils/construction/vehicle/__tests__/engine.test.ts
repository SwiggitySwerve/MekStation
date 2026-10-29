/**
 * Installed combat-vehicle engine weights.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md
 * Independent arithmetic: MegaMek 48fcb2f64a1b Engine.java:396-460.
 * These fixtures are combat vehicles, not support vehicles.
 */

import { EngineType } from '@/types/construction/EngineType';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { computeVehicleEngineWeight, validateVehicleEngine } from '../engine';

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
