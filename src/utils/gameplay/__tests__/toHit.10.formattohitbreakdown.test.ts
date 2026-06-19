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

    // Gunnery 4 + MinRange penalty 6 = 10
    expect(result.finalToHit).toBe(10);
  });
});
