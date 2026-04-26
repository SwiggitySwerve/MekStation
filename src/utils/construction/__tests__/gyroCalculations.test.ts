/**
 * Gyro calculation invariants.
 *
 * Base weight = ceil(engineRating / 100).
 * Final weight = ceil(base × type-multiplier × 2) / 2 (ceil to half-ton).
 *
 * Standard gyro = 4 critical slots (mult 1.0).
 * XL gyro mult 0.5 (lighter), Compact mult 1.5, Heavy-Duty mult 2.0.
 */

import { GyroType } from '@/types/construction/GyroType';

import {
  calculateGyroWeight,
  getGyroCriticalSlots,
  isGyroCompatibleWithCockpit,
  validateGyro,
} from '../gyroCalculations';

describe('calculateGyroWeight (base = ceil(rating/100))', () => {
  it('matches base weight for standard gyro at exact 100s', () => {
    // rating 200 → base 2; mult 1.0 → 2 t
    expect(calculateGyroWeight(200, GyroType.STANDARD)).toBe(2);
    // rating 100 → 1 t
    expect(calculateGyroWeight(100, GyroType.STANDARD)).toBe(1);
    // rating 400 → 4 t
    expect(calculateGyroWeight(400, GyroType.STANDARD)).toBe(4);
  });

  it('rounds base UP when engine rating exceeds a multiple of 100', () => {
    // rating 201 → ceil(2.01) = 3 → 3 t standard
    expect(calculateGyroWeight(201, GyroType.STANDARD)).toBe(3);
    // rating 105 → ceil(1.05) = 2 → 2 t
    expect(calculateGyroWeight(105, GyroType.STANDARD)).toBe(2);
  });

  it('handles XL gyro (mult 0.5, ceil to 0.5 t)', () => {
    // rating 200 → base 2 × 0.5 = 1 → 1 t
    expect(calculateGyroWeight(200, GyroType.XL)).toBe(1);
    // rating 100 → base 1 × 0.5 = 0.5 → 0.5 t
    expect(calculateGyroWeight(100, GyroType.XL)).toBe(0.5);
  });

  it('handles Compact gyro (mult 1.5)', () => {
    // rating 200 → base 2 × 1.5 = 3 → 3 t
    expect(calculateGyroWeight(200, GyroType.COMPACT)).toBe(3);
  });

  it('handles Heavy-Duty gyro (mult 2.0)', () => {
    // rating 200 → base 2 × 2.0 = 4 → 4 t
    expect(calculateGyroWeight(200, GyroType.HEAVY_DUTY)).toBe(4);
  });

  it('returns 0 for non-positive engine rating', () => {
    expect(calculateGyroWeight(0, GyroType.STANDARD)).toBe(0);
    expect(calculateGyroWeight(-1, GyroType.STANDARD)).toBe(0);
  });
});

describe('getGyroCriticalSlots', () => {
  it('Standard / XL / Heavy-Duty / Compact use canonical slot counts', () => {
    expect(getGyroCriticalSlots(GyroType.STANDARD)).toBe(4);
    expect(getGyroCriticalSlots(GyroType.XL)).toBe(6);
    expect(getGyroCriticalSlots(GyroType.HEAVY_DUTY)).toBe(4);
    expect(getGyroCriticalSlots(GyroType.COMPACT)).toBe(2);
  });
});

describe('validateGyro', () => {
  it('flags non-positive engine rating', () => {
    const r = validateGyro(GyroType.STANDARD, 0);
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => /greater than 0/.test(e))).toBe(true);
  });

  it('passes for valid combinations', () => {
    expect(validateGyro(GyroType.STANDARD, 200).isValid).toBe(true);
  });
});

describe('isGyroCompatibleWithCockpit', () => {
  it('returns true for compact gyro + standard cockpit (compatible per simplified rules)', () => {
    expect(isGyroCompatibleWithCockpit(GyroType.COMPACT, 'Standard')).toBe(
      true,
    );
  });

  it('returns true for arbitrary gyro/cockpit pairings (no incompatibilities encoded)', () => {
    expect(isGyroCompatibleWithCockpit(GyroType.XL, 'Torso-Mounted')).toBe(
      true,
    );
  });
});
