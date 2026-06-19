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

describe('checkUnitDestruction', () => {
  describe('already destroyed', () => {
    it('should return destroyed true if already destroyed', () => {
      const state = createTestState({
        destroyed: true,
        destructionCause: 'damage',
      });
      const result = checkUnitDestruction(state);

      expect(result.destroyed).toBe(true);
      expect(result.cause).toBe('damage');
      expect(result.state).toBe(state);
    });

    it('should preserve existing destruction cause', () => {
      const state = createTestState({
        destroyed: true,
        destructionCause: 'ammo_explosion',
      });
      const result = checkUnitDestruction(state);

      expect(result.cause).toBe('ammo_explosion');
    });

    it('should default cause to damage if not specified', () => {
      const state = createTestState({
        destroyed: true,
        destructionCause: undefined,
      });
      const result = checkUnitDestruction(state);

      expect(result.cause).toBe('damage');
    });
  });

  describe('head destruction', () => {
    it('should destroy unit when head is destroyed', () => {
      const state = createTestState({
        destroyedLocations: ['head'],
      });
      const { state: newState, destroyed, cause } = checkUnitDestruction(state);

      expect(destroyed).toBe(true);
      expect(cause).toBe('head_destroyed');
      expect(newState.destroyed).toBe(true);
      expect(newState.destructionCause).toBe('head_destroyed');
    });

    it('should not destroy unit if head is not in destroyed list', () => {
      const state = createTestState({
        destroyedLocations: ['left_arm', 'right_arm'],
      });
      const { destroyed } = checkUnitDestruction(state);

      expect(destroyed).toBe(false);
    });
  });

  describe('center torso destruction', () => {
    it('should destroy unit when center torso is destroyed', () => {
      const state = createTestState({
        destroyedLocations: ['center_torso'],
      });
      const { state: newState, destroyed, cause } = checkUnitDestruction(state);

      expect(destroyed).toBe(true);
      expect(cause).toBe('ct_destroyed');
      expect(newState.destroyed).toBe(true);
      expect(newState.destructionCause).toBe('ct_destroyed');
    });

    it('should not destroy unit if only side torsos are destroyed', () => {
      const state = createTestState({
        destroyedLocations: ['left_torso', 'right_torso'],
      });
      const { destroyed } = checkUnitDestruction(state);

      expect(destroyed).toBe(false);
    });
  });

  describe('cause priority', () => {
    it('should prefer pilot death over fatal location destruction', () => {
      const state = createTestState({
        destroyedLocations: ['head', 'center_torso'],
        pilotWounds: 6,
      });
      const { state: newState, destroyed, cause } = checkUnitDestruction(state);

      expect(destroyed).toBe(true);
      expect(cause).toBe('pilot_death');
      expect(newState.destructionCause).toBe('pilot_death');
    });
  });

  describe('pilot death', () => {
    it('should destroy unit when pilot has 6 wounds', () => {
      const state = createTestState({
        pilotWounds: 6,
      });
      const { state: newState, destroyed, cause } = checkUnitDestruction(state);

      expect(destroyed).toBe(true);
      expect(cause).toBe('pilot_death');
      expect(newState.destroyed).toBe(true);
      expect(newState.destructionCause).toBe('pilot_death');
    });

    it('should destroy unit when pilot has more than 6 wounds', () => {
      const state = createTestState({
        pilotWounds: 8,
      });
      const { destroyed, cause } = checkUnitDestruction(state);

      expect(destroyed).toBe(true);
      expect(cause).toBe('pilot_death');
    });

    it('should not destroy unit if pilot has 5 wounds', () => {
      const state = createTestState({
        pilotWounds: 5,
      });
      const { destroyed } = checkUnitDestruction(state);

      expect(destroyed).toBe(false);
    });
  });

  describe('non-destruction scenarios', () => {
    it('should not destroy unit with limbs destroyed', () => {
      const state = createTestState({
        destroyedLocations: ['left_arm', 'right_arm', 'left_leg', 'right_leg'],
      });
      const { destroyed } = checkUnitDestruction(state);

      expect(destroyed).toBe(false);
    });

    it('should not destroy unit with side torsos and limbs destroyed', () => {
      const state = createTestState({
        destroyedLocations: [
          'left_torso',
          'right_torso',
          'left_arm',
          'right_arm',
        ],
      });
      const { destroyed } = checkUnitDestruction(state);

      expect(destroyed).toBe(false);
    });

    it('should not destroy undamaged unit', () => {
      const state = createTestState();
      const { destroyed } = checkUnitDestruction(state);

      expect(destroyed).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should not mutate original state', () => {
      const state = createTestState({
        destroyedLocations: ['head'],
      });
      const originalDestroyed = state.destroyed;

      checkUnitDestruction(state);

      expect(state.destroyed).toBe(originalDestroyed);
    });

    it('should return same state if no destruction', () => {
      const state = createTestState();
      const { state: newState } = checkUnitDestruction(state);

      expect(newState).toBe(state);
    });

    it('should return new state if destruction detected', () => {
      const state = createTestState({
        destroyedLocations: ['center_torso'],
      });
      const { state: newState } = checkUnitDestruction(state);

      expect(newState).not.toBe(state);
    });
  });
});

// =============================================================================
// resolveDamage Tests
// =============================================================================
