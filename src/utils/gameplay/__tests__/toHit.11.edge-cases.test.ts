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
