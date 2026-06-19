import { describe, expect, it } from '@jest/globals';

import type {
  IActuatorDamage,
  ICombatContext,
  IIndirectFire,
  ISecondaryTarget,
  ITerrainFeature,
  IToHitModifierDetail,
} from './toHit.test-helpers';

import {
  ATTACKER_MOVEMENT_MODIFIERS,
  FiringArc,
  HEAT_THRESHOLDS,
  MovementType,
  PROBABILITY_TABLE,
  RANGE_MODIFIERS,
  RangeBracket,
  TerrainType,
  aggregateModifiers,
  calculateActuatorDamageModifier,
  calculateAttackerMovementModifier,
  calculateAttackerProneModifier,
  calculateCalledShotModifier,
  calculateHeatModifier,
  calculateHullDownModifier,
  calculateImmobileModifier,
  calculateIndirectFireModifier,
  calculateMinimumRangeModifier,
  calculatePartialCoverModifier,
  calculatePilotWoundModifier,
  calculateProneModifier,
  calculateRangeModifier,
  calculateSecondaryTargetModifier,
  calculateSensorDamageModifier,
  calculateSpottingAttackerModifier,
  calculateTMM,
  calculateTargetEvasionModifier,
  calculateTargetSprintedModifier,
  calculateTargetingComputerModifier,
  calculateToHit,
  calculateToHitFromContext,
  createBaseModifier,
  createTestAttackerState,
  createTestCombatContext,
  createTestTargetState,
  formatToHitBreakdown,
  getProbability,
  getRangeBracket,
  getRangeModifierForBracket,
  getTerrainToHitModifier,
  simpleToHit,
} from './toHit.test-helpers';

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

  it('should have TacOps Evade modifier of 2', () => {
    expect(ATTACKER_MOVEMENT_MODIFIERS[MovementType.Evade]).toBe(2);
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
