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
// getTerrainToHitModifier Tests
// =============================================================================

describe('getTerrainToHitModifier', () => {
  describe('clear terrain', () => {
    it('should return 0 for clear terrain', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      expect(getTerrainToHitModifier(target, [])).toBe(0);
    });

    it('should return 0 for clear terrain with no intervening', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });
  });

  describe('target in terrain', () => {
    it('should add +1 for target in light woods', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });

    it('should add +2 for target in heavy woods', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.HeavyWoods, level: 2 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(2);
    });

    it('should return -1 for target in water depth 1', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Water, level: 1 }];
      expect(getTerrainToHitModifier(target, [])).toBe(-1);
    });

    it('should add +1 for target in smoke', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Smoke, level: 1 }];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });

    it('should add +1 for target in swamp', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Swamp, level: 1 }];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });
  });

  describe('intervening terrain', () => {
    it('should add +1 per intervening light woods hex', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.LightWoods, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(2);
    });

    it('should add +2 per intervening heavy woods hex', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.HeavyWoods, level: 2 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(2);
    });

    it('should add +1 per intervening smoke hex', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.Smoke, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(1);
    });

    it('should not add modifier for intervening water', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.Water, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });
  });

  describe('combined terrain', () => {
    it('should combine target and intervening modifiers', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
      ];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.HeavyWoods, level: 2 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(4);
    });

    it('should handle multiple intervening hexes with mixed terrain', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
        [{ type: TerrainType.Smoke, level: 1 }],
        [{ type: TerrainType.HeavyWoods, level: 2 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(4);
    });

    it('should handle target in water with intervening woods', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Water, level: 1 }];
      const intervening: ITerrainFeature[][] = [
        [{ type: TerrainType.LightWoods, level: 1 }],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });
  });

  describe('multiple terrain features per hex', () => {
    it('should use highest target modifier when multiple features', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
        { type: TerrainType.Smoke, level: 1 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });

    it('should sum all intervening modifiers from multiple features', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [
        [
          { type: TerrainType.LightWoods, level: 1 },
          { type: TerrainType.Smoke, level: 1 },
        ],
      ];
      expect(getTerrainToHitModifier(target, intervening)).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty target terrain array', () => {
      const target: ITerrainFeature[] = [];
      const intervening: ITerrainFeature[][] = [];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });

    it('should handle empty intervening terrain array', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.LightWoods, level: 1 },
      ];
      const intervening: ITerrainFeature[][] = [];
      expect(getTerrainToHitModifier(target, intervening)).toBe(1);
    });

    it('should handle intervening hexes with no features', () => {
      const target: ITerrainFeature[] = [{ type: TerrainType.Clear, level: 0 }];
      const intervening: ITerrainFeature[][] = [[], []];
      expect(getTerrainToHitModifier(target, intervening)).toBe(0);
    });

    it('should handle negative target modifiers correctly', () => {
      const target: ITerrainFeature[] = [
        { type: TerrainType.Water, level: 1 },
        { type: TerrainType.LightWoods, level: 1 },
      ];
      expect(getTerrainToHitModifier(target, [])).toBe(1);
    });
  });
});

// =============================================================================
// Phase 10: To-Hit Modifier Completion Tests
// =============================================================================

describe('calculatePilotWoundModifier', () => {
  it('should return null for 0 wounds', () => {
    expect(calculatePilotWoundModifier(0)).toBeNull();
  });

  it('should return null for negative wounds', () => {
    expect(calculatePilotWoundModifier(-1)).toBeNull();
  });

  it('should return +1 for 1 wound', () => {
    const mod = calculatePilotWoundModifier(1);
    expect(mod?.value).toBe(1);
    expect(mod?.source).toBe('other');
  });

  it('should return +3 for 3 wounds', () => {
    const mod = calculatePilotWoundModifier(3);
    expect(mod?.value).toBe(3);
  });

  it('should return +5 for 5 wounds', () => {
    const mod = calculatePilotWoundModifier(5);
    expect(mod?.value).toBe(5);
  });

  it('should include wound count in description', () => {
    const mod = calculatePilotWoundModifier(2);
    expect(mod?.description).toContain('2');
    expect(mod?.name).toBe('Pilot Wounds');
  });
});
