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
