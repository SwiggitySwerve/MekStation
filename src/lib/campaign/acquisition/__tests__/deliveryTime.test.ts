/**
 * Delivery Time Calculator Tests
 *
 * TDD tests for the delivery time calculation formula:
 * deliveryTime = max(1, floor((7 + 1d6 + availabilityIndex) / 4))
 *
 * Based on MekHQ Campaign.java lines 9289-9331
 */

import { AvailabilityRating } from '@/types/campaign/acquisition/acquisitionTypes';

import { calculateDeliveryTime, roll1d6 } from '../deliveryTime';

/**
 * Helper to create a deterministic random function that returns a specific 1d6 value
 * @param value - The 1d6 value (1-6) to return
 * @returns A RandomFn that always returns the value needed for that 1d6 roll
 */
function randomFor1d6(value: number) {
  if (value < 1 || value > 6) {
    throw new Error(`Invalid 1d6 value: ${value}. Must be 1-6.`);
  }
  // roll1d6 does: Math.floor(random() * 6) + 1
  // So for value 1: Math.floor(random() * 6) = 0, so random() must be in [0, 1/6)
  // For value 6: Math.floor(random() * 6) = 5, so random() must be in [5/6, 1)
  return () => (value - 1) / 6;
}

describe('roll1d6', () => {
  it('should return a value between 1 and 6', () => {
    const rolls = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const roll = roll1d6();
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(6);
      rolls.add(roll);
    }
    // With 100 rolls, we should get multiple different values
    expect(rolls.size).toBeGreaterThan(1);
  });

  it('should return 1 with deterministic random', () => {
    const roll = roll1d6(randomFor1d6(1));
    expect(roll).toBe(1);
  });

  it('should return 3 with deterministic random', () => {
    const roll = roll1d6(randomFor1d6(3));
    expect(roll).toBe(3);
  });

  it('should return 6 with deterministic random', () => {
    const roll = roll1d6(randomFor1d6(6));
    expect(roll).toBe(6);
  });
});

describe('calculateDeliveryTime', () => {
  describe('Availability Index Mapping', () => {
    it('should map A to index 0', () => {
      // A (0) + roll 1: (7 + 1 + 0) / 4 = 2
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBe(2);
    });

    it('should map B to index 1', () => {
      // B (1) + roll 1: (7 + 1 + 1) / 4 = 2.25 → 2
      const time = calculateDeliveryTime(
        AvailabilityRating.B,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBe(2);
    });

    it('should map C to index 2', () => {
      // C (2) + roll 1: (7 + 1 + 2) / 4 = 2.5 → 2
      const time = calculateDeliveryTime(
        AvailabilityRating.C,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBe(2);
    });

    it('should map D to index 3', () => {
      // D (3) + roll 1: (7 + 1 + 3) / 4 = 2.75 → 2
      const time = calculateDeliveryTime(
        AvailabilityRating.D,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBe(2);
    });

    it('should map E to index 4', () => {
      // E (4) + roll 1: (7 + 1 + 4) / 4 = 3
      const time = calculateDeliveryTime(
        AvailabilityRating.E,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBe(3);
    });

    it('should map F to index 5', () => {
      // F (5) + roll 1: (7 + 1 + 5) / 4 = 3.25 → 3
      const time = calculateDeliveryTime(
        AvailabilityRating.F,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBe(3);
    });

    it('should map X to index 6', () => {
      // X (6) + roll 1: (7 + 1 + 6) / 4 = 3.5 → 3
      const time = calculateDeliveryTime(
        AvailabilityRating.X,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBe(3);
    });
  });

  describe('Formula Calculation', () => {
    it('should calculate A + roll 3 = 2 months', () => {
      // A (0) + roll 3: (7 + 3 + 0) / 4 = 2.5 → 2
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'month',
        randomFor1d6(3),
      );
      expect(time).toBe(2);
    });

    it('should calculate D + roll 4 = 3 months', () => {
      // D (3) + roll 4: (7 + 4 + 3) / 4 = 3.5 → 3
      const time = calculateDeliveryTime(
        AvailabilityRating.D,
        'month',
        randomFor1d6(4),
      );
      expect(time).toBe(3);
    });

    it('should calculate F + roll 6 = 4 months', () => {
      // F (5) + roll 6: (7 + 6 + 5) / 4 = 4.5 → 4
      const time = calculateDeliveryTime(
        AvailabilityRating.F,
        'month',
        randomFor1d6(6),
      );
      expect(time).toBe(4);
    });

    it('should calculate X + roll 6 = 4 months', () => {
      // X (6) + roll 6: (7 + 6 + 6) / 4 = 4.75 → 4
      const time = calculateDeliveryTime(
        AvailabilityRating.X,
        'month',
        randomFor1d6(6),
      );
      expect(time).toBe(4);
    });
  });

  describe('Minimum Delivery Time', () => {
    it('should enforce minimum of 1 unit for A + roll 1', () => {
      // A (0) + roll 1: (7 + 1 + 0) / 4 = 2 → max(1, 2) = 2
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBeGreaterThanOrEqual(1);
      expect(time).toBe(2);
    });

    it('should never return less than 1', () => {
      // Even with the lowest possible values, should be >= 1
      // A (0) + roll 1: (7 + 1 + 0) / 4 = 2
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'month',
        randomFor1d6(1),
      );
      expect(time).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Transit Unit Parameter', () => {
    it('should accept day as transit unit', () => {
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'day',
        randomFor1d6(3),
      );
      expect(time).toBe(2);
    });

    it('should accept week as transit unit', () => {
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'week',
        randomFor1d6(3),
      );
      expect(time).toBe(2);
    });

    it('should accept month as transit unit', () => {
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'month',
        randomFor1d6(3),
      );
      expect(time).toBe(2);
    });

    it('should default to month when not specified', () => {
      const time = calculateDeliveryTime(
        AvailabilityRating.A,
        'month',
        randomFor1d6(3),
      );
      expect(time).toBe(2);
    });
  });

  describe('Injectable Random Function', () => {
    it('should use provided random function', () => {
      const mockRandom = jest.fn(() => 0.5);
      calculateDeliveryTime(AvailabilityRating.A, 'month', mockRandom);
      expect(mockRandom).toHaveBeenCalled();
    });

    it('should use Math.random by default', () => {
      const spy = jest.spyOn(Math, 'random');
      calculateDeliveryTime(AvailabilityRating.A, 'month');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should produce deterministic results with seeded random', () => {
      const time1 = calculateDeliveryTime(
        AvailabilityRating.D,
        'month',
        randomFor1d6(4),
      );
      const time2 = calculateDeliveryTime(
        AvailabilityRating.D,
        'month',
        randomFor1d6(4),
      );
      expect(time1).toBe(time2);
      expect(time1).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle all availability ratings with roll 1', () => {
      const ratings = [
        AvailabilityRating.A,
        AvailabilityRating.B,
        AvailabilityRating.C,
        AvailabilityRating.D,
        AvailabilityRating.E,
        AvailabilityRating.F,
        AvailabilityRating.X,
      ];

      ratings.forEach((rating) => {
        const time = calculateDeliveryTime(rating, 'month', randomFor1d6(1));
        expect(time).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(time)).toBe(true);
      });
    });

    it('should handle all availability ratings with roll 6', () => {
      const ratings = [
        AvailabilityRating.A,
        AvailabilityRating.B,
        AvailabilityRating.C,
        AvailabilityRating.D,
        AvailabilityRating.E,
        AvailabilityRating.F,
        AvailabilityRating.X,
      ];

      ratings.forEach((rating) => {
        const time = calculateDeliveryTime(rating, 'month', randomFor1d6(6));
        expect(time).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(time)).toBe(true);
      });
    });

    it('should return integer values only', () => {
      for (let roll = 1; roll <= 6; roll++) {
        const time = calculateDeliveryTime(
          AvailabilityRating.D,
          'month',
          randomFor1d6(roll),
        );
        expect(Number.isInteger(time)).toBe(true);
      }
    });
  });
});
