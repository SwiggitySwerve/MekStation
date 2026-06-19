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
// Phase 10: Integration Tests — calculateToHit with new modifiers
// =============================================================================

describe('calculateToHit with Phase 10 modifiers', () => {
  it('should apply pilot wound penalty', () => {
    const attacker = createTestAttackerState({ gunnery: 4, pilotWounds: 2 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + wounds 2 = 6
    expect(result.finalToHit).toBe(6);
    expect(result.modifiers.some((m) => m.name === 'Pilot Wounds')).toBe(true);
  });

  it('should apply sensor damage penalty', () => {
    const attacker = createTestAttackerState({ gunnery: 4, sensorHits: 1 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + sensor 1 = 5
    expect(result.finalToHit).toBe(5);
    expect(result.modifiers.some((m) => m.name === 'Sensor Damage')).toBe(true);
  });

  it('should apply actuator damage penalty', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      actuatorDamage: {
        shoulderDestroyed: true,
        upperArmDestroyed: false,
        lowerArmDestroyed: true,
      },
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + shoulder 4 + lower arm 1 = 9
    expect(result.finalToHit).toBe(9);
    expect(result.modifiers.some((m) => m.name === 'Actuator Damage')).toBe(
      true,
    );
  });

  it('should apply targeting computer bonus', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      targetingComputer: true,
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + TC -1 = 3
    expect(result.finalToHit).toBe(3);
    expect(result.modifiers.some((m) => m.name === 'Targeting Computer')).toBe(
      true,
    );
  });

  it('should apply attacker prone penalty', () => {
    const attacker = createTestAttackerState({ gunnery: 4, prone: true });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + prone 2 = 6
    expect(result.finalToHit).toBe(6);
    expect(result.modifiers.some((m) => m.name === 'Attacker Prone')).toBe(
      true,
    );
  });

  it('should apply attacker spotting penalty', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      isSpotting: true,
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);

    expect(result.finalToHit).toBe(5);
    expect(result.modifiers.some((m) => m.name === 'Attacker Spotting')).toBe(
      true,
    );
  });

  it('should apply secondary target penalty (front arc)', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      secondaryTarget: { isSecondary: true, inFrontArc: true },
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + secondary 1 = 5
    expect(result.finalToHit).toBe(5);
  });

  it('should apply secondary target penalty (other arc)', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      secondaryTarget: { isSecondary: true, inFrontArc: false },
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + secondary 2 = 6
    expect(result.finalToHit).toBe(6);
  });

  it('should apply indirect fire penalty (base)', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      indirectFire: { isIndirect: true, spotterWalked: false },
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + indirect 1 = 5
    expect(result.finalToHit).toBe(5);
  });

  it('should apply indirect fire penalty (spotter walked)', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      indirectFire: { isIndirect: true, spotterWalked: true },
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + indirect 2 = 6
    expect(result.finalToHit).toBe(6);
  });

  it('should apply called shot penalty', () => {
    const attacker = createTestAttackerState({ gunnery: 4, calledShot: true });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + called 3 = 7
    expect(result.finalToHit).toBe(7);
    expect(result.modifiers.some((m) => m.name === 'Called Shot')).toBe(true);
  });

  it('should combine all new modifiers together', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      pilotWounds: 1,
      sensorHits: 1,
      targetingComputer: true,
      prone: true,
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Gunnery 4 + wounds 1 + sensor 1 + TC -1 + prone 2 = 7
    expect(result.finalToHit).toBe(7);
  });

  it('should not apply optional modifiers when not set', () => {
    const attacker = createTestAttackerState({ gunnery: 4 });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    // Should be same as before: just Gunnery 4
    expect(result.finalToHit).toBe(4);
    expect(result.modifiers.some((m) => m.name === 'Pilot Wounds')).toBe(false);
    expect(result.modifiers.some((m) => m.name === 'Sensor Damage')).toBe(
      false,
    );
    expect(result.modifiers.some((m) => m.name === 'Actuator Damage')).toBe(
      false,
    );
    expect(result.modifiers.some((m) => m.name === 'Targeting Computer')).toBe(
      false,
    );
    expect(result.modifiers.some((m) => m.name === 'Attacker Prone')).toBe(
      false,
    );
    expect(result.modifiers.some((m) => m.name === 'Secondary Target')).toBe(
      false,
    );
    expect(result.modifiers.some((m) => m.name === 'Indirect Fire')).toBe(
      false,
    );
    expect(result.modifiers.some((m) => m.name === 'Called Shot')).toBe(false);
  });

  it('should make shot impossible with many stacking penalties', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      movementType: MovementType.Jump,
      pilotWounds: 3,
      sensorHits: 2,
      calledShot: true,
    });
    const target = createTestTargetState({
      movementType: MovementType.Run,
      hexesMoved: 8,
    });
    const result = calculateToHit(attacker, target, RangeBracket.Medium, 5);
    // Gunnery 4 + Medium 2 + Jump 3 + TMM 3 + wounds 3 + sensor 2 + called 3 = 20 -> capped 13
    expect(result.finalToHit).toBe(13);
    expect(result.impossible).toBe(true);
  });
});
