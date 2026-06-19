/**
 * SmallCraftUnitHandler Tests
 *
 * Tests for Small Craft BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { SmallCraftLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  SmallCraftUnitHandler,
  createSmallCraftHandler,
} from '../SmallCraftUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Small Craft',
    mappedUnitType: UnitType.SMALL_CRAFT,
    name: 'K-1',
    model: 'Shuttle',
    year: 2470,
    type: 'IS Level 2',
    tonnage: 100,
    motionType: 'Aerodyne',
    safeThrust: 5,
    structuralIntegrity: 5,
    fuel: 500,
    heatsinks: 10,
    sinkType: 0,
    engineType: 0,
    armorType: 0,
    armor: [40, 30, 30, 20],
    crew: 2,
    passengers: 8,
    escapePod: 2,
    lifeBoat: 0,
    equipmentByLocation: {
      'Nose Equipment': ['Medium Laser', 'Medium Laser'],
    },
    rawTags: {
      cargo: '5.0',
    },
    ...overrides,
  };
}

export function createSpheroidSmallCraft(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Hunter',
    model: 'Killer Whale Carrier',
    motionType: 'Spheroid',
    tonnage: 200,
    safeThrust: 3,
    structuralIntegrity: 8,
    armor: [80, 60, 60, 40],
    crew: 4,
    passengers: 0,
    equipmentByLocation: {
      'Nose Equipment': ['Killer Whale', 'Killer Whale'],
      'Aft Equipment': ['Medium Laser'],
    },
  });
}

export function createAssaultBoat(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Assault',
    model: 'Boat',
    tonnage: 200,
    safeThrust: 6,
    structuralIntegrity: 6,
    armor: [100, 80, 80, 60],
    crew: 4,
    passengers: 20, // Marines
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser', 'Large Laser'],
      'Left Side Equipment': ['Medium Laser'],
      'Right Side Equipment': ['Medium Laser'],
    },
  });
}

// ============================================================================
// Tests
// ============================================================================
