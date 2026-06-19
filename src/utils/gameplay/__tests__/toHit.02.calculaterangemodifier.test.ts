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
// calculateRangeModifier Tests
// =============================================================================

describe('calculateRangeModifier', () => {
  const shortRange = 3;
  const mediumRange = 6;
  const longRange = 15;

  describe('short range', () => {
    it('should return +0 for range 1', () => {
      const modifier = calculateRangeModifier(
        1,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(0);
    });

    it('should return +0 for range equal to short range', () => {
      const modifier = calculateRangeModifier(
        3,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(0);
    });

    it('should include "short" in name (case-insensitive)', () => {
      const modifier = calculateRangeModifier(
        2,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('short');
    });
  });

  describe('medium range', () => {
    it('should return +2 for range just beyond short', () => {
      const modifier = calculateRangeModifier(
        4,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(2);
    });

    it('should return +2 for range equal to medium range', () => {
      const modifier = calculateRangeModifier(
        6,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(2);
    });

    it('should include "medium" in name (case-insensitive)', () => {
      const modifier = calculateRangeModifier(
        5,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('medium');
    });
  });

  describe('long range', () => {
    it('should return +4 for range just beyond medium', () => {
      const modifier = calculateRangeModifier(
        7,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(4);
    });

    it('should return +4 for range equal to long range', () => {
      const modifier = calculateRangeModifier(
        15,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(4);
    });

    it('should include "long" in name (case-insensitive)', () => {
      const modifier = calculateRangeModifier(
        10,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('long');
    });
  });

  describe('out of range', () => {
    it('should return Infinity for range beyond long', () => {
      const modifier = calculateRangeModifier(
        16,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(Infinity);
    });

    it('should include "out_of_range" in name', () => {
      const modifier = calculateRangeModifier(
        20,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.name.toLowerCase()).toContain('out_of_range');
    });
  });

  it('should set source to "range"', () => {
    const modifier = calculateRangeModifier(
      5,
      shortRange,
      mediumRange,
      longRange,
    );
    expect(modifier.source).toBe('range');
  });

  it('should include actual range in description', () => {
    const modifier = calculateRangeModifier(
      7,
      shortRange,
      mediumRange,
      longRange,
    );
    expect(modifier.description).toContain('7');
  });

  describe('extreme range', () => {
    it('should return +6 for range just beyond long when extreme provided', () => {
      const modifier = calculateRangeModifier(
        16,
        shortRange,
        mediumRange,
        longRange,
        30,
      );
      expect(modifier.value).toBe(6);
    });

    it('should return +6 for range equal to extreme range', () => {
      const modifier = calculateRangeModifier(
        30,
        shortRange,
        mediumRange,
        longRange,
        30,
      );
      expect(modifier.value).toBe(6);
    });

    it('should include "extreme" in name (case-insensitive)', () => {
      const modifier = calculateRangeModifier(
        20,
        shortRange,
        mediumRange,
        longRange,
        30,
      );
      expect(modifier.name.toLowerCase()).toContain('extreme');
    });

    it('should return Infinity for range beyond extreme', () => {
      const modifier = calculateRangeModifier(
        31,
        shortRange,
        mediumRange,
        longRange,
        30,
      );
      expect(modifier.value).toBe(Infinity);
    });

    it('should return Infinity when extreme range not provided and beyond long', () => {
      const modifier = calculateRangeModifier(
        16,
        shortRange,
        mediumRange,
        longRange,
      );
      expect(modifier.value).toBe(Infinity);
    });
  });
});
