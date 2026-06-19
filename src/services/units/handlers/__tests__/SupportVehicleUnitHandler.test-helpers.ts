/**
 * SupportVehicleUnitHandler Tests
 *
 * Tests for Support Vehicle BLK parsing, validation, and calculations
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel, WeightClass } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { SupportVehicleSizeClass } from '@/types/unit/VehicleInterfaces';

import {
  SupportVehicleUnitHandler,
  createSupportVehicleHandler,
} from '../SupportVehicleUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for support vehicle testing
 */
export function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'SupportTank',
    mappedUnitType: UnitType.SUPPORT_VEHICLE,
    name: 'Cargo Truck',
    model: 'Standard',
    year: 3025,
    type: 'IS Level 1',
    tonnage: 20,
    cruiseMP: 4,
    armor: [8, 6, 6, 4],
    equipmentByLocation: {
      'Body Equipment': ['Cargo (5 tons)'],
    },
    rawTags: {
      bar: '5',
      cargo: '5',
    },
    ...overrides,
  };
}

/**
 * Create a small support vehicle document (<=5 tons)
 */
export function createSmallSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Utility Cart',
    model: 'Light',
    tonnage: 3,
    cruiseMP: 6,
    motionType: 'Wheeled',
    armor: [2, 2, 2, 2],
    equipmentByLocation: {},
    rawTags: {
      bar: '3',
      cargo: '1',
    },
  });
}

/**
 * Create a medium support vehicle document (6-80 tons)
 */
export function createMediumSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Mobile HQ',
    model: 'Command',
    tonnage: 50,
    cruiseMP: 3,
    motionType: 'Tracked',
    armor: [20, 15, 15, 10],
    equipmentByLocation: {
      'Body Equipment': ['Communications Equipment (5 tons)'],
    },
    rawTags: {
      bar: '7',
      cargo: '10',
      structuraltechrating: '5',
      armortechrating: '6',
      enginetechrating: '5',
    },
  });
}

/**
 * Create a large support vehicle document (>80 tons)
 */
export function createLargeSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Heavy Hauler',
    model: 'Industrial',
    tonnage: 150,
    cruiseMP: 2,
    motionType: 'Tracked',
    armor: [40, 30, 30, 20],
    equipmentByLocation: {
      'Body Equipment': ['Cargo (80 tons)'],
    },
    rawTags: {
      bar: '8',
      cargo: '80',
    },
  });
}

/**
 * Create a hover support vehicle document
 */
export function createHoverSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Hover Ambulance',
    model: 'Medical',
    tonnage: 15,
    cruiseMP: 8,
    motionType: 'Hover',
    armor: [6, 4, 4, 3],
    equipmentByLocation: {
      'Body Equipment': ['MASH (3 tons)'],
    },
    rawTags: {
      bar: '5',
      cargo: '2',
    },
  });
}

/**
 * Create a VTOL support vehicle document
 */
export function createVTOLSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Search & Rescue',
    model: 'VTOL',
    tonnage: 10,
    cruiseMP: 10,
    motionType: 'VTOL',
    armor: [4, 3, 3, 2],
    equipmentByLocation: {
      'Body Equipment': ['Searchlight'],
    },
    rawTags: {
      bar: '4',
      cargo: '1',
    },
  });
}

/**
 * Create a naval support vehicle document
 */
export function createNavalSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Cargo Barge',
    model: 'River',
    tonnage: 100,
    cruiseMP: 2,
    motionType: 'Naval',
    armor: [15, 10, 10, 8],
    equipmentByLocation: {
      'Body Equipment': ['Cargo (60 tons)'],
    },
    rawTags: {
      bar: '6',
      cargo: '60',
    },
  });
}

/**
 * Create a hydrofoil support vehicle document
 */
export function createHydrofoilSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Fast Ferry',
    model: 'Passenger',
    tonnage: 40,
    cruiseMP: 6,
    motionType: 'Hydrofoil',
    armor: [10, 8, 8, 6],
    equipmentByLocation: {},
    rawTags: {
      bar: '5',
      passengers: '30',
    },
  });
}

/**
 * Create a submarine support vehicle document
 */
export function createSubmarineSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Research Sub',
    model: 'Deep Sea',
    tonnage: 60,
    cruiseMP: 3,
    motionType: 'Submarine',
    armor: [20, 15, 15, 10],
    equipmentByLocation: {
      'Body Equipment': ['Scientific Equipment'],
    },
    rawTags: {
      bar: '6',
      cargo: '5',
    },
  });
}

/**
 * Create a WiGE support vehicle document
 */
export function createWiGESupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Ground Effect Transport',
    model: 'Cargo',
    tonnage: 30,
    cruiseMP: 7,
    motionType: 'WiGE',
    armor: [8, 6, 6, 4],
    equipmentByLocation: {
      'Body Equipment': ['Cargo (15 tons)'],
    },
    rawTags: {
      bar: '5',
      cargo: '15',
    },
  });
}

/**
 * Create a rail support vehicle document
 */
export function createRailSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Freight Car',
    model: 'Standard',
    tonnage: 80,
    cruiseMP: 4,
    motionType: 'Rail',
    armor: [12, 10, 10, 8],
    equipmentByLocation: {
      'Body Equipment': ['Cargo (50 tons)'],
    },
    rawTags: {
      bar: '5',
      cargo: '50',
    },
  });
}

/**
 * Create a maglev support vehicle document
 */
export function createMaglevSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'High Speed Transport',
    model: 'Express',
    tonnage: 70,
    cruiseMP: 12,
    motionType: 'Maglev',
    armor: [14, 12, 12, 10],
    equipmentByLocation: {},
    rawTags: {
      bar: '6',
      passengers: '100',
    },
  });
}

/**
 * Create a support vehicle with Clan tech base
 */
export function createClanSupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Logistics Carrier',
    model: 'Clan',
    type: 'Clan Level 2',
    tonnage: 40,
    cruiseMP: 5,
    motionType: 'Tracked',
    armor: [16, 12, 12, 8],
    equipmentByLocation: {},
    rawTags: {
      bar: '7',
      cargo: '20',
    },
  });
}

/**
 * Create a stationary support vehicle (0 MP)
 */
export function createStationarySupportVehicleDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Generator Platform',
    model: 'Industrial',
    tonnage: 25,
    cruiseMP: 0,
    motionType: 'Fixed',
    armor: [10, 8, 8, 6],
    equipmentByLocation: {
      'Body Equipment': ['Fusion Engine (10 tons)'],
    },
    rawTags: {
      bar: '5',
    },
  });
}

/**
 * Create a support vehicle with equipment in multiple locations
 */
export function createMultiLocationEquipmentDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Construction Vehicle',
    model: 'Engineering',
    tonnage: 35,
    cruiseMP: 3,
    motionType: 'Tracked',
    armor: [12, 10, 10, 6],
    equipmentByLocation: {
      'Front Equipment': ['Bulldozer Blade'],
      'Body Equipment': ['Lift Hoist (5 tons)'],
      'Turret Equipment': ['Crane Arm'],
      'Rear Equipment': ['Dump Bed'],
    },
    rawTags: {
      bar: '5',
      cargo: '8',
    },
  });
}

// ============================================================================
// Tests
// ============================================================================
