/**
 * Money class tests
 * Tests immutable Money class with arithmetic operations and formatting
 */

import { Money } from '../Money';

describe('Money', () => {
  describe('format', () => {
    it('should format simple amount', () => {
      const m = new Money(100);
      expect(m.format()).toBe('100.00 C-bills');
    });

    it('should format with thousand separators', () => {
      const m = new Money(1234.56);
      expect(m.format()).toBe('1,234.56 C-bills');
    });

    it('should format large amounts with separators', () => {
      const m = new Money(1000000);
      expect(m.format()).toBe('1,000,000.00 C-bills');
    });

    it('should format decimal amounts', () => {
      const m = new Money(99.99);
      expect(m.format()).toBe('99.99 C-bills');
    });

    it('should format zero', () => {
      const m = new Money(0);
      expect(m.format()).toBe('0.00 C-bills');
    });

    it('should format negative amounts', () => {
      const m = new Money(-500.25);
      expect(m.format()).toBe('-500.25 C-bills');
    });

    it('should always show two decimal places', () => {
      const m = new Money(100);
      expect(m.format()).toMatch(/\d+\.\d{2} C-bills/);
    });

    it('should format very large amounts', () => {
      const m = new Money(999999999.99);
      expect(m.format()).toContain('C-bills');
      expect(m.format()).toContain(',');
    });
  });

  describe('compareTo', () => {
    it('should return -1 when less than', () => {
      const m1 = new Money(50);
      const m2 = new Money(100);
      expect(m1.compareTo(m2)).toBe(-1);
    });

    it('should return 0 when equal', () => {
      const m1 = new Money(100);
      const m2 = new Money(100);
      expect(m1.compareTo(m2)).toBe(0);
    });

    it('should return 1 when greater than', () => {
      const m1 = new Money(150);
      const m2 = new Money(100);
      expect(m1.compareTo(m2)).toBe(1);
    });

    it('should handle negative amounts', () => {
      const m1 = new Money(-100);
      const m2 = new Money(100);
      expect(m1.compareTo(m2)).toBe(-1);
    });

    it('should handle decimal amounts', () => {
      const m1 = new Money(100.5);
      const m2 = new Money(100.49);
      expect(m1.compareTo(m2)).toBe(1);
    });
  });

  describe('equals', () => {
    it('should return true for equal amounts', () => {
      const m1 = new Money(100);
      const m2 = new Money(100);
      expect(m1.equals(m2)).toBe(true);
    });

    it('should return false for different amounts', () => {
      const m1 = new Money(100);
      const m2 = new Money(101);
      expect(m1.equals(m2)).toBe(false);
    });

    it('should handle decimal equality', () => {
      const m1 = new Money(100.5);
      const m2 = new Money(100.5);
      expect(m1.equals(m2)).toBe(true);
    });

    it('should handle floating point precision', () => {
      const m1 = new Money(0.1 + 0.2);
      const m2 = new Money(0.3);
      expect(m1.equals(m2)).toBe(true);
    });
  });

  describe('isZero', () => {
    it('should return true for zero', () => {
      const m = new Money(0);
      expect(m.isZero()).toBe(true);
    });

    it('should return false for positive amount', () => {
      const m = new Money(100);
      expect(m.isZero()).toBe(false);
    });

    it('should return false for negative amount', () => {
      const m = new Money(-100);
      expect(m.isZero()).toBe(false);
    });
  });

  describe('isPositive', () => {
    it('should return true for positive amount', () => {
      const m = new Money(100);
      expect(m.isPositive()).toBe(true);
    });

    it('should return false for zero', () => {
      const m = new Money(0);
      expect(m.isPositive()).toBe(false);
    });

    it('should return false for negative amount', () => {
      const m = new Money(-100);
      expect(m.isPositive()).toBe(false);
    });
  });

  describe('isNegative', () => {
    it('should return true for negative amount', () => {
      const m = new Money(-100);
      expect(m.isNegative()).toBe(true);
    });

    it('should return false for zero', () => {
      const m = new Money(0);
      expect(m.isNegative()).toBe(false);
    });

    it('should return false for positive amount', () => {
      const m = new Money(100);
      expect(m.isNegative()).toBe(false);
    });
  });

  describe('isPositiveOrZero', () => {
    it('should return true for positive amount', () => {
      const m = new Money(100);
      expect(m.isPositiveOrZero()).toBe(true);
    });

    it('should return true for zero', () => {
      const m = new Money(0);
      expect(m.isPositiveOrZero()).toBe(true);
    });

    it('should return false for negative amount', () => {
      const m = new Money(-100);
      expect(m.isPositiveOrZero()).toBe(false);
    });
  });

  describe('absolute', () => {
    it('should return same value for positive amount', () => {
      const m = new Money(100);
      const result = m.absolute();
      expect(result.amount).toBe(100);
    });

    it('should return positive for negative amount', () => {
      const m = new Money(-100);
      const result = m.absolute();
      expect(result.amount).toBe(100);
    });

    it('should return zero for zero', () => {
      const m = new Money(0);
      const result = m.absolute();
      expect(result.amount).toBe(0);
    });

    it('should return new Money instance', () => {
      const m = new Money(-100);
      const result = m.absolute();
      expect(result).not.toBe(m);
    });

    it('should not mutate original Money', () => {
      const m = new Money(-100);
      m.absolute();
      expect(m.amount).toBe(-100);
    });
  });

  describe('ZERO constant', () => {
    it('should have zero value', () => {
      expect(Money.ZERO.amount).toBe(0);
    });

    it('should be immutable', () => {
      expect(Money.ZERO.isZero()).toBe(true);
    });
  });

  describe('fromCents', () => {
    it('should create Money from cents', () => {
      const m = Money.fromCents(12345);
      expect(m.amount).toBe(123.45);
    });

    it('should handle zero cents', () => {
      const m = Money.fromCents(0);
      expect(m.amount).toBe(0);
    });

    it('should handle negative cents', () => {
      const m = Money.fromCents(-5000);
      expect(m.amount).toBe(-50);
    });
  });

  describe('toString', () => {
    it('should return formatted string', () => {
      const m = new Money(1234.56);
      expect(m.toString()).toBe('1,234.56 C-bills');
    });
  });

  describe('toJSON', () => {
    it('should return amount as number', () => {
      const m = new Money(100.5);
      expect(m.toJSON()).toBe(100.5);
    });

    it('should serialize correctly', () => {
      const m = new Money(1234.56);
      const json = JSON.stringify({ amount: m });
      expect(json).toContain('1234.56');
    });
  });

  describe('edge cases', () => {
    it('should handle chained operations', () => {
      const m = new Money(100);
      const result = m.add(new Money(50)).multiply(2).subtract(new Money(100));
      expect(result.amount).toBe(200);
    });

    it('should handle very small decimal amounts', () => {
      const m = new Money(0.01);
      const result = m.add(new Money(0.02));
      expect(result.amount).toBe(0.03);
    });

    it('should handle large transaction sequences', () => {
      let balance = new Money(1000);
      for (let i = 0; i < 100; i++) {
        balance = balance.add(new Money(10.5));
      }
      expect(balance.amount).toBe(2050);
    });

    it('should maintain precision through multiple operations', () => {
      const m1 = new Money(100);
      const m2 = new Money(50);
      const m3 = new Money(25);
      const result = m1.add(m2).add(m3);
      expect(result.amount).toBe(175);
    });

    it('should handle division and multiplication round-trip', () => {
      const m = new Money(100);
      const result = m.divide(3).multiply(3);
      expect(result.amount).toBeCloseTo(100, 1);
    });
  });
});
