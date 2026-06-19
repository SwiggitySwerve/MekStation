/**
 * Money class tests
 * Tests immutable Money class with arithmetic operations and formatting
 */

import { Money } from '../Money';

describe('Money', () => {
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
      const m = new Money(25.5);
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
});
