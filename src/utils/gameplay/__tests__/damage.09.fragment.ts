/**
 * Damage Application Tests
 *
 * Comprehensive tests for BattleTech damage application mechanics.
 * Tests all exported functions with high coverage.
 */

import type { CombatLocation, IHexTerrain } from '@/types/gameplay';

import { TerrainType } from '@/types/gameplay';

import {
  applyDamageToLocation,
  applyDamageWithTransfer,
  checkCriticalHitTrigger,
  getCriticalHitCount,
  applyPilotDamage,
  checkUnitDestruction,
  resolveDamage,
  applyDamageWithTerrainEffects,
  createDamageState,
  getLocationDamageCapacity,
  getLocationHealthPercent,
  IUnitDamageState,
  STANDARD_STRUCTURE_TABLE,
} from '../damage';
import * as hitLocation from '../hitLocation';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock roll2d6 for deterministic tests
jest.mock('../hitLocation', () => {
  const actual =
    jest.requireActual<typeof import('../hitLocation')>('../hitLocation');
  return {
    ...actual,
    roll2d6: jest.fn(),
  };
});

const mockRoll2d6 = hitLocation.roll2d6 as jest.MockedFunction<
  typeof hitLocation.roll2d6
>;

/**
 * Helper to create a mock dice roll result.
 */
function createMockRoll(die1: number, die2: number) {
  const total = die1 + die2;
  return {
    dice: [die1, die2],
    total,
    isSnakeEyes: total === 2,
    isBoxcars: total === 12,
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Create a test unit damage state with standard values for a 50-ton mech.
 */
function createTestState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    armor: {
      head: 9,
      center_torso: 20,
      left_torso: 15,
      right_torso: 15,
      left_arm: 10,
      right_arm: 10,
      left_leg: 12,
      right_leg: 12,
      // Rear locations have 0 front armor (handled by rearArmor)
      center_torso_rear: 0,
      left_torso_rear: 0,
      right_torso_rear: 0,
    },
    rearArmor: {
      center_torso: 8,
      left_torso: 6,
      right_torso: 6,
    },
    structure: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
      // Rear locations share structure with front
      center_torso_rear: 16,
      left_torso_rear: 12,
      right_torso_rear: 12,
    },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    ...overrides,
  };
}

/**
 * Create minimal armor values for testing.
 */
function createZeroArmor(): Record<CombatLocation, number> {
  return {
    head: 0,
    center_torso: 0,
    left_torso: 0,
    right_torso: 0,
    left_arm: 0,
    right_arm: 0,
    left_leg: 0,
    right_leg: 0,
    center_torso_rear: 0,
    left_torso_rear: 0,
    right_torso_rear: 0,
  };
}

/**
 * Create minimal structure values for testing.
 */
function createMinimalStructure(): Record<CombatLocation, number> {
  return {
    head: 1,
    center_torso: 1,
    left_torso: 1,
    right_torso: 1,
    left_arm: 1,
    right_arm: 1,
    left_leg: 1,
    right_leg: 1,
    center_torso_rear: 1,
    left_torso_rear: 1,
    right_torso_rear: 1,
  };
}

// =============================================================================
// Structure Table Tests
// =============================================================================

describe('applyDamageWithTerrainEffects', () => {
  beforeEach(() => {
    mockRoll2d6.mockClear();
  });

  describe('null terrain (no terrain effects)', () => {
    it('should apply damage normally with null terrain', () => {
      const state = createTestState();
      const { state: newState, result } = applyDamageWithTerrainEffects(
        state,
        'center_torso',
        10,
        null,
      );

      expect(result.locationDamages[0].armorDamage).toBe(10);
      expect(result.locationDamages[0].structureDamage).toBe(0);
      expect(newState.armor['center_torso']).toBe(10);
    });
  });

  describe('clear terrain (no special effects)', () => {
    it('should apply damage normally in clear terrain', () => {
      const state = createTestState();
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Clear, level: 0 }],
      };

      const { state: newState, result } = applyDamageWithTerrainEffects(
        state,
        'left_arm',
        8,
        terrain,
      );

      expect(result.locationDamages[0].armorDamage).toBe(8);
      expect(result.locationDamages[0].structureDamage).toBe(0);
      expect(newState.armor['left_arm']).toBe(2);
    });
  });

  describe('water depth 1 (normal behavior)', () => {
    it('should apply damage normally in shallow water', () => {
      const state = createTestState();
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 1 }],
      };

      const { state: newState, result } = applyDamageWithTerrainEffects(
        state,
        'right_leg',
        10,
        terrain,
      );

      expect(result.locationDamages[0].armorDamage).toBe(10);
      expect(result.locationDamages[0].structureDamage).toBe(0);
      expect(newState.armor['right_leg']).toBe(2);
    });

    it('should not trigger drowning check in water depth 1', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_leg: 0 },
        structure: { ...createTestState().structure, left_leg: 5 },
      });
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 1 }],
      };

      const { result, terrainEffects } = applyDamageWithTerrainEffects(
        state,
        'left_leg',
        10,
        terrain,
      );

      expect(result.locationDamages[0].destroyed).toBe(true);
      expect(terrainEffects).toBeUndefined();
    });
  });

  describe('water depth 2+ with fall trigger', () => {
    it('should trigger drowning check when unit falls in deep water', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(3, 3));
      const state = createTestState({
        armor: { ...createTestState().armor, left_leg: 0 },
        structure: { ...createTestState().structure, left_leg: 3 },
      });
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 2 }],
      };

      const { result, terrainEffects } = applyDamageWithTerrainEffects(
        state,
        'left_leg',
        10,
        terrain,
      );

      expect(result.locationDamages[0].destroyed).toBe(true);
      expect(terrainEffects?.drowningCheckTriggered).toBe(true);
      expect(terrainEffects?.drowningRoll?.total).toBe(6);
      expect(terrainEffects?.drowningCheckPassed).toBe(true);
    });

    it('should apply additional damage on failed drowning PSR', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(2, 2));
      const state = createTestState({
        armor: { ...createTestState().armor, right_leg: 0 },
        structure: { ...createTestState().structure, right_leg: 2 },
      });
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 3 }],
      };

      const { result, terrainEffects } = applyDamageWithTerrainEffects(
        state,
        'right_leg',
        10,
        terrain,
      );

      expect(result.locationDamages[0].destroyed).toBe(true);
      expect(terrainEffects?.drowningCheckTriggered).toBe(true);
      expect(terrainEffects?.drowningCheckPassed).toBe(false);
      expect(terrainEffects?.drowningDamage).toBe(1);
      expect(result.locationDamages.length).toBeGreaterThan(1);
    });

    it('should not trigger drowning if unit does not fall', () => {
      const state = createTestState();
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 2 }],
      };

      const { result, terrainEffects } = applyDamageWithTerrainEffects(
        state,
        'center_torso',
        5,
        terrain,
      );

      expect(result.locationDamages[0].armorDamage).toBe(5);
      expect(result.locationDamages[0].destroyed).toBe(false);
      expect(terrainEffects).toBeUndefined();
    });

    it('should pass drowning check with high PSR roll', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState({
        armor: { ...createTestState().armor, left_leg: 0 },
        structure: { ...createTestState().structure, left_leg: 1 },
      });
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 2 }],
      };

      const { result, terrainEffects } = applyDamageWithTerrainEffects(
        state,
        'left_leg',
        5,
        terrain,
      );

      expect(result.locationDamages[0].destroyed).toBe(true);
      expect(terrainEffects?.drowningCheckTriggered).toBe(true);
      expect(terrainEffects?.drowningCheckPassed).toBe(true);
      expect(terrainEffects?.drowningDamage).toBeUndefined();
    });
  });

  describe('multiple terrain features', () => {
    it('should handle water with other terrain features', () => {
      const state = createTestState();
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [
          { type: TerrainType.Water, level: 2 },
          { type: TerrainType.Rough, level: 1 },
        ],
      };

      const { result } = applyDamageWithTerrainEffects(
        state,
        'right_arm',
        7,
        terrain,
      );

      expect(result.locationDamages[0].armorDamage).toBe(7);
    });
  });

  describe('edge cases', () => {
    it('should handle zero damage with terrain', () => {
      const state = createTestState();
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 2 }],
      };

      const { result } = applyDamageWithTerrainEffects(
        state,
        'head',
        0,
        terrain,
      );

      expect(result.locationDamages.length).toBe(0);
    });

    it('should handle head destruction in deep water', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(1, 1));
      const state = createTestState({
        armor: { ...createTestState().armor, head: 0 },
        structure: { ...createTestState().structure, head: 1 },
      });
      const terrain: IHexTerrain = {
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Water, level: 2 }],
      };

      const { result } = applyDamageWithTerrainEffects(
        state,
        'head',
        5,
        terrain,
      );

      expect(result.unitDestroyed).toBe(true);
      expect(result.destructionCause).toBe('head_destroyed');
    });
  });
});

// =============================================================================
// getLocationDamageCapacity Tests
// =============================================================================
