import { EngineType } from '@/types/construction/EngineType';
import {
  validateEngineRating,
  getBaseEngineWeight,
  calculateEngineWeight,
  calculateEngineRating,
  calculateIntegralHeatSinks,
  getEngineCTSlots,
  calculateWalkMP,
  getEngineSideTorsoSlots,
  getTotalEngineSlots,
  validateEngineForTonnage,
  isFusionEngine,
  getAllValidEngineRatings,
} from '@/utils/construction/engineCalculations';

describe('engineCalculations', () => {
  describe('validateEngineRating()', () => {
    it('should validate correct engine rating', () => {
      const result = validateEngineRating(250);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject non-integer ratings', () => {
      const result = validateEngineRating(250.5);
      expect(result.isValid).toBe(false);
    });

    it('should reject ratings below 10', () => {
      const result = validateEngineRating(5);
      expect(result.isValid).toBe(false);
    });

    it('should reject ratings above 500', () => {
      const result = validateEngineRating(505);
      expect(result.isValid).toBe(false);
    });

    it('should reject ratings not multiple of 5', () => {
      const result = validateEngineRating(251);
      expect(result.isValid).toBe(false);
    });
  });

  describe('getBaseEngineWeight()', () => {
    it('should return weight from table', () => {
      const weight = getBaseEngineWeight(250);
      expect(weight).toBe(12.5); // From table
    });

    it('should calculate weight for non-table values', () => {
      const weight = getBaseEngineWeight(255);
      expect(weight).toBeGreaterThan(0);
    });

    it('should return 0 for invalid rating', () => {
      const weight = getBaseEngineWeight(251);
      expect(weight).toBe(0);
    });
  });

  describe('calculateEngineWeight()', () => {
    it('should calculate standard engine weight', () => {
      const weight = calculateEngineWeight(250, EngineType.STANDARD);
      expect(weight).toBeGreaterThan(0);
    });

    it('should apply XL multiplier', () => {
      const standardWeight = calculateEngineWeight(250, EngineType.STANDARD);
      const xlWeight = calculateEngineWeight(250, EngineType.XL_IS);

      expect(xlWeight).toBeLessThan(standardWeight);
    });

    it('should handle unknown engine type', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(calculateEngineWeight(250, 'INVALID' as any)).toBe(
        getBaseEngineWeight(250),
      );
    });
  });

  describe('calculateEngineRating()', () => {
    it('should calculate engine rating from tonnage and walk MP', () => {
      const rating = calculateEngineRating(50, 5);
      expect(rating).toBe(250); // 50 * 5 = 250, rounded to nearest 5
    });

    it('should round to nearest multiple of 5', () => {
      const rating = calculateEngineRating(50, 4.7);
      expect(rating % 5).toBe(0);
    });
  });

  describe('calculateWalkMP()', () => {
    it('should calculate walk MP', () => {
      expect(calculateWalkMP(250, 50)).toBe(5);
      expect(calculateWalkMP(245, 50)).toBe(4);
    });

    it('should return 0 for invalid input', () => {
      expect(calculateWalkMP(0, 50)).toBe(0);
      expect(calculateWalkMP(250, 0)).toBe(0);
    });
  });

  describe('calculateIntegralHeatSinks()', () => {
    it('should calculate integral heat sinks', () => {
      const sinks = calculateIntegralHeatSinks(250, EngineType.STANDARD);
      expect(sinks).toBe(10); // 250 / 25 = 10
    });

    it('should handle different engine types', () => {
      const standardSinks = calculateIntegralHeatSinks(
        250,
        EngineType.STANDARD,
      );
      const xlSinks = calculateIntegralHeatSinks(250, EngineType.XL_IS);

      expect(xlSinks).toBeGreaterThanOrEqual(standardSinks);
    });

    it('should return 0 if engine does not support integral sinks', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(calculateIntegralHeatSinks(250, 'ICE' as any)).toBe(0);
    });
  });

  describe('getEngineCTSlots()', () => {
    it('should return CT slots for standard engine', () => {
      const slots = getEngineCTSlots(250, EngineType.STANDARD);
      expect(slots).toBeGreaterThan(0);
      expect(slots).toBeLessThanOrEqual(6);
    });

    it('should handle COMPACT engine', () => {
      expect(getEngineCTSlots(250, EngineType.COMPACT)).toBe(3);
    });

    it('should handle unknown engine type', () => {
      // oxlint-disable-next-line @typescript-eslint/no-explicit-any -- Testing invalid input handling
      expect(getEngineCTSlots(250, 'INVALID' as any)).toBe(6);
    });
  });

  describe('getEngineSideTorsoSlots()', () => {
    it('should return 0 for standard engine', () => {
      expect(getEngineSideTorsoSlots(EngineType.STANDARD)).toBe(0);
    });

    it('should return correct slots for XL engine', () => {
      expect(getEngineSideTorsoSlots(EngineType.XL_IS)).toBe(3);
    });
  });

  describe('getTotalEngineSlots()', () => {
    it('should sum CT and side torso slots', () => {
      const total = getTotalEngineSlots(250, EngineType.XL_IS);
      expect(total).toBe(6 + 3 * 2);
    });
  });

  describe('validateEngineForTonnage()', () => {
    it('should validate valid engine', () => {
      const result = validateEngineForTonnage(250, 50);
      expect(result.isValid).toBe(true);
    });

    it('should reject engine with walk MP < 1', () => {
      const result = validateEngineForTonnage(40, 100);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too low');
    });

    it('should reject engine with walk MP > 20', () => {
      const result = validateEngineForTonnage(500, 20);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too high');
    });
  });

  describe('isFusionEngine()', () => {
    it('should return true for fusion engines', () => {
      expect(isFusionEngine(EngineType.STANDARD)).toBe(true);
      expect(isFusionEngine(EngineType.XL_IS)).toBe(true);
    });
  });

  describe('getAllValidEngineRatings()', () => {
    it('should return a list of ratings', () => {
      const ratings = getAllValidEngineRatings();
      expect(ratings).toContain(250);
      expect(ratings.length).toBeGreaterThan(50);
    });
  });
});
