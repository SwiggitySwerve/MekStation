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

describe('applyDamageWithTransfer', () => {
  it('should apply damage without transfer if no destruction', () => {
    const state = createTestState();
    const { results } = applyDamageWithTransfer(state, 'center_torso', 5);

    expect(results.length).toBe(1);
    expect(results[0].armorDamage).toBe(5);
    expect(results[0].transferredDamage).toBe(0);
  });

  it('should return empty results for zero damage', () => {
    const state = createTestState();
    const { state: newState, results } = applyDamageWithTransfer(
      state,
      'center_torso',
      0,
    );

    // Zero damage doesn't enter the loop, so no results
    expect(results.length).toBe(0);
    // State should be unchanged
    expect(newState).toBe(state);
  });

  it('should handle damage transfer from arm to torso', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, left_arm: 2 },
      structure: { ...createTestState().structure, left_arm: 3 },
    });

    // 20 damage: 2 armor + 3 structure = 5, then 15 transfers to left torso
    const { state: newState, results } = applyDamageWithTransfer(
      state,
      'left_arm',
      20,
    );

    expect(results.length).toBe(2);

    // First result: arm destruction
    expect(results[0].location).toBe('left_arm');
    expect(results[0].armorDamage).toBe(2);
    expect(results[0].structureDamage).toBe(3);
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(15);

    // Second result: torso takes transferred damage
    expect(results[1].location).toBe('left_torso');
    expect(results[1].damage).toBe(15);

    expect(newState.destroyedLocations).toContain('left_arm');
  });

  it('should handle multiple transfer steps (arm -> torso -> CT)', () => {
    const state = createTestState({
      armor: {
        ...createTestState().armor,
        left_arm: 0,
        left_torso: 0,
      },
      structure: {
        ...createTestState().structure,
        left_arm: 2,
        left_torso: 3,
      },
    });

    // 15 damage: 2 arm structure -> 13 transfer -> 3 torso structure -> 10 to CT
    const { results } = applyDamageWithTransfer(state, 'left_arm', 15);

    expect(results.length).toBe(3);
    expect(results[0].location).toBe('left_arm');
    expect(results[1].location).toBe('left_torso');
    expect(results[2].location).toBe('center_torso');
  });

  it('should handle transfer chain from leg to CT', () => {
    const state = createTestState({
      armor: {
        ...createTestState().armor,
        right_leg: 0,
        right_torso: 0,
      },
      structure: {
        ...createTestState().structure,
        right_leg: 2,
        right_torso: 3,
      },
    });

    const { results } = applyDamageWithTransfer(state, 'right_leg', 20);

    expect(results.length).toBe(3);
    expect(results[0].location).toBe('right_leg');
    expect(results[1].location).toBe('right_torso');
    expect(results[2].location).toBe('center_torso');
  });

  it('should stop transfer chain at head', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, head: 0 },
      structure: { ...createTestState().structure, head: 2 },
    });

    const { results } = applyDamageWithTransfer(state, 'head', 10);

    expect(results.length).toBe(1);
    expect(results[0].location).toBe('head');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(0);
  });

  it('should stop transfer chain at center torso', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, center_torso: 0 },
      structure: { ...createTestState().structure, center_torso: 5 },
    });

    const { results } = applyDamageWithTransfer(state, 'center_torso', 20);

    expect(results.length).toBe(1);
    expect(results[0].location).toBe('center_torso');
    expect(results[0].destroyed).toBe(true);
    expect(results[0].transferredDamage).toBe(0);
  });

  it('should handle damage starting from already destroyed location', () => {
    const state = createTestState({
      destroyedLocations: ['left_arm'],
    });

    const { results } = applyDamageWithTransfer(state, 'left_arm', 10);

    expect(results.length).toBe(2);
    expect(results[0].location).toBe('left_arm');
    expect(results[0].transferredDamage).toBe(10);
    expect(results[1].location).toBe('left_torso');
  });

  it('should track multiple destroyed locations', () => {
    const state = createTestState({
      armor: {
        ...createTestState().armor,
        right_arm: 0,
        right_torso: 0,
      },
      structure: {
        ...createTestState().structure,
        right_arm: 1,
        right_torso: 1,
      },
    });

    const { state: newState } = applyDamageWithTransfer(state, 'right_arm', 10);

    expect(newState.destroyedLocations).toContain('right_arm');
    expect(newState.destroyedLocations).toContain('right_torso');
  });

  describe('immutability', () => {
    it('should not mutate original state', () => {
      const state = createTestState();
      const originalArmor = { ...state.armor };

      applyDamageWithTransfer(state, 'left_arm', 50);

      expect(state.armor).toEqual(originalArmor);
    });
  });
});

// =============================================================================
// Critical Hit Tests
// =============================================================================
