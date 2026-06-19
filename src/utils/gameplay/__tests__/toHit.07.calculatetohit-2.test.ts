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

describe('calculateToHit', () => {
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

  it('should apply +6 modifier for extreme range', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Extreme, 20);

    // Gunnery 4 + Extreme 6 = 10
    expect(result.finalToHit).toBe(10);
    expect(result.modifiers.some((m) => m.name.includes('extreme'))).toBe(true);
    const extremeModifier = result.modifiers.find((m) =>
      m.name.includes('extreme'),
    );
    expect(extremeModifier?.value).toBe(6);
  });

  it('should handle extreme range with other modifiers', () => {
    const attacker = createTestAttackerState({
      gunnery: 3,
      movementType: MovementType.Walk,
    });
    const target = createTestTargetState({
      movementType: MovementType.Walk,
      hexesMoved: 5,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Extreme, 20);

    // Gunnery 3 + Extreme 6 + Walk 1 + TMM 2 (5 hexes) = 12
    expect(result.finalToHit).toBe(12);
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

    // Gunnery 4 + Min range penalty 4 = 8
    expect(result.finalToHit).toBe(8);
  });
});
