/**
 * Tests for Engine Calculations
 *
 * @spec openspec/specs/engine-system/spec.md
 */

import { EngineType } from '@/types/construction/EngineType';
import {
  validateEngineRating,
  getBaseEngineWeight,
  calculateEngineWeight,
  calculateEngineRating,
  calculateWalkMP,
  getEngineCTSlots,
  getEngineSideTorsoSlots,
  getTotalEngineSlots,
  calculateIntegralHeatSinks,
  validateEngineForTonnage,
  isFusionEngine,
  getAllValidEngineRatings,
} from '@/utils/construction/engineCalculations';

describe('Engine Calculations', () => {
  describe('validateEngineRating', () => {
    it('should pass for valid ratings', () => {
      expect(validateEngineRating(100).isValid).toBe(true);
      expect(validateEngineRating(250).isValid).toBe(true);
      expect(validateEngineRating(400).isValid).toBe(true);
    });

    it('should fail for ratings below minimum', () => {
      const result = validateEngineRating(5);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('10'))).toBe(true);
    });

    it('should fail for ratings above maximum', () => {
      const result = validateEngineRating(505);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('500'))).toBe(true);
    });

    it('should fail for non-multiples of 5', () => {
      const result = validateEngineRating(103);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('multiple'))).toBe(true);
    });

    it('should fail for non-integers', () => {
      const result = validateEngineRating(100.5);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('integer'))).toBe(true);
    });

    it('should pass for boundary values', () => {
      expect(validateEngineRating(10).isValid).toBe(true);
      expect(validateEngineRating(500).isValid).toBe(true);
    });
  });

  describe('getBaseEngineWeight', () => {
    it('should return correct weight for standard ratings', () => {
      expect(getBaseEngineWeight(100)).toBe(3.0);
      expect(getBaseEngineWeight(200)).toBe(8.5);
      expect(getBaseEngineWeight(300)).toBe(19.0);
    });

    it('should return 0 for invalid ratings', () => {
      expect(getBaseEngineWeight(503)).toBe(0);
      expect(getBaseEngineWeight(5)).toBe(0);
    });

    it('should return correct weight for small engines', () => {
      expect(getBaseEngineWeight(10)).toBe(0.5);
      expect(getBaseEngineWeight(50)).toBe(1.5);
    });

    it('should return correct weight for large engines', () => {
      expect(getBaseEngineWeight(400)).toBe(52.5);
      expect(getBaseEngineWeight(500)).toBe(462.5);
    });
  });

  describe('calculateEngineWeight', () => {
    it('should calculate standard fusion engine weight', () => {
      const weight = calculateEngineWeight(200, EngineType.STANDARD);
      expect(weight).toBe(8.5);
    });

    it('should apply XL multiplier', () => {
      const standardWeight = calculateEngineWeight(200, EngineType.STANDARD);
      const xlWeight = calculateEngineWeight(200, EngineType.XL_IS);
      expect(xlWeight).toBeLessThan(standardWeight);
    });

    it('should apply light engine multiplier', () => {
      const standardWeight = calculateEngineWeight(200, EngineType.STANDARD);
      const lightWeight = calculateEngineWeight(200, EngineType.LIGHT);
      expect(lightWeight).toBeLessThan(standardWeight);
      expect(lightWeight).toBeGreaterThan(
        calculateEngineWeight(200, EngineType.XL_IS),
      );
    });

    it('should handle compact engine', () => {
      const compactWeight = calculateEngineWeight(200, EngineType.COMPACT);
      expect(compactWeight).toBeGreaterThan(0);
    });
  });

  describe('calculateEngineRating', () => {
    it('should calculate rating from tonnage and walk MP', () => {
      // 50 ton mech, walk MP 4 = 200 rating
      expect(calculateEngineRating(50, 4)).toBe(200);

      // 75 ton mech, walk MP 3 = 225 rating
      expect(calculateEngineRating(75, 3)).toBe(225);

      // 100 ton mech, walk MP 3 = 300 rating
      expect(calculateEngineRating(100, 3)).toBe(300);
    });

    it('should round to nearest 5', () => {
      // 55 tons, walk MP 3 = 165, which is already multiple of 5
      expect(calculateEngineRating(55, 3)).toBe(165);

      // 52 tons, walk MP 3 = 156, rounds to 155
      expect(calculateEngineRating(52, 3)).toBe(155);
    });
  });

  describe('calculateWalkMP', () => {
    it('should calculate walk MP from rating and tonnage', () => {
      expect(calculateWalkMP(200, 50)).toBe(4);
      expect(calculateWalkMP(300, 100)).toBe(3);
      expect(calculateWalkMP(250, 50)).toBe(5);
    });

    it('should return 0 for invalid inputs', () => {
      expect(calculateWalkMP(0, 50)).toBe(0);
      expect(calculateWalkMP(200, 0)).toBe(0);
      expect(calculateWalkMP(-100, 50)).toBe(0);
    });

    it('should floor the result', () => {
      // 175 / 50 = 3.5 -> floors to 3
      expect(calculateWalkMP(175, 50)).toBe(3);
    });
  });

  describe('getEngineCTSlots', () => {
    it('should return correct slots for standard fusion', () => {
      const slots = getEngineCTSlots(200, EngineType.STANDARD);
      expect(slots).toBeGreaterThan(0);
    });

    it('should return 3 slots for compact engine', () => {
      expect(getEngineCTSlots(200, EngineType.COMPACT)).toBe(3);
    });

    it('should return standard slots for XL engine', () => {
      expect(getEngineCTSlots(200, EngineType.XL_IS)).toBeGreaterThan(0);
    });
  });

  describe('getEngineSideTorsoSlots', () => {
    it('should return 0 for standard fusion', () => {
      expect(getEngineSideTorsoSlots(EngineType.STANDARD)).toBe(0);
    });

    it('should return 3 for XL IS engine', () => {
      expect(getEngineSideTorsoSlots(EngineType.XL_IS)).toBe(3);
    });

    it('should return 2 for XL Clan engine', () => {
      expect(getEngineSideTorsoSlots(EngineType.XL_CLAN)).toBe(2);
    });

    it('should return slots for light engine', () => {
      expect(getEngineSideTorsoSlots(EngineType.LIGHT)).toBe(2);
    });
  });

  describe('getTotalEngineSlots', () => {
    it('should calculate total slots including side torsos', () => {
      // Standard fusion: CT only
      const fusionSlots = getTotalEngineSlots(200, EngineType.STANDARD);

      // XL: CT + both side torsos
      const xlSlots = getTotalEngineSlots(200, EngineType.XL_IS);

      expect(xlSlots).toBeGreaterThan(fusionSlots);
    });

    it('should include both side torso slots for XL', () => {
      const ctSlots = getEngineCTSlots(200, EngineType.XL_IS);
      const stSlots = getEngineSideTorsoSlots(EngineType.XL_IS);
      const totalSlots = getTotalEngineSlots(200, EngineType.XL_IS);

      expect(totalSlots).toBe(ctSlots + stSlots * 2);
    });
  });

  describe('calculateIntegralHeatSinks', () => {
    it('should calculate integral heat sinks from rating', () => {
      // 250 rating = floor(250/25) = 10 integral heat sinks
      expect(calculateIntegralHeatSinks(250, EngineType.STANDARD)).toBe(10);

      // 300 rating = floor(300/25) = 12 integral heat sinks
      expect(calculateIntegralHeatSinks(300, EngineType.STANDARD)).toBe(12);
    });

    it('should return 0 for engines that do not support integral heat sinks', () => {
      // ICE engines don't support integral heat sinks
      const integral = calculateIntegralHeatSinks(200, EngineType.ICE);
      expect(integral).toBe(0);
    });

    it('should floor the result', () => {
      // 175 / 25 = 7
      expect(calculateIntegralHeatSinks(175, EngineType.STANDARD)).toBe(7);

      // 195/25 = 7.8 -> 7
      expect(calculateIntegralHeatSinks(195, EngineType.STANDARD)).toBe(7);
    });

    it('should handle large engines', () => {
      // 400 rating = 16 integral heat sinks
      expect(calculateIntegralHeatSinks(400, EngineType.STANDARD)).toBe(16);
    });
  });

  describe('validateEngineForTonnage', () => {
    it('should pass for valid configurations', () => {
      const result = validateEngineForTonnage(200, 50);
      expect(result.isValid).toBe(true);
    });

    it('should fail for rating too low (walk MP < 1)', () => {
      const result = validateEngineForTonnage(10, 100);
      expect(result.isValid).toBe(false);
    });

    it('should fail for rating too high (walk MP > 20)', () => {
      const result = validateEngineForTonnage(500, 20);
      expect(result.isValid).toBe(false);
    });

    it('should inherit rating validation errors', () => {
      const result = validateEngineForTonnage(503, 50);
      expect(result.isValid).toBe(false);
    });
  });

  describe('isFusionEngine', () => {
    it('should return true for standard fusion engine', () => {
      expect(isFusionEngine(EngineType.STANDARD)).toBe(true);
    });

    it('should return true for XL IS fusion', () => {
      expect(isFusionEngine(EngineType.XL_IS)).toBe(true);
    });

    it('should return true for XL Clan fusion', () => {
      expect(isFusionEngine(EngineType.XL_CLAN)).toBe(true);
    });

    it('should return true for light fusion', () => {
      expect(isFusionEngine(EngineType.LIGHT)).toBe(true);
    });

    it('should return true for compact fusion', () => {
      expect(isFusionEngine(EngineType.COMPACT)).toBe(true);
    });

    it('should return false for ICE', () => {
      expect(isFusionEngine(EngineType.ICE)).toBe(false);
    });

    it('should return false for fuel cell', () => {
      expect(isFusionEngine(EngineType.FUEL_CELL)).toBe(false);
    });
  });

  describe('getAllValidEngineRatings', () => {
    it('should return array of valid ratings', () => {
      const ratings = getAllValidEngineRatings();
      expect(Array.isArray(ratings)).toBe(true);
      expect(ratings.length).toBeGreaterThan(0);
    });

    it('should be sorted in ascending order', () => {
      const ratings = getAllValidEngineRatings();
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeGreaterThan(ratings[i - 1]);
      }
    });

    it('should include common ratings', () => {
      const ratings = getAllValidEngineRatings();
      expect(ratings).toContain(100);
      expect(ratings).toContain(200);
      expect(ratings).toContain(300);
    });

    it('should start at 10 and end at 500', () => {
      const ratings = getAllValidEngineRatings();
      expect(ratings[0]).toBe(10);
      expect(ratings[ratings.length - 1]).toBe(500);
    });
  });
});
