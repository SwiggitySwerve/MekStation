/**
 * VTOLUnitHandler Tests
 *
 * Tests for VTOL BLK parsing, validation, and serialization
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.2.8
 */

import { VTOLLocation } from '@/types/construction/UnitLocation';
import { TechBase, WeightClass, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType, IVTOL } from '@/types/unit/VehicleInterfaces';

import { VTOLUnitHandler, createVTOLHandler } from '../VTOLUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for VTOL testing
 */
export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'VTOL',
    mappedUnitType: UnitType.VTOL,
    name: 'Warrior',
    model: 'H-7',
    year: 2957,
    type: 'IS Level 1',
    tonnage: 21,
    cruiseMP: 10,
    armor: [16, 10, 10, 8, 2],
    equipmentByLocation: {
      'Front Equipment': ['Medium Laser'],
      'Body Equipment': [],
    },
    rawTags: {},
    ...overrides,
  };
}

/**
 * Create a VTOL with chin turret
 */
export function createChinTurretVTOLDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Yellow Jacket',
    model: 'Prime',
    tonnage: 25,
    cruiseMP: 8,
    armor: [20, 15, 15, 10, 2],
    equipmentByLocation: {
      'Front Equipment': ['Small Laser'],
      Chin: ['SRM 2'],
      'Body Equipment': ['Ammo SRM 2'],
    },
    rawTags: {
      turrettype: 'Chin',
    },
  });
}

/**
 * Create a fast scout VTOL
 */
export function createScoutVTOLDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Cavalry',
    model: 'Attack Helicopter',
    tonnage: 15,
    cruiseMP: 12,
    armor: [12, 8, 8, 6, 2],
    equipmentByLocation: {
      'Front Equipment': ['Machine Gun', 'Machine Gun'],
      'Body Equipment': ['Ammo MG (Full)'],
    },
    rawTags: {},
  });
}

/**
 * Create max weight VTOL (30 tons)
 */
export function createHeavyVTOLDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Karnov',
    model: 'UR Transport',
    tonnage: 30,
    cruiseMP: 6,
    armor: [30, 24, 24, 20, 2],
    equipmentByLocation: {
      'Front Equipment': [],
      'Body Equipment': ['Infantry Bay (6)'],
    },
    rawTags: {},
  });
}

/**
 * Create Clan tech VTOL
 */
export function createClanVTOLDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Skadi',
    model: 'Swift Attack',
    tonnage: 25,
    cruiseMP: 9,
    type: 'Clan Level 2',
    armor: [22, 16, 16, 12, 2],
    equipmentByLocation: {
      'Front Equipment': ['ER Medium Laser'],
      Turret: ['Streak SRM 2'],
      'Body Equipment': ['Ammo Streak SRM 2'],
    },
    rawTags: {},
  });
}

/**
 * Create a document with invalid overweight VTOL
 */
export function createOverweightVTOLDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Invalid',
    model: 'Heavy',
    tonnage: 35, // Over 30 ton limit
    cruiseMP: 5,
    armor: [40, 30, 30, 20, 2],
    equipmentByLocation: {},
    rawTags: {},
  });
}

/**
 * Create a document with no movement
 */
export function createNoMovementVTOLDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Broken',
    model: 'Stationary',
    tonnage: 20,
    cruiseMP: 0,
    armor: [16, 10, 10, 8, 2],
    equipmentByLocation: {},
    rawTags: {},
  });
}

/**
 * Create VTOL with custom rotor type
 */
export function createCustomRotorVTOLDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Experimental',
    model: 'X-1',
    tonnage: 20,
    cruiseMP: 10,
    armor: [16, 10, 10, 8, 2],
    equipmentByLocation: {},
    rawTags: {
      rotortype: 'Coaxial',
    },
  });
}

/**
 * Create VTOL with excessive rotor armor
 */
export function createExcessiveRotorArmorDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Overarmored',
    model: 'Rotor',
    tonnage: 25,
    cruiseMP: 8,
    armor: [20, 15, 15, 10, 5], // 5 points on rotor - exceeds 2
    equipmentByLocation: {},
    rawTags: {},
  });
}

// ============================================================================
// Tests
// ============================================================================
