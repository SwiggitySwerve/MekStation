/**
 * Tests for Battle Value calculation utilities
 */

import { calculateAdjustedBV } from '../battleValueCalculations';

describe('calculateAdjustedBV', () => {
  describe('baseline pilot (4/5)', () => {
    it('should return approximately baseBV × 1.0 for 4/5 pilot', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 4, 5);
      // 4 + 5 = 9, which gives 1.0 modifier
      expect(result).toBe(1000);
    });

    it('should handle different base values for baseline pilot', () => {
      expect(calculateAdjustedBV(500, 4, 5)).toBe(500);
      expect(calculateAdjustedBV(2000, 4, 5)).toBe(2000);
    });
  });

  describe('elite pilot (3/4)', () => {
    it('should return approximately baseBV × 1.2 for 3/4 pilot', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 3, 4);
      // 3 + 4 = 7, which gives 1.2 modifier
      expect(result).toBe(1200);
    });

    it('should handle different base values for elite pilot', () => {
      expect(calculateAdjustedBV(500, 3, 4)).toBe(600);
      expect(calculateAdjustedBV(2000, 3, 4)).toBe(2400);
    });
  });

  describe('green pilot (5/6)', () => {
    it('should return approximately baseBV × 0.9 for 5/6 pilot', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 5, 6);
      // 5 + 6 = 11, which gives 0.9 modifier
      expect(result).toBe(900);
    });

    it('should handle different base values for green pilot', () => {
      expect(calculateAdjustedBV(500, 5, 6)).toBe(450);
      expect(calculateAdjustedBV(2000, 5, 6)).toBe(1800);
    });
  });

  describe('edge cases', () => {
    it('should handle zero base BV', () => {
      expect(calculateAdjustedBV(0, 4, 5)).toBe(0);
      expect(calculateAdjustedBV(0, 3, 4)).toBe(0);
    });

    it('should round to nearest integer', () => {
      // 1000 × 1.2 = 1200 (exact)
      expect(calculateAdjustedBV(1000, 3, 4)).toBe(1200);
      
      // 1111 × 1.2 = 1333.2 -> rounds to 1333
      expect(calculateAdjustedBV(1111, 3, 4)).toBe(1333);
    });

    it('should handle perfect pilot (0/0)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 0, 0);
      // 0 + 0 = 0, which gives 1.4 modifier
      expect(result).toBe(1400);
    });

    it('should handle terrible pilot (8/8)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 8, 8);
      // 8 + 8 = 16, which gives 0.8 modifier
      expect(result).toBe(800);
    });
  });

  describe('skill modifier ranges', () => {
    it('should apply 1.4x for elite pilots (0-5 total)', () => {
      expect(calculateAdjustedBV(1000, 0, 0)).toBe(1400);
      expect(calculateAdjustedBV(1000, 2, 3)).toBe(1400);
      expect(calculateAdjustedBV(1000, 1, 4)).toBe(1400);
    });

    it('should apply 1.2x for skilled pilots (6-7 total)', () => {
      expect(calculateAdjustedBV(1000, 3, 3)).toBe(1200);
      expect(calculateAdjustedBV(1000, 2, 5)).toBe(1200);
      expect(calculateAdjustedBV(1000, 3, 4)).toBe(1200);
    });

    it('should apply 1.0x for regular pilots (8-9 total)', () => {
      expect(calculateAdjustedBV(1000, 4, 4)).toBe(1000);
      expect(calculateAdjustedBV(1000, 4, 5)).toBe(1000);
      expect(calculateAdjustedBV(1000, 3, 6)).toBe(1000);
    });

    it('should apply 0.9x for green pilots (10-11 total)', () => {
      expect(calculateAdjustedBV(1000, 5, 5)).toBe(900);
      expect(calculateAdjustedBV(1000, 5, 6)).toBe(900);
      expect(calculateAdjustedBV(1000, 4, 7)).toBe(900);
    });

    it('should apply 0.8x for poor pilots (12+ total)', () => {
      expect(calculateAdjustedBV(1000, 6, 6)).toBe(800);
      expect(calculateAdjustedBV(1000, 8, 8)).toBe(800);
      expect(calculateAdjustedBV(1000, 5, 8)).toBe(800);
    });
  });
});
