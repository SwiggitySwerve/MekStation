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

describe('applyDamageToLocation', () => {
  describe('damage to armor only', () => {
    it('should reduce armor without affecting structure', () => {
      const state = createTestState();
      const { state: newState, result } = applyDamageToLocation(
        state,
        'center_torso',
        5,
      );

      expect(result.armorDamage).toBe(5);
      expect(result.structureDamage).toBe(0);
      expect(result.armorRemaining).toBe(15); // 20 - 5
      expect(result.structureRemaining).toBe(16);
      expect(result.destroyed).toBe(false);
      expect(newState.armor['center_torso']).toBe(15);
    });

    it('should handle damage equal to armor', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 10 },
      });
      const { result } = applyDamageToLocation(state, 'left_arm', 10);

      expect(result.armorDamage).toBe(10);
      expect(result.structureDamage).toBe(0);
      expect(result.armorRemaining).toBe(0);
      expect(result.destroyed).toBe(false);
    });

    it('should handle zero damage', () => {
      const state = createTestState();
      const { state: newState, result } = applyDamageToLocation(
        state,
        'center_torso',
        0,
      );

      expect(result.armorDamage).toBe(0);
      expect(result.structureDamage).toBe(0);
      expect(result.armorRemaining).toBe(20);
      expect(result.structureRemaining).toBe(16);
      expect(result.destroyed).toBe(false);
      expect(newState.armor['center_torso']).toBe(20);
    });

    it('should handle damage to location with zero armor', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 0 },
      });
      const { result } = applyDamageToLocation(state, 'left_arm', 5);

      expect(result.armorDamage).toBe(0);
      expect(result.structureDamage).toBe(5);
      expect(result.armorRemaining).toBe(0);
      expect(result.structureRemaining).toBe(3); // 8 - 5
    });

    it('should handle small damage to head', () => {
      const state = createTestState();
      const { result } = applyDamageToLocation(state, 'head', 3);

      expect(result.armorDamage).toBe(3);
      expect(result.structureDamage).toBe(0);
      expect(result.armorRemaining).toBe(6); // 9 - 3
      expect(result.destroyed).toBe(false);
    });
  });

  describe('damage through armor to structure', () => {
    it('should apply excess damage to structure', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 5 },
      });
      const { state: newState, result } = applyDamageToLocation(
        state,
        'left_arm',
        10,
      );

      expect(result.armorDamage).toBe(5);
      expect(result.structureDamage).toBe(5);
      expect(result.armorRemaining).toBe(0);
      expect(result.structureRemaining).toBe(3); // 8 - 5
      expect(result.destroyed).toBe(false);
      expect(newState.structure['left_arm']).toBe(3);
    });

    it('should correctly calculate damage split between armor and structure', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, right_leg: 7 },
        structure: { ...createTestState().structure, right_leg: 10 },
      });
      const { result } = applyDamageToLocation(state, 'right_leg', 12);

      expect(result.armorDamage).toBe(7);
      expect(result.structureDamage).toBe(5);
      expect(result.armorRemaining).toBe(0);
      expect(result.structureRemaining).toBe(5);
    });
  });

  describe('location destruction', () => {
    it('should destroy location when structure is depleted', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 0 },
        structure: { ...createTestState().structure, left_arm: 5 },
      });
      const { state: newState, result } = applyDamageToLocation(
        state,
        'left_arm',
        10,
      );

      expect(result.structureDamage).toBe(5);
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(5); // 10 - 5 structure
      expect(result.transferLocation).toBe('left_torso');
      expect(newState.destroyedLocations).toContain('left_arm');
    });

    it('should transfer damage from right arm to right torso', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, right_arm: 0 },
        structure: { ...createTestState().structure, right_arm: 3 },
      });
      const { result } = applyDamageToLocation(state, 'right_arm', 10);

      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(7);
      expect(result.transferLocation).toBe('right_torso');
    });

    it('should transfer damage from left leg to left torso', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_leg: 0 },
        structure: { ...createTestState().structure, left_leg: 2 },
      });
      const { result } = applyDamageToLocation(state, 'left_leg', 8);

      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(6);
      expect(result.transferLocation).toBe('left_torso');
    });

    it('should transfer damage from right leg to right torso', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, right_leg: 0 },
        structure: { ...createTestState().structure, right_leg: 4 },
      });
      const { result } = applyDamageToLocation(state, 'right_leg', 10);

      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(6);
      expect(result.transferLocation).toBe('right_torso');
    });

    it('should transfer damage from side torsos to center torso', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_torso: 0 },
        structure: { ...createTestState().structure, left_torso: 5 },
      });
      const { result } = applyDamageToLocation(state, 'left_torso', 15);

      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(10);
      expect(result.transferLocation).toBe('center_torso');
    });

    it('should not transfer damage from destroyed head', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, head: 0 },
        structure: { ...createTestState().structure, head: 2 },
      });
      const { result } = applyDamageToLocation(state, 'head', 10);

      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(0);
      expect(result.transferLocation).toBeUndefined();
    });

    it('should not transfer damage from destroyed center torso', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, center_torso: 0 },
        structure: { ...createTestState().structure, center_torso: 5 },
      });
      const { result } = applyDamageToLocation(state, 'center_torso', 20);

      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(0);
      expect(result.transferLocation).toBeUndefined();
    });

    it('should destroy location exactly when structure reaches zero', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 0 },
        structure: { ...createTestState().structure, left_arm: 5 },
      });
      const { result } = applyDamageToLocation(state, 'left_arm', 5);

      expect(result.structureDamage).toBe(5);
      expect(result.structureRemaining).toBe(0);
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(0);
    });
  });

  describe('already destroyed locations', () => {
    it('should transfer all damage from destroyed location', () => {
      const state = createTestState({
        destroyedLocations: ['left_arm'],
      });
      const { result } = applyDamageToLocation(state, 'left_arm', 10);

      expect(result.armorDamage).toBe(0);
      expect(result.structureDamage).toBe(0);
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(10);
      expect(result.transferLocation).toBe('left_torso');
    });

    it('should not transfer damage from destroyed head', () => {
      const state = createTestState({
        destroyedLocations: ['head'],
      });
      const { result } = applyDamageToLocation(state, 'head', 10);

      expect(result.armorDamage).toBe(0);
      expect(result.structureDamage).toBe(0);
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(0);
    });

    it('should not transfer damage from destroyed center torso', () => {
      const state = createTestState({
        destroyedLocations: ['center_torso'],
      });
      const { result } = applyDamageToLocation(state, 'center_torso', 10);

      expect(result.armorDamage).toBe(0);
      expect(result.structureDamage).toBe(0);
      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(0);
    });

    it('should transfer damage from destroyed leg to torso', () => {
      const state = createTestState({
        destroyedLocations: ['right_leg'],
      });
      const { result } = applyDamageToLocation(state, 'right_leg', 15);

      expect(result.transferredDamage).toBe(15);
      expect(result.transferLocation).toBe('right_torso');
    });
  });

  describe('rear armor', () => {
    it('should apply damage to rear armor for rear locations', () => {
      const state = createTestState();
      const { state: newState, result } = applyDamageToLocation(
        state,
        'center_torso_rear',
        5,
      );

      expect(result.armorDamage).toBe(5);
      expect(result.armorRemaining).toBe(3); // 8 - 5
      expect(newState.rearArmor['center_torso']).toBe(3);
    });

    it('should damage structure when rear armor is depleted', () => {
      const state = createTestState({
        rearArmor: { ...createTestState().rearArmor, left_torso: 3 },
      });
      const { result } = applyDamageToLocation(state, 'left_torso_rear', 8);

      expect(result.armorDamage).toBe(3);
      expect(result.structureDamage).toBe(5);
      expect(result.structureRemaining).toBe(7); // 12 - 5
    });

    it('should destroy location from rear damage', () => {
      const state = createTestState({
        rearArmor: { ...createTestState().rearArmor, right_torso: 0 },
        structure: { ...createTestState().structure, right_torso: 5 },
      });
      const { state: newState, result } = applyDamageToLocation(
        state,
        'right_torso_rear',
        10,
      );

      expect(result.destroyed).toBe(true);
      expect(result.transferredDamage).toBe(5);
      expect(result.transferLocation).toBe('center_torso');
      expect(newState.destroyedLocations).toContain('right_torso_rear');
      expect(newState.destroyedLocations).toContain('right_torso');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original state', () => {
      const state = createTestState();
      const originalArmor = state.armor['center_torso'];
      const originalStructure = state.structure['center_torso'];

      applyDamageToLocation(state, 'center_torso', 25);

      expect(state.armor['center_torso']).toBe(originalArmor);
      expect(state.structure['center_torso']).toBe(originalStructure);
    });

    it('should not mutate destroyed locations array', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 0 },
        structure: { ...createTestState().structure, left_arm: 3 },
      });
      const originalDestroyedLength = state.destroyedLocations.length;

      applyDamageToLocation(state, 'left_arm', 10);

      expect(state.destroyedLocations.length).toBe(originalDestroyedLength);
    });

    it('should return new state object', () => {
      const state = createTestState();
      const { state: newState } = applyDamageToLocation(
        state,
        'center_torso',
        5,
      );

      expect(newState).not.toBe(state);
      expect(newState.armor).not.toBe(state.armor);
    });
  });
});

// =============================================================================
// applyDamageWithTransfer Tests
// =============================================================================
