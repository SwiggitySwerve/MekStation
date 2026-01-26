import { calculateVictoryProbability } from '../acar';

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
