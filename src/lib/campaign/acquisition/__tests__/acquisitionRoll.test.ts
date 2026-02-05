/**
 * Acquisition Roll Calculator Tests
 *
 * Tests for the core acquisition roll mechanics:
 * - Target number calculation with modifiers
 * - 2d6 roll generation with injectable random
 * - Complete acquisition roll with success/failure
 */

import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';

import {
  calculateAcquisitionTN,
  roll2d6,
  performAcquisitionRoll,
  type IAcquisitionModifier,
  type RandomFn,
} from '../acquisitionRoll';

/**
 * Helper to create a seeded random function for deterministic 2d6 rolls
 * @param die1 First die result (1-6)
 * @param die2 Second die result (1-6)
 */
function randomFor2d6(die1: number, die2: number): RandomFn {
  let callCount = 0;
  return () => {
    callCount++;
    if (callCount === 1) return (die1 - 1) / 6;
    if (callCount === 2) return (die2 - 1) / 6;
    return 0;
  };
}

describe('calculateAcquisitionTN', () => {
  it('should return base TN for regular part with no modifiers', () => {
    const tn = calculateAcquisitionTN(AvailabilityRating.D, false, []);
    expect(tn).toBe(8); // D rating regular part = 8
  });

  it('should return base TN for consumable with no modifiers', () => {
    const tn = calculateAcquisitionTN(AvailabilityRating.D, true, []);
    expect(tn).toBe(6); // D rating consumable = 6
  });

  it('should apply single positive modifier', () => {
    const modifiers: IAcquisitionModifier[] = [
      { name: 'Negotiator', value: -2 },
    ];
    const tn = calculateAcquisitionTN(AvailabilityRating.D, false, modifiers);
    expect(tn).toBe(6); // 8 + (-2) = 6
  });

  it('should apply single negative modifier', () => {
    const modifiers: IAcquisitionModifier[] = [
      { name: 'Clan Parts', value: 3 },
    ];
    const tn = calculateAcquisitionTN(AvailabilityRating.D, false, modifiers);
    expect(tn).toBe(11); // 8 + 3 = 11
  });

  it('should stack multiple modifiers', () => {
    const modifiers: IAcquisitionModifier[] = [
      { name: 'Negotiator', value: -2 },
      { name: 'Clan Parts', value: 3 },
      { name: 'Contract', value: -1 },
    ];
    const tn = calculateAcquisitionTN(AvailabilityRating.D, false, modifiers);
    expect(tn).toBe(8); // 8 + (-2) + 3 + (-1) = 8
  });

  it('should handle all availability ratings for regular parts', () => {
    const ratings = [
      { rating: AvailabilityRating.A, expected: 3 },
      { rating: AvailabilityRating.B, expected: 4 },
      { rating: AvailabilityRating.C, expected: 6 },
      { rating: AvailabilityRating.D, expected: 8 },
      { rating: AvailabilityRating.E, expected: 10 },
      { rating: AvailabilityRating.F, expected: 11 },
      { rating: AvailabilityRating.X, expected: 13 },
    ];

    ratings.forEach(({ rating, expected }) => {
      const tn = calculateAcquisitionTN(rating, false, []);
      expect(tn).toBe(expected);
    });
  });

  it('should handle all availability ratings for consumables', () => {
    const ratings = [
      { rating: AvailabilityRating.A, expected: 2 },
      { rating: AvailabilityRating.B, expected: 3 },
      { rating: AvailabilityRating.C, expected: 4 },
      { rating: AvailabilityRating.D, expected: 6 },
      { rating: AvailabilityRating.E, expected: 8 },
      { rating: AvailabilityRating.F, expected: 10 },
      { rating: AvailabilityRating.X, expected: 13 },
    ];

    ratings.forEach(({ rating, expected }) => {
      const tn = calculateAcquisitionTN(rating, true, []);
      expect(tn).toBe(expected);
    });
  });

  it('should handle empty modifier array', () => {
    const tn = calculateAcquisitionTN(AvailabilityRating.D, false, []);
    expect(tn).toBe(8);
  });
});

describe('roll2d6', () => {
  it('should return value between 2 and 12', () => {
    for (let i = 0; i < 100; i++) {
      const roll = roll2d6();
      expect(roll).toBeGreaterThanOrEqual(2);
      expect(roll).toBeLessThanOrEqual(12);
    }
  });

  it('should return 2 when rolling 1,1', () => {
    const roll = roll2d6(randomFor2d6(1, 1));
    expect(roll).toBe(2);
  });

  it('should return 7 when rolling 3,4', () => {
    const roll = roll2d6(randomFor2d6(3, 4));
    expect(roll).toBe(7);
  });

  it('should return 12 when rolling 6,6', () => {
    const roll = roll2d6(randomFor2d6(6, 6));
    expect(roll).toBe(12);
  });

  it('should use Math.random by default', () => {
    const roll = roll2d6();
    expect(typeof roll).toBe('number');
    expect(roll).toBeGreaterThanOrEqual(2);
    expect(roll).toBeLessThanOrEqual(12);
  });

  it('should accept injectable random function', () => {
    const random = randomFor2d6(4, 5);
    const roll = roll2d6(random);
    expect(roll).toBe(9);
  });
});

describe('performAcquisitionRoll', () => {
  it('should succeed when roll >= TN', () => {
    const random = randomFor2d6(5, 4); // rolls 9
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.success).toBe(true);
    expect(result.roll).toBe(9);
    expect(result.targetNumber).toBe(8);
  });

  it('should fail when roll < TN', () => {
    const random = randomFor2d6(2, 3); // rolls 5
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.success).toBe(false);
    expect(result.roll).toBe(5);
    expect(result.targetNumber).toBe(8);
  });

  it('should calculate correct margin on success', () => {
    const random = randomFor2d6(5, 4); // rolls 9
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.margin).toBe(1); // 9 - 8 = 1
  });

  it('should calculate correct margin on failure', () => {
    const random = randomFor2d6(2, 3); // rolls 5
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.margin).toBe(-3); // 5 - 8 = -3
  });

  it('should include request ID in result', () => {
    const random = randomFor2d6(3, 3);
    const result = performAcquisitionRoll(
      'req-12345',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.requestId).toBe('req-12345');
  });

  it('should include modifiers in result', () => {
    const modifiers: IAcquisitionModifier[] = [
      { name: 'Negotiator', value: -2 },
      { name: 'Clan Parts', value: 3 },
    ];
    const random = randomFor2d6(3, 3);
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      modifiers,
      random,
    );
    expect(result.modifiers).toEqual(modifiers);
  });

  it('should apply modifiers to TN calculation', () => {
    const modifiers: IAcquisitionModifier[] = [
      { name: 'Negotiator', value: -2 },
    ];
    const random = randomFor2d6(3, 4); // rolls 7
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      modifiers,
      random,
    );
    expect(result.targetNumber).toBe(6); // 8 + (-2) = 6
    expect(result.success).toBe(true); // 7 >= 6
  });

  it('should handle consumable parts', () => {
    const random = randomFor2d6(3, 3); // rolls 6
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      true, // consumable
      [],
      random,
    );
    expect(result.targetNumber).toBe(6); // D consumable = 6
    expect(result.success).toBe(true); // 6 >= 6
  });

  it('should set transitDays to 0 (calculated by delivery module)', () => {
    const random = randomFor2d6(3, 3);
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.transitDays).toBe(0);
  });

  it('should succeed on exact TN match', () => {
    const random = randomFor2d6(4, 4); // rolls 8
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.success).toBe(true);
    expect(result.margin).toBe(0);
  });

  it('should fail on TN - 1', () => {
    const random = randomFor2d6(3, 4); // rolls 7
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      [],
      random,
    );
    expect(result.success).toBe(false);
    expect(result.margin).toBe(-1);
  });

  it('should handle complex modifier stacking', () => {
    const modifiers: IAcquisitionModifier[] = [
      { name: 'Negotiator', value: -2 },
      { name: 'Clan Parts', value: 3 },
      { name: 'Contract', value: -1 },
    ];
    const random = randomFor2d6(3, 4); // rolls 7
    const result = performAcquisitionRoll(
      'req-001',
      AvailabilityRating.D,
      false,
      modifiers,
      random,
    );
    // TN = 8 + (-2) + 3 + (-1) = 8
    expect(result.targetNumber).toBe(8);
    expect(result.success).toBe(false); // 7 < 8
    expect(result.margin).toBe(-1);
  });
});
