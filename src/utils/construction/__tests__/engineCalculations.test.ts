/**
 * Engine calculation invariants.
 *
 * Engine rating is constrained to multiples of 5 in [10..500].
 * Standard fusion table from TechManual p.49 governs base weight;
 * each engine type applies its own weight multiplier.
 * Walk MP = floor(rating / tonnage). Integral HS = floor(rating / 25).
 * Side-torso crit slots come from the engine definition (0 for std, 3 for IS XL, etc.).
 */

import { EngineType } from '@/types/construction/EngineType';

import {
  calculateEngineRating,
  calculateEngineWeight,
  calculateIntegralHeatSinks,
  calculateWalkMP,
  getAllValidEngineRatings,
  getBaseEngineWeight,
  getEngineCTSlots,
  getEngineSideTorsoSlots,
  getTotalEngineSlots,
  isFusionEngine,
  validateEngineForTonnage,
  validateEngineRating,
} from '../engineCalculations';

describe('validateEngineRating', () => {
  it('accepts valid multiples of 5 in [10..500]', () => {
    expect(validateEngineRating(10).isValid).toBe(true);
    expect(validateEngineRating(200).isValid).toBe(true);
    expect(validateEngineRating(500).isValid).toBe(true);
  });

  it('rejects non-multiples of 5', () => {
    const r = validateEngineRating(201);
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => /multiple of 5/.test(e))).toBe(true);
  });

  it('rejects out-of-range ratings', () => {
    expect(validateEngineRating(5).isValid).toBe(false);
    expect(validateEngineRating(505).isValid).toBe(false);
  });

  it('rejects non-integer ratings', () => {
    const r = validateEngineRating(50.5);
    expect(r.isValid).toBe(false);
  });
});

describe('getBaseEngineWeight (TechManual table)', () => {
  it('matches the canonical table at common ratings', () => {
    expect(getBaseEngineWeight(200)).toBe(8.5);
    expect(getBaseEngineWeight(300)).toBe(19.0);
    expect(getBaseEngineWeight(100)).toBe(3.0);
    expect(getBaseEngineWeight(400)).toBe(52.5);
  });

  it('returns 0 for invalid ratings', () => {
    expect(getBaseEngineWeight(7)).toBe(0);
    expect(getBaseEngineWeight(0)).toBe(0);
  });
});

describe('calculateEngineWeight (with type multiplier)', () => {
  it('matches base weight for standard fusion', () => {
    expect(calculateEngineWeight(200, EngineType.STANDARD)).toBe(8.5);
  });

  it('halves weight for XL engines (mult 0.5, rounded UP to 0.5 t)', () => {
    // 8.5 × 0.5 = 4.25 → ceil 0.5 → 4.5
    expect(calculateEngineWeight(200, EngineType.XL_IS)).toBe(4.5);
    expect(calculateEngineWeight(200, EngineType.XL_CLAN)).toBe(4.5);
  });
});

describe('calculateEngineRating + calculateWalkMP', () => {
  it('rating = tonnage × walkMP, snapped to nearest 5', () => {
    expect(calculateEngineRating(50, 4)).toBe(200);
    expect(calculateEngineRating(75, 4)).toBe(300);
    // 50×7 = 350 (multiple of 5)
    expect(calculateEngineRating(50, 7)).toBe(350);
  });

  it('walkMP = floor(rating / tonnage)', () => {
    expect(calculateWalkMP(200, 50)).toBe(4);
    expect(calculateWalkMP(300, 75)).toBe(4);
    expect(calculateWalkMP(199, 50)).toBe(3); // floor 3.98 → 3
  });

  it('returns 0 walk MP for non-positive inputs', () => {
    expect(calculateWalkMP(0, 50)).toBe(0);
    expect(calculateWalkMP(200, 0)).toBe(0);
  });
});

describe('engine slot accounting', () => {
  it('Standard CT slots = 6, side-torso = 0', () => {
    expect(getEngineCTSlots(200, EngineType.STANDARD)).toBe(6);
    expect(getEngineSideTorsoSlots(EngineType.STANDARD)).toBe(0);
    expect(getTotalEngineSlots(200, EngineType.STANDARD)).toBe(6);
  });

  it('IS XL: 6 CT + 3 per side = 12 total', () => {
    expect(getEngineSideTorsoSlots(EngineType.XL_IS)).toBe(3);
    expect(getTotalEngineSlots(200, EngineType.XL_IS)).toBe(12);
  });

  it('Clan XL: 6 CT + 2 per side = 10 total', () => {
    expect(getEngineSideTorsoSlots(EngineType.XL_CLAN)).toBe(2);
    expect(getTotalEngineSlots(200, EngineType.XL_CLAN)).toBe(10);
  });

  it('Compact engines use 3 CT slots and 0 side', () => {
    expect(getEngineCTSlots(200, EngineType.COMPACT)).toBe(3);
    expect(getEngineSideTorsoSlots(EngineType.COMPACT)).toBe(0);
  });
});

describe('calculateIntegralHeatSinks (floor(rating/25) for fusion)', () => {
  it('returns floor(rating / 25) for fusion engines', () => {
    expect(calculateIntegralHeatSinks(250, EngineType.STANDARD)).toBe(10);
    expect(calculateIntegralHeatSinks(400, EngineType.STANDARD)).toBe(16);
    expect(calculateIntegralHeatSinks(99, EngineType.STANDARD)).toBe(3);
  });

  it('returns 0 for non-fusion engines (ICE)', () => {
    expect(calculateIntegralHeatSinks(200, EngineType.ICE)).toBe(0);
  });
});

describe('validateEngineForTonnage', () => {
  it('flags engine too small (walk < 1)', () => {
    // 100 t with rating 50 → walkMP 0 → invalid
    const r = validateEngineForTonnage(50, 100);
    expect(r.isValid).toBe(false);
  });

  it('flags engine too large (walk > 20)', () => {
    // 5 t with rating 500 → walkMP = floor(500/5) = 100 → invalid
    const r = validateEngineForTonnage(500, 5);
    expect(r.isValid).toBe(false);
    expect(r.errors.some((e) => /too high/.test(e))).toBe(true);
  });

  it('passes for legal engine/tonnage combinations', () => {
    expect(validateEngineForTonnage(200, 50).isValid).toBe(true);
  });
});

describe('isFusionEngine', () => {
  it('returns true for fusion family', () => {
    expect(isFusionEngine(EngineType.STANDARD)).toBe(true);
    expect(isFusionEngine(EngineType.XL_IS)).toBe(true);
  });

  it('returns false for ICE / fuel cell / fission', () => {
    expect(isFusionEngine(EngineType.ICE)).toBe(false);
    expect(isFusionEngine(EngineType.FUEL_CELL)).toBe(false);
    expect(isFusionEngine(EngineType.FISSION)).toBe(false);
  });
});

describe('getAllValidEngineRatings', () => {
  it('returns a sorted ascending list of multiples of 5 from 10 to 500', () => {
    const ratings = getAllValidEngineRatings();
    expect(ratings[0]).toBe(10);
    expect(ratings[ratings.length - 1]).toBe(500);
    // Sorted ascending
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i]).toBeGreaterThan(ratings[i - 1]);
    }
    // All multiples of 5
    expect(ratings.every((r) => r % 5 === 0)).toBe(true);
  });
});
