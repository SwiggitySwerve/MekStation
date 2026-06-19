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

describe('calculateSecondaryTargetModifier', () => {
  it('should return null when not a secondary target', () => {
    const info: ISecondaryTarget = { isSecondary: false, inFrontArc: true };
    expect(calculateSecondaryTargetModifier(info)).toBeNull();
  });

  it('should return +1 for secondary target in front arc', () => {
    const info: ISecondaryTarget = { isSecondary: true, inFrontArc: true };
    const mod = calculateSecondaryTargetModifier(info);
    expect(mod?.value).toBe(1);
  });

  it('should return +2 for secondary target in other arc', () => {
    const info: ISecondaryTarget = { isSecondary: true, inFrontArc: false };
    const mod = calculateSecondaryTargetModifier(info);
    expect(mod?.value).toBe(2);
  });

  it('should set source to other', () => {
    const info: ISecondaryTarget = { isSecondary: true, inFrontArc: true };
    expect(calculateSecondaryTargetModifier(info)?.source).toBe('other');
  });

  it('should include arc info in description', () => {
    const front: ISecondaryTarget = { isSecondary: true, inFrontArc: true };
    expect(calculateSecondaryTargetModifier(front)?.description).toContain(
      'front',
    );

    const other: ISecondaryTarget = { isSecondary: true, inFrontArc: false };
    expect(calculateSecondaryTargetModifier(other)?.description).toContain(
      'other',
    );
  });
});

describe('calculateTargetingComputerModifier', () => {
  it('should return null when no targeting computer', () => {
    expect(calculateTargetingComputerModifier(false)).toBeNull();
  });

  it('should return -1 when targeting computer present', () => {
    const mod = calculateTargetingComputerModifier(true);
    expect(mod?.value).toBe(-1);
  });

  it('should set source to equipment', () => {
    expect(calculateTargetingComputerModifier(true)?.source).toBe('equipment');
  });

  it('should set name to Targeting Computer', () => {
    expect(calculateTargetingComputerModifier(true)?.name).toBe(
      'Targeting Computer',
    );
  });
});

describe('calculateSensorDamageModifier', () => {
  it('should return null for 0 sensor hits', () => {
    expect(calculateSensorDamageModifier(0)).toBeNull();
  });

  it('should return null for negative sensor hits', () => {
    expect(calculateSensorDamageModifier(-1)).toBeNull();
  });

  it('should return +1 for 1 sensor hit', () => {
    const mod = calculateSensorDamageModifier(1);
    expect(mod?.value).toBe(1);
  });

  it('should return +2 for 2 sensor hits', () => {
    const mod = calculateSensorDamageModifier(2);
    expect(mod?.value).toBe(2);
  });

  it('should set source to damage', () => {
    expect(calculateSensorDamageModifier(1)?.source).toBe('damage');
  });

  it('should include hit count in description', () => {
    const mod = calculateSensorDamageModifier(3);
    expect(mod?.description).toContain('3');
  });
});

describe('calculateActuatorDamageModifier', () => {
  it('should return null when no actuators damaged', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: false,
      upperArmDestroyed: false,
      lowerArmDestroyed: false,
    };
    expect(calculateActuatorDamageModifier(damage)).toBeNull();
  });

  it('should return +4 for shoulder destroyed', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: true,
      upperArmDestroyed: false,
      lowerArmDestroyed: false,
    };
    expect(calculateActuatorDamageModifier(damage)?.value).toBe(4);
  });

  it('should return +1 for upper arm destroyed', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: false,
      upperArmDestroyed: true,
      lowerArmDestroyed: false,
    };
    expect(calculateActuatorDamageModifier(damage)?.value).toBe(1);
  });

  it('should return +1 for lower arm destroyed', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: false,
      upperArmDestroyed: false,
      lowerArmDestroyed: true,
    };
    expect(calculateActuatorDamageModifier(damage)?.value).toBe(1);
  });

  it('should be cumulative: shoulder + upper arm + lower arm = +6', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: true,
      upperArmDestroyed: true,
      lowerArmDestroyed: true,
    };
    expect(calculateActuatorDamageModifier(damage)?.value).toBe(6);
  });

  it('should be cumulative: upper + lower = +2', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: false,
      upperArmDestroyed: true,
      lowerArmDestroyed: true,
    };
    expect(calculateActuatorDamageModifier(damage)?.value).toBe(2);
  });

  it('should set source to damage', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: true,
      upperArmDestroyed: false,
      lowerArmDestroyed: false,
    };
    expect(calculateActuatorDamageModifier(damage)?.source).toBe('damage');
  });

  it('should list damaged parts in description', () => {
    const damage: IActuatorDamage = {
      shoulderDestroyed: true,
      upperArmDestroyed: true,
      lowerArmDestroyed: false,
    };
    const mod = calculateActuatorDamageModifier(damage);
    expect(mod?.description).toContain('shoulder');
    expect(mod?.description).toContain('upper arm');
  });
});

describe('calculateAttackerProneModifier', () => {
  it('should return null when not prone', () => {
    expect(calculateAttackerProneModifier(false)).toBeNull();
  });

  it('should return +2 when attacker is prone', () => {
    const mod = calculateAttackerProneModifier(true);
    expect(mod?.value).toBe(2);
  });

  it('should set source to other', () => {
    expect(calculateAttackerProneModifier(true)?.source).toBe('other');
  });

  it('should set name to Attacker Prone', () => {
    expect(calculateAttackerProneModifier(true)?.name).toBe('Attacker Prone');
  });
});

describe('calculateSpottingAttackerModifier', () => {
  it('should return null when the attacker is not spotting', () => {
    expect(calculateSpottingAttackerModifier(false)).toBeNull();
    expect(calculateSpottingAttackerModifier()).toBeNull();
  });

  it('should apply +1 when the attacker is spotting', () => {
    const modifier = calculateSpottingAttackerModifier(true);
    expect(modifier).toMatchObject({
      name: 'Attacker Spotting',
      value: 1,
      source: 'other',
    });
  });
});
