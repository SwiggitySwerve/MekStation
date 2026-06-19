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
