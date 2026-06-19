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

describe('Side Torso → Arm Destruction Cascade', () => {
  describe('applyDamageToLocation cascade', () => {
    it('should destroy left arm when left torso is destroyed', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_torso: 0 },
        structure: { ...createTestState().structure, left_torso: 3 },
      });

      const { state: newState } = applyDamageToLocation(
        state,
        'left_torso',
        10,
      );

      expect(newState.destroyedLocations).toContain('left_torso');
      expect(newState.destroyedLocations).toContain('left_arm');
      expect(newState.armor['left_arm']).toBe(0);
      expect(newState.structure['left_arm']).toBe(0);
    });

    it('should destroy right arm when right torso is destroyed', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, right_torso: 0 },
        structure: { ...createTestState().structure, right_torso: 3 },
      });

      const { state: newState } = applyDamageToLocation(
        state,
        'right_torso',
        10,
      );

      expect(newState.destroyedLocations).toContain('right_torso');
      expect(newState.destroyedLocations).toContain('right_arm');
      expect(newState.armor['right_arm']).toBe(0);
      expect(newState.structure['right_arm']).toBe(0);
    });

    it('should not cascade when arm is already destroyed', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_torso: 0, left_arm: 0 },
        structure: {
          ...createTestState().structure,
          left_torso: 3,
          left_arm: 0,
        },
        destroyedLocations: ['left_arm'],
      });

      const { state: newState } = applyDamageToLocation(
        state,
        'left_torso',
        10,
      );

      expect(newState.destroyedLocations).toContain('left_torso');
      expect(newState.destroyedLocations).toContain('left_arm');
      expect(
        newState.destroyedLocations.filter((l) => l === 'left_arm'),
      ).toHaveLength(1);
    });

    it('should cascade from rear side torso damage', () => {
      const state = createTestState({
        rearArmor: { ...createTestState().rearArmor, right_torso: 0 },
        structure: { ...createTestState().structure, right_torso: 2 },
      });

      const { state: newState } = applyDamageToLocation(
        state,
        'right_torso_rear',
        10,
      );

      expect(newState.destroyedLocations).toContain('right_torso_rear');
      expect(newState.destroyedLocations).toContain('right_torso');
      expect(newState.destroyedLocations).toContain('right_arm');
      expect(newState.armor['right_arm']).toBe(0);
      expect(newState.structure['right_arm']).toBe(0);
    });

    it('should not cascade when non-torso location is destroyed', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 0 },
        structure: { ...createTestState().structure, left_arm: 3 },
      });

      const { state: newState } = applyDamageToLocation(state, 'left_arm', 10);

      expect(newState.destroyedLocations).toContain('left_arm');
      expect(newState.destroyedLocations).not.toContain('left_torso');
    });

    it('should not cascade when center torso is destroyed', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, center_torso: 0 },
        structure: { ...createTestState().structure, center_torso: 3 },
      });

      const { state: newState } = applyDamageToLocation(
        state,
        'center_torso',
        10,
      );

      expect(newState.destroyedLocations).toContain('center_torso');
      expect(newState.destroyedLocations).not.toContain('left_arm');
      expect(newState.destroyedLocations).not.toContain('right_arm');
    });
  });

  describe('applyDamageWithTransfer cascade', () => {
    it('should cascade arm destruction during transfer chain through side torso', () => {
      const state = createTestState({
        armor: {
          ...createTestState().armor,
          left_leg: 0,
          left_torso: 0,
        },
        structure: {
          ...createTestState().structure,
          left_leg: 1,
          left_torso: 1,
        },
      });

      const { state: newState } = applyDamageWithTransfer(
        state,
        'left_leg',
        10,
      );

      expect(newState.destroyedLocations).toContain('left_leg');
      expect(newState.destroyedLocations).toContain('left_torso');
      expect(newState.destroyedLocations).toContain('left_arm');
      expect(newState.armor['left_arm']).toBe(0);
      expect(newState.structure['left_arm']).toBe(0);
    });
  });

  describe('resolveDamage cascade', () => {
    it('should cascade arm destruction in full damage resolution', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, right_torso: 0 },
        structure: { ...createTestState().structure, right_torso: 2 },
      });

      const { state: newState, result } = resolveDamage(
        state,
        'right_torso',
        10,
      );

      expect(newState.destroyedLocations).toContain('right_torso');
      expect(newState.destroyedLocations).toContain('right_arm');
      expect(newState.armor['right_arm']).toBe(0);
      expect(newState.structure['right_arm']).toBe(0);
      expect(result.locationDamages[0].destroyed).toBe(true);
    });

    it('should preserve arm armor/structure values when torso not destroyed', () => {
      const state = createTestState();

      const { state: newState } = resolveDamage(state, 'left_torso', 5);

      expect(newState.destroyedLocations).not.toContain('left_arm');
      expect(newState.armor['left_arm']).toBe(10);
      expect(newState.structure['left_arm']).toBe(8);
    });
  });
});
