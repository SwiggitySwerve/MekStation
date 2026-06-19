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
// calculateImmobileModifier Tests
// =============================================================================

describe('calculateImmobileModifier', () => {
  it('should return null when target is not immobile', () => {
    const modifier = calculateImmobileModifier(false);
    expect(modifier).toBeNull();
  });

  it('should return -4 when target is immobile', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.value).toBe(-4);
  });

  it('should set source to "other"', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.source).toBe('other');
  });

  it('should include "Immobile" in name', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.name).toContain('Immobile');
  });

  it('should include "-4" in description', () => {
    const modifier = calculateImmobileModifier(true);
    expect(modifier?.description).toContain('-4');
  });
});

// =============================================================================
// calculatePartialCoverModifier Tests
// =============================================================================

describe('calculatePartialCoverModifier', () => {
  it('should return null when target is not in partial cover', () => {
    const modifier = calculatePartialCoverModifier(false);
    expect(modifier).toBeNull();
  });

  it('should return +1 when target is in partial cover', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.value).toBe(1);
  });

  it('should set source to "terrain"', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.source).toBe('terrain');
  });

  it('should include "Cover" in name', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.name).toContain('Cover');
  });

  it('should include "+1" in description', () => {
    const modifier = calculatePartialCoverModifier(true);
    expect(modifier?.description).toContain('+1');
  });
});
