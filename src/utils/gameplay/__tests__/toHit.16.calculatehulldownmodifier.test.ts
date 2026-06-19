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
// Hull-Down Position Tests
// =============================================================================

describe('calculateHullDownModifier', () => {
  it('should return null when not hull-down', () => {
    expect(calculateHullDownModifier(false, false)).toBeNull();
  });

  it('should return +2 when hull-down and no terrain partial cover', () => {
    const mod = calculateHullDownModifier(true, false);
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(2);
  });

  it('should override terrain partial cover when hull-down', () => {
    const mod = calculateHullDownModifier(true, true);
    expect(mod).not.toBeNull();
    expect(mod?.value).toBe(2);
  });

  it('should set source to terrain', () => {
    const mod = calculateHullDownModifier(true, false);
    expect(mod?.source).toBe('terrain');
  });

  it('should set name to Hull-Down', () => {
    const mod = calculateHullDownModifier(true, false);
    expect(mod?.name).toBe('Hull-Down');
  });

  it('should include hull-down description', () => {
    const mod = calculateHullDownModifier(true, false);
    expect(mod?.description).toContain('hull-down');
  });
});

describe('calculateToHit with hull-down modifier', () => {
  it('should apply +2 hull-down modifier to attacks against hull-down target', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ hullDown: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Hull-down +2 = 6
    expect(result.finalToHit).toBe(6);
    expect(result.modifiers.some((m) => m.name === 'Hull-Down')).toBe(true);
  });

  it('should not apply hull-down when hullDown is false', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ hullDown: false });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    expect(result.finalToHit).toBe(4);
    expect(result.modifiers.some((m) => m.name === 'Hull-Down')).toBe(false);
  });

  it('should not apply hull-down when hullDown is undefined', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    expect(result.finalToHit).toBe(4);
    expect(result.modifiers.some((m) => m.name === 'Hull-Down')).toBe(false);
  });

  it('should replace terrain partial cover with hull-down', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({
      partialCover: true,
      hullDown: true,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    // Gunnery 4 + Hull-down +2 = 6 (normal partial cover suppressed)
    expect(result.finalToHit).toBe(6);
    expect(result.modifiers.some((m) => m.name === 'Hull-Down')).toBe(true);
    expect(result.modifiers.some((m) => m.name === 'Partial Cover')).toBe(
      false,
    );
  });

  it('should stack hull-down modifier with other modifiers', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      movementType: MovementType.Walk,
    });
    const target = createTestTargetState({ hullDown: true });
    const result = calculateToHit(attacker, target, RangeBracket.Medium, 5);

    // Gunnery 4 + Medium 2 + Walk 1 + Hull-down 2 = 9
    expect(result.finalToHit).toBe(9);
  });
});
