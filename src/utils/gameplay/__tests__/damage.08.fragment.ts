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

describe('createDamageState', () => {
  const testArmorValues: Record<CombatLocation, number> = {
    head: 9,
    center_torso: 20,
    left_torso: 15,
    right_torso: 15,
    left_arm: 10,
    right_arm: 10,
    left_leg: 12,
    right_leg: 12,
    center_torso_rear: 0,
    left_torso_rear: 0,
    right_torso_rear: 0,
  };

  const testRearArmorValues: Record<
    'center_torso' | 'left_torso' | 'right_torso',
    number
  > = {
    center_torso: 8,
    left_torso: 6,
    right_torso: 6,
  };

  it('should create state with correct armor values', () => {
    const state = createDamageState(50, testArmorValues, testRearArmorValues);

    expect(state.armor.head).toBe(9);
    expect(state.armor.center_torso).toBe(20);
    expect(state.armor.left_arm).toBe(10);
  });

  it('should create state with correct rear armor values', () => {
    const state = createDamageState(50, testArmorValues, testRearArmorValues);

    expect(state.rearArmor.center_torso).toBe(8);
    expect(state.rearArmor.left_torso).toBe(6);
    expect(state.rearArmor.right_torso).toBe(6);
  });

  it('should set structure based on tonnage for 20-ton mech', () => {
    const state = createDamageState(20, testArmorValues, testRearArmorValues);

    expect(state.structure.head).toBe(3);
    expect(state.structure.center_torso).toBe(6);
    expect(state.structure.left_torso).toBe(5);
    expect(state.structure.left_arm).toBe(3);
    expect(state.structure.left_leg).toBe(4);
  });

  it('should set structure based on tonnage for 50-ton mech', () => {
    const state = createDamageState(50, testArmorValues, testRearArmorValues);

    expect(state.structure.head).toBe(3);
    expect(state.structure.center_torso).toBe(16);
    expect(state.structure.left_torso).toBe(12);
    expect(state.structure.left_arm).toBe(8);
    expect(state.structure.left_leg).toBe(12);
  });

  it('should set structure based on tonnage for 100-ton mech', () => {
    const state = createDamageState(100, testArmorValues, testRearArmorValues);

    expect(state.structure.head).toBe(3);
    expect(state.structure.center_torso).toBe(31);
    expect(state.structure.left_torso).toBe(21);
    expect(state.structure.left_arm).toBe(17);
    expect(state.structure.left_leg).toBe(21);
  });

  it('should default to 50-ton structure for unknown tonnage', () => {
    const state = createDamageState(37, testArmorValues, testRearArmorValues);

    expect(state.structure.center_torso).toBe(16); // 50-ton default
  });

  it('should initialize with no destroyed locations', () => {
    const state = createDamageState(50, testArmorValues, testRearArmorValues);

    expect(state.destroyedLocations).toEqual([]);
  });

  it('should initialize pilot with zero wounds and conscious', () => {
    const state = createDamageState(50, testArmorValues, testRearArmorValues);

    expect(state.pilotWounds).toBe(0);
    expect(state.pilotConscious).toBe(true);
  });

  it('should initialize unit as not destroyed', () => {
    const state = createDamageState(50, testArmorValues, testRearArmorValues);

    expect(state.destroyed).toBe(false);
    expect(state.destructionCause).toBeUndefined();
  });

  it('should set rear locations to share structure with front', () => {
    const state = createDamageState(50, testArmorValues, testRearArmorValues);

    expect(state.structure.center_torso_rear).toBe(
      state.structure.center_torso,
    );
    expect(state.structure.left_torso_rear).toBe(state.structure.left_torso);
    expect(state.structure.right_torso_rear).toBe(state.structure.right_torso);
  });

  it('should not mutate input armor values', () => {
    const originalHead = testArmorValues.head;
    createDamageState(50, testArmorValues, testRearArmorValues);

    expect(testArmorValues.head).toBe(originalHead);
  });

  it('should create state for all standard tonnages', () => {
    const tonnages = [
      20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
    ];

    for (const tonnage of tonnages) {
      const state = createDamageState(
        tonnage,
        testArmorValues,
        testRearArmorValues,
      );
      expect(state.structure.head).toBe(3);
      expect(state.structure.center_torso).toBe(
        STANDARD_STRUCTURE_TABLE[tonnage].centerTorso,
      );
    }
  });
});

// =============================================================================
// applyDamageWithTerrainEffects Tests
// =============================================================================
