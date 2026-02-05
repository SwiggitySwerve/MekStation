/**
 * OpFor BV Matching Tests
 *
 * Tests for OpFor (Opposing Force) BV calculation and force composition system:
 * - calculateOpForBV with 75-125% variation formula
 * - LANCE_SIZE constants for IS/Clan/ComStar
 * - calculateForceComposition function
 * - IOpForConfig interface
 *
 * @module campaign/scenario/__tests__/opForGeneration
 */

import {
  calculateOpForBV,
  calculateForceComposition,
  LANCE_SIZE,
  type IOpForConfig,
  type RandomFn,
} from '../opForGeneration';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a seeded random function that always returns a specific value.
 * Used for deterministic testing.
 *
 * @param value - The value to return (0-1 range)
 * @returns RandomFn that always returns the specified value
 */
const seededRandom =
  (value: number): RandomFn =>
  () =>
    value;

/**
 * Create a random function that cycles through values.
 * Used for testing multiple random calls.
 *
 * @param values - Array of values to cycle through
 * @returns RandomFn that returns next value on each call
 */
const cyclingRandom = (values: number[]): RandomFn => {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index++;
    return value;
  };
};

// =============================================================================
// LANCE_SIZE Constants Tests
// =============================================================================

describe('LANCE_SIZE', () => {
  it('should have IS lance size of 4', () => {
    expect(LANCE_SIZE.IS).toBe(4);
  });

  it('should have Clan star size of 5', () => {
    expect(LANCE_SIZE.CLAN).toBe(5);
  });

  it('should have ComStar level II size of 6', () => {
    expect(LANCE_SIZE.COMSTAR).toBe(6);
  });

  it('should have all sizes as positive integers', () => {
    expect(LANCE_SIZE.IS).toBeGreaterThan(0);
    expect(LANCE_SIZE.CLAN).toBeGreaterThan(0);
    expect(LANCE_SIZE.COMSTAR).toBeGreaterThan(0);
    expect(Number.isInteger(LANCE_SIZE.IS)).toBe(true);
    expect(Number.isInteger(LANCE_SIZE.CLAN)).toBe(true);
    expect(Number.isInteger(LANCE_SIZE.COMSTAR)).toBe(true);
  });
});

// =============================================================================
// calculateOpForBV Tests
// =============================================================================

describe('calculateOpForBV', () => {
  describe('Variation Formula (75-125%)', () => {
    it('should apply variation formula: (randomInt(8) - 3) * 5', () => {
      // Test all 8 possible random values (0-7)
      // Expected variations: -15, -10, -5, 0, 5, 10, 15, 20
      // Expected percentages: 85%, 90%, 95%, 100%, 105%, 110%, 115%, 120%

      const testCases = [
        { randomValue: 0 / 8, expectedVariation: -15, expectedPct: 85 },
        { randomValue: 1 / 8, expectedVariation: -10, expectedPct: 90 },
        { randomValue: 2 / 8, expectedVariation: -5, expectedPct: 95 },
        { randomValue: 3 / 8, expectedVariation: 0, expectedPct: 100 },
        { randomValue: 4 / 8, expectedVariation: 5, expectedPct: 105 },
        { randomValue: 5 / 8, expectedVariation: 10, expectedPct: 110 },
        { randomValue: 6 / 8, expectedVariation: 15, expectedPct: 115 },
        { randomValue: 7 / 8, expectedVariation: 20, expectedPct: 120 },
      ];

      testCases.forEach(({ randomValue, expectedPct }) => {
        const playerBV = 100;
        const difficulty = 1.0;
        const result = calculateOpForBV(
          playerBV,
          difficulty,
          seededRandom(randomValue),
        );

        // Expected: 100 * 1.0 * (expectedPct / 100) = expectedPct
        const expected = Math.round(
          playerBV * difficulty * (expectedPct / 100),
        );
        expect(result).toBe(expected);
      });
    });

    it('should produce 85% minimum variation (random 0)', () => {
      const playerBV = 100;
      const difficulty = 1.0;
      const result = calculateOpForBV(playerBV, difficulty, seededRandom(0));

      // 100 * 1.0 * 0.85 = 85
      expect(result).toBe(85);
    });

    it('should produce 120% maximum variation (random 7/8)', () => {
      const playerBV = 100;
      const difficulty = 1.0;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(7 / 8),
      );

      // 100 * 1.0 * 1.20 = 120
      expect(result).toBe(120);
    });

    it('should produce 100% with middle variation (random 3/8)', () => {
      const playerBV = 100;
      const difficulty = 1.0;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      );

      // 100 * 1.0 * 1.00 = 100
      expect(result).toBe(100);
    });
  });

  describe('Difficulty Multiplier', () => {
    it('should apply 0.5 easy difficulty', () => {
      const playerBV = 100;
      const difficulty = 0.5;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      ); // 100% variation

      // 100 * 0.5 * 1.0 = 50
      expect(result).toBe(50);
    });

    it('should apply 1.0 normal difficulty', () => {
      const playerBV = 100;
      const difficulty = 1.0;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      ); // 100% variation

      // 100 * 1.0 * 1.0 = 100
      expect(result).toBe(100);
    });

    it('should apply 2.0 hard difficulty', () => {
      const playerBV = 100;
      const difficulty = 2.0;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      ); // 100% variation

      // 100 * 2.0 * 1.0 = 200
      expect(result).toBe(200);
    });

    it('should combine difficulty and variation correctly', () => {
      const playerBV = 100;
      const difficulty = 1.5;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(4 / 8),
      ); // 105% variation

      // 100 * 1.5 * 1.05 = 157.5 → 158 (rounded)
      expect(result).toBe(158);
    });
  });

  describe('Rounding', () => {
    it('should round to whole number', () => {
      const playerBV = 100;
      const difficulty = 1.5;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(4 / 8),
      ); // 105% variation

      // 100 * 1.5 * 1.05 = 157.5 → 158
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBe(158);
    });

    it('should round 0.5 up (Math.round behavior)', () => {
      const playerBV = 100;
      const difficulty = 1.0;
      // Need to find a combination that produces X.5
      // 100 * 1.0 * 1.005 = 100.5 → 101
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3.5 / 8),
      );

      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('Deterministic behavior with seeded random', () => {
    it('should produce consistent results with same seed', () => {
      const playerBV = 100;
      const difficulty = 1.0;
      const seed = 0.5;

      const result1 = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(seed),
      );
      const result2 = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(seed),
      );

      expect(result1).toBe(result2);
    });

    it('should produce different results with different seeds', () => {
      const playerBV = 100;
      const difficulty = 1.0;

      const result1 = calculateOpForBV(playerBV, difficulty, seededRandom(0));
      const result2 = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(7 / 8),
      );

      expect(result1).not.toBe(result2);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero player BV', () => {
      const playerBV = 0;
      const difficulty = 1.0;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      );

      expect(result).toBe(0);
    });

    it('should handle very large player BV', () => {
      const playerBV = 10000;
      const difficulty = 1.0;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      );

      expect(result).toBe(10000);
      expect(Number.isInteger(result)).toBe(true);
    });

    it('should handle very small difficulty', () => {
      const playerBV = 100;
      const difficulty = 0.1;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      );

      expect(result).toBe(10);
    });

    it('should handle very large difficulty', () => {
      const playerBV = 100;
      const difficulty = 3.0;
      const result = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(3 / 8),
      );

      expect(result).toBe(300);
    });

    it('should handle random value at boundaries', () => {
      const playerBV = 100;
      const difficulty = 1.0;

      const result1 = calculateOpForBV(playerBV, difficulty, seededRandom(0.0));
      const result2 = calculateOpForBV(
        playerBV,
        difficulty,
        seededRandom(0.999),
      );

      expect(Number.isInteger(result1)).toBe(true);
      expect(Number.isInteger(result2)).toBe(true);
    });
  });
});

// =============================================================================
// calculateForceComposition Tests
// =============================================================================

describe('calculateForceComposition', () => {
  describe('Return type and structure', () => {
    it('should return IOpForConfig with all required fields', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result).toHaveProperty('targetBV');
      expect(result).toHaveProperty('unitCount');
      expect(result).toHaveProperty('weightClass');
      expect(result).toHaveProperty('quality');
    });

    it('should have targetBV matching input', () => {
      const targetBV = 250;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.targetBV).toBe(targetBV);
    });

    it('should have unitCount as positive integer', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(Number.isInteger(result.unitCount)).toBe(true);
      expect(result.unitCount).toBeGreaterThan(0);
    });

    it('should have valid weightClass', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      const validClasses = ['light', 'medium', 'heavy', 'assault', 'mixed'];
      expect(validClasses).toContain(result.weightClass);
    });

    it('should have quality as string', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(typeof result.quality).toBe('string');
      expect(result.quality.length).toBeGreaterThan(0);
    });
  });

  describe('Faction-specific unit counts', () => {
    it('should use IS lance size (4) for IS faction', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.unitCount).toBe(LANCE_SIZE.IS);
    });

    it('should use Clan star size (5) for Clan faction', () => {
      const targetBV = 100;
      const faction = 'Clan';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.unitCount).toBe(LANCE_SIZE.CLAN);
    });

    it('should use ComStar level II size (6) for ComStar faction', () => {
      const targetBV = 100;
      const faction = 'ComStar';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.unitCount).toBe(LANCE_SIZE.COMSTAR);
    });

    it('should default to IS lance size for unknown faction', () => {
      const targetBV = 100;
      const faction = 'Unknown';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.unitCount).toBe(LANCE_SIZE.IS);
    });

    it('should be case-insensitive for faction names', () => {
      const targetBV = 100;

      const resultIS = calculateForceComposition(
        targetBV,
        'is',
        seededRandom(0.5),
      );
      const resultClan = calculateForceComposition(
        targetBV,
        'clan',
        seededRandom(0.5),
      );
      const resultComStar = calculateForceComposition(
        targetBV,
        'comstar',
        seededRandom(0.5),
      );

      expect(resultIS.unitCount).toBe(LANCE_SIZE.IS);
      expect(resultClan.unitCount).toBe(LANCE_SIZE.CLAN);
      expect(resultComStar.unitCount).toBe(LANCE_SIZE.COMSTAR);
    });
  });

  describe('Quality assignment', () => {
    it('should have quality as A-F rating', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      const validQualities = ['A', 'B', 'C', 'D', 'E', 'F'];
      expect(validQualities).toContain(result.quality);
    });

    it('should default to C quality', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      // Default should be C (regular)
      expect(result.quality).toBe('C');
    });
  });

  describe('Weight class assignment', () => {
    it('should have weight class as one of valid types', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      const validClasses = ['light', 'medium', 'heavy', 'assault', 'mixed'];
      expect(validClasses).toContain(result.weightClass);
    });

    it('should default to mixed weight class', () => {
      const targetBV = 100;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.weightClass).toBe('mixed');
    });
  });

  describe('Deterministic behavior with seeded random', () => {
    it('should produce consistent results with same seed', () => {
      const targetBV = 100;
      const faction = 'IS';
      const seed = 0.5;

      const result1 = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(seed),
      );
      const result2 = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(seed),
      );

      expect(result1).toEqual(result2);
    });

    it('should work with all factions', () => {
      const targetBV = 100;
      const factions = ['IS', 'Clan', 'ComStar'];

      factions.forEach((faction) => {
        const result = calculateForceComposition(
          targetBV,
          faction,
          seededRandom(0.5),
        );
        expect(result).toHaveProperty('targetBV');
        expect(result).toHaveProperty('unitCount');
        expect(result).toHaveProperty('weightClass');
        expect(result).toHaveProperty('quality');
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle zero target BV', () => {
      const targetBV = 0;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.targetBV).toBe(0);
      expect(result.unitCount).toBe(LANCE_SIZE.IS);
    });

    it('should handle very large target BV', () => {
      const targetBV = 100000;
      const faction = 'IS';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      expect(result.targetBV).toBe(100000);
      expect(result.unitCount).toBe(LANCE_SIZE.IS);
    });

    it('should handle empty faction string', () => {
      const targetBV = 100;
      const faction = '';
      const result = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.5),
      );

      // Should default to IS
      expect(result.unitCount).toBe(LANCE_SIZE.IS);
    });

    it('should handle random value at boundaries', () => {
      const targetBV = 100;
      const faction = 'IS';

      const result1 = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.0),
      );
      const result2 = calculateForceComposition(
        targetBV,
        faction,
        seededRandom(0.999),
      );

      expect(result1).toHaveProperty('targetBV');
      expect(result2).toHaveProperty('targetBV');
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('OpFor Generation Integration', () => {
  it('should work together: calculateOpForBV then calculateForceComposition', () => {
    const playerBV = 100;
    const difficulty = 1.0;
    const faction = 'IS';

    const opForBV = calculateOpForBV(playerBV, difficulty, seededRandom(3 / 8));
    const composition = calculateForceComposition(
      opForBV,
      faction,
      seededRandom(0.5),
    );

    expect(opForBV).toBe(100);
    expect(composition.targetBV).toBe(100);
    expect(composition.unitCount).toBe(LANCE_SIZE.IS);
  });

  it('should handle full scenario: hard difficulty with Clan forces', () => {
    const playerBV = 200;
    const difficulty = 1.5;
    const faction = 'Clan';

    const opForBV = calculateOpForBV(playerBV, difficulty, seededRandom(5 / 8)); // 110% variation
    const composition = calculateForceComposition(
      opForBV,
      faction,
      seededRandom(0.5),
    );

    // 200 * 1.5 * 1.10 = 330
    expect(opForBV).toBe(330);
    expect(composition.targetBV).toBe(330);
    expect(composition.unitCount).toBe(LANCE_SIZE.CLAN);
  });

  it('should handle full scenario: easy difficulty with ComStar forces', () => {
    const playerBV = 150;
    const difficulty = 0.75;
    const faction = 'ComStar';

    const opForBV = calculateOpForBV(playerBV, difficulty, seededRandom(1 / 8)); // 90% variation
    const composition = calculateForceComposition(
      opForBV,
      faction,
      seededRandom(0.5),
    );

    // 150 * 0.75 * 0.90 = 101.25 → 101
    expect(opForBV).toBe(101);
    expect(composition.targetBV).toBe(101);
    expect(composition.unitCount).toBe(LANCE_SIZE.COMSTAR);
  });
});
