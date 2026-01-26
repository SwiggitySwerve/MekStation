/**
 * Money class tests
 * Tests immutable Money class with arithmetic operations and formatting
 */

import { Money } from '../Money';

describe('Money', () => {
  // =============================================================================
  // Constructor Tests
  // =============================================================================

  describe('constructor', () => {
    it('should create Money with default value of zero', () => {
      const money = new Money();
      expect(money.amount).toBe(0);
    });

    it('should create Money from integer amount', () => {
      const money = new Money(100);
      expect(money.amount).toBe(100);
    });

    it('should create Money from decimal amount', () => {
      const money = new Money(123.45);
      expect(money.amount).toBe(123.45);
    });

    it('should handle negative amounts', () => {
      const money = new Money(-50.25);
      expect(money.amount).toBe(-50.25);
    });

    it('should round to cents to avoid floating point errors', () => {
      const money = new Money(0.1 + 0.2); // Classic floating point issue
      expect(money.amount).toBe(0.3);
    });

    it('should handle very large amounts', () => {
      const money = new Money(1000000000);
      expect(money.amount).toBe(1000000000);
    });

    it('should handle very small amounts', () => {
      const money = new Money(0.01);
      expect(money.amount).toBe(0.01);
    });
  });

  // =============================================================================
  // Addition Tests
  // =============================================================================

  describe('add', () => {
    it('should add two positive amounts', () => {
      const m1 = new Money(100);
      const m2 = new Money(50);
      const result = m1.add(m2);
      expect(result.amount).toBe(150);
    });

    it('should add positive and negative amounts', () => {
      const m1 = new Money(100);
      const m2 = new Money(-30);
      const result = m1.add(m2);
      expect(result.amount).toBe(70);
    });

    it('should add two negative amounts', () => {
      const m1 = new Money(-50);
      const m2 = new Money(-25);
      const result = m1.add(m2);
      expect(result.amount).toBe(-75);
    });

    it('should add decimal amounts without floating point errors', () => {
      const m1 = new Money(10.25);
      const m2 = new Money(20.75);
      const result = m1.add(m2);
      expect(result.amount).toBe(31);
    });

    it('should return new Money instance', () => {
      const m1 = new Money(100);
      const m2 = new Money(50);
      const result = m1.add(m2);
      expect(result).not.toBe(m1);
      expect(result).not.toBe(m2);
    });

    it('should not mutate original Money', () => {
      const m1 = new Money(100);
      const m2 = new Money(50);
      m1.add(m2);
      expect(m1.amount).toBe(100);
    });

    it('should add to zero', () => {
      const m1 = new Money(100);
      const m2 = Money.ZERO;
      const result = m1.add(m2);
      expect(result.amount).toBe(100);
    });
  });

  // =============================================================================
  // Subtraction Tests
  // =============================================================================

  describe('subtract', () => {
    it('should subtract two positive amounts', () => {
      const m1 = new Money(100);
      const m2 = new Money(30);
      const result = m1.subtract(m2);
      expect(result.amount).toBe(70);
    });

    it('should subtract negative amount (add)', () => {
      const m1 = new Money(100);
      const m2 = new Money(-30);
      const result = m1.subtract(m2);
      expect(result.amount).toBe(130);
    });

    it('should result in negative when subtracting larger amount', () => {
      const m1 = new Money(30);
      const m2 = new Money(100);
      const result = m1.subtract(m2);
      expect(result.amount).toBe(-70);
    });

    it('should subtract decimal amounts without floating point errors', () => {
      const m1 = new Money(50.75);
      const m2 = new Money(20.25);
      const result = m1.subtract(m2);
      expect(result.amount).toBe(30.5);
    });

    it('should return new Money instance', () => {
      const m1 = new Money(100);
      const m2 = new Money(30);
      const result = m1.subtract(m2);
      expect(result).not.toBe(m1);
      expect(result).not.toBe(m2);
    });

    it('should not mutate original Money', () => {
      const m1 = new Money(100);
      const m2 = new Money(30);
      m1.subtract(m2);
      expect(m1.amount).toBe(100);
    });
  });

  // =============================================================================
  // Multiplication Tests
  // =============================================================================

  describe('multiply', () => {
    it('should multiply by positive integer', () => {
      const m = new Money(100);
      const result = m.multiply(3);
      expect(result.amount).toBe(300);
    });

    it('should multiply by decimal', () => {
      const m = new Money(100);
      const result = m.multiply(1.5);
      expect(result.amount).toBe(150);
    });

    it('should multiply by zero', () => {
      const m = new Money(100);
      const result = m.multiply(0);
      expect(result.amount).toBe(0);
    });

    it('should multiply by negative number', () => {
      const m = new Money(100);
      const result = m.multiply(-2);
      expect(result.amount).toBe(-200);
    });

    it('should multiply decimal amount', () => {
      const m = new Money(25.50);
      const result = m.multiply(2);
      expect(result.amount).toBe(51);
    });

    it('should handle floating point precision', () => {
      const m = new Money(10.01);
      const result = m.multiply(3);
      expect(result.amount).toBe(30.03);
    });

    it('should return new Money instance', () => {
      const m = new Money(100);
      const result = m.multiply(2);
      expect(result).not.toBe(m);
    });

    it('should not mutate original Money', () => {
      const m = new Money(100);
      m.multiply(2);
      expect(m.amount).toBe(100);
    });
  });

  // =============================================================================
  // Division Tests
  // =============================================================================

  describe('divide', () => {
    it('should divide by positive integer', () => {
      const m = new Money(300);
      const result = m.divide(3);
      expect(result.amount).toBe(100);
    });

    it('should divide by decimal', () => {
      const m = new Money(100);
      const result = m.divide(2.5);
      expect(result.amount).toBe(40);
    });

    it('should divide negative amount', () => {
      const m = new Money(-100);
      const result = m.divide(2);
      expect(result.amount).toBe(-50);
    });

    it('should throw error when dividing by zero', () => {
      const m = new Money(100);
      expect(() => m.divide(0)).toThrow('Cannot divide Money by zero');
    });

    it('should handle division with rounding', () => {
      const m = new Money(100);
      const result = m.divide(3);
      expect(result.amount).toBeCloseTo(33.33, 2);
    });

    it('should return new Money instance', () => {
      const m = new Money(100);
      const result = m.divide(2);
      expect(result).not.toBe(m);
    });

    it('should not mutate original Money', () => {
      const m = new Money(100);
      m.divide(2);
      expect(m.amount).toBe(100);
    });
  });

  // =============================================================================
  // Formatting Tests
  // =============================================================================

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

  // =============================================================================
  // Comparison Tests
  // =============================================================================

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
      const m1 = new Money(100.50);
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
      const m1 = new Money(100.50);
      const m2 = new Money(100.50);
      expect(m1.equals(m2)).toBe(true);
    });

    it('should handle floating point precision', () => {
      const m1 = new Money(0.1 + 0.2);
      const m2 = new Money(0.3);
      expect(m1.equals(m2)).toBe(true);
    });
  });

  // =============================================================================
  // Predicate Tests
  // =============================================================================

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

  // =============================================================================
  // Absolute Value Tests
  // =============================================================================

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

  // =============================================================================
  // Constants Tests
  // =============================================================================

  describe('ZERO constant', () => {
    it('should have zero value', () => {
      expect(Money.ZERO.amount).toBe(0);
    });

    it('should be immutable', () => {
      expect(Money.ZERO.isZero()).toBe(true);
    });
  });

  // =============================================================================
  // Static Factory Tests
  // =============================================================================

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

  // =============================================================================
  // String Representation Tests
  // =============================================================================

  describe('toString', () => {
    it('should return formatted string', () => {
      const m = new Money(1234.56);
      expect(m.toString()).toBe('1,234.56 C-bills');
    });
  });

  describe('toJSON', () => {
    it('should return amount as number', () => {
      const m = new Money(100.50);
      expect(m.toJSON()).toBe(100.50);
    });

    it('should serialize correctly', () => {
      const m = new Money(1234.56);
      const json = JSON.stringify({ amount: m });
      expect(json).toContain('1234.56');
    });
  });

  // =============================================================================
  // Edge Cases and Integration Tests
  // =============================================================================

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
        balance = balance.add(new Money(10.50));
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
