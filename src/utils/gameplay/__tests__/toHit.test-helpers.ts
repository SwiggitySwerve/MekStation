import type {
  IActuatorDamage,
  IAttackerState,
  ICombatContext,
  IIndirectFire,
  ISecondaryTarget,
  ITargetState,
  IToHitModifierDetail,
} from '@/types/gameplay';
import type { ITerrainFeature } from '@/types/gameplay/TerrainTypes';

import { FiringArc, MovementType, RangeBracket } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  ATTACKER_MOVEMENT_MODIFIERS,
  HEAT_THRESHOLDS,
  PROBABILITY_TABLE,
  RANGE_MODIFIERS,
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
  formatToHitBreakdown,
  getProbability,
  getRangeBracket,
  getRangeModifierForBracket,
  getTerrainToHitModifier,
  simpleToHit,
} from '../toHit';

export type {
  IActuatorDamage,
  IAttackerState,
  ICombatContext,
  IIndirectFire,
  ISecondaryTarget,
  ITargetState,
  IToHitModifierDetail,
  ITerrainFeature,
};

export {
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
  formatToHitBreakdown,
  getProbability,
  getRangeBracket,
  getRangeModifierForBracket,
  getTerrainToHitModifier,
  simpleToHit,
};

export function createTestAttackerState(
  overrides: Partial<IAttackerState> = {},
): IAttackerState {
  return {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
    ...overrides,
  };
}

export function createTestTargetState(
  overrides: Partial<ITargetState> = {},
): ITargetState {
  return {
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    prone: false,
    immobile: false,
    partialCover: false,
    ...overrides,
  };
}

export function createTestCombatContext(
  overrides: Partial<ICombatContext> = {},
): ICombatContext {
  return {
    attacker: createTestAttackerState(),
    target: createTestTargetState(),
    range: 3,
    arc: FiringArc.Front,
    environmental: [],
    ...overrides,
  };
}
