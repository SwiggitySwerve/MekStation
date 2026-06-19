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

describe('Integration: Full damage scenarios', () => {
  beforeEach(() => {
    mockRoll2d6.mockClear();
  });

  it('should correctly process damage chain destroying multiple locations', () => {
    const state = createTestState({
      armor: {
        ...createZeroArmor(),
      },
      structure: {
        ...createMinimalStructure(),
      },
    });

    const { state: newState, results } = applyDamageWithTransfer(
      state,
      'left_arm',
      10,
    );

    // Should destroy arm (1 structure) -> torso (1 structure) -> CT gets remaining
    expect(newState.destroyedLocations).toContain('left_arm');
    expect(newState.destroyedLocations).toContain('left_torso');
    expect(results.length).toBe(3);
  });

  it('should handle combat with pilot taking damage and passing consciousness', () => {
    mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // passes all checks
    const state = createTestState();

    const { state: finalState, result } = resolveDamage(state, 'head', 5);

    expect(result.pilotDamage?.woundsInflicted).toBe(1);
    expect(result.pilotDamage?.conscious).toBe(true);
    expect(finalState.pilotConscious).toBe(true);
    expect(finalState.destroyed).toBe(false);
  });

  it('should handle combat killing pilot through head damage', () => {
    const state = createTestState({
      pilotWounds: 5,
      armor: { ...createTestState().armor, head: 0 },
    });

    const { state: finalState, result } = resolveDamage(state, 'head', 1);

    expect(result.pilotDamage?.dead).toBe(true);
    expect(result.unitDestroyed).toBe(true);
    expect(result.destructionCause).toBe('pilot_death');
    expect(finalState.destroyed).toBe(true);
  });

  it('should handle center torso destruction from transfer chain', () => {
    const state = createTestState({
      armor: {
        ...createZeroArmor(),
      },
      structure: {
        ...createTestState().structure,
        left_arm: 1,
        left_torso: 1,
        center_torso: 1,
      },
    });

    const { state: finalState, result } = resolveDamage(state, 'left_arm', 10);

    expect(result.unitDestroyed).toBe(true);
    expect(result.destructionCause).toBe('ct_destroyed');
    expect(finalState.destroyed).toBe(true);
    expect(finalState.destroyedLocations).toContain('center_torso');
  });

  it('should not destroy unit with all limbs destroyed', () => {
    const state = createTestState({
      destroyedLocations: ['left_arm', 'right_arm', 'left_leg', 'right_leg'],
    });

    const { destroyed } = checkUnitDestruction(state);

    expect(destroyed).toBe(false);
  });

  it('should handle rear armor damage correctly', () => {
    const state = createTestState();

    const { state: newState, result } = resolveDamage(
      state,
      'center_torso_rear',
      10,
    );

    expect(result.locationDamages[0].armorDamage).toBe(8); // All rear armor
    expect(result.locationDamages[0].structureDamage).toBe(2); // 2 structure damage
    expect(newState.rearArmor.center_torso).toBe(0);
    expect(newState.structure.center_torso).toBe(14);
  });
});

// =============================================================================
// Side Torso → Arm Destruction Cascade Tests
// =============================================================================
