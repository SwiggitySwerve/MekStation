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
// calculateHeatModifier Tests
// =============================================================================

describe('calculateHeatModifier', () => {
  describe('no heat penalty (0-7)', () => {
    it('should return +0 for heat 0', () => {
      const modifier = calculateHeatModifier(0);
      expect(modifier.value).toBe(0);
    });

    it('should return +0 for heat 7', () => {
      const modifier = calculateHeatModifier(7);
      expect(modifier.value).toBe(0);
    });

    it('should have "No heat penalty" description for heat 0', () => {
      const modifier = calculateHeatModifier(0);
      expect(modifier.description?.toLowerCase()).toContain('no heat');
    });
  });

  describe('+1 heat penalty (8-12)', () => {
    it('should return +1 for heat 8', () => {
      const modifier = calculateHeatModifier(8);
      expect(modifier.value).toBe(1);
    });

    it('should return +1 for heat 12', () => {
      const modifier = calculateHeatModifier(12);
      expect(modifier.value).toBe(1);
    });
  });

  describe('+2 heat penalty (13-16)', () => {
    it('should return +2 for heat 13', () => {
      const modifier = calculateHeatModifier(13);
      expect(modifier.value).toBe(2);
    });

    it('should return +2 for heat 16', () => {
      const modifier = calculateHeatModifier(16);
      expect(modifier.value).toBe(2);
    });
  });

  describe('+3 heat penalty (17-23)', () => {
    it('should return +3 for heat 17', () => {
      const modifier = calculateHeatModifier(17);
      expect(modifier.value).toBe(3);
    });

    it('should return +3 for heat 23', () => {
      const modifier = calculateHeatModifier(23);
      expect(modifier.value).toBe(3);
    });
  });

  describe('+4 heat penalty (24+)', () => {
    it('should return +4 for heat 24', () => {
      const modifier = calculateHeatModifier(24);
      expect(modifier.value).toBe(4);
    });

    it('should return +4 for very high heat', () => {
      const modifier = calculateHeatModifier(30);
      expect(modifier.value).toBe(4);
    });
  });

  it('should set source to "heat"', () => {
    const modifier = calculateHeatModifier(5);
    expect(modifier.source).toBe('heat');
  });

  it('should set name to "Heat"', () => {
    const modifier = calculateHeatModifier(5);
    expect(modifier.name).toBe('Heat');
  });

  it('should include heat value in description for non-zero heat', () => {
    const modifier = calculateHeatModifier(10);
    expect(modifier.description).toContain('10');
  });
});

// =============================================================================
// calculateMinimumRangeModifier Tests
// =============================================================================

describe('calculateMinimumRangeModifier', () => {
  describe('no minimum range', () => {
    it('should return null when minRange is 0', () => {
      const modifier = calculateMinimumRangeModifier(1, 0);
      expect(modifier).toBeNull();
    });

    it('should return null when minRange is negative', () => {
      const modifier = calculateMinimumRangeModifier(1, -1);
      expect(modifier).toBeNull();
    });
  });

  describe('target outside minimum range', () => {
    it('should return +1 when range equals minRange', () => {
      const modifier = calculateMinimumRangeModifier(3, 3);
      expect(modifier?.value).toBe(1);
    });

    it('should return null when range exceeds minRange', () => {
      const modifier = calculateMinimumRangeModifier(5, 3);
      expect(modifier).toBeNull();
    });
  });

  describe('target inside minimum range', () => {
    it('should return +1 for 1 hex under minimum', () => {
      const modifier = calculateMinimumRangeModifier(2, 3);
      expect(modifier?.value).toBe(2);
    });

    it('should return +4 for 3 hexes under minimum plus the canonical +1', () => {
      const modifier = calculateMinimumRangeModifier(0, 3);
      expect(modifier?.value).toBe(4);
    });

    it('should return +6 for LRM with minRange 6 at range 1', () => {
      const modifier = calculateMinimumRangeModifier(1, 6);
      expect(modifier?.value).toBe(6);
    });
  });

  it('should set source to "range"', () => {
    const modifier = calculateMinimumRangeModifier(1, 3);
    expect(modifier?.source).toBe('range');
  });

  it('should set name to "Minimum Range"', () => {
    const modifier = calculateMinimumRangeModifier(1, 3);
    expect(modifier?.name).toBe('Minimum Range');
  });

  it('should include minimum range value in description', () => {
    const modifier = calculateMinimumRangeModifier(1, 6);
    expect(modifier?.description).toContain('6');
  });
});

// =============================================================================
// calculateProneModifier Tests
// =============================================================================

describe('calculateProneModifier', () => {
  describe('target not prone', () => {
    it('should return null when target is not prone', () => {
      const modifier = calculateProneModifier(false, 1);
      expect(modifier).toBeNull();
    });

    it('should return null at any range when not prone', () => {
      expect(calculateProneModifier(false, 0)).toBeNull();
      expect(calculateProneModifier(false, 5)).toBeNull();
      expect(calculateProneModifier(false, 10)).toBeNull();
    });
  });

  describe('target prone at close range (adjacent)', () => {
    it('should return -2 for prone target at range 0', () => {
      const modifier = calculateProneModifier(true, 0);
      expect(modifier?.value).toBe(-2);
    });

    it('should return -2 for prone target at range 1 (adjacent)', () => {
      const modifier = calculateProneModifier(true, 1);
      expect(modifier?.value).toBe(-2);
    });

    it('should include "close range" in description', () => {
      const modifier = calculateProneModifier(true, 1);
      expect(modifier?.description?.toLowerCase()).toContain('close');
    });
  });

  describe('target prone at range', () => {
    it('should return +1 for prone target at range 2', () => {
      const modifier = calculateProneModifier(true, 2);
      expect(modifier?.value).toBe(1);
    });

    it('should return +1 for prone target at long range', () => {
      const modifier = calculateProneModifier(true, 10);
      expect(modifier?.value).toBe(1);
    });

    it('should include "at range" in description', () => {
      const modifier = calculateProneModifier(true, 5);
      expect(modifier?.description?.toLowerCase()).toContain('range');
    });
  });

  it('should set source to "other"', () => {
    const modifier = calculateProneModifier(true, 1);
    expect(modifier?.source).toBe('other');
  });

  it('should include "Prone" in name', () => {
    const modifier = calculateProneModifier(true, 1);
    expect(modifier?.name).toContain('Prone');
  });
});
