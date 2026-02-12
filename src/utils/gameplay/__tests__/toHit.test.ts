/**
 * To-Hit Calculation Module Tests
 *
 * Comprehensive tests for BattleTech to-hit modifiers and probability calculations.
 */

import type {
  IAttackerState,
  ITargetState,
  ICombatContext,
  IToHitModifierDetail,
} from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { MovementType, RangeBracket } from '@/types/gameplay';
import { FiringArc } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  // Constants
  RANGE_MODIFIERS,
  ATTACKER_MOVEMENT_MODIFIERS,
  HEAT_THRESHOLDS,
  PROBABILITY_TABLE,
  // Modifier calculation functions
  createBaseModifier,
  calculateRangeModifier,
  getRangeModifierForBracket,
  calculateAttackerMovementModifier,
  calculateTMM,
  calculateHeatModifier,
  calculateMinimumRangeModifier,
  calculateProneModifier,
  calculateImmobileModifier,
  calculatePartialCoverModifier,
  getTerrainToHitModifier,
  // Aggregation functions
  calculateToHit,
  calculateToHitFromContext,
  aggregateModifiers,
  getProbability,
  getRangeBracket,
  // Utility functions
  simpleToHit,
  formatToHitBreakdown,
} from '../toHit';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a test attacker state.
 */
function createTestAttackerState(
  overrides: Partial<IAttackerState> = {},
): IAttackerState {
  return {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
    ...overrides,
  };
}

/**
 * Create a test target state.
 */
function createTestTargetState(
  overrides: Partial<ITargetState> = {},
): ITargetState {
  return {
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    prone: false,
    immobile: false,
    partialCover: false,
    ...overrides,
  };
}

/**
 * Create a test combat context.
 */
function createTestCombatContext(
  overrides: Partial<ICombatContext> = {},
): ICombatContext {
  return {
    attacker: createTestAttackerState(),
    target: createTestTargetState(),
    range: 3,
    arc: FiringArc.Front,
    environmental: [],
    ...overrides,
  };
}

// =============================================================================
// RANGE_MODIFIERS Constant Tests
// =============================================================================

describe('RANGE_MODIFIERS', () => {
  it('should have Short range modifier of 0', () => {
    expect(RANGE_MODIFIERS[RangeBracket.Short]).toBe(0);
  });

  it('should have Medium range modifier of 2', () => {
    expect(RANGE_MODIFIERS[RangeBracket.Medium]).toBe(2);
  });

  it('should have Long range modifier of 4', () => {
    expect(RANGE_MODIFIERS[RangeBracket.Long]).toBe(4);
  });

  it('should have Extreme range modifier of 6', () => {
    expect(RANGE_MODIFIERS[RangeBracket.Extreme]).toBe(6);
  });

  it('should have OutOfRange modifier of Infinity', () => {
    expect(RANGE_MODIFIERS[RangeBracket.OutOfRange]).toBe(Infinity);
  });

  it('should have all range brackets defined', () => {
    const brackets = Object.values(RangeBracket);
    for (const bracket of brackets) {
      expect(RANGE_MODIFIERS[bracket]).toBeDefined();
    }
  });
});

// =============================================================================
// ATTACKER_MOVEMENT_MODIFIERS Constant Tests
// =============================================================================

describe('ATTACKER_MOVEMENT_MODIFIERS', () => {
  it('should have Stationary modifier of 0', () => {
    expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Stationary]).toBe(0);
  });

  it('should have Walk modifier of 1', () => {
    expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Walk]).toBe(1);
  });

  it('should have Run modifier of 2', () => {
    expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Run]).toBe(2);
  });

  it('should have Jump modifier of 3', () => {
    expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Jump]).toBe(3);
  });

  it('should have all movement types defined', () => {
    const types = Object.values(MovementType);
    for (const type of types) {
      expect(ATTACKER_MOVEMENT_MODIFIERS[type]).toBeDefined();
    }
  });
});

// =============================================================================
// HEAT_THRESHOLDS Constant Tests
// =============================================================================

describe('HEAT_THRESHOLDS', () => {
  it('should have 5 heat threshold ranges', () => {
    expect(HEAT_THRESHOLDS).toHaveLength(5);
  });

  it('should have no modifier for heat 0-7', () => {
    const threshold = HEAT_THRESHOLDS[0];
    expect(threshold.minHeat).toBe(0);
    expect(threshold.maxHeat).toBe(7);
    expect(threshold.modifier).toBe(0);
  });

  it('should have +1 modifier for heat 8-12', () => {
    const threshold = HEAT_THRESHOLDS[1];
    expect(threshold.minHeat).toBe(8);
    expect(threshold.maxHeat).toBe(12);
    expect(threshold.modifier).toBe(1);
  });

  it('should have +2 modifier for heat 13-16', () => {
    const threshold = HEAT_THRESHOLDS[2];
    expect(threshold.minHeat).toBe(13);
    expect(threshold.maxHeat).toBe(16);
    expect(threshold.modifier).toBe(2);
  });

  it('should have +3 modifier for heat 17-23', () => {
    const threshold = HEAT_THRESHOLDS[3];
    expect(threshold.minHeat).toBe(17);
    expect(threshold.maxHeat).toBe(23);
    expect(threshold.modifier).toBe(3);
  });

  it('should have +4 modifier for heat 24+', () => {
    const threshold = HEAT_THRESHOLDS[4];
    expect(threshold.minHeat).toBe(24);
    expect(threshold.maxHeat).toBe(Infinity);
    expect(threshold.modifier).toBe(4);
  });

  it('should cover all heat values from 0 to Infinity', () => {
    // Verify thresholds cover the full range without gaps
    const sorted = [...HEAT_THRESHOLDS].sort((a, b) => a.minHeat - b.minHeat);
    expect(sorted[0].minHeat).toBe(0);
    expect(sorted[sorted.length - 1].maxHeat).toBe(Infinity);

    // Verify no gaps between thresholds
    for (let i = 0; i < sorted.length - 1; i++) {
      expect(sorted[i].maxHeat + 1).toBe(sorted[i + 1].minHeat);
    }
  });
});

// =============================================================================
// PROBABILITY_TABLE Constant Tests
// =============================================================================

describe('PROBABILITY_TABLE', () => {
  it('should have probability 1.0 for target number 2', () => {
    expect(PROBABILITY_TABLE[2]).toBe(1.0);
  });

  it('should have probability 0 for target number 13', () => {
    expect(PROBABILITY_TABLE[13]).toBe(0);
  });

  it('should have correct probability for target 7 (21/36 = 0.583...)', () => {
    expect(PROBABILITY_TABLE[7]).toBeCloseTo(21 / 36, 6);
  });

  it('should have correct probability for target 8 (15/36 = 0.416...)', () => {
    expect(PROBABILITY_TABLE[8]).toBeCloseTo(15 / 36, 6);
  });

  it('should have correct probability for target 12 (1/36)', () => {
    expect(PROBABILITY_TABLE[12]).toBeCloseTo(1 / 36, 6);
  });

  it('should have decreasing probabilities as target number increases', () => {
    for (let target = 2; target < 12; target++) {
      expect(PROBABILITY_TABLE[target]).toBeGreaterThan(
        PROBABILITY_TABLE[target + 1],
      );
    }
  });

  it('should have all standard 2d6 target numbers (2-13)', () => {
    for (let target = 2; target <= 13; target++) {
      expect(PROBABILITY_TABLE[target]).toBeDefined();
    }
  });

  it('should sum to approximately 6.0 for all probabilities (weighted average check)', () => {
    // This validates the 2d6 distribution is correct
    // Sum of (target * probability) for all should approximate 7 (expected value)
    let weightedSum = 0;
    for (let target = 2; target <= 12; target++) {
      const probability =
        PROBABILITY_TABLE[target] - (PROBABILITY_TABLE[target + 1] ?? 0);
      weightedSum += target * probability;
    }
    expect(weightedSum).toBeCloseTo(7, 1);
  });
});

// =============================================================================
// createBaseModifier Tests
// =============================================================================

describe('createBaseModifier', () => {
  it('should create modifier with correct gunnery value', () => {
    const modifier = createBaseModifier(4);
    expect(modifier.value).toBe(4);
  });

  it('should set name to "Gunnery Skill"', () => {
    const modifier = createBaseModifier(4);
    expect(modifier.name).toBe('Gunnery Skill');
  });

  it('should set source to "base"', () => {
    const modifier = createBaseModifier(4);
    expect(modifier.source).toBe('base');
  });

  it('should include gunnery value in description', () => {
    const modifier = createBaseModifier(5);
    expect(modifier.description).toContain('5');
  });

  it('should handle gunnery 0 (elite pilot)', () => {
    const modifier = createBaseModifier(0);
    expect(modifier.value).toBe(0);
  });

  it('should handle high gunnery values', () => {
    const modifier = createBaseModifier(8);
    expect(modifier.value).toBe(8);
  });
});

// =============================================================================
// calculateRangeModifier Tests
// =============================================================================

describe('calculateRangeModifier', () => {
  const shortRange = 3;
  const mediumRange = 6;
  const longRange = 15;

  describe('short range', () => {
    it('should return +0 for range 1', () => {
      const modifier = calculateRangeModifier(
        1,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(0);
    });

    it('should return +0 for range equal to short range', () => {
      const modifier = calculateRangeModifier(
        3,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(0);
    });

    it('should include "short" in name (case-insensitive)', () => {
      const modifier = calculateRangeModifier(
        2,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('short');
    });
  });

  describe('medium range', () => {
    it('should return +2 for range just beyond short', () => {
      const modifier = calculateRangeModifier(
        4,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(2);
    });

    it('should return +2 for range equal to medium range', () => {
      const modifier = calculateRangeModifier(
        6,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(2);
    });

    it('should include "medium" in name (case-insensitive)', () => {
      const modifier = calculateRangeModifier(
        5,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('medium');
    });
  });

  describe('long range', () => {
    it('should return +4 for range just beyond medium', () => {
      const modifier = calculateRangeModifier(
        7,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(4);
    });

    it('should return +4 for range equal to long range', () => {
      const modifier = calculateRangeModifier(
        15,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(4);
    });

    it('should include "long" in name (case-insensitive)', () => {
      const modifier = calculateRangeModifier(
        10,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('long');
    });
  });

  describe('out of range', () => {
    it('should return Infinity for range beyond long', () => {
      const modifier = calculateRangeModifier(
        16,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(Infinity);
    });

    it('should include "out_of_range" in name', () => {
      const modifier = calculateRangeModifier(
        20,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('out_of_range');
    });
  });

  it('should set source to "range"', () => {
    const modifier = calculateRangeModifier(
      5,
      shortRange,
      mediumRange,
      longRange,
    );
    expect(modifier.source).toBe('range');
  });

  it('should include actual range in description', () => {
    const modifier = calculateRangeModifier(
      7,
      shortRange,
      mediumRange,
      longRange,
    );
    expect(modifier.description).toContain('7');
  });
});

// =============================================================================
// getRangeModifierForBracket Tests
// =============================================================================

describe('getRangeModifierForBracket', () => {
  it('should return +0 for Short bracket', () => {
    const modifier = getRangeModifierForBracket(RangeBracket.Short);
    expect(modifier.value).toBe(0);
  });

  it('should return +2 for Medium bracket', () => {
    const modifier = getRangeModifierForBracket(RangeBracket.Medium);
    expect(modifier.value).toBe(2);
  });

  it('should return +4 for Long bracket', () => {
    const modifier = getRangeModifierForBracket(RangeBracket.Long);
    expect(modifier.value).toBe(4);
  });

  it('should return +6 for Extreme bracket', () => {
    const modifier = getRangeModifierForBracket(RangeBracket.Extreme);
    expect(modifier.value).toBe(6);
  });

  it('should return Infinity for OutOfRange bracket', () => {
    const modifier = getRangeModifierForBracket(RangeBracket.OutOfRange);
    expect(modifier.value).toBe(Infinity);
  });

  it('should set source to "range"', () => {
    const modifier = getRangeModifierForBracket(RangeBracket.Medium);
    expect(modifier.source).toBe('range');
  });

  it('should include bracket name in modifier name', () => {
    const modifier = getRangeModifierForBracket(RangeBracket.Long);
    expect(modifier.name).toContain('long');
  });
});

// =============================================================================
// calculateAttackerMovementModifier Tests
// =============================================================================

describe('calculateAttackerMovementModifier', () => {
  it('should return +0 for stationary', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Stationary);
    expect(modifier.value).toBe(0);
  });

  it('should return +1 for walking', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Walk);
    expect(modifier.value).toBe(1);
  });

  it('should return +2 for running', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Run);
    expect(modifier.value).toBe(2);
  });

  it('should return +3 for jumping', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Jump);
    expect(modifier.value).toBe(3);
  });

  it('should set source to "attacker_movement"', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Walk);
    expect(modifier.source).toBe('attacker_movement');
  });

  it('should set name to "Attacker Movement"', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Run);
    expect(modifier.name).toBe('Attacker Movement');
  });

  it('should include movement type in description', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Jump);
    expect(modifier.description).toContain('jump');
  });
});

// =============================================================================
// calculateTMM Tests
// =============================================================================

describe('calculateTMM', () => {
  describe('stationary target', () => {
    it('should return +0 for stationary movement type', () => {
      const modifier = calculateTMM(MovementType.Stationary, 0);
      expect(modifier.value).toBe(0);
    });

    it('should return +0 for 0 hexes moved regardless of type', () => {
      const modifier = calculateTMM(MovementType.Walk, 0);
      expect(modifier.value).toBe(0);
    });

    it('should describe target as stationary', () => {
      const modifier = calculateTMM(MovementType.Stationary, 0);
      expect(modifier.description?.toLowerCase()).toContain('stationary');
    });
  });

  describe('walking target', () => {
    it('should return +0 for 1-2 hexes moved', () => {
      expect(calculateTMM(MovementType.Walk, 1).value).toBe(0);
      expect(calculateTMM(MovementType.Walk, 2).value).toBe(0);
    });

    it('should return +1 for 3-4 hexes moved', () => {
      expect(calculateTMM(MovementType.Walk, 3).value).toBe(1);
      expect(calculateTMM(MovementType.Walk, 4).value).toBe(1);
    });

    it('should return +2 for 5-6 hexes moved', () => {
      expect(calculateTMM(MovementType.Walk, 5).value).toBe(2);
      expect(calculateTMM(MovementType.Walk, 6).value).toBe(2);
    });

    it('should return +3 for 7-9 hexes moved', () => {
      expect(calculateTMM(MovementType.Walk, 7).value).toBe(3);
      expect(calculateTMM(MovementType.Walk, 9).value).toBe(3);
    });

    it('should return +4 for 10-17 hexes moved', () => {
      expect(calculateTMM(MovementType.Walk, 10).value).toBe(4);
      expect(calculateTMM(MovementType.Walk, 17).value).toBe(4);
    });
  });

  describe('running target', () => {
    it('should use same TMM calculation as walking', () => {
      expect(calculateTMM(MovementType.Run, 5).value).toBe(2);
      expect(calculateTMM(MovementType.Run, 10).value).toBe(4);
    });
  });

  describe('jumping target', () => {
    it('should add +1 to base TMM for jumping', () => {
      // 5 hexes = TMM 2 + 1 for jumping = 3
      const modifier = calculateTMM(MovementType.Jump, 5);
      expect(modifier.value).toBe(3);
    });

    it('should add +1 to higher TMM values for jumping', () => {
      // 10 hexes = TMM 4 + 1 for jumping = 5
      const modifier = calculateTMM(MovementType.Jump, 10);
      expect(modifier.value).toBe(5);
    });

    it('should include "jumped" in description', () => {
      const modifier = calculateTMM(MovementType.Jump, 5);
      expect(modifier.description?.toLowerCase()).toContain('jump');
    });
  });

  it('should set source to "target_movement"', () => {
    const modifier = calculateTMM(MovementType.Walk, 5);
    expect(modifier.source).toBe('target_movement');
  });

  it('should set name to include TMM', () => {
    const modifier = calculateTMM(MovementType.Walk, 5);
    expect(modifier.name).toContain('TMM');
  });

  it('should include hexes moved in description', () => {
    const modifier = calculateTMM(MovementType.Walk, 7);
    expect(modifier.description).toContain('7');
  });
});

// =============================================================================
// calculateHeatModifier Tests
// =============================================================================

describe('calculateHeatModifier', () => {
  describe('no heat penalty (0-7)', () => {
    it('should return +0 for heat 0', () => {
      const modifier = calculateHeatModifier(0);
      expect(modifier.value).toBe(0);
    });

    it('should return +0 for heat 7', () => {
      const modifier = calculateHeatModifier(7);
      expect(modifier.value).toBe(0);
    });

    it('should have "No heat penalty" description for heat 0', () => {
      const modifier = calculateHeatModifier(0);
      expect(modifier.description?.toLowerCase()).toContain('no heat');
    });
  });

  describe('+1 heat penalty (8-12)', () => {
    it('should return +1 for heat 8', () => {
      const modifier = calculateHeatModifier(8);
      expect(modifier.value).toBe(1);
    });

    it('should return +1 for heat 12', () => {
      const modifier = calculateHeatModifier(12);
      expect(modifier.value).toBe(1);
    });
  });

  describe('+2 heat penalty (13-16)', () => {
    it('should return +2 for heat 13', () => {
      const modifier = calculateHeatModifier(13);
      expect(modifier.value).toBe(2);
    });

    it('should return +2 for heat 16', () => {
      const modifier = calculateHeatModifier(16);
      expect(modifier.value).toBe(2);
    });
  });

  describe('+3 heat penalty (17-23)', () => {
    it('should return +3 for heat 17', () => {
      const modifier = calculateHeatModifier(17);
      expect(modifier.value).toBe(3);
    });

    it('should return +3 for heat 23', () => {
      const modifier = calculateHeatModifier(23);
      expect(modifier.value).toBe(3);
    });
  });

  describe('+4 heat penalty (24+)', () => {
    it('should return +4 for heat 24', () => {
      const modifier = calculateHeatModifier(24);
      expect(modifier.value).toBe(4);
    });

    it('should return +4 for very high heat', () => {
      const modifier = calculateHeatModifier(30);
      expect(modifier.value).toBe(4);
    });
  });

  it('should set source to "heat"', () => {
    const modifier = calculateHeatModifier(5);
    expect(modifier.source).toBe('heat');
  });

  it('should set name to "Heat"', () => {
    const modifier = calculateHeatModifier(5);
    expect(modifier.name).toBe('Heat');
  });

  it('should include heat value in description for non-zero heat', () => {
    const modifier = calculateHeatModifier(10);
    expect(modifier.description).toContain('10');
  });
});

// =============================================================================
// calculateMinimumRangeModifier Tests
// =============================================================================

describe('calculateMinimumRangeModifier', () => {
  describe('no minimum range', () => {
    it('should return null when minRange is 0', () => {
      const modifier = calculateMinimumRangeModifier(1, 0);
      expect(modifier).toBeNull();
    });

    it('should return null when minRange is negative', () => {
      const modifier = calculateMinimumRangeModifier(1, -1);
      expect(modifier).toBeNull();
    });
  });

  describe('target outside minimum range', () => {
    it('should return null when range equals minRange', () => {
      const modifier = calculateMinimumRangeModifier(3, 3);
      expect(modifier).toBeNull();
    });

    it('should return null when range exceeds minRange', () => {
      const modifier = calculateMinimumRangeModifier(5, 3);
      expect(modifier).toBeNull();
    });
  });

  describe('target inside minimum range', () => {
    it('should return +1 for 1 hex under minimum', () => {
      const modifier = calculateMinimumRangeModifier(2, 3);
      expect(modifier?.value).toBe(1);
    });

    it('should return +3 for 3 hexes under minimum', () => {
      const modifier = calculateMinimumRangeModifier(0, 3);
      expect(modifier?.value).toBe(3);
    });

    it('should return +5 for LRM with minRange 6 at range 1', () => {
      const modifier = calculateMinimumRangeModifier(1, 6);
      expect(modifier?.value).toBe(5);
    });
  });

  it('should set source to "range"', () => {
    const modifier = calculateMinimumRangeModifier(1, 3);
    expect(modifier?.source).toBe('range');
  });

  it('should set name to "Minimum Range"', () => {
    const modifier = calculateMinimumRangeModifier(1, 3);
    expect(modifier?.name).toBe('Minimum Range');
  });

  it('should include minimum range value in description', () => {
    const modifier = calculateMinimumRangeModifier(1, 6);
    expect(modifier?.description).toContain('6');
  });
});

// =============================================================================
// calculateProneModifier Tests
// =============================================================================

describe('calculateProneModifier', () => {
  describe('target not prone', () => {
    it('should return null when target is not prone', () => {
      const modifier = calculateProneModifier(false, 1);
      expect(modifier).toBeNull();
    });

    it('should return null at any range when not prone', () => {
      expect(calculateProneModifier(false, 0)).toBeNull();
      expect(calculateProneModifier(false, 5)).toBeNull();
      expect(calculateProneModifier(false, 10)).toBeNull();
    });
  });

  describe('target prone at close range (adjacent)', () => {
    it('should return -2 for prone target at range 0', () => {
      const modifier = calculateProneModifier(true, 0);
      expect(modifier?.value).toBe(-2);
    });

    it('should return -2 for prone target at range 1 (adjacent)', () => {
      const modifier = calculateProneModifier(true, 1);
      expect(modifier?.value).toBe(-2);
    });

    it('should include "close range" in description', () => {
      const modifier = calculateProneModifier(true, 1);
      expect(modifier?.description?.toLowerCase()).toContain('close');
    });
  });

  describe('target prone at range', () => {
    it('should return +1 for prone target at range 2', () => {
      const modifier = calculateProneModifier(true, 2);
      expect(modifier?.value).toBe(1);
    });

    it('should return +1 for prone target at long range', () => {
      const modifier = calculateProneModifier(true, 10);
      expect(modifier?.value).toBe(1);
    });

    it('should include "at range" in description', () => {
      const modifier = calculateProneModifier(true, 5);
      expect(modifier?.description?.toLowerCase()).toContain('range');
    });
  });

  it('should set source to "other"', () => {
    const modifier = calculateProneModifier(true, 1);
    expect(modifier?.source).toBe('other');
  });

  it('should include "Prone" in name', () => {
    const modifier = calculateProneModifier(true, 1);
    expect(modifier?.name).toContain('Prone');
  });
});

// =============================================================================
// calculateImmobileModifier Tests
// =============================================================================

describe('calculateImmobileModifier', () => {
  it('should return null when target is not immobile', () => {
    const modifier = calculateImmobileModifier(false);
    expect(modifier).toBeNull();
  });

  it('should return -4 when target is immobile', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.value).toBe(-4);
  });

  it('should set source to "other"', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.source).toBe('other');
  });

  it('should include "Immobile" in name', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.name).toContain('Immobile');
  });

  it('should include "-4" in description', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.description).toContain('-4');
  });
});

// =============================================================================
// calculatePartialCoverModifier Tests
// =============================================================================

describe('calculatePartialCoverModifier', () => {
  it('should return null when target is not in partial cover', () => {
    const modifier = calculatePartialCoverModifier(false);
    expect(modifier).toBeNull();
  });

  it('should return +1 when target is in partial cover', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.value).toBe(1);
  });

  it('should set source to "terrain"', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.source).toBe('terrain');
  });

  it('should include "Cover" in name', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.name).toContain('Cover');
  });

  it('should include "+1" in description', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.description).toContain('+1');
  });
});

// =============================================================================
// calculateToHit Tests
// =============================================================================

describe('calculateToHit', () => {
  it('should calculate basic to-hit with only gunnery and range', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Short range 0 = 4
    expect(result.finalToHit).toBe(4);
    expect(result.impossible).toBe(false);
  });

  it('should include attacker movement modifier', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      movementType: MovementType.Run,
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Running 2 = 6
    expect(result.finalToHit).toBe(6);
  });

  it('should include target movement modifier (TMM)', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({
      movementType: MovementType.Walk,
      hexesMoved: 5,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + TMM 2 (5 hexes → bracket 5-6 = +2) = 6
    expect(result.finalToHit).toBe(6);
  });

  it('should include heat modifier', () => {
    const attacker = createTestAttackerState({ gunnery: 4, heat: 8 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Heat 1 (canonical: +1@8) = 5
    expect(result.finalToHit).toBe(5);
  });

  it('should include minimum range modifier', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 2, 5);

    // Gunnery 4 + Min range penalty 3 = 7
    expect(result.finalToHit).toBe(7);
  });

  it('should include prone modifier (close range)', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ prone: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 1);

    // Gunnery 4 + Prone close -2 = 2
    expect(result.finalToHit).toBe(2);
  });

  it('should include prone modifier (at range) as penalty', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ prone: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Prone at range +1 = 5
    expect(result.finalToHit).toBe(5);
  });

  it('should include immobile modifier as bonus', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ immobile: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Immobile -4 = 0, but min is still calculated
    expect(result.finalToHit).toBe(0);
  });

  it('should include partial cover modifier', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ partialCover: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Partial cover 1 = 5
    expect(result.finalToHit).toBe(5);
  });

  it('should include damage modifiers from attacker', () => {
    const damageModifier: IToHitModifierDetail = {
      name: 'Damaged Sensors',
      value: 2,
      source: 'damage',
      description: 'Sensors damaged: +2',
    };
    const attacker = createTestAttackerState({
      gunnery: 4,
      damageModifiers: [damageModifier],
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Damaged sensors 2 = 6
    expect(result.finalToHit).toBe(6);
  });

  it('should combine all modifiers correctly', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      movementType: MovementType.Walk,
      heat: 5,
    });
    const target = createTestTargetState({
      movementType: MovementType.Run,
      hexesMoved: 6,
      partialCover: true,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Medium, 5);

    // Gunnery 4 + Medium 2 + Walk 1 + TMM 2 (6 hexes = +2) + Heat 0 (@5 = no penalty) + Cover 1 = 10
    expect(result.finalToHit).toBe(10);
  });

  it('should mark impossible shots (> 12)', () => {
    const attacker = createTestAttackerState({
      gunnery: 6,
      movementType: MovementType.Jump,
      heat: 13,
    });
    const target = createTestTargetState({
      movementType: MovementType.Jump,
      hexesMoved: 10,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Long, 10);

    // Gunnery 6 + Long 4 + Jump 3 + Heat 2 (@13) + TMM 5 (10 hexes=+4, +1 jump) = 20, capped at 13
    expect(result.finalToHit).toBe(13);
    expect(result.impossible).toBe(true);
    expect(result.probability).toBe(0);
  });

  it('should return probability based on final to-hit', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    expect(result.probability).toBeCloseTo(PROBABILITY_TABLE[4], 6);
  });

  it('should return all modifiers in the result', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      movementType: MovementType.Walk,
    });
    const target = createTestTargetState({
      movementType: MovementType.Walk,
      hexesMoved: 3,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Should have: Gunnery, Range, Attacker Movement, TMM, Heat
    expect(result.modifiers.length).toBeGreaterThanOrEqual(5);
    expect(result.modifiers.some((m) => m.name === 'Gunnery Skill')).toBe(true);
    expect(result.modifiers.some((m) => m.name.includes('Range'))).toBe(true);
    expect(result.modifiers.some((m) => m.name === 'Attacker Movement')).toBe(
      true,
    );
    expect(result.modifiers.some((m) => m.name.includes('TMM'))).toBe(true);
    expect(result.modifiers.some((m) => m.name === 'Heat')).toBe(true);
  });
});

// =============================================================================
// calculateToHitFromContext Tests
// =============================================================================

describe('calculateToHitFromContext', () => {
  it('should calculate to-hit from combat context', () => {
    const context = createTestCombatContext({
      attacker: createTestAttackerState({ gunnery: 4 }),
      target: createTestTargetState(),
      range: 3,
    });
    const result = calculateToHitFromContext(context);

    // Should use default ranges (3, 6, 15) - range 3 is Short
    expect(result.finalToHit).toBe(4);
  });

  it('should determine range bracket automatically', () => {
    const context = createTestCombatContext({
      attacker: createTestAttackerState({ gunnery: 4 }),
      target: createTestTargetState(),
      range: 5,
    });
    const result = calculateToHitFromContext(context);

    // Range 5 with default short=3 should be Medium (+2)
    // Gunnery 4 + Medium 2 = 6
    expect(result.finalToHit).toBe(6);
  });

  it('should apply minimum range when provided', () => {
    const context = createTestCombatContext({
      attacker: createTestAttackerState({ gunnery: 4 }),
      target: createTestTargetState(),
      range: 2,
    });
    const result = calculateToHitFromContext(context, 5);

    // Gunnery 4 + Min range penalty 3 = 7
    expect(result.finalToHit).toBe(7);
  });
});

// =============================================================================
// aggregateModifiers Tests
// =============================================================================

describe('aggregateModifiers', () => {
  it('should sum all modifier values', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 4, source: 'base' },
      { name: 'B', value: 2, source: 'range' },
      { name: 'C', value: 1, source: 'heat' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(7);
  });

  it('should handle negative modifiers', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 6, source: 'base' },
      { name: 'B', value: -4, source: 'other' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(2);
  });

  it('should cap final to-hit at 13', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 10, source: 'base' },
      { name: 'B', value: 6, source: 'range' },
      { name: 'C', value: 5, source: 'heat' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(13);
  });

  it('should mark impossible for final > 12', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 13, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.impossible).toBe(true);
  });

  it('should not mark impossible for final = 12', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 12, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.impossible).toBe(false);
  });

  it('should set probability to 0 for impossible shots', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 15, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.probability).toBe(0);
  });

  it('should use first modifier value as baseToHit', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'Gunnery', value: 4, source: 'base' },
      { name: 'Range', value: 2, source: 'range' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.baseToHit).toBe(4);
  });

  it('should handle empty modifier array', () => {
    const modifiers: IToHitModifierDetail[] = [];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(0);
    expect(result.baseToHit).toBe(0);
    expect(result.impossible).toBe(false);
    expect(result.probability).toBe(1.0);
  });

  it('should preserve all modifiers in result', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 4, source: 'base' },
      { name: 'B', value: 2, source: 'range' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.modifiers).toHaveLength(2);
    expect(result.modifiers).toEqual(modifiers);
  });

  it('should handle Infinity modifier (out of range)', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'Gunnery', value: 4, source: 'base' },
      { name: 'Range', value: Infinity, source: 'range' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(13);
    expect(result.impossible).toBe(true);
  });
});

// =============================================================================
// getProbability Tests
// =============================================================================

describe('getProbability', () => {
  it('should return 1.0 for target 2 or below', () => {
    expect(getProbability(2)).toBe(1.0);
    expect(getProbability(1)).toBe(1.0);
    expect(getProbability(0)).toBe(1.0);
    expect(getProbability(-5)).toBe(1.0);
  });

  it('should return 0 for target above 12', () => {
    expect(getProbability(13)).toBe(0);
    expect(getProbability(14)).toBe(0);
    expect(getProbability(100)).toBe(0);
  });

  it('should return correct probability for each standard target', () => {
    expect(getProbability(3)).toBeCloseTo(35 / 36, 6);
    expect(getProbability(4)).toBeCloseTo(33 / 36, 6);
    expect(getProbability(5)).toBeCloseTo(30 / 36, 6);
    expect(getProbability(6)).toBeCloseTo(26 / 36, 6);
    expect(getProbability(7)).toBeCloseTo(21 / 36, 6);
    expect(getProbability(8)).toBeCloseTo(15 / 36, 6);
    expect(getProbability(9)).toBeCloseTo(10 / 36, 6);
    expect(getProbability(10)).toBeCloseTo(6 / 36, 6);
    expect(getProbability(11)).toBeCloseTo(3 / 36, 6);
    expect(getProbability(12)).toBeCloseTo(1 / 36, 6);
  });

  it('should handle edge case target numbers', () => {
    expect(getProbability(2)).toBe(1.0);
    expect(getProbability(12)).toBeCloseTo(1 / 36, 6);
  });
});

// =============================================================================
// getRangeBracket Tests
// =============================================================================

describe('getRangeBracket', () => {
  const shortRange = 3;
  const mediumRange = 6;
  const longRange = 15;

  it('should return Short for range 0', () => {
    expect(getRangeBracket(0, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.Short,
    );
  });

  it('should return Short for range equal to short range', () => {
    expect(getRangeBracket(3, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.Short,
    );
  });

  it('should return Medium for range just above short', () => {
    expect(getRangeBracket(4, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.Medium,
    );
  });

  it('should return Medium for range equal to medium range', () => {
    expect(getRangeBracket(6, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.Medium,
    );
  });

  it('should return Long for range just above medium', () => {
    expect(getRangeBracket(7, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.Long,
    );
  });

  it('should return Long for range equal to long range', () => {
    expect(getRangeBracket(15, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.Long,
    );
  });

  it('should return OutOfRange for range beyond long', () => {
    expect(getRangeBracket(16, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.OutOfRange,
    );
  });

  it('should handle different weapon range brackets', () => {
    // LRM example: short 7, medium 14, long 21
    expect(getRangeBracket(7, 7, 14, 21)).toBe(RangeBracket.Short);
    expect(getRangeBracket(14, 7, 14, 21)).toBe(RangeBracket.Medium);
    expect(getRangeBracket(21, 7, 14, 21)).toBe(RangeBracket.Long);
    expect(getRangeBracket(22, 7, 14, 21)).toBe(RangeBracket.OutOfRange);
  });
});

// =============================================================================
// simpleToHit Tests
// =============================================================================

describe('simpleToHit', () => {
  it('should calculate basic to-hit with defaults', () => {
    const result = simpleToHit(4, RangeBracket.Short);

    // Gunnery 4, Short 0, Stationary 0, Stationary TMM 0, Heat 0 = 4
    expect(result.finalToHit).toBe(4);
  });

  it('should include gunnery skill', () => {
    const result = simpleToHit(6, RangeBracket.Short);
    expect(result.finalToHit).toBe(6);
  });

  it('should include range bracket modifier', () => {
    const result = simpleToHit(4, RangeBracket.Medium);
    expect(result.finalToHit).toBe(6); // 4 + 2
  });

  it('should include attacker movement modifier', () => {
    const result = simpleToHit(4, RangeBracket.Short, MovementType.Run);
    expect(result.finalToHit).toBe(6); // 4 + 2
  });

  it('should include target movement modifier', () => {
    const result = simpleToHit(
      4,
      RangeBracket.Short,
      MovementType.Stationary,
      MovementType.Walk,
      5,
    );
    expect(result.finalToHit).toBe(6); // 4 + TMM 2 (5 hexes → bracket 5-6 = +2)
  });

  it('should include heat modifier', () => {
    const result = simpleToHit(
      4,
      RangeBracket.Short,
      MovementType.Stationary,
      MovementType.Stationary,
      0,
      8,
    );
    expect(result.finalToHit).toBe(5); // 4 + Heat 1 (canonical: +1@8)
  });

  it('should combine all parameters', () => {
    const result = simpleToHit(
      4,
      RangeBracket.Medium,
      MovementType.Walk,
      MovementType.Run,
      8,
      5,
    );
    // Gunnery 4 + Medium 2 + Walk 1 + TMM 3 (8 hexes → bracket 7-9 = +3) + Heat 0 (@5) = 10
    expect(result.finalToHit).toBe(10);
  });

  it('should return impossible for very difficult shots', () => {
    const result = simpleToHit(
      6,
      RangeBracket.Long,
      MovementType.Jump,
      MovementType.Jump,
      15,
      13,
    );
    // Should be impossible
    expect(result.impossible).toBe(true);
  });
});

// =============================================================================
// formatToHitBreakdown Tests
// =============================================================================

describe('formatToHitBreakdown', () => {
  it('should format basic calculation', () => {
    const calc = simpleToHit(4, RangeBracket.Short);
    const formatted = formatToHitBreakdown(calc);

    expect(formatted).toContain('Gunnery');
    expect(formatted).toContain('4');
    expect(formatted).toContain('Total');
  });

  it('should include all modifiers', () => {
    const calc = simpleToHit(
      4,
      RangeBracket.Medium,
      MovementType.Walk,
      MovementType.Walk,
      5,
      5,
    );
    const formatted = formatToHitBreakdown(calc);

    expect(formatted).toContain('Gunnery');
    expect(formatted).toContain('Range');
    expect(formatted).toContain('Attacker Movement');
    expect(formatted).toContain('TMM');
    expect(formatted).toContain('Heat');
  });

  it('should show positive sign for positive modifiers', () => {
    const calc = simpleToHit(4, RangeBracket.Medium);
    const formatted = formatToHitBreakdown(calc);

    expect(formatted).toContain('+2');
  });

  it('should show probability for possible shots', () => {
    const calc = simpleToHit(4, RangeBracket.Short);
    const formatted = formatToHitBreakdown(calc);

    expect(formatted).toContain('Probability');
    expect(formatted).toContain('%');
  });

  it('should indicate impossible shots', () => {
    const calc = simpleToHit(
      8,
      RangeBracket.Long,
      MovementType.Jump,
      MovementType.Jump,
      10,
      13,
    );
    const formatted = formatToHitBreakdown(calc);

    expect(formatted.toLowerCase()).toContain('impossible');
  });

  it('should not show probability for impossible shots', () => {
    const calc = simpleToHit(
      8,
      RangeBracket.Long,
      MovementType.Jump,
      MovementType.Jump,
      10,
      13,
    );
    const formatted = formatToHitBreakdown(calc);

    // Should not have probability line
    expect(formatted).not.toMatch(/Probability:.*\d+\.\d+%/);
  });

  it('should include separator line', () => {
    const calc = simpleToHit(4, RangeBracket.Short);
    const formatted = formatToHitBreakdown(calc);

    expect(formatted).toContain('─');
  });

  it('should be multiline', () => {
    const calc = simpleToHit(4, RangeBracket.Short);
    const formatted = formatToHitBreakdown(calc);
    const lines = formatted.split('\n');

    expect(lines.length).toBeGreaterThan(3);
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration: Full to-hit calculations', () => {
  it('should calculate typical medium laser shot', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({
      movementType: MovementType.Walk,
      hexesMoved: 4,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + TMM 1 (4 hexes → bracket 3-4 = +1) = 5
    expect(result.finalToHit).toBe(5);
    expect(result.probability).toBeCloseTo(30 / 36, 2);
  });

  it('should calculate difficult LRM shot', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      movementType: MovementType.Walk,
      heat: 6,
    });
    const target = createTestTargetState({
      movementType: MovementType.Run,
      hexesMoved: 8,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Medium, 10, 6);

    // Gunnery 4 + Medium 2 + Walk 1 + TMM 3 (8 hexes → bracket 7-9 = +3) + Heat 0 (@6) + MinRange 0 = 10
    expect(result.finalToHit).toBe(10);
    expect(result.probability).toBeCloseTo(6 / 36, 2);
  });

  it('should calculate shot against prone immobile target', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({
      prone: true,
      immobile: true,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Prone at range +1 + Immobile -4 = 1
    expect(result.finalToHit).toBe(1);
    expect(result.probability).toBe(1.0);
  });

  it('should calculate impossible shot', () => {
    const attacker = createTestAttackerState({
      gunnery: 6,
      movementType: MovementType.Jump,
      heat: 15,
    });
    const target = createTestTargetState({
      movementType: MovementType.Jump,
      hexesMoved: 12,
      partialCover: true,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Long, 12);

    // Should be impossible
    expect(result.impossible).toBe(true);
    expect(result.probability).toBe(0);
    expect(result.finalToHit).toBe(13);
  });

  it('should calculate minimum range penalty correctly', () => {
    // LRM at point blank range
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 1, 6);

    // Gunnery 4 + MinRange penalty 5 = 9
    expect(result.finalToHit).toBe(9);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('should handle gunnery 0 (elite pilot)', () => {
    const result = simpleToHit(0, RangeBracket.Short);
    expect(result.finalToHit).toBe(0);
    expect(result.probability).toBe(1.0);
  });

  it('should handle negative final to-hit', () => {
    const attacker = createTestAttackerState({ gunnery: 0 });
    const target = createTestTargetState({ immobile: true, prone: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 5);

    // Gunnery 0 + Immobile -4 + Prone at range +1 = -3
    expect(result.finalToHit).toBe(-3);
    expect(result.probability).toBe(1.0);
    expect(result.impossible).toBe(false);
  });

  it('should handle exactly 12 to-hit (minimum success)', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'Total', value: 12, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(12);
    expect(result.impossible).toBe(false);
    expect(result.probability).toBeCloseTo(1 / 36, 6);
  });

  it('should handle exactly 13 to-hit (impossible)', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'Total', value: 13, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(13);
    expect(result.impossible).toBe(true);
    expect(result.probability).toBe(0);
  });

  it('should handle target that moved 0 hexes but not stationary', () => {
    // Edge case: movement type is walk but moved 0 hexes
    const modifier = calculateTMM(MovementType.Walk, 0);
    expect(modifier.value).toBe(0);
  });

  it('should handle very high heat values', () => {
    const modifier = calculateHeatModifier(100);
    expect(modifier.value).toBe(4); // Max is +4 (canonical: +4@24+)
  });

  it('should handle range exactly at bracket boundaries', () => {
    // At exactly short range
    expect(getRangeBracket(3, 3, 6, 15)).toBe(RangeBracket.Short);
    // At exactly medium range
    expect(getRangeBracket(6, 3, 6, 15)).toBe(RangeBracket.Medium);
    // At exactly long range
    expect(getRangeBracket(15, 3, 6, 15)).toBe(RangeBracket.Long);
  });
});

// =============================================================================
// getTerrainToHitModifier Tests
// =============================================================================

describe('getTerrainToHitModifier', () => {
  describe('clear terrain', () => {
    it('should return 0 for clear terrain', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      expect(getTerrainToHitModifier(target, [])).toBe(0);
    });

    it('should return 0 for clear terrain with no intervening', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });
  });

  describe('target in terrain', () => {
    it('should add +1 for target in light woods', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });

    it('should add +2 for target in heavy woods', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.HeavyWoods, level: 2 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(2);
    });

    it('should return -1 for target in water depth 1', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Water, level: 1 }];
      expect(getTerrainToHitModifier(target, [])).toBe(-1);
    });

    it('should add +1 for target in smoke', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Smoke, level: 1 }];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });

    it('should add +1 for target in swamp', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Swamp, level: 1 }];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });
  });

  describe('intervening terrain', () => {
    it('should add +1 per intervening light woods hex', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.LightWoods, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(2);
    });

    it('should add +2 per intervening heavy woods hex', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.HeavyWoods, level: 2 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(2);
    });

    it('should add +1 per intervening smoke hex', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.Smoke, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(1);
    });

    it('should not add modifier for intervening water', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.Water, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });
  });

  describe('combined terrain', () => {
    it('should combine target and intervening modifiers', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
      ];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.HeavyWoods, level: 2 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(4);
    });

    it('should handle multiple intervening hexes with mixed terrain', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.Smoke, level: 1 }],
        [{ type: TerrainType.HeavyWoods, level: 2 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(4);
    });

    it('should handle target in water with intervening woods', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Water, level: 1 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });
  });

  describe('multiple terrain features per hex', () => {
    it('should use highest target modifier when multiple features', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
        { type: TerrainType.Smoke, level: 1 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });

    it('should sum all intervening modifiers from multiple features', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [
          { type: TerrainType.LightWoods, level: 1 },
          { type: TerrainType.Smoke, level: 1 },
        ],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty target terrain array', () => {
      const target: ITerrainFeature[] = [];
      const intervening: ITerrainFeature[][] = [];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });

    it('should handle empty intervening terrain array', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
      ];
      const intervening: ITerrainFeature[][] = [];
      expect(getTerrainToHitModifier(target, intervening)).toBe(1);
    });

    it('should handle intervening hexes with no features', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [[], []];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });

    it('should handle negative target modifiers correctly', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 1 },
        { type: TerrainType.LightWoods, level: 1 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });
  });
});
