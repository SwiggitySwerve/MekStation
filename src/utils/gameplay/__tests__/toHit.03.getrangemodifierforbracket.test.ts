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

  it('should return +2 for TacOps Evade', () => {
    const modifier = calculateAttackerMovementModifier(MovementType.Evade);
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
