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

describe('STANDARD_STRUCTURE_TABLE', () => {
  const expectedTonnages = [
    20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
  ];

  it('should have structure values for all standard tonnages', () => {
    for (const tonnage of expectedTonnages) {
      expect(STANDARD_STRUCTURE_TABLE[tonnage]).toBeDefined();
      expect(STANDARD_STRUCTURE_TABLE[tonnage].head).toBeGreaterThan(0);
      expect(STANDARD_STRUCTURE_TABLE[tonnage].centerTorso).toBeGreaterThan(0);
      expect(STANDARD_STRUCTURE_TABLE[tonnage].sideTorso).toBeGreaterThan(0);
      expect(STANDARD_STRUCTURE_TABLE[tonnage].arm).toBeGreaterThan(0);
      expect(STANDARD_STRUCTURE_TABLE[tonnage].leg).toBeGreaterThan(0);
    }
  });

  it('should have correct head structure (always 3 for all tonnages)', () => {
    for (const tonnage of Object.keys(STANDARD_STRUCTURE_TABLE)) {
      expect(STANDARD_STRUCTURE_TABLE[Number(tonnage)].head).toBe(3);
    }
  });

  it('should have structure values that increase with tonnage', () => {
    expect(STANDARD_STRUCTURE_TABLE[20].centerTorso).toBeLessThan(
      STANDARD_STRUCTURE_TABLE[100].centerTorso,
    );
    expect(STANDARD_STRUCTURE_TABLE[20].sideTorso).toBeLessThan(
      STANDARD_STRUCTURE_TABLE[100].sideTorso,
    );
    expect(STANDARD_STRUCTURE_TABLE[20].arm).toBeLessThan(
      STANDARD_STRUCTURE_TABLE[100].arm,
    );
    expect(STANDARD_STRUCTURE_TABLE[20].leg).toBeLessThan(
      STANDARD_STRUCTURE_TABLE[100].leg,
    );
  });

  it('should have correct values for 20-ton mech', () => {
    const structure = STANDARD_STRUCTURE_TABLE[20];
    expect(structure.head).toBe(3);
    expect(structure.centerTorso).toBe(6);
    expect(structure.sideTorso).toBe(5);
    expect(structure.arm).toBe(3);
    expect(structure.leg).toBe(4);
  });

  it('should have correct values for 50-ton mech', () => {
    const structure = STANDARD_STRUCTURE_TABLE[50];
    expect(structure.head).toBe(3);
    expect(structure.centerTorso).toBe(16);
    expect(structure.sideTorso).toBe(12);
    expect(structure.arm).toBe(8);
    expect(structure.leg).toBe(12);
  });

  it('should have correct values for 100-ton mech', () => {
    const structure = STANDARD_STRUCTURE_TABLE[100];
    expect(structure.head).toBe(3);
    expect(structure.centerTorso).toBe(31);
    expect(structure.sideTorso).toBe(21);
    expect(structure.arm).toBe(17);
    expect(structure.leg).toBe(21);
  });

  it('should have exactly 17 tonnage entries', () => {
    expect(Object.keys(STANDARD_STRUCTURE_TABLE)).toHaveLength(17);
  });
});

// =============================================================================
// applyDamageToLocation Tests
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

describe('checkCriticalHitTrigger', () => {
  beforeEach(() => {
    mockRoll2d6.mockClear();
  });

  it('should not trigger for zero structure damage', () => {
    const result = checkCriticalHitTrigger(0);
    expect(result.triggered).toBe(false);
    expect(result.roll.total).toBe(0);
    expect(mockRoll2d6).not.toHaveBeenCalled();
  });

  it('should not trigger for negative structure damage', () => {
    const result = checkCriticalHitTrigger(-5);
    expect(result.triggered).toBe(false);
    expect(result.roll.total).toBe(0);
  });

  it('should trigger when roll is 8 or higher', () => {
    mockRoll2d6.mockReturnValue(createMockRoll(4, 4)); // total 8
    const result = checkCriticalHitTrigger(5);

    expect(result.triggered).toBe(true);
    expect(result.roll.total).toBe(8);
    expect(mockRoll2d6).toHaveBeenCalledTimes(1);
  });

  it('should trigger when roll is 12', () => {
    mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // total 12
    const result = checkCriticalHitTrigger(1);

    expect(result.triggered).toBe(true);
    expect(result.roll.total).toBe(12);
  });

  it('should not trigger when roll is below 8', () => {
    mockRoll2d6.mockReturnValue(createMockRoll(3, 4)); // total 7
    const result = checkCriticalHitTrigger(5);

    expect(result.triggered).toBe(false);
    expect(result.roll.total).toBe(7);
  });

  it('should not trigger when roll is exactly 7', () => {
    mockRoll2d6.mockReturnValue(createMockRoll(4, 3)); // total 7
    const result = checkCriticalHitTrigger(10);

    expect(result.triggered).toBe(false);
  });

  it('should return roll details when structure damage occurs', () => {
    mockRoll2d6.mockReturnValue(createMockRoll(5, 5)); // total 10
    const result = checkCriticalHitTrigger(5);

    expect(result.roll).toBeDefined();
    expect(result.roll.dice).toEqual([5, 5]);
    expect(result.roll.total).toBe(10);
    expect(result.roll.isSnakeEyes).toBe(false);
    expect(result.roll.isBoxcars).toBe(false);
  });

  it('should detect boxcars on critical trigger roll', () => {
    mockRoll2d6.mockReturnValue(createMockRoll(6, 6)); // total 12
    const result = checkCriticalHitTrigger(3);

    expect(result.triggered).toBe(true);
    expect(result.roll.isBoxcars).toBe(true);
  });
});

describe('getCriticalHitCount', () => {
  it('should return 0 for rolls below 8', () => {
    expect(getCriticalHitCount(2)).toBe(0);
    expect(getCriticalHitCount(3)).toBe(0);
    expect(getCriticalHitCount(4)).toBe(0);
    expect(getCriticalHitCount(5)).toBe(0);
    expect(getCriticalHitCount(6)).toBe(0);
    expect(getCriticalHitCount(7)).toBe(0);
  });

  it('should return 1 for rolls 8-9', () => {
    expect(getCriticalHitCount(8)).toBe(1);
    expect(getCriticalHitCount(9)).toBe(1);
  });

  it('should return 2 for rolls 10-11', () => {
    expect(getCriticalHitCount(10)).toBe(2);
    expect(getCriticalHitCount(11)).toBe(2);
  });

  it('should return 3 for roll 12', () => {
    expect(getCriticalHitCount(12)).toBe(3);
  });

  it('should return 0 for roll 0', () => {
    expect(getCriticalHitCount(0)).toBe(0);
  });

  it('should return 0 for negative rolls', () => {
    expect(getCriticalHitCount(-1)).toBe(0);
    expect(getCriticalHitCount(-10)).toBe(0);
  });

  it('should return 3 for rolls above 12', () => {
    expect(getCriticalHitCount(13)).toBe(3);
    expect(getCriticalHitCount(100)).toBe(3);
  });
});

// =============================================================================
// Pilot Damage Tests
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
      expect(cause).toBe('damage');
      expect(newState.destroyed).toBe(true);
      expect(newState.destructionCause).toBe('damage');
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
      expect(cause).toBe('damage');
      expect(newState.destroyed).toBe(true);
    });

    it('should not destroy unit if only side torsos are destroyed', () => {
      const state = createTestState({
        destroyedLocations: ['left_torso', 'right_torso'],
      });
      const { destroyed } = checkUnitDestruction(state);

      expect(destroyed).toBe(false);
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
      expect(result.destructionCause).toBe('damage');
      expect(newState.destroyed).toBe(true);
    });

    it('should detect center torso destruction', () => {
      const state = createTestState({
        armor: { ...createTestState().armor, center_torso: 0 },
        structure: { ...createTestState().structure, center_torso: 5 },
      });
      const { result } = resolveDamage(state, 'center_torso', 20);

      expect(result.unitDestroyed).toBe(true);
      expect(result.destructionCause).toBe('damage');
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
      expect(result.destructionCause).toBe('damage');
    });
  });
});

// =============================================================================
// getLocationDamageCapacity Tests
// =============================================================================

describe('getLocationDamageCapacity', () => {
  it('should return sum of armor and structure for front location', () => {
    const state = createTestState();
    const capacity = getLocationDamageCapacity(state, 'center_torso');

    expect(capacity).toBe(36); // 20 armor + 16 structure
  });

  it('should return correct capacity for head', () => {
    const state = createTestState();
    const capacity = getLocationDamageCapacity(state, 'head');

    expect(capacity).toBe(12); // 9 armor + 3 structure
  });

  it('should return correct capacity for arms', () => {
    const state = createTestState();
    const leftArmCapacity = getLocationDamageCapacity(state, 'left_arm');
    const rightArmCapacity = getLocationDamageCapacity(state, 'right_arm');

    expect(leftArmCapacity).toBe(18); // 10 armor + 8 structure
    expect(rightArmCapacity).toBe(18);
  });

  it('should return correct capacity for legs', () => {
    const state = createTestState();
    const leftLegCapacity = getLocationDamageCapacity(state, 'left_leg');
    const rightLegCapacity = getLocationDamageCapacity(state, 'right_leg');

    expect(leftLegCapacity).toBe(24); // 12 armor + 12 structure
    expect(rightLegCapacity).toBe(24);
  });

  it('should return rear armor + structure for rear locations', () => {
    const state = createTestState();
    const capacity = getLocationDamageCapacity(state, 'center_torso_rear');

    expect(capacity).toBe(24); // 8 rear armor + 16 structure
  });

  it('should return correct capacity for side torso rear', () => {
    const state = createTestState();
    const leftCapacity = getLocationDamageCapacity(state, 'left_torso_rear');
    const rightCapacity = getLocationDamageCapacity(state, 'right_torso_rear');

    expect(leftCapacity).toBe(18); // 6 rear armor + 12 structure
    expect(rightCapacity).toBe(18);
  });

  it('should return 0 for location with no armor or structure', () => {
    const state = createTestState({
      armor: createZeroArmor(),
      structure: {
        ...createTestState().structure,
        left_arm: 0,
      },
    });
    const capacity = getLocationDamageCapacity(state, 'left_arm');

    expect(capacity).toBe(0);
  });

  it('should handle partially damaged locations', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, center_torso: 10 },
      structure: { ...createTestState().structure, center_torso: 8 },
    });
    const capacity = getLocationDamageCapacity(state, 'center_torso');

    expect(capacity).toBe(18); // 10 armor + 8 structure
  });
});

// =============================================================================
// getLocationHealthPercent Tests
// =============================================================================

describe('getLocationHealthPercent', () => {
  it('should return 100% for undamaged location', () => {
    const state = createTestState();
    const percent = getLocationHealthPercent(state, 'center_torso', 20, 16);

    expect(percent).toBe(100);
  });

  it('should return 0% for destroyed location', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, left_arm: 0 },
      structure: { ...createTestState().structure, left_arm: 0 },
    });
    const percent = getLocationHealthPercent(state, 'left_arm', 10, 8);

    expect(percent).toBe(0);
  });

  it('should calculate correct percentage for partial damage', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, center_torso: 10 },
    });
    const percent = getLocationHealthPercent(state, 'center_torso', 20, 16);

    // (10 armor + 16 structure) / (20 + 16) * 100 = 26/36 * 100 = 72.22...
    expect(percent).toBeCloseTo(72.22, 1);
  });

  it('should calculate correct percentage for armor-only damage', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, head: 6 },
    });
    const percent = getLocationHealthPercent(state, 'head', 9, 3);

    // (6 + 3) / (9 + 3) * 100 = 75%
    expect(percent).toBe(75);
  });

  it('should calculate correct percentage for structure damage', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, left_arm: 0 },
      structure: { ...createTestState().structure, left_arm: 4 },
    });
    const percent = getLocationHealthPercent(state, 'left_arm', 10, 8);

    // (0 + 4) / (10 + 8) * 100 = 22.22...%
    expect(percent).toBeCloseTo(22.22, 1);
  });

  it('should return 50% for half health', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, left_leg: 6 },
      structure: { ...createTestState().structure, left_leg: 6 },
    });
    const percent = getLocationHealthPercent(state, 'left_leg', 12, 12);

    expect(percent).toBe(50);
  });

  it('should handle rear locations correctly', () => {
    const state = createTestState({
      rearArmor: { ...createTestState().rearArmor, center_torso: 4 },
    });
    const percent = getLocationHealthPercent(state, 'center_torso_rear', 8, 16);

    // (4 rear armor + 16 structure) / (8 + 16) * 100 = 83.33...%
    expect(percent).toBeCloseTo(83.33, 1);
  });

  it('should return 0 if max values are zero', () => {
    const state = createTestState();
    const percent = getLocationHealthPercent(state, 'left_arm', 0, 0);

    expect(percent).toBe(0);
  });

  it('should handle edge case with only structure remaining', () => {
    const state = createTestState({
      armor: { ...createTestState().armor, right_torso: 0 },
      structure: { ...createTestState().structure, right_torso: 12 },
    });
    const percent = getLocationHealthPercent(state, 'right_torso', 15, 12);

    // (0 + 12) / (15 + 12) * 100 = 44.44...%
    expect(percent).toBeCloseTo(44.44, 1);
  });
});

// =============================================================================
// Integration Tests
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
    expect(result.destructionCause).toBe('damage');
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
