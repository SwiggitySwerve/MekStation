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
