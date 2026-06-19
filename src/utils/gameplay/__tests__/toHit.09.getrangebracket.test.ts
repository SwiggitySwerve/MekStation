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

  it('should return Extreme for range within extreme bracket', () => {
    const extremeRange = 30;
    expect(
      getRangeBracket(16, shortRange, mediumRange, longRange, extremeRange),
    ).toBe(RangeBracket.Extreme);
  });

  it('should return Extreme for range equal to extreme range', () => {
    const extremeRange = 30;
    expect(
      getRangeBracket(30, shortRange, mediumRange, longRange, extremeRange),
    ).toBe(RangeBracket.Extreme);
  });

  it('should return OutOfRange for range beyond extreme', () => {
    const extremeRange = 30;
    expect(
      getRangeBracket(31, shortRange, mediumRange, longRange, extremeRange),
    ).toBe(RangeBracket.OutOfRange);
  });

  it('should return OutOfRange when extreme range not provided', () => {
    expect(getRangeBracket(16, shortRange, mediumRange, longRange)).toBe(
      RangeBracket.OutOfRange,
    );
  });

  it('should handle artillery weapon with extreme range', () => {
    // Artillery example: short 7, medium 14, long 21, extreme 42
    expect(getRangeBracket(7, 7, 14, 21, 42)).toBe(RangeBracket.Short);
    expect(getRangeBracket(14, 7, 14, 21, 42)).toBe(RangeBracket.Medium);
    expect(getRangeBracket(21, 7, 14, 21, 42)).toBe(RangeBracket.Long);
    expect(getRangeBracket(30, 7, 14, 21, 42)).toBe(RangeBracket.Extreme);
    expect(getRangeBracket(42, 7, 14, 21, 42)).toBe(RangeBracket.Extreme);
    expect(getRangeBracket(43, 7, 14, 21, 42)).toBe(RangeBracket.OutOfRange);
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

  it('should include TacOps Sprint attacker movement modifier', () => {
    const result = simpleToHit(4, RangeBracket.Short, MovementType.Sprint);
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
