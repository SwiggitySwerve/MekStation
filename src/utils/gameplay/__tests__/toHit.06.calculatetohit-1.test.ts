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

  it('should cancel positive target movement for active semi-guided TAG', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({
      movementType: MovementType.Walk,
      hexesMoved: 5,
    });
    const result = calculateToHit(
      attacker,
      target,
      RangeBracket.Short,
      3,
      0,
      undefined,
      { isSemiGuided: true, targetTagDesignated: true },
    );

    expect(result.finalToHit).toBe(4);
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Target Movement (TMM)',
        value: 2,
        source: 'target_movement',
      }),
    );
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Semi-guided TAG target movement',
        value: -2,
        source: 'equipment',
      }),
    );
  });

  it('should not cancel target movement when ECM suppresses TAG guidance', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({
      movementType: MovementType.Walk,
      hexesMoved: 5,
    });
    const result = calculateToHit(
      attacker,
      target,
      RangeBracket.Short,
      3,
      0,
      undefined,
      {
        isSemiGuided: true,
        targetTagDesignated: true,
        targetEcmProtected: true,
      },
    );

    expect(result.finalToHit).toBe(6);
    expect(
      result.modifiers.some((modifier) =>
        modifier.name.includes('Semi-guided TAG'),
      ),
    ).toBe(false);
  });

  it('should include target evasion modifier for explicit evading targets', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ isEvading: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    expect(result.finalToHit).toBe(5);
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Target Evasion',
        value: 1,
        source: 'target_movement',
      }),
    );
  });

  it('should consume explicit Skilled Evasion target bonuses', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({
      isEvading: true,
      evasionBonus: 3,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    expect(result.finalToHit).toBe(7);
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Target Evasion',
        value: 3,
        source: 'target_movement',
      }),
    );
  });

  it('should suppress explicit zero Skilled Evasion target bonuses', () => {
    const modifier = calculateTargetEvasionModifier(true, false, 0);

    expect(modifier).toBeNull();
  });

  it('should suppress target evasion while the target is prone', () => {
    const modifier = calculateTargetEvasionModifier(true, true);

    expect(modifier).toBeNull();
  });

  it('should include source-backed target sprinted relief', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState({ sprintedThisTurn: true });
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    expect(result.finalToHit).toBe(3);
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Target Sprinted',
        value: -1,
        source: 'target_movement',
      }),
    );
  });

  it('should omit target sprinted relief unless explicit sprint state is set', () => {
    const modifier = calculateTargetSprintedModifier(false);

    expect(modifier).toBeNull();
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

    // Gunnery 4 + Min range penalty 4 = 8
    expect(result.finalToHit).toBe(8);
  });

  it('should apply semi-guided TAG indirect-fire relief as a separate modifier', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      indirectFire: { isIndirect: true, spotterWalked: false },
    });
    const target = createTestTargetState();
    const result = calculateToHit(
      attacker,
      target,
      RangeBracket.Short,
      3,
      0,
      undefined,
      {
        isSemiGuided: true,
        targetTagDesignated: true,
        isIndirectFire: true,
      },
    );

    expect(result.finalToHit).toBe(4);
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({ name: 'Indirect Fire', value: 1 }),
    );
    expect(result.modifiers).toContainEqual(
      expect.objectContaining({
        name: 'Semi-guided TAG indirect fire',
        value: -1,
        source: 'equipment',
      }),
    );
  });
});
