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

describe('applyPilotDamage', () => {
  beforeEach(() => {
    mockRoll2d6.mockClear();
  });

  describe('wound application', () => {
    it('should add wounds to pilot', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // passes consciousness
      const state = createTestState();
      const { state: newState, result } = applyPilotDamage(
        state,
        2,
        'head_hit',
      );

      expect(result.woundsInflicted).toBe(2);
      expect(result.totalWounds).toBe(2);
      expect(newState.pilotWounds).toBe(2);
    });

    it('should accumulate wounds', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // passes consciousness
      const state = createTestState({ pilotWounds: 3 });
      const { result } = applyPilotDamage(state, 2, 'fall');

      expect(result.woundsInflicted).toBe(2);
      expect(result.totalWounds).toBe(5);
    });

    it('should track damage source', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState();

      const headResult = applyPilotDamage(state, 1, 'head_hit').result;
      expect(headResult.source).toBe('head_hit');

      const ammoResult = applyPilotDamage(state, 1, 'ammo_explosion').result;
      expect(ammoResult.source).toBe('ammo_explosion');

      const fallResult = applyPilotDamage(state, 1, 'fall').result;
      expect(fallResult.source).toBe('fall');

      const heatResult = applyPilotDamage(state, 1, 'heat').result;
      expect(heatResult.source).toBe('heat');

      const physicalResult = applyPilotDamage(
        state,
        1,
        'physical_attack',
      ).result;
      expect(physicalResult.source).toBe('physical_attack');

      const destructionResult = applyPilotDamage(
        state,
        1,
        'mech_destruction',
      ).result;
      expect(destructionResult.source).toBe('mech_destruction');
    });
  });

  describe('consciousness checks', () => {
    it('should require consciousness check when wounded', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState();
      const { result } = applyPilotDamage(state, 1, 'head_hit');

      expect(result.consciousnessCheckRequired).toBe(true);
    });

    it('should not require consciousness check for zero wounds', () => {
      const state = createTestState();
      const { result } = applyPilotDamage(state, 0, 'head_hit');

      expect(result.consciousnessCheckRequired).toBe(false);
      expect(result.consciousnessRoll).toBeUndefined();
    });

    it('should pass consciousness check when roll beats target', () => {
      // Target = 3 + 1 wound = 4, roll 6+6=12 > 4
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState();
      const { state: newState, result } = applyPilotDamage(
        state,
        1,
        'head_hit',
      );

      expect(result.consciousnessTarget).toBe(4);
      expect(result.consciousnessRoll?.total).toBe(12);
      expect(result.conscious).toBe(true);
      expect(newState.pilotConscious).toBe(true);
    });

    it('should fail consciousness check when roll does not beat target', () => {
      // Target = 3 + 3 wounds = 6, roll 3+2=5, not > 6
      mockRoll2d6.mockReturnValue(createMockRoll(3, 2));
      const state = createTestState({ pilotWounds: 2 });
      const { state: newState, result } = applyPilotDamage(
        state,
        1,
        'head_hit',
      );

      expect(result.consciousnessTarget).toBe(6); // 3 + 3 total wounds
      expect(result.consciousnessRoll?.total).toBe(5);
      expect(result.conscious).toBe(false);
      expect(newState.pilotConscious).toBe(false);
    });

    it('should pass consciousness check when roll equals target (need to meet)', () => {
      // Target = 3 + 2 wounds = 5, roll 2+3=5, 5 >= 5 passes
      mockRoll2d6.mockReturnValue(createMockRoll(2, 3));
      const state = createTestState({ pilotWounds: 1 });
      const { state: newState, result } = applyPilotDamage(
        state,
        1,
        'head_hit',
      );

      expect(result.consciousnessTarget).toBe(5);
      expect(result.consciousnessRoll?.total).toBe(5);
      expect(result.conscious).toBe(true);
      expect(newState.pilotConscious).toBe(true);
    });

    it('should calculate correct target for 5 wounds', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // 12 > 8
      const state = createTestState({ pilotWounds: 4 });
      const { result } = applyPilotDamage(state, 1, 'head_hit');

      expect(result.consciousnessTarget).toBe(8); // 3 + 5 total wounds
    });
  });

  describe('pilot death', () => {
    it('should kill pilot at 6 wounds', () => {
      const state = createTestState({ pilotWounds: 5 });
      const { state: newState, result } = applyPilotDamage(
        state,
        1,
        'head_hit',
      );

      expect(result.dead).toBe(true);
      expect(result.totalWounds).toBe(6);
      expect(newState.pilotWounds).toBe(6);
      expect(newState.pilotConscious).toBe(false);
      expect(newState.destroyed).toBe(true);
      expect(newState.destructionCause).toBe('pilot_death');
    });

    it('should kill pilot when wounds exceed 6', () => {
      const state = createTestState({ pilotWounds: 3 });
      const { state: newState, result } = applyPilotDamage(
        state,
        5,
        'ammo_explosion',
      );

      expect(result.dead).toBe(true);
      expect(result.totalWounds).toBe(8);
      expect(newState.destroyed).toBe(true);
    });

    it('should not require consciousness check when killing pilot', () => {
      const state = createTestState({ pilotWounds: 5 });
      const { result } = applyPilotDamage(state, 1, 'head_hit');

      expect(result.dead).toBe(true);
      expect(result.consciousnessCheckRequired).toBe(false);
    });

    it('should not die at 5 wounds', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState({ pilotWounds: 4 });
      const { result } = applyPilotDamage(state, 1, 'head_hit');

      expect(result.dead).toBe(false);
      expect(result.totalWounds).toBe(5);
    });
  });

  describe('immutability', () => {
    it('should not mutate original state', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState({ pilotWounds: 2 });
      const originalWounds = state.pilotWounds;

      applyPilotDamage(state, 3, 'head_hit');

      expect(state.pilotWounds).toBe(originalWounds);
    });

    it('should return new state object', () => {
      mockRoll2d6.mockReturnValue(createMockRoll(6, 6));
      const state = createTestState();
      const { state: newState } = applyPilotDamage(state, 1, 'head_hit');

      expect(newState).not.toBe(state);
    });
  });
});

// =============================================================================
// Unit Destruction Tests
// =============================================================================
