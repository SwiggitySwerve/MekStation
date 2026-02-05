import {
  isValidWeight,
  roundToHalfTon,
  ceilToHalfTon,
  floorToHalfTon,
  percentOfTonnage,
  percentOfTonnageRounded,
  validateWeight,
} from '@/utils/physical/weightUtils';

describe('weightUtils', () => {
  describe('isValidWeight()', () => {
    it('should return true for valid weights', () => {
      expect(isValidWeight(0)).toBe(true);
      expect(isValidWeight(5)).toBe(true);
      expect(isValidWeight(50.5)).toBe(true);
    });

    it('should return false for negative weights', () => {
      expect(isValidWeight(-1)).toBe(false);
    });

    it('should return false for infinite weights', () => {
      expect(isValidWeight(Infinity)).toBe(false);
      expect(isValidWeight(-Infinity)).toBe(false);
    });

    it('should return false for NaN', () => {
      expect(isValidWeight(NaN)).toBe(false);
    });
  });

  describe('roundToHalfTon()', () => {
    it('should round to nearest half ton', () => {
      expect(roundToHalfTon(5.2)).toBe(5.0);
      expect(roundToHalfTon(5.3)).toBe(5.5);
      expect(roundToHalfTon(5.7)).toBe(5.5);
      expect(roundToHalfTon(5.8)).toBe(6.0);
    });

    it('should handle exact half tons', () => {
      expect(roundToHalfTon(5.5)).toBe(5.5);
      expect(roundToHalfTon(10.0)).toBe(10.0);
    });

    it('should return 0 for invalid input', () => {
      expect(roundToHalfTon(Infinity)).toBe(0);
      expect(roundToHalfTon(NaN)).toBe(0);
    });
  });

  describe('ceilToHalfTon()', () => {
    it('should round up to nearest half ton', () => {
      expect(ceilToHalfTon(5.1)).toBe(5.5);
      expect(ceilToHalfTon(5.5)).toBe(5.5);
      expect(ceilToHalfTon(5.6)).toBe(6.0);
    });

    it('should return 0 for invalid input', () => {
      expect(ceilToHalfTon(Infinity)).toBe(0);
      expect(ceilToHalfTon(NaN)).toBe(0);
    });
  });

  describe('floorToHalfTon()', () => {
    it('should round down to nearest half ton', () => {
      expect(floorToHalfTon(5.6)).toBe(5.5);
      expect(floorToHalfTon(5.5)).toBe(5.5);
      expect(floorToHalfTon(5.4)).toBe(5.0);
    });

    it('should return 0 for invalid input', () => {
      expect(floorToHalfTon(Infinity)).toBe(0);
      expect(floorToHalfTon(NaN)).toBe(0);
    });
  });

  describe('percentOfTonnage()', () => {
    it('should calculate percentage of tonnage', () => {
      expect(percentOfTonnage(0.1, 50)).toBe(5); // 10% of 50 = 5
      expect(percentOfTonnage(0.2, 50)).toBe(10); // 20% of 50 = 10
    });

    it('should return 0 for invalid input', () => {
      expect(percentOfTonnage(Infinity, 50)).toBe(0);
      expect(percentOfTonnage(0.1, Infinity)).toBe(0);
    });
  });

  describe('percentOfTonnageRounded()', () => {
    it('should calculate and round percentage', () => {
      const result = percentOfTonnageRounded(0.1, 50);
      expect(result).toBe(5.0);
    });
  });

  describe('validateWeight()', () => {
    it('should validate correct weight', () => {
      const result = validateWeight(5);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject negative weight', () => {
      const result = validateWeight(-1);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should include context in errors', () => {
      const result = validateWeight(-1, 'Engine');
      expect(result.errors[0]).toContain('Engine');
    });
  });
});
