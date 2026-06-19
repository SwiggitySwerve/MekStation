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
// aggregateModifiers Tests
// =============================================================================

describe('aggregateModifiers', () => {
  it('should sum all modifier values', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 4, source: 'base' },
      { name: 'B', value: 2, source: 'range' },
      { name: 'C', value: 1, source: 'heat' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(7);
  });

  it('should handle negative modifiers', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 6, source: 'base' },
      { name: 'B', value: -4, source: 'other' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(2);
  });

  it('should cap final to-hit at 13', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 10, source: 'base' },
      { name: 'B', value: 6, source: 'range' },
      { name: 'C', value: 5, source: 'heat' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(13);
  });

  it('should mark impossible for final > 12', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 13, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.impossible).toBe(true);
  });

  it('should not mark impossible for final = 12', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 12, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.impossible).toBe(false);
  });

  it('should set probability to 0 for impossible shots', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 15, source: 'base' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.probability).toBe(0);
  });

  it('should use first modifier value as baseToHit', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'Gunnery', value: 4, source: 'base' },
      { name: 'Range', value: 2, source: 'range' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.baseToHit).toBe(4);
  });

  it('should handle empty modifier array', () => {
    const modifiers: IToHitModifierDetail[] = [];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(0);
    expect(result.baseToHit).toBe(0);
    expect(result.impossible).toBe(false);
    expect(result.probability).toBe(1.0);
  });

  it('should preserve all modifiers in result', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'A', value: 4, source: 'base' },
      { name: 'B', value: 2, source: 'range' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.modifiers).toHaveLength(2);
    expect(result.modifiers).toEqual(modifiers);
  });

  it('should handle Infinity modifier (out of range)', () => {
    const modifiers: IToHitModifierDetail[] = [
      { name: 'Gunnery', value: 4, source: 'base' },
      { name: 'Range', value: Infinity, source: 'range' },
    ];
    const result = aggregateModifiers(modifiers);

    expect(result.finalToHit).toBe(13);
    expect(result.impossible).toBe(true);
  });
});

// =============================================================================
// getProbability Tests
// =============================================================================

describe('getProbability', () => {
  it('should return 1.0 for target 2 or below', () => {
    expect(getProbability(2)).toBe(1.0);
    expect(getProbability(1)).toBe(1.0);
    expect(getProbability(0)).toBe(1.0);
    expect(getProbability(-5)).toBe(1.0);
  });

  it('should return 0 for target above 12', () => {
    expect(getProbability(13)).toBe(0);
    expect(getProbability(14)).toBe(0);
    expect(getProbability(100)).toBe(0);
  });

  it('should return correct probability for each standard target', () => {
    expect(getProbability(3)).toBeCloseTo(35 / 36, 6);
    expect(getProbability(4)).toBeCloseTo(33 / 36, 6);
    expect(getProbability(5)).toBeCloseTo(30 / 36, 6);
    expect(getProbability(6)).toBeCloseTo(26 / 36, 6);
    expect(getProbability(7)).toBeCloseTo(21 / 36, 6);
    expect(getProbability(8)).toBeCloseTo(15 / 36, 6);
    expect(getProbability(9)).toBeCloseTo(10 / 36, 6);
    expect(getProbability(10)).toBeCloseTo(6 / 36, 6);
    expect(getProbability(11)).toBeCloseTo(3 / 36, 6);
    expect(getProbability(12)).toBeCloseTo(1 / 36, 6);
  });

  it('should handle edge case target numbers', () => {
    expect(getProbability(2)).toBe(1.0);
    expect(getProbability(12)).toBeCloseTo(1 / 36, 6);
  });
});
