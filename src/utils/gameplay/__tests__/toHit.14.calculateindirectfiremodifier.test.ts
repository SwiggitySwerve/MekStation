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

describe('calculateIndirectFireModifier', () => {
  it('should return null when not indirect fire', () => {
    const info: IIndirectFire = { isIndirect: false, spotterWalked: false };
    expect(calculateIndirectFireModifier(info)).toBeNull();
  });

  it('should return +1 for indirect fire with stationary spotter', () => {
    const info: IIndirectFire = { isIndirect: true, spotterWalked: false };
    const mod = calculateIndirectFireModifier(info);
    expect(mod?.value).toBe(1);
  });

  it('should return +2 for indirect fire with walking spotter', () => {
    const info: IIndirectFire = { isIndirect: true, spotterWalked: true };
    const mod = calculateIndirectFireModifier(info);
    expect(mod?.value).toBe(2);
  });

  it('should set source to other', () => {
    const info: IIndirectFire = { isIndirect: true, spotterWalked: false };
    expect(calculateIndirectFireModifier(info)?.source).toBe('other');
  });

  it('should include spotter info in description when walked', () => {
    const info: IIndirectFire = { isIndirect: true, spotterWalked: true };
    expect(calculateIndirectFireModifier(info)?.description).toContain(
      'spotter',
    );
  });
});

describe('calculateCalledShotModifier', () => {
  it('should return null when not a called shot', () => {
    expect(calculateCalledShotModifier({ calledShot: false })).toBeNull();
  });

  it('should return +3 for called shot', () => {
    const mod = calculateCalledShotModifier({ calledShot: true });
    expect(mod?.value).toBe(3);
  });

  it('should set source to other', () => {
    expect(calculateCalledShotModifier({ calledShot: true })?.source).toBe(
      'other',
    );
  });

  it('should set name to Called Shot', () => {
    expect(calculateCalledShotModifier({ calledShot: true })?.name).toBe(
      'Called Shot',
    );
  });

  it('should return +0 when teammate designated called shot', () => {
    const mod = calculateCalledShotModifier({
      calledShot: true,
      teammateCalledShot: true,
    });
    expect(mod?.value).toBe(0);
    expect(mod?.description).toContain('teammate spotter');
  });

  it('should return +3 without teammate and without Sharpshooter', () => {
    const mod = calculateCalledShotModifier({
      calledShot: true,
      teammateCalledShot: false,
    });
    expect(mod?.value).toBe(3);
  });

  it('should return +2 with Sharpshooter SPA and no teammate', () => {
    const mod = calculateCalledShotModifier({
      calledShot: true,
      teammateCalledShot: false,
      abilities: ['sharpshooter'],
    });
    expect(mod?.value).toBe(2);
    expect(mod?.description).toContain('Sharpshooter');
  });

  it('should return +2 with canonical Marksman SPA and no teammate', () => {
    const mod = calculateCalledShotModifier({
      calledShot: true,
      teammateCalledShot: false,
      abilities: ['marksman'],
    });
    expect(mod?.value).toBe(2);
    expect(mod?.description).toContain('Marksman');
  });

  it('should return +0 with both teammate and Sharpshooter', () => {
    const mod = calculateCalledShotModifier({
      calledShot: true,
      teammateCalledShot: true,
      abilities: ['sharpshooter'],
    });
    expect(mod?.value).toBe(0);
  });

  it('should return null when calledShot is false even with teammate', () => {
    expect(
      calculateCalledShotModifier({
        calledShot: false,
        teammateCalledShot: true,
      }),
    ).toBeNull();
  });
});

// =============================================================================
// Teammate Called Shot Integration Tests
// =============================================================================

describe('calculateToHit with teammate called shot', () => {
  it('should apply +0 called shot penalty when teammate designates', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      calledShot: true,
      teammateCalledShot: true,
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    expect(result.finalToHit).toBe(4);
    const calledMod = result.modifiers.find((m) => m.name === 'Called Shot');
    expect(calledMod).toBeDefined();
    expect(calledMod?.value).toBe(0);
  });

  it('should apply +3 called shot penalty without teammate', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      calledShot: true,
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    expect(result.finalToHit).toBe(7);
  });

  it('should apply +2 with Sharpshooter and no teammate', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      calledShot: true,
      abilities: ['sharpshooter'],
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    const calledMod = result.modifiers.find((m) => m.name === 'Called Shot');
    expect(calledMod?.value).toBe(2);
  });

  it('should apply +2 with canonical Marksman and no teammate', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      calledShot: true,
      abilities: ['marksman'],
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    const calledMod = result.modifiers.find((m) => m.name === 'Called Shot');
    expect(calledMod?.value).toBe(2);
  });

  it('should apply +0 with Sharpshooter and teammate (no additional effect)', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      calledShot: true,
      teammateCalledShot: true,
      abilities: ['sharpshooter'],
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    const calledMod = result.modifiers.find((m) => m.name === 'Called Shot');
    expect(calledMod?.value).toBe(0);
    expect(result.finalToHit).toBe(4);
  });

  it('should not add called shot modifier when calledShot is false', () => {
    const attacker = createTestAttackerState({
      gunnery: 4,
      teammateCalledShot: true,
    });
    const target = createTestTargetState();
    const result = calculateToHit(attacker, target, RangeBracket.Short, 3);
    expect(result.modifiers.some((m) => m.name === 'Called Shot')).toBe(false);
  });
});
