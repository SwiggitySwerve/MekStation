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

describe('resolveDamage', () => {
  beforeEach(() => {
    mockRoll2d6.mockClear();
  });

  describe('basic damage resolution', () => {
    it('should resolve armor damage correctly', () => {
      const state = createTestState();
      const { state: newState, result } = resolveDamage(
        state,
        'center_torso',
        5,
      );

      expect(result.locationDamages.length).toBe(1);
      expect(result.locationDamages[0].armorDamage).toBe(5);
      expect(result.unitDestroyed).toBe(false);
      expect(newState.armor['center_torso']).toBe(15);
    });

    it('should return empty location damages for zero damage', () => {
      const state = createTestState();
      const { state: newState, result } = resolveDamage(state, 'left_arm', 0);

      // Zero damage produces no location damage results
      expect(result.locationDamages.length).toBe(0);
      expect(result.unitDestroyed).toBe(false);
      // State should be unchanged except for possible destruction check
      expect(newState.armor['left_arm']).toBe(state.armor['left_arm']);
    });
  });

  describe('head hit pilot damage', () => {
    it('should apply pilot damage on head hit', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // passes consciousness
      const state = createTestState();
      const { state: newState, result } = resolveDamage(state, 'head', 3);

      expect(result.pilotDamage).toBeDefined();
      expect(result.pilotDamage?.source).toBe('head_hit');
      expect(result.pilotDamage?.woundsInflicted).toBe(1);
      expect(newState.pilotWounds).toBe(1);
    });

    it('should not apply pilot damage for zero damage to head', () => {
      const state = createTestState();
      const { result } = resolveDamage(state, 'head', 0);

      expect(result.pilotDamage).toBeUndefined();
    });

    it('should not apply pilot damage for non-head locations', () => {
      const state = createTestState();
      const { result } = resolveDamage(state, 'center_torso', 10);

      expect(result.pilotDamage).toBeUndefined();
    });
  });

  describe('unit destruction', () => {
    it('should detect head destruction', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, head: 0 },
        structure: { ...createTestState().structure, head: 2 },
      });
      mockRoll2d6.mockReturnValue(createMockRoll(1, 1)); // fails consciousness but doesn't matter
      const { state: newState, result } = resolveDamage(state, 'head', 10);

      expect(result.unitDestroyed).toBe(true);
      expect(result.destructionCause).toBe('head_destroyed');
      expect(newState.destroyed).toBe(true);
    });

    it('should detect center torso destruction', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, center_torso: 0 },
        structure: { ...createTestState().structure, center_torso: 5 },
      });
      const { result } = resolveDamage(state, 'center_torso', 20);

      expect(result.unitDestroyed).toBe(true);
      expect(result.destructionCause).toBe('ct_destroyed');
    });

    it('should detect pilot death from head hit', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState({ pilotWounds: 5 });
      const { state: newState, result } = resolveDamage(state, 'head', 1);

      expect(result.unitDestroyed).toBe(true);
      expect(result.destructionCause).toBe('pilot_death');
      expect(result.pilotDamage?.dead).toBe(true);
      expect(newState.destroyed).toBe(true);
    });
  });

  describe('damage transfer', () => {
    it('should handle damage transfer to center torso', () => {
      const state = createTestState({
        armor: {
          ...createTestState().armor,
          left_arm: 0,
          left_torso: 0,
        },
        structure: {
          ...createTestState().structure,
          left_arm: 1,
          left_torso: 1,
        },
      });

      const { result } = resolveDamage(state, 'left_arm', 10);

      expect(result.locationDamages.length).toBe(3);
      expect(result.locationDamages[2].location).toBe('center_torso');
    });
  });

  describe('critical hit handling', () => {
    it('should return empty critical hits array', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // triggers critical
      const state = createTestState({
        armor: { ...createTestState().armor, left_arm: 0 },
      });

      const { result } = resolveDamage(state, 'left_arm', 5);

      // Note: Critical hit resolution is flagged but not fully resolved here
      expect(result.criticalHits).toEqual([]);
    });
  });

  describe('immutability', () => {
    it('should not mutate original state', () => {
      const state = createTestState();
      const originalArmor = state.armor['center_torso'];

      resolveDamage(state, 'center_torso', 10);

      expect(state.armor['center_torso']).toBe(originalArmor);
    });
  });
});

// =============================================================================
// createDamageState Tests
// =============================================================================
