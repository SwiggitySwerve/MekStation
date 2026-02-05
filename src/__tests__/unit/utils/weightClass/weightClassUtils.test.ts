/**
 * Tests for Weight Class Utilities
 *
 * @spec openspec/specs/weight-class-system/spec.md
 */

import {
  WeightClass,
  WEIGHT_CLASS_RANGES,
  getWeightClass,
  getWeightClassRange,
  isValidMechTonnage,
  getValidMechTonnages,
  compareWeightClasses,
  getTonnagesForWeightClass,
  validateTonnage,
} from '@/utils/weightClass/weightClassUtils';

describe('Weight Class Utilities', () => {
  // ============================================================================
  // WEIGHT_CLASS_RANGES
  // ============================================================================
  describe('WEIGHT_CLASS_RANGES', () => {
    it('should define all weight classes including special types', () => {
      // Includes Ultralight, Light, Medium, Heavy, Assault, Super Heavy
      expect(WEIGHT_CLASS_RANGES.length).toBeGreaterThanOrEqual(4);
    });

    it('should cover full tonnage range', () => {
      const minTonnage = Math.min(
        ...WEIGHT_CLASS_RANGES.map((r) => r.minTonnage),
      );
      const maxTonnage = Math.max(
        ...WEIGHT_CLASS_RANGES.map((r) => r.maxTonnage),
      );
      expect(minTonnage).toBeLessThanOrEqual(20);
      expect(maxTonnage).toBeGreaterThanOrEqual(100);
    });
  });

  // ============================================================================
  // getWeightClass
  // ============================================================================
  describe('getWeightClass', () => {
    it('should return LIGHT for 20-35 tons', () => {
      expect(getWeightClass(20)).toBe(WeightClass.LIGHT);
      expect(getWeightClass(25)).toBe(WeightClass.LIGHT);
      expect(getWeightClass(30)).toBe(WeightClass.LIGHT);
      expect(getWeightClass(35)).toBe(WeightClass.LIGHT);
    });

    it('should return MEDIUM for 40-55 tons', () => {
      expect(getWeightClass(40)).toBe(WeightClass.MEDIUM);
      expect(getWeightClass(45)).toBe(WeightClass.MEDIUM);
      expect(getWeightClass(50)).toBe(WeightClass.MEDIUM);
      expect(getWeightClass(55)).toBe(WeightClass.MEDIUM);
    });

    it('should return HEAVY for 60-75 tons', () => {
      expect(getWeightClass(60)).toBe(WeightClass.HEAVY);
      expect(getWeightClass(65)).toBe(WeightClass.HEAVY);
      expect(getWeightClass(70)).toBe(WeightClass.HEAVY);
      expect(getWeightClass(75)).toBe(WeightClass.HEAVY);
    });

    it('should return ASSAULT for 80-100 tons', () => {
      expect(getWeightClass(80)).toBe(WeightClass.ASSAULT);
      expect(getWeightClass(85)).toBe(WeightClass.ASSAULT);
      expect(getWeightClass(90)).toBe(WeightClass.ASSAULT);
      expect(getWeightClass(95)).toBe(WeightClass.ASSAULT);
      expect(getWeightClass(100)).toBe(WeightClass.ASSAULT);
    });
  });

  // ============================================================================
  // getWeightClassRange
  // ============================================================================
  describe('getWeightClassRange', () => {
    it('should return correct range for LIGHT', () => {
      const range = getWeightClassRange(WeightClass.LIGHT);
      expect(range).toBeDefined();
      expect(range?.minTonnage).toBe(20);
      expect(range?.maxTonnage).toBe(35);
    });

    it('should return correct range for MEDIUM', () => {
      const range = getWeightClassRange(WeightClass.MEDIUM);
      expect(range).toBeDefined();
      expect(range?.minTonnage).toBe(40);
      expect(range?.maxTonnage).toBe(55);
    });

    it('should return correct range for HEAVY', () => {
      const range = getWeightClassRange(WeightClass.HEAVY);
      expect(range).toBeDefined();
      expect(range?.minTonnage).toBe(60);
      expect(range?.maxTonnage).toBe(75);
    });

    it('should return correct range for ASSAULT', () => {
      const range = getWeightClassRange(WeightClass.ASSAULT);
      expect(range).toBeDefined();
      expect(range?.minTonnage).toBe(80);
      expect(range?.maxTonnage).toBe(100);
    });
  });

  // ============================================================================
  // isValidMechTonnage
  // ============================================================================
  describe('isValidMechTonnage', () => {
    it('should accept valid tonnages in 5-ton increments', () => {
      const validTonnages = [
        20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
      ];
      for (const tonnage of validTonnages) {
        expect(isValidMechTonnage(tonnage)).toBe(true);
      }
    });

    it('should reject tonnages below 20', () => {
      expect(isValidMechTonnage(15)).toBe(false);
      expect(isValidMechTonnage(10)).toBe(false);
    });

    it('should reject tonnages above 100', () => {
      expect(isValidMechTonnage(105)).toBe(false);
      expect(isValidMechTonnage(200)).toBe(false);
    });

    it('should reject non-5-ton increments', () => {
      expect(isValidMechTonnage(52)).toBe(false);
      expect(isValidMechTonnage(63)).toBe(false);
    });
  });

  // ============================================================================
  // getValidMechTonnages
  // ============================================================================
  describe('getValidMechTonnages', () => {
    it('should return 17 valid tonnages (20-100 in 5-ton increments)', () => {
      const tonnages = getValidMechTonnages();
      expect(tonnages).toHaveLength(17);
    });

    it('should start at 20 and end at 100', () => {
      const tonnages = getValidMechTonnages();
      expect(tonnages[0]).toBe(20);
      expect(tonnages[tonnages.length - 1]).toBe(100);
    });

    it('should be in 5-ton increments', () => {
      const tonnages = getValidMechTonnages();
      for (let i = 1; i < tonnages.length; i++) {
        expect(tonnages[i] - tonnages[i - 1]).toBe(5);
      }
    });
  });

  // ============================================================================
  // compareWeightClasses
  // ============================================================================
  describe('compareWeightClasses', () => {
    it('should return negative when first is lighter', () => {
      expect(
        compareWeightClasses(WeightClass.LIGHT, WeightClass.MEDIUM),
      ).toBeLessThan(0);
      expect(
        compareWeightClasses(WeightClass.MEDIUM, WeightClass.HEAVY),
      ).toBeLessThan(0);
      expect(
        compareWeightClasses(WeightClass.HEAVY, WeightClass.ASSAULT),
      ).toBeLessThan(0);
    });

    it('should return positive when first is heavier', () => {
      expect(
        compareWeightClasses(WeightClass.ASSAULT, WeightClass.HEAVY),
      ).toBeGreaterThan(0);
      expect(
        compareWeightClasses(WeightClass.HEAVY, WeightClass.MEDIUM),
      ).toBeGreaterThan(0);
      expect(
        compareWeightClasses(WeightClass.MEDIUM, WeightClass.LIGHT),
      ).toBeGreaterThan(0);
    });

    it('should return 0 when equal', () => {
      expect(compareWeightClasses(WeightClass.LIGHT, WeightClass.LIGHT)).toBe(
        0,
      );
      expect(compareWeightClasses(WeightClass.MEDIUM, WeightClass.MEDIUM)).toBe(
        0,
      );
      expect(compareWeightClasses(WeightClass.HEAVY, WeightClass.HEAVY)).toBe(
        0,
      );
      expect(
        compareWeightClasses(WeightClass.ASSAULT, WeightClass.ASSAULT),
      ).toBe(0);
    });
  });

  // ============================================================================
  // getTonnagesForWeightClass
  // ============================================================================
  describe('getTonnagesForWeightClass', () => {
    it('should return 4 tonnages for LIGHT (20, 25, 30, 35)', () => {
      const tonnages = getTonnagesForWeightClass(WeightClass.LIGHT);
      expect(tonnages).toEqual([20, 25, 30, 35]);
    });

    it('should return 4 tonnages for MEDIUM (40, 45, 50, 55)', () => {
      const tonnages = getTonnagesForWeightClass(WeightClass.MEDIUM);
      expect(tonnages).toEqual([40, 45, 50, 55]);
    });

    it('should return 4 tonnages for HEAVY (60, 65, 70, 75)', () => {
      const tonnages = getTonnagesForWeightClass(WeightClass.HEAVY);
      expect(tonnages).toEqual([60, 65, 70, 75]);
    });

    it('should return 5 tonnages for ASSAULT (80, 85, 90, 95, 100)', () => {
      const tonnages = getTonnagesForWeightClass(WeightClass.ASSAULT);
      expect(tonnages).toEqual([80, 85, 90, 95, 100]);
    });
  });

  // ============================================================================
  // validateTonnage
  // ============================================================================
  describe('validateTonnage', () => {
    it('should validate valid tonnage and return weight class', () => {
      const result = validateTonnage(50);
      expect(result.isValid).toBe(true);
      expect(result.weightClass).toBe(WeightClass.MEDIUM);
      expect(result.errors).toHaveLength(0);
    });

    it('should error for non-finite numbers', () => {
      const result = validateTonnage(Infinity);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Tonnage must be a finite number');
    });

    it('should error for tonnage below 20', () => {
      const result = validateTonnage(15);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('at least 20'))).toBe(true);
    });

    it('should error for tonnage above 100', () => {
      const result = validateTonnage(105);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('at most 100'))).toBe(true);
    });

    it('should error for non-5-ton increments', () => {
      const result = validateTonnage(52);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('5-ton increments'))).toBe(
        true,
      );
    });

    it('should still return weight class even when invalid', () => {
      const result = validateTonnage(52);
      expect(result.weightClass).toBe(WeightClass.MEDIUM);
    });
  });
});
