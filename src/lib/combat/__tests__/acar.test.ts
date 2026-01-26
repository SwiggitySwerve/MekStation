import { calculateVictoryProbability, distributeDamage } from '../acar';

describe('calculateVictoryProbability', () => {
  it('should return 0.5 when both BVs are equal', () => {
    const result = calculateVictoryProbability(3000, 3000);
    expect(result).toBe(0.5);
  });

  it('should return 2/3 for a 2:1 ratio (player advantage)', () => {
    const result = calculateVictoryProbability(4000, 2000);
    expect(result).toBeCloseTo(2 / 3, 5);
  });

  it('should return 3/4 for a 3:1 ratio (player advantage)', () => {
    const result = calculateVictoryProbability(6000, 2000);
    expect(result).toBeCloseTo(3 / 4, 5);
  });

  it('should return 0.5 when both BVs are zero (edge case)', () => {
    const result = calculateVictoryProbability(0, 0);
    expect(result).toBe(0.5);
  });

  it('should return 0 when player BV is zero and opponent has BV', () => {
    const result = calculateVictoryProbability(0, 5000);
    expect(result).toBe(0);
  });

  it('should return 1 when opponent BV is zero and player has BV', () => {
    const result = calculateVictoryProbability(5000, 0);
    expect(result).toBe(1);
  });

  it('should handle very large numbers correctly', () => {
    const result = calculateVictoryProbability(1000000, 1000000);
    expect(result).toBe(0.5);
  });

  it('should handle decimal values correctly', () => {
    const result = calculateVictoryProbability(1500.5, 1500.5);
    expect(result).toBe(0.5);
  });
});

describe('distributeDamage', () => {
  it('should return empty Map when unitIds array is empty', () => {
    const result = distributeDamage([], 0.8);
    expect(result).toEqual(new Map());
    expect(result.size).toBe(0);
  });

  it('should distribute damage to single unit with severity 0.2', () => {
    const seededRandom = () => 0.5;
    const result = distributeDamage(['unit1'], 0.2, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBeCloseTo(15, 5); // 0.2 * (0.5 + 0.5 * 0.5) * 100 = 15
  });

  it('should distribute damage to single unit with severity 0.5', () => {
    const seededRandom = () => 0.5;
    const result = distributeDamage(['unit1'], 0.5, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBeCloseTo(37.5, 5); // 0.5 * (0.5 + 0.5 * 0.5) * 100 = 37.5
  });

  it('should distribute damage to single unit with severity 0.8', () => {
    const seededRandom = () => 0.5;
    const result = distributeDamage(['unit1'], 0.8, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBeCloseTo(60, 5); // 0.8 * (0.5 + 0.5 * 0.5) * 100 = 60
  });

  it('should cap damage at 100% when severity is 1.0', () => {
    const seededRandom = () => 1.0;
    const result = distributeDamage(['unit1'], 1.0, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBe(100); // Capped at 100
  });

  it('should distribute different damage to multiple units with same severity', () => {
    let callCount = 0;
    const seededRandom = () => {
      callCount++;
      return callCount === 1 ? 0.0 : 1.0; // First unit gets min, second gets max
    };
    const result = distributeDamage(['unit1', 'unit2'], 0.8, seededRandom);
    expect(result.size).toBe(2);
    expect(result.get('unit1')).toBeCloseTo(40, 5); // 0.8 * (0.5 + 0.0 * 0.5) * 100 = 40
    expect(result.get('unit2')).toBeCloseTo(80, 5); // 0.8 * (0.5 + 1.0 * 0.5) * 100 = 80
  });

  it('should handle three units with varying random values', () => {
    const randomValues = [0.0, 0.5, 1.0];
    let index = 0;
    const seededRandom = () => randomValues[index++];
    const result = distributeDamage(['unit1', 'unit2', 'unit3'], 0.6, seededRandom);
    expect(result.size).toBe(3);
    expect(result.get('unit1')).toBeCloseTo(30, 5); // 0.6 * (0.5 + 0.0 * 0.5) * 100 = 30
    expect(result.get('unit2')).toBeCloseTo(45, 5); // 0.6 * (0.5 + 0.5 * 0.5) * 100 = 45
    expect(result.get('unit3')).toBeCloseTo(60, 5); // 0.6 * (0.5 + 1.0 * 0.5) * 100 = 60
  });

  it('should ensure all damage values are within 0-100 range', () => {
    const seededRandom = () => Math.random();
    const result = distributeDamage(['unit1', 'unit2', 'unit3', 'unit4', 'unit5'], 1.0, seededRandom);
    result.forEach((damage) => {
      expect(damage).toBeGreaterThanOrEqual(0);
      expect(damage).toBeLessThanOrEqual(100);
    });
  });

  it('should use Math.random by default when no random function provided', () => {
    const result = distributeDamage(['unit1', 'unit2'], 0.5);
    expect(result.size).toBe(2);
    expect(result.get('unit1')).toBeDefined();
    expect(result.get('unit2')).toBeDefined();
    const damage1 = result.get('unit1')!;
    const damage2 = result.get('unit2')!;
    expect(damage1).toBeGreaterThanOrEqual(25); // Min: 0.5 * 0.5 * 100
    expect(damage1).toBeLessThanOrEqual(100); // Max: capped at 100
    expect(damage2).toBeGreaterThanOrEqual(25);
    expect(damage2).toBeLessThanOrEqual(100);
  });

  it('should return Map with correct unitId keys', () => {
    const seededRandom = () => 0.5;
    const unitIds = ['mech1', 'vehicle2', 'turret3'];
    const result = distributeDamage(unitIds, 0.7, seededRandom);
    expect(result.has('mech1')).toBe(true);
    expect(result.has('vehicle2')).toBe(true);
    expect(result.has('turret3')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('should handle severity 0 resulting in 0 damage', () => {
    const seededRandom = () => 1.0;
    const result = distributeDamage(['unit1'], 0, seededRandom);
    expect(result.size).toBe(1);
    expect(result.get('unit1')).toBe(0); // 0 * (0.5 + 1.0 * 0.5) * 100 = 0
  });
});
