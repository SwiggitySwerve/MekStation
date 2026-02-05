import {
  calculateBVAdvantage,
  calculateComparisonDelta,
} from '../calculations';

describe('calculateBVAdvantage', () => {
  it('should calculate positive advantage', () => {
    expect(calculateBVAdvantage(2000, 1500)).toBe(33.33);
  });

  it('should calculate negative advantage', () => {
    expect(calculateBVAdvantage(1000, 1500)).toBe(-33.33);
  });

  it('should handle zero enemy BV', () => {
    expect(calculateBVAdvantage(1000, 0)).toBe(100);
  });

  it('should handle equal BV', () => {
    expect(calculateBVAdvantage(1000, 1000)).toBe(0);
  });

  it('should handle small BV values', () => {
    expect(calculateBVAdvantage(100, 50)).toBe(100);
  });

  it('should handle large BV values', () => {
    expect(calculateBVAdvantage(50000, 40000)).toBe(25);
  });

  it('should round to 2 decimal places', () => {
    expect(calculateBVAdvantage(1000, 3000)).toBe(-66.67);
  });

  it('should handle very small differences', () => {
    expect(calculateBVAdvantage(1001, 1000)).toBe(0.1);
  });
});

describe('calculateComparisonDelta', () => {
  it('should calculate positive delta', () => {
    const result = calculateComparisonDelta(120, 100);
    expect(result.absolute).toBe(20);
    expect(result.percentage).toBe(20);
  });

  it('should calculate negative delta', () => {
    const result = calculateComparisonDelta(80, 100);
    expect(result.absolute).toBe(-20);
    expect(result.percentage).toBe(-20);
  });

  it('should handle zero baseline', () => {
    const result = calculateComparisonDelta(100, 0);
    expect(result.absolute).toBe(100);
    expect(result.percentage).toBe(0);
  });

  it('should handle zero current', () => {
    const result = calculateComparisonDelta(0, 100);
    expect(result.absolute).toBe(-100);
    expect(result.percentage).toBe(-100);
  });

  it('should handle both zero', () => {
    const result = calculateComparisonDelta(0, 0);
    expect(result.absolute).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('should handle equal values', () => {
    const result = calculateComparisonDelta(100, 100);
    expect(result.absolute).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it('should round to 2 decimal places', () => {
    const result = calculateComparisonDelta(100, 3);
    expect(result.absolute).toBe(97);
    expect(result.percentage).toBe(3233.33);
  });

  it('should handle decimal values', () => {
    const result = calculateComparisonDelta(1.5, 1.0);
    expect(result.absolute).toBe(0.5);
    expect(result.percentage).toBe(50);
  });

  it('should handle negative values', () => {
    const result = calculateComparisonDelta(-50, -100);
    expect(result.absolute).toBe(50);
    expect(result.percentage).toBe(-50);
  });

  it('should handle large values', () => {
    const result = calculateComparisonDelta(1000000, 500000);
    expect(result.absolute).toBe(500000);
    expect(result.percentage).toBe(100);
  });
});
