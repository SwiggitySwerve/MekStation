/**
 * Aerospace thrust derivation invariants.
 *
 * safeThrust = floor(rating / tonnage), clamped to per-subtype cap.
 * maxThrust = floor(safeThrust × 1.5).
 * Engine legality is restricted per sub-type (CF: ICE/FuelCell only).
 */

import {
  AerospaceEngineType,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';

import {
  calculateMaxThrust,
  calculateSafeThrust,
  getMaxSafeThrust,
  isEngineLegalForSubType,
  ratingFromThrust,
} from '../thrustCalculations';

describe('calculateSafeThrust', () => {
  it('returns floor(rating/tonnage) within cap', () => {
    // 250 / 50 = 5
    expect(
      calculateSafeThrust(250, 50, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toBe(5);
    // 300 / 100 = 3
    expect(calculateSafeThrust(300, 100, AerospaceSubType.SMALL_CRAFT)).toBe(3);
  });

  it('clamps to ASF/CF cap of 12', () => {
    // 600/50 = 12 (at cap)
    expect(
      calculateSafeThrust(600, 50, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toBe(12);
    // 1000/50 = 20 → clamped to 12
    expect(
      calculateSafeThrust(1000, 50, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toBe(12);
  });

  it('clamps small craft to a cap of 6', () => {
    expect(calculateSafeThrust(2000, 100, AerospaceSubType.SMALL_CRAFT)).toBe(
      6,
    );
  });

  it('returns 0 for non-positive tonnage (guard)', () => {
    expect(
      calculateSafeThrust(200, 0, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toBe(0);
  });

  it('floors fractional thrust', () => {
    // 251 / 50 = 5.02 → floor → 5
    expect(
      calculateSafeThrust(251, 50, AerospaceSubType.AEROSPACE_FIGHTER),
    ).toBe(5);
  });
});

describe('calculateMaxThrust (safeThrust × 1.5, floored)', () => {
  it('returns floor(safeThrust × 1.5)', () => {
    expect(calculateMaxThrust(4)).toBe(6); // 4×1.5 = 6
    expect(calculateMaxThrust(5)).toBe(7); // 7.5 → floor → 7
    expect(calculateMaxThrust(6)).toBe(9);
    expect(calculateMaxThrust(8)).toBe(12);
  });

  it('returns 0 for zero safe thrust', () => {
    expect(calculateMaxThrust(0)).toBe(0);
  });
});

describe('ratingFromThrust (engine rating needed for a thrust target)', () => {
  it('multiplies safeThrust × tonnage', () => {
    expect(ratingFromThrust(6, 50)).toBe(300);
    expect(ratingFromThrust(4, 100)).toBe(400);
  });
});

describe('isEngineLegalForSubType (sub-type → engine restrictions)', () => {
  it('allows fusion engines on ASF and small craft, but not CF', () => {
    expect(
      isEngineLegalForSubType(
        AerospaceEngineType.FUSION,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(true);
    expect(
      isEngineLegalForSubType(
        AerospaceEngineType.FUSION,
        AerospaceSubType.SMALL_CRAFT,
      ),
    ).toBe(true);
    expect(
      isEngineLegalForSubType(
        AerospaceEngineType.FUSION,
        AerospaceSubType.CONVENTIONAL_FIGHTER,
      ),
    ).toBe(false);
  });

  it('restricts conventional fighters to ICE and fuel cell only', () => {
    expect(
      isEngineLegalForSubType(
        AerospaceEngineType.ICE,
        AerospaceSubType.CONVENTIONAL_FIGHTER,
      ),
    ).toBe(true);
    expect(
      isEngineLegalForSubType(
        AerospaceEngineType.FUEL_CELL,
        AerospaceSubType.CONVENTIONAL_FIGHTER,
      ),
    ).toBe(true);
    expect(
      isEngineLegalForSubType(
        AerospaceEngineType.XL,
        AerospaceSubType.CONVENTIONAL_FIGHTER,
      ),
    ).toBe(false);
  });

  it('forbids ICE on aerospace fighters', () => {
    expect(
      isEngineLegalForSubType(
        AerospaceEngineType.ICE,
        AerospaceSubType.AEROSPACE_FIGHTER,
      ),
    ).toBe(false);
  });
});

describe('getMaxSafeThrust (per-subtype cap)', () => {
  it('returns 12 for ASF and CF, 6 for small craft', () => {
    expect(getMaxSafeThrust(AerospaceSubType.AEROSPACE_FIGHTER)).toBe(12);
    expect(getMaxSafeThrust(AerospaceSubType.CONVENTIONAL_FIGHTER)).toBe(12);
    expect(getMaxSafeThrust(AerospaceSubType.SMALL_CRAFT)).toBe(6);
  });
});
