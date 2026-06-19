/**
 * BattleArmorUnitHandler Tests
 *
 * Comprehensive tests for Battle Armor BLK parsing, validation, and calculations.
 *
 * @see BattleArmorUnitHandler.ts
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.4
 */

import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  BattleArmorWeightClass,
  BattleArmorChassisType,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';

import {
  BattleArmorUnitHandler,
  createBattleArmorHandler,
} from '../BattleArmorUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for Battle Armor with sensible defaults
 */
export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'BattleArmor',
    mappedUnitType: UnitType.BATTLE_ARMOR,
    name: 'Elemental',
    model: 'Point',
    year: 2868,
    type: 'Clan Level 2',
    tonnage: 4, // Total squad weight (4 troopers * 1 ton each)
    chassis: 'biped',
    trooperCount: 5,
    weightClass: 3, // Heavy
    cruiseMP: 1,
    jumpingMP: 3,
    armor: [10], // Armor per trooper
    equipmentByLocation: {
      'Squad Equipment': ['BA Small Laser', 'BA SRM-2'],
    },
    rawTags: {},
    ...overrides,
  };
}

/**
 * Create PA(L) (Power Armor Light) document - weight class 0
 */
export function createPALDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Nighthawk PA(L)',
    model: 'XXI',
    type: 'IS Level 2',
    tonnage: 0.4, // 100kg per trooper * 4 = 400kg total
    weightClass: 0, // PA(L)
    trooperCount: 4,
    cruiseMP: 2,
    jumpingMP: 3,
    armor: [2],
    equipmentByLocation: {
      'Squad Equipment': ['BA Laser Rifle'],
    },
  });
}

/**
 * Create Light BA document - weight class 1
 */
export function createLightBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Infiltrator Mk I',
    model: 'Standard',
    type: 'IS Level 2',
    tonnage: 2, // 500kg per trooper * 4 = 2000kg total
    weightClass: 1, // Light
    trooperCount: 4,
    cruiseMP: 2,
    jumpingMP: 2,
    armor: [4],
    equipmentByLocation: {
      'Squad Equipment': ['BA Laser Rifle'],
    },
  });
}

/**
 * Create Medium BA document - weight class 2
 */
export function createMediumBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Inner Sphere Standard',
    model: 'IS Std',
    type: 'IS Level 2',
    tonnage: 4, // 1000kg per trooper * 4 = 4000kg total
    weightClass: 2, // Medium
    trooperCount: 4,
    cruiseMP: 1,
    jumpingMP: 3,
    armor: [6],
    equipmentByLocation: {
      'Squad Equipment': ['BA Small Laser', 'BA SRM-2'],
    },
  });
}

/**
 * Create Heavy BA document - weight class 3
 */
export function createHeavyBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Elemental',
    model: 'Standard',
    type: 'Clan Level 2',
    tonnage: 5, // 1000kg per trooper * 5 = 5000kg total
    weightClass: 3, // Heavy
    trooperCount: 5,
    cruiseMP: 1,
    jumpingMP: 3,
    armor: [10],
    equipmentByLocation: {
      'Squad Equipment': ['BA Small Laser', 'BA SRM-2'],
    },
  });
}

/**
 * Create Assault BA document - weight class 4
 */
export function createAssaultBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Kanazuchi',
    model: 'Standard',
    type: 'IS Level 3',
    tonnage: 8, // 2000kg per trooper * 4 = 8000kg total
    weightClass: 4, // Assault
    trooperCount: 4,
    cruiseMP: 1,
    jumpingMP: 0,
    armor: [14],
    equipmentByLocation: {
      'Squad Equipment': ['BA Heavy Machine Gun', 'BA Heavy Recoilless Rifle'],
    },
  });
}

/**
 * Create Quad BA document
 */
export function createQuadBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Fenrir',
    model: 'Standard',
    type: 'Clan Level 3',
    chassis: 'quad',
    tonnage: 5,
    weightClass: 3,
    trooperCount: 5,
    cruiseMP: 3,
    jumpingMP: 0,
    armor: [8],
  });
}

/**
 * Create VTOL BA document
 */
export function createVTOLBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Rogue Bear',
    model: 'Standard',
    type: 'Clan Level 3',
    tonnage: 3,
    weightClass: 2,
    trooperCount: 4,
    motionType: 'vtol',
    cruiseMP: 5,
    jumpingMP: 0,
    armor: [6],
  });
}

/**
 * Create UMU (underwater) BA document
 */
export function createUMUBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Undine',
    model: 'Standard',
    type: 'Clan Level 2',
    tonnage: 4,
    weightClass: 2,
    trooperCount: 5,
    motionType: 'umu',
    cruiseMP: 1,
    jumpingMP: 2,
    armor: [6],
    rawTags: {
      umump: '4',
    },
  });
}

/**
 * Create Mechanized BA document
 */
export function createMechanizedBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Gray Death Scout Suit',
    model: 'Standard',
    type: 'IS Level 2',
    tonnage: 2,
    weightClass: 1,
    trooperCount: 4,
    motionType: 'mechanized',
    cruiseMP: 1,
    jumpingMP: 0,
    armor: [3],
  });
}

/**
 * Create BA with manipulators document
 */
export function createBAWithManipulatorsDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Elemental',
    model: 'Heavy Battle Manipulators',
    type: 'Clan Level 2',
    tonnage: 5,
    weightClass: 3,
    trooperCount: 5,
    armor: [10],
    rawTags: {
      leftmanipulator: 'Heavy Battle',
      rightmanipulator: 'Heavy Battle',
    },
  });
}

/**
 * Create BA with special equipment document
 */
export function createBAWithSpecialEquipmentDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Purifier',
    model: 'Adaptive',
    type: 'IS Level 3',
    tonnage: 4,
    weightClass: 2,
    trooperCount: 4,
    armor: [6],
    rawTags: {
      apmount: 'true',
      modularmount: 'true',
      turretmount: '1',
      stealth: 'true',
      mimetic: 'false',
      fireresistant: 'true',
      mechanicaljumpboosters: 'true',
    },
  });
}

/**
 * Create BA with turret equipment document
 */
export function createBAWithTurretDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Longinus',
    model: 'Standard',
    type: 'IS Level 2',
    tonnage: 4,
    weightClass: 2,
    trooperCount: 4,
    armor: [7],
    equipmentByLocation: {
      'Squad Equipment': ['BA Small Laser'],
      'Turret Equipment': ['BA Micro Grenade Launcher'],
    },
    rawTags: {
      turretmount: 'true',
    },
  });
}

/**
 * Create BA with AP mount equipment document
 */
export function createBAWithAPMountDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Gnome',
    model: 'Standard',
    type: 'IS Level 2',
    tonnage: 3,
    weightClass: 2,
    trooperCount: 4,
    armor: [7],
    equipmentByLocation: {
      'Squad Equipment': ['BA Machine Gun'],
      'AP Equipment': ['BA Light Machine Gun'],
    },
    rawTags: {
      apmount: 'true',
    },
  });
}

/**
 * Create BA with multiple equipment locations document
 */
export function createBAWithMultipleLocationsDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Test BA',
    model: 'Multi-Location',
    type: 'IS Level 2',
    tonnage: 4,
    weightClass: 2,
    trooperCount: 4,
    armor: [6],
    equipmentByLocation: {
      'Squad Equipment': ['BA Small Laser'],
      'Body Equipment': ['BA ECM Suite'],
      'Left Arm Equipment': ['Battle Claw'],
      'Right Arm Equipment': ['Battle Claw'],
    },
  });
}

/**
 * Create minimal BA document (no optional fields)
 */
export function createMinimalBADocument(): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'BattleArmor',
    mappedUnitType: UnitType.BATTLE_ARMOR,
    name: 'Minimal',
    model: '',
    year: 3050,
    type: 'IS Level 2',
    tonnage: 2,
    armor: [4],
    equipmentByLocation: {},
    rawTags: {},
  };
}

/**
 * Create BA with unusual squad size
 */
export function createUnusualSquadSizeDocument(size: number): IBlkDocument {
  return createMockBlkDocument({
    name: `${size}-Trooper Squad`,
    trooperCount: size,
    tonnage: size, // 1 ton per trooper for simplicity
  });
}

// ============================================================================
// Tests
// ============================================================================
