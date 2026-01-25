/**
 * Game Value Formatters Tests
 */

import {
  formatBV,
  formatWeight,
  formatCost,
  formatCostFull,
  formatArmorPoints,
  formatHeat,
  formatDamage,
  formatRange,
  formatMovement,
} from '../gameValueFormatters';

describe('gameValueFormatters', () => {
  describe('formatBV', () => {
    it('should format Battle Value with thousands separator', () => {
      expect(formatBV(1234)).toBe('1,234 BV');
      expect(formatBV(12345)).toBe('12,345 BV');
    });

    it('should handle zero', () => {
      expect(formatBV(0)).toBe('0 BV');
    });

    it('should handle small values', () => {
      expect(formatBV(100)).toBe('100 BV');
    });
  });

  describe('formatWeight', () => {
    it('should format whole number weights without decimal', () => {
      expect(formatWeight(75)).toBe('75 tons');
      expect(formatWeight(100)).toBe('100 tons');
    });

    it('should format fractional weights with decimal', () => {
      expect(formatWeight(35.5)).toBe('35.5 tons');
      expect(formatWeight(0.5)).toBe('0.5 tons');
    });

    it('should handle singular ton', () => {
      expect(formatWeight(1)).toBe('1 ton');
    });

    it('should respect precision parameter', () => {
      expect(formatWeight(35.567, 2)).toBe('35.57 tons');
    });
  });

  describe('formatCost', () => {
    it('should format millions with M suffix', () => {
      expect(formatCost(1500000)).toBe('1.5M C-Bills');
      expect(formatCost(10000000)).toBe('10M C-Bills');
    });

    it('should format thousands with K suffix', () => {
      expect(formatCost(750000)).toBe('750K C-Bills');
      expect(formatCost(5000)).toBe('5K C-Bills');
    });

    it('should format small values without suffix', () => {
      expect(formatCost(500)).toBe('500 C-Bills');
    });

    it('should format billions with B suffix', () => {
      expect(formatCost(1500000000)).toBe('1.5B C-Bills');
    });
  });

  describe('formatCostFull', () => {
    it('should format with full number and separators', () => {
      expect(formatCostFull(1500000)).toBe('1,500,000 C-Bills');
      expect(formatCostFull(500)).toBe('500 C-Bills');
    });
  });

  describe('formatArmorPoints', () => {
    it('should format points only', () => {
      expect(formatArmorPoints(45)).toBe('45 pts');
    });

    it('should format points with max', () => {
      expect(formatArmorPoints(45, 50)).toBe('45/50 pts');
    });

    it('should handle zero', () => {
      expect(formatArmorPoints(0)).toBe('0 pts');
      expect(formatArmorPoints(0, 50)).toBe('0/50 pts');
    });
  });

  describe('formatHeat', () => {
    it('should format positive heat with plus sign', () => {
      expect(formatHeat(5)).toBe('+5 heat');
    });

    it('should format negative heat with minus sign', () => {
      expect(formatHeat(-3)).toBe('-3 heat');
    });

    it('should format zero heat without sign', () => {
      expect(formatHeat(0)).toBe('0 heat');
    });
  });

  describe('formatDamage', () => {
    it('should format damage', () => {
      expect(formatDamage(10)).toBe('10 dmg');
      expect(formatDamage(0)).toBe('0 dmg');
    });
  });

  describe('formatRange', () => {
    it('should format range as short/medium/long', () => {
      expect(formatRange(3, 6, 9)).toBe('3/6/9');
      expect(formatRange(1, 2, 3)).toBe('1/2/3');
    });
  });

  describe('formatMovement', () => {
    it('should format walk/run', () => {
      expect(formatMovement(4, 6)).toBe('4/6');
    });

    it('should format walk/run/jump', () => {
      expect(formatMovement(4, 6, 4)).toBe('4/6/4');
    });

    it('should calculate run if not provided', () => {
      expect(formatMovement(4)).toBe('4/6');
    });

    it('should not include jump if zero', () => {
      expect(formatMovement(4, 6, 0)).toBe('4/6');
    });
  });
});
