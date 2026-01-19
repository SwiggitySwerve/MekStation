/**
 * Range Tests
 * Tests for range calculations.
 *
 * @spec openspec/changes/add-hex-grid-system/specs/hex-grid-system/spec.md
 */

import { describe, it, expect } from '@jest/globals';
import {
  getRangeBracket,
  getRangeModifier,
  calculateRange,
  isInWeaponRange,
  getWeaponRangeBracket,
  getWeaponRangeModifier,
  getMinimumRangePenalty,
  calculateWeaponRange,
  isAdjacent,
  getCoordinatesAtRange,
  getCoordinatesInRange,
  IWeaponRangeProfile,
} from '@/utils/gameplay/range';
import { RangeBracket } from '@/types/gameplay';

describe('range', () => {
  // =========================================================================
  // Range Bracket Determination
  // =========================================================================

  describe('getRangeBracket()', () => {
    it('should return Short for 0-3 hexes', () => {
      expect(getRangeBracket(0)).toBe(RangeBracket.Short);
      expect(getRangeBracket(1)).toBe(RangeBracket.Short);
      expect(getRangeBracket(2)).toBe(RangeBracket.Short);
      expect(getRangeBracket(3)).toBe(RangeBracket.Short);
    });

    it('should return Medium for 4-6 hexes', () => {
      expect(getRangeBracket(4)).toBe(RangeBracket.Medium);
      expect(getRangeBracket(5)).toBe(RangeBracket.Medium);
      expect(getRangeBracket(6)).toBe(RangeBracket.Medium);
    });

    it('should return Long for 7-15 hexes', () => {
      expect(getRangeBracket(7)).toBe(RangeBracket.Long);
      expect(getRangeBracket(10)).toBe(RangeBracket.Long);
      expect(getRangeBracket(15)).toBe(RangeBracket.Long);
    });

    it('should return Extreme for 16+ hexes', () => {
      expect(getRangeBracket(16)).toBe(RangeBracket.Extreme);
      expect(getRangeBracket(20)).toBe(RangeBracket.Extreme);
      expect(getRangeBracket(100)).toBe(RangeBracket.Extreme);
    });
  });

  describe('getRangeModifier()', () => {
    it('should return correct modifiers for each bracket', () => {
      expect(getRangeModifier(RangeBracket.Short)).toBe(0);
      expect(getRangeModifier(RangeBracket.Medium)).toBe(2);
      expect(getRangeModifier(RangeBracket.Long)).toBe(4);
      expect(getRangeModifier(RangeBracket.Extreme)).toBe(6);
    });
  });

  describe('calculateRange()', () => {
    it('should calculate complete range information', () => {
      const result = calculateRange({ q: 0, r: 0 }, { q: 5, r: 0 });
      
      expect(result.distance).toBe(5);
      expect(result.bracket).toBe(RangeBracket.Medium);
      expect(result.modifier).toBe(2);
    });
  });

  // =========================================================================
  // Weapon Range Checking
  // =========================================================================

  const mediumLaserRange: IWeaponRangeProfile = {
    short: 3,
    medium: 6,
    long: 9,
  };

  const lrmRange: IWeaponRangeProfile = {
    short: 7,
    medium: 14,
    long: 21,
    minimum: 6,
  };

  describe('isInWeaponRange()', () => {
    it('should return true when within max range', () => {
      expect(isInWeaponRange(5, mediumLaserRange)).toBe(true);
      expect(isInWeaponRange(9, mediumLaserRange)).toBe(true);
    });

    it('should return false when beyond max range', () => {
      expect(isInWeaponRange(10, mediumLaserRange)).toBe(false);
      expect(isInWeaponRange(15, mediumLaserRange)).toBe(false);
    });
  });

  describe('getWeaponRangeBracket()', () => {
    it('should use weapon-specific ranges', () => {
      expect(getWeaponRangeBracket(3, mediumLaserRange)).toBe(RangeBracket.Short);
      expect(getWeaponRangeBracket(4, mediumLaserRange)).toBe(RangeBracket.Medium);
      expect(getWeaponRangeBracket(7, mediumLaserRange)).toBe(RangeBracket.Long);
    });

    it('should return OutOfRange for weapons without extreme', () => {
      expect(getWeaponRangeBracket(10, mediumLaserRange)).toBe(RangeBracket.OutOfRange);
    });
  });

  describe('getWeaponRangeModifier()', () => {
    it('should return standard modifiers for valid ranges', () => {
      expect(getWeaponRangeModifier(2, mediumLaserRange)).toBe(0);  // Short
      expect(getWeaponRangeModifier(5, mediumLaserRange)).toBe(2);  // Medium
      expect(getWeaponRangeModifier(8, mediumLaserRange)).toBe(4);  // Long
    });

    it('should return Infinity for out of range', () => {
      expect(getWeaponRangeModifier(15, mediumLaserRange)).toBe(Infinity);
    });
  });

  describe('getMinimumRangePenalty()', () => {
    it('should return 0 for weapons without minimum range', () => {
      expect(getMinimumRangePenalty(1, mediumLaserRange)).toBe(0);
      expect(getMinimumRangePenalty(3, mediumLaserRange)).toBe(0);
    });

    it('should return 0 for targets outside minimum range', () => {
      expect(getMinimumRangePenalty(7, lrmRange)).toBe(0);
      expect(getMinimumRangePenalty(10, lrmRange)).toBe(0);
    });

    it('should return penalty for targets inside minimum range', () => {
      // min 6, at range 5: penalty = 6 - 5 + 1 = 2
      expect(getMinimumRangePenalty(5, lrmRange)).toBe(2);
      // min 6, at range 3: penalty = 6 - 3 + 1 = 4
      expect(getMinimumRangePenalty(3, lrmRange)).toBe(4);
      // min 6, at range 1: penalty = 6 - 1 + 1 = 6
      expect(getMinimumRangePenalty(1, lrmRange)).toBe(6);
    });
  });

  describe('calculateWeaponRange()', () => {
    it('should calculate complete weapon range information', () => {
      const result = calculateWeaponRange(
        { q: 0, r: 0 },
        { q: 5, r: 0 },
        mediumLaserRange
      );
      
      expect(result.distance).toBe(5);
      expect(result.bracket).toBe(RangeBracket.Medium);
      expect(result.modifier).toBe(2);
      expect(result.minimumRangePenalty).toBe(0);
      expect(result.inRange).toBe(true);
    });

    it('should include minimum range penalty', () => {
      const result = calculateWeaponRange(
        { q: 0, r: 0 },
        { q: 3, r: 0 },
        lrmRange
      );
      
      expect(result.minimumRangePenalty).toBe(4);
    });
  });

  // =========================================================================
  // Range Helpers
  // =========================================================================

  describe('isAdjacent()', () => {
    it('should return true for adjacent hexes', () => {
      expect(isAdjacent({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
      expect(isAdjacent({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(true);
    });

    it('should return false for non-adjacent hexes', () => {
      expect(isAdjacent({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
      expect(isAdjacent({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(false);
    });
  });

  describe('getCoordinatesAtRange()', () => {
    it('should return single coordinate for range 0', () => {
      const coords = getCoordinatesAtRange({ q: 0, r: 0 }, 0);
      expect(coords.length).toBe(1);
      expect(coords[0]).toEqual({ q: 0, r: 0 });
    });

    it('should return 6 coordinates for range 1', () => {
      const coords = getCoordinatesAtRange({ q: 0, r: 0 }, 1);
      expect(coords.length).toBe(6);
    });

    it('should return 12 coordinates for range 2', () => {
      const coords = getCoordinatesAtRange({ q: 0, r: 0 }, 2);
      expect(coords.length).toBe(12);
    });
  });

  describe('getCoordinatesInRange()', () => {
    it('should include all coordinates within range', () => {
      const coords = getCoordinatesInRange({ q: 0, r: 0 }, 2);
      // 1 + 6 + 12 = 19
      expect(coords.length).toBe(19);
    });

    it('should include center hex', () => {
      const coords = getCoordinatesInRange({ q: 0, r: 0 }, 1);
      expect(coords.some(c => c.q === 0 && c.r === 0)).toBe(true);
    });
  });
});
