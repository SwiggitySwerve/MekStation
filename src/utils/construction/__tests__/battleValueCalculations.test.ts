/**
 * Tests for Battle Value calculation utilities
 */

import { calculateAdjustedBV } from '../battleValueCalculations';

describe('calculateAdjustedBV', () => {
  describe('baseline pilot (4/5)', () => {
    it('should return baseBV × 1.0 for 4/5 pilot (MegaMek matrix)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 4, 5);
      // MegaMek matrix[4][5] = 1.0
      expect(result).toBe(1000);
    });

    it('should handle different base values for baseline pilot', () => {
      expect(calculateAdjustedBV(500, 4, 5)).toBe(500);
      expect(calculateAdjustedBV(2000, 4, 5)).toBe(2000);
    });
  });

  describe('elite pilot (3/4)', () => {
    it('should return baseBV × 1.32 for 3/4 pilot (MegaMek matrix)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 3, 4);
      // MegaMek matrix[3][4] = 1.32
      expect(result).toBe(1320);
    });

    it('should handle different base values for elite pilot', () => {
      expect(calculateAdjustedBV(500, 3, 4)).toBe(660);
      expect(calculateAdjustedBV(2000, 3, 4)).toBe(2640);
    });
  });

  describe('green pilot (5/6)', () => {
    it('should return baseBV × 0.86 for 5/6 pilot (MegaMek matrix)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 5, 6);
      // MegaMek matrix[5][6] = 0.86
      expect(result).toBe(860);
    });

    it('should handle different base values for green pilot', () => {
      expect(calculateAdjustedBV(500, 5, 6)).toBe(430);
      expect(calculateAdjustedBV(2000, 5, 6)).toBe(1720);
    });
  });

  describe('edge cases', () => {
    it('should handle zero base BV', () => {
      expect(calculateAdjustedBV(0, 4, 5)).toBe(0);
      expect(calculateAdjustedBV(0, 3, 4)).toBe(0);
    });

    it('should round to nearest integer', () => {
      // 1000 × 1.32 = 1320 (exact)
      expect(calculateAdjustedBV(1000, 3, 4)).toBe(1320);

      // 1111 × 1.32 = 1466.52 -> rounds to 1467
      expect(calculateAdjustedBV(1111, 3, 4)).toBe(1467);
    });

    it('should handle perfect pilot (0/0)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 0, 0);
      // MegaMek matrix[0][0] = 2.42
      expect(result).toBe(2420);
    });

    it('should handle terrible pilot (8/8)', () => {
      const baseBV = 1000;
      const result = calculateAdjustedBV(baseBV, 8, 8);
      // MegaMek matrix[8][8] = 0.64
      expect(result).toBe(640);
    });
  });

  describe('skill modifier ranges', () => {
    it('should apply MegaMek matrix values for elite pilots (0-5 total)', () => {
      expect(calculateAdjustedBV(1000, 0, 0)).toBe(2420); // matrix[0][0] = 2.42
      expect(calculateAdjustedBV(1000, 2, 3)).toBe(1680); // matrix[2][3] = 1.68
      expect(calculateAdjustedBV(1000, 1, 4)).toBe(1760); // matrix[1][4] = 1.76
    });

    it('should apply MegaMek matrix values for skilled pilots (6-7 total)', () => {
      expect(calculateAdjustedBV(1000, 3, 3)).toBe(1440); // matrix[3][3] = 1.44
      expect(calculateAdjustedBV(1000, 2, 5)).toBe(1400); // matrix[2][5] = 1.40
      expect(calculateAdjustedBV(1000, 3, 4)).toBe(1320); // matrix[3][4] = 1.32
    });

    it('should apply MegaMek matrix values for regular pilots (8-9 total)', () => {
      expect(calculateAdjustedBV(1000, 4, 4)).toBe(1100); // matrix[4][4] = 1.10
      expect(calculateAdjustedBV(1000, 4, 5)).toBe(1000); // matrix[4][5] = 1.00
      expect(calculateAdjustedBV(1000, 3, 6)).toBe(1160); // matrix[3][6] = 1.16
    });

    it('should apply MegaMek matrix values for green pilots (10-11 total)', () => {
      expect(calculateAdjustedBV(1000, 5, 5)).toBe(900); // matrix[5][5] = 0.90
      expect(calculateAdjustedBV(1000, 5, 6)).toBe(860); // matrix[5][6] = 0.86
      expect(calculateAdjustedBV(1000, 4, 7)).toBe(900); // matrix[4][7] = 0.90
    });

    it('should apply MegaMek matrix values for poor pilots (12+ total)', () => {
      expect(calculateAdjustedBV(1000, 6, 6)).toBe(810); // matrix[6][6] = 0.81
      expect(calculateAdjustedBV(1000, 8, 8)).toBe(640); // matrix[8][8] = 0.64
      expect(calculateAdjustedBV(1000, 5, 8)).toBe(770); // matrix[5][8] = 0.77
    });
  });
});
