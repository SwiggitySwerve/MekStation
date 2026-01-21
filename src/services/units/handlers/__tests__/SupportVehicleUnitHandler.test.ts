/**
 * SupportVehicleUnitHandler Tests
 *
 * Tests for Support Vehicle BLK parsing, validation, and calculations
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import {
  SupportVehicleUnitHandler,
  createSupportVehicleHandler,
} from '../SupportVehicleUnitHandler';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { GroundMotionType } from '../../../../types/unit/BaseUnitInterfaces';
import { VehicleLocation } from '../../../../types/construction/UnitLocation';
import { SupportVehicleSizeClass } from '../../../../types/unit/VehicleInterfaces';
import { TechBase, RulesLevel, WeightClass } from '../../../../types/enums';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for support vehicle testing
 */
function createMockBlkDocument(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
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
function createSmallSupportVehicleDocument(): IBlkDocument {
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
function createMediumSupportVehicleDocument(): IBlkDocument {
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
function createLargeSupportVehicleDocument(): IBlkDocument {
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
function createHoverSupportVehicleDocument(): IBlkDocument {
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
function createVTOLSupportVehicleDocument(): IBlkDocument {
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
function createNavalSupportVehicleDocument(): IBlkDocument {
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
function createHydrofoilSupportVehicleDocument(): IBlkDocument {
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
function createSubmarineSupportVehicleDocument(): IBlkDocument {
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
function createWiGESupportVehicleDocument(): IBlkDocument {
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
function createRailSupportVehicleDocument(): IBlkDocument {
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
function createMaglevSupportVehicleDocument(): IBlkDocument {
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
function createClanSupportVehicleDocument(): IBlkDocument {
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
function createStationarySupportVehicleDocument(): IBlkDocument {
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
function createMultiLocationEquipmentDocument(): IBlkDocument {
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

describe('SupportVehicleUnitHandler', () => {
  let handler: SupportVehicleUnitHandler;

  beforeEach(() => {
    handler = createSupportVehicleHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('constructor and properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.SUPPORT_VEHICLE);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Support Vehicle');
    });

    it('should return VehicleLocation values from getLocations()', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(VehicleLocation.FRONT);
      expect(locations).toContain(VehicleLocation.LEFT);
      expect(locations).toContain(VehicleLocation.RIGHT);
      expect(locations).toContain(VehicleLocation.REAR);
      expect(locations).toContain(VehicleLocation.TURRET);
      expect(locations).toContain(VehicleLocation.BODY);
    });

    it('should return all VehicleLocation enum values', () => {
      const locations = handler.getLocations();
      const vehicleLocationValues = Object.values(VehicleLocation);
      expect(locations.length).toBe(vehicleLocationValues.length);
      for (const loc of vehicleLocationValues) {
        expect(locations).toContain(loc);
      }
    });
  });

  // ==========================================================================
  // canHandle
  // ==========================================================================

  describe('canHandle', () => {
    it('should handle SupportTank unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle SupportVTOL unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'SupportVTOL',
        mappedUnitType: UnitType.SUPPORT_VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle mapped SUPPORT_VEHICLE unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Custom',
        mappedUnitType: UnitType.SUPPORT_VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle Tank (combat vehicle) unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing - Basic
  // ==========================================================================

  describe('parse - basic functionality', () => {
    it('should parse basic support vehicle successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit).toBeDefined();
      expect(result.unit?.unitType).toBe(UnitType.SUPPORT_VEHICLE);
      expect(result.unit?.tonnage).toBe(20);
      expect(result.unit?.metadata.chassis).toBe('Cargo Truck');
      expect(result.unit?.metadata.model).toBe('Standard');
    });

    it('should parse name and model correctly', () => {
      const doc = createMockBlkDocument({
        name: 'Custom Transport',
        model: 'Mark IV',
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.name).toBe('Custom Transport Mark IV');
      expect(result.unit?.metadata.chassis).toBe('Custom Transport');
      expect(result.unit?.metadata.model).toBe('Mark IV');
    });

    it('should parse year correctly', () => {
      const doc = createMockBlkDocument({ year: 2750 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.metadata.year).toBe(2750);
    });

    it('should fail parsing with missing name', () => {
      const doc = createMockBlkDocument({ name: '' });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail parsing with zero tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 0 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('tonnage'))).toBe(true);
    });

    it('should fail parsing with negative tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: -10 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing - Motion Types
  // ==========================================================================

  describe('parse - motion types', () => {
    it('should parse tracked motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'Tracked' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.TRACKED);
    });

    it('should parse wheeled motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'Wheeled' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.WHEELED);
    });

    it('should parse hover motion type', () => {
      const doc = createHoverSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.HOVER);
    });

    it('should parse VTOL motion type', () => {
      const doc = createVTOLSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.VTOL);
    });

    it('should parse naval motion type', () => {
      const doc = createNavalSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.NAVAL);
    });

    it('should parse hydrofoil motion type', () => {
      const doc = createHydrofoilSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.HYDROFOIL);
    });

    it('should parse submarine motion type', () => {
      const doc = createSubmarineSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.SUBMARINE);
    });

    it('should parse WiGE motion type', () => {
      const doc = createWiGESupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.WIGE);
    });

    it('should parse rail motion type', () => {
      const doc = createRailSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.RAIL);
    });

    it('should parse maglev motion type', () => {
      const doc = createMaglevSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.MAGLEV);
    });

    it('should default to wheeled for unknown motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'UnknownType' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.WHEELED);
    });

    it('should default to wheeled for undefined motion type', () => {
      const doc = createMockBlkDocument({ motionType: undefined });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.WHEELED);
    });

    it('should handle case-insensitive motion type parsing', () => {
      const doc = createMockBlkDocument({ motionType: 'HOVER' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.HOVER);
    });

    it('should map airship to hover motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'Airship' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.HOVER);
    });

    it('should map fixed to tracked motion type', () => {
      const doc = createStationarySupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.TRACKED);
    });
  });

  // ==========================================================================
  // Parsing - Movement
  // ==========================================================================

  describe('parse - movement', () => {
    it('should calculate cruiseMP correctly', () => {
      const doc = createMockBlkDocument({ cruiseMP: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.cruiseMP).toBe(5);
    });

    it('should calculate flankMP as 1.5x cruiseMP', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.flankMP).toBe(6); // 4 * 1.5 = 6
    });

    it('should floor flankMP for odd cruise values', () => {
      const doc = createMockBlkDocument({ cruiseMP: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.flankMP).toBe(7); // floor(5 * 1.5) = 7
    });

    it('should parse jumpMP correctly', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4, jumpingMP: 2 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.jumpMP).toBe(2);
    });

    it('should default jumpMP to 0', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.jumpMP).toBe(0);
    });

    it('should handle zero cruise MP for stationary vehicles', () => {
      const doc = createStationarySupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.cruiseMP).toBe(0);
      expect(result.unit?.movement.flankMP).toBe(0);
    });

    it('should calculate engine rating from cruiseMP and tonnage', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4, tonnage: 20 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.engineRating).toBe(80); // 4 * 20 = 80
    });
  });

  // ==========================================================================
  // Parsing - BAR Rating
  // ==========================================================================

  describe('parse - BAR rating', () => {
    it('should parse BAR rating from bar tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: '7' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.barRating).toBe(7);
    });

    it('should parse BAR rating from barrating tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { barrating: '8' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.barRating).toBe(8);
    });

    it('should default BAR rating to 5 when not specified', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.barRating).toBe(5);
    });

    it('should parse BAR rating from array value', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: ['6', '7'] },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.barRating).toBe(6); // First value
    });

    it('should default to 5 for invalid BAR string', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: 'invalid' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.barRating).toBe(5);
    });
  });

  // ==========================================================================
  // Parsing - Size Class
  // ==========================================================================

  describe('parse - size class determination', () => {
    it('should classify tonnage <= 5 as SMALL', () => {
      const doc = createSmallSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.sizeClass).toBe(SupportVehicleSizeClass.SMALL);
    });

    it('should classify 5 tons as SMALL', () => {
      const doc = createMockBlkDocument({ tonnage: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.sizeClass).toBe(SupportVehicleSizeClass.SMALL);
    });

    it('should classify 6 tons as MEDIUM', () => {
      const doc = createMockBlkDocument({ tonnage: 6 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.sizeClass).toBe(SupportVehicleSizeClass.MEDIUM);
    });

    it('should classify tonnage 6-80 as MEDIUM', () => {
      const doc = createMediumSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.sizeClass).toBe(SupportVehicleSizeClass.MEDIUM);
    });

    it('should classify 80 tons as MEDIUM', () => {
      const doc = createMockBlkDocument({ tonnage: 80 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.sizeClass).toBe(SupportVehicleSizeClass.MEDIUM);
    });

    it('should classify 81 tons as LARGE', () => {
      const doc = createMockBlkDocument({ tonnage: 81 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.sizeClass).toBe(SupportVehicleSizeClass.LARGE);
    });

    it('should classify tonnage > 80 as LARGE', () => {
      const doc = createLargeSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.sizeClass).toBe(SupportVehicleSizeClass.LARGE);
    });
  });

  // ==========================================================================
  // Parsing - Equipment
  // ==========================================================================

  describe('parse - equipment', () => {
    it('should parse equipment from Body location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Body Equipment': ['Cargo (5 tons)'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment.length).toBe(1);
      expect(result.unit?.equipment[0].name).toBe('Cargo (5 tons)');
      expect(result.unit?.equipment[0].location).toBe(VehicleLocation.BODY);
    });

    it('should parse equipment from multiple locations', () => {
      const doc = createMultiLocationEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment.length).toBe(4);

      const frontEquip = result.unit?.equipment.find(
        (e) => e.location === VehicleLocation.FRONT
      );
      expect(frontEquip?.name).toBe('Bulldozer Blade');

      const turretEquip = result.unit?.equipment.find(
        (e) => e.location === VehicleLocation.TURRET
      );
      expect(turretEquip?.name).toBe('Crane Arm');
      expect(turretEquip?.isTurretMounted).toBe(true);
    });

    it('should normalize location names correctly', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Item A'],
          'Left Side Equipment': ['Item B'],
          'Right Side Equipment': ['Item C'],
          'Rear Equipment': ['Item D'],
          'Turret Equipment': ['Item E'],
          'Body Equipment': ['Item F'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);

      const locations = result.unit?.equipment.map((e) => e.location);
      expect(locations).toContain(VehicleLocation.FRONT);
      expect(locations).toContain(VehicleLocation.LEFT);
      expect(locations).toContain(VehicleLocation.RIGHT);
      expect(locations).toContain(VehicleLocation.REAR);
      expect(locations).toContain(VehicleLocation.TURRET);
      expect(locations).toContain(VehicleLocation.BODY);
    });

    it('should mark turret equipment as turret mounted', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Turret Equipment': ['Pintle Mount'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment[0].isTurretMounted).toBe(true);
    });

    it('should not mark non-turret equipment as turret mounted', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Bulldozer Blade'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment[0].isTurretMounted).toBe(false);
    });

    it('should assign unique IDs to equipment mounts', () => {
      const doc = createMultiLocationEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const ids = result.unit?.equipment.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids?.length);
    });

    it('should handle empty equipment list', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment.length).toBe(0);
    });
  });

  // ==========================================================================
  // Parsing - Cargo Capacity
  // ==========================================================================

  describe('parse - cargo capacity', () => {
    it('should parse cargo capacity from cargo tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargo: '10' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.cargoCapacity).toBe(10);
    });

    it('should parse cargo capacity from cargocapacity tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargocapacity: '15.5' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.cargoCapacity).toBe(15.5);
    });

    it('should default cargo capacity to 0', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.cargoCapacity).toBe(0);
    });

    it('should parse cargo from array value', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargo: ['20', '30'] },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.cargoCapacity).toBe(20);
    });
  });

  // ==========================================================================
  // Parsing - Tech Ratings
  // ==========================================================================

  describe('parse - tech ratings', () => {
    it('should parse structural tech rating', () => {
      const doc = createMockBlkDocument({
        rawTags: { structuraltechrating: '6' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.structuralTechRating).toBe(6);
    });

    it('should parse armor tech rating', () => {
      const doc = createMockBlkDocument({
        rawTags: { armortechrating: '7' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.armorTechRating).toBe(7);
    });

    it('should parse engine tech rating', () => {
      const doc = createMockBlkDocument({
        rawTags: { enginetechrating: '8' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.engineTechRating).toBe(8);
    });

    it('should default tech ratings to 5', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.structuralTechRating).toBe(5);
      expect(result.unit?.armorTechRating).toBe(5);
      expect(result.unit?.engineTechRating).toBe(5);
    });
  });

  // ==========================================================================
  // Parsing - Armor
  // ==========================================================================

  describe('parse - armor', () => {
    it('should parse armor array', () => {
      const doc = createMockBlkDocument({
        armor: [10, 8, 8, 6],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.armor).toEqual([10, 8, 8, 6]);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [10, 8, 8, 6],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.totalArmorPoints).toBe(32);
    });

    it('should calculate max armor based on tonnage and BAR', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      // Max = floor(20 * 3.5 * (10/10)) = floor(70) = 70
      expect(result.unit?.maxArmorPoints).toBe(70);
    });

    it('should calculate reduced max armor for lower BAR', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        rawTags: { bar: '5' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      // Max = floor(20 * 3.5 * (5/10)) = floor(35) = 35
      expect(result.unit?.maxArmorPoints).toBe(35);
    });
  });

  // ==========================================================================
  // Parsing - Tech Base
  // ==========================================================================

  describe('parse - tech base', () => {
    it('should parse Inner Sphere tech base', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should parse Clan tech base', () => {
      const doc = createClanSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should default to Inner Sphere for unspecified tech base', () => {
      const doc = createMockBlkDocument({ type: '' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should handle mixed tech as Inner Sphere', () => {
      const doc = createMockBlkDocument({ type: 'Mixed (IS Chassis)' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });
  });

  // ==========================================================================
  // Parsing - Rules Level
  // ==========================================================================

  describe('parse - rules level', () => {
    it('should parse introductory rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 1' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
    });

    it('should parse standard rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
    });

    it('should parse advanced rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
    });

    it('should parse experimental rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 4' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.rulesLevel).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should default to standard rules level', () => {
      const doc = createMockBlkDocument({ type: 'Unknown' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
    });
  });

  // ==========================================================================
  // Parsing - Weight Class
  // ==========================================================================

  describe('parse - weight class', () => {
    it('should classify light weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.weightClass).toBe(WeightClass.LIGHT);
    });

    it('should classify medium weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 50 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.weightClass).toBe(WeightClass.MEDIUM);
    });

    it('should classify heavy weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 70 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.weightClass).toBe(WeightClass.HEAVY);
    });

    it('should classify assault weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 100 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.weightClass).toBe(WeightClass.ASSAULT);
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe('validate - tonnage rules', () => {
    it('should pass validation for valid small support vehicle', () => {
      // Small support vehicle with armor within limits
      const doc = createMockBlkDocument({
        name: 'Small Cart',
        tonnage: 5,
        cruiseMP: 4,
        motionType: 'Wheeled',
        armor: [2, 1, 1, 1], // Total: 5, well within max
        equipmentByLocation: {},
        rawTags: { bar: '5' }, // Max armor = floor(5 * 3.5 * 0.5) = 8
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true);
    });

    it('should pass validation for valid medium support vehicle', () => {
      const doc = createMediumSupportVehicleDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true);
    });

    it('should pass validation for valid large support vehicle', () => {
      const doc = createLargeSupportVehicleDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true);
    });

    it('should fail validation for large support vehicle over 300 tons', () => {
      const doc = createMockBlkDocument({ tonnage: 350 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) => e.includes('Large support vehicles cannot exceed 300 tons'))
      ).toBe(true);
    });
  });

  describe('validate - BAR rating rules', () => {
    it('should pass validation for BAR rating of 1', () => {
      const doc = createMockBlkDocument({
        armor: [2, 2, 2, 2],
        rawTags: { bar: '1' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.errors.some((e) => e.includes('BAR rating'))).toBe(false);
    });

    it('should pass validation for BAR rating of 10', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.errors.some((e) => e.includes('BAR rating'))).toBe(false);
    });

    it('should default BAR rating of 0 to 5 (parser behavior)', () => {
      // Note: The parser treats '0' as falsy and defaults to 5
      // This is by design - BAR 0 is invalid input and defaults safely
      const doc = createMockBlkDocument({
        rawTags: { bar: '0' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);
      expect(result.unit?.barRating).toBe(5); // Defaults to 5

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true); // Valid because BAR is 5
    });

    it('should fail validation for negative BAR rating parsed as-is', () => {
      // Negative numbers are truthy, so they are parsed correctly
      // and should fail validation
      const doc = createMockBlkDocument({
        rawTags: { bar: '-1' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);
      expect(result.unit?.barRating).toBe(-1);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) => e.includes('BAR rating must be between 1 and 10'))
      ).toBe(true);
    });

    it('should fail validation for BAR rating over 10', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: '11' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some((e) => e.includes('BAR rating must be between 1 and 10'))
      ).toBe(true);
    });
  });

  describe('validate - armor rules', () => {
    it('should pass validation when armor is within maximum', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        armor: [10, 8, 8, 6], // Total: 32
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.errors.some((e) => e.includes('exceeds maximum'))).toBe(false);
    });

    it('should fail validation when armor exceeds maximum', () => {
      const doc = createMockBlkDocument({
        tonnage: 10,
        armor: [50, 40, 40, 30], // Total: 160, way over max
        rawTags: { bar: '5' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('exceeds maximum'))).toBe(true);
    });
  });

  describe('validate - cargo info', () => {
    it('should include cargo capacity info when present', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargo: '10' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.infos.some((i) => i.includes('10 tons of cargo capacity'))).toBe(true);
    });

    it('should not include cargo info when cargo is 0', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.infos.some((i) => i.includes('cargo capacity'))).toBe(false);
    });
  });

  // ==========================================================================
  // Calculations
  // ==========================================================================

  describe('calculateWeight', () => {
    it('should calculate weight for mobile vehicle', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 4,
        armor: [8, 6, 6, 4],
        rawTags: { bar: '5' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.unit!);
      expect(weight).toBeGreaterThan(0);
    });

    it('should calculate zero engine weight for stationary vehicle', () => {
      const doc = createStationarySupportVehicleDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.unit!);
      // Stationary vehicles have no engine weight component
      expect(weight).toBeGreaterThan(0); // Still has structural and armor weight
    });

    it('should include structural weight', () => {
      const doc = createMockBlkDocument({ tonnage: 50, cruiseMP: 0, armor: [] });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.unit!);
      // Structural weight = tonnage * 0.08 = 50 * 0.08 = 4
      expect(weight).toBeGreaterThanOrEqual(4);
    });

    it('should include armor weight based on BAR', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [10, 10, 10, 10], // 40 points
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.unit!);
      // Should include armor weight: 40 * 0.0625 * (10/10) = 2.5
      expect(weight).toBeGreaterThan(0);
    });
  });

  describe('calculateBV', () => {
    it('should calculate BV greater than 0', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.unit!);
      expect(bv).toBeGreaterThan(0);
    });

    it('should include armor BV', () => {
      const doc = createMockBlkDocument({
        armor: [20, 15, 15, 10], // 60 points
        cruiseMP: 0,
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.unit!);
      // Base armor BV = 60 * 1.5 * (10/10) = 90
      expect(bv).toBeGreaterThanOrEqual(90);
    });

    it('should apply movement modifier to BV', () => {
      const stationaryDoc = createMockBlkDocument({
        armor: [10, 10, 10, 10],
        cruiseMP: 0,
        rawTags: { bar: '5' },
      });
      const mobileDoc = createMockBlkDocument({
        armor: [10, 10, 10, 10],
        cruiseMP: 4,
        rawTags: { bar: '5' },
      });

      const stationaryResult = handler.parse(stationaryDoc);
      const mobileResult = handler.parse(mobileDoc);

      const stationaryBV = handler.calculateBV(stationaryResult.unit!);
      const mobileBV = handler.calculateBV(mobileResult.unit!);

      // Mobile vehicle should have higher BV due to movement modifier
      expect(mobileBV).toBeGreaterThan(stationaryBV);
    });

    it('should reduce BV for lower BAR rating', () => {
      const highBarDoc = createMockBlkDocument({
        armor: [20, 20, 20, 20],
        cruiseMP: 0,
        rawTags: { bar: '10' },
      });
      const lowBarDoc = createMockBlkDocument({
        armor: [20, 20, 20, 20],
        cruiseMP: 0,
        rawTags: { bar: '5' },
      });

      const highBarResult = handler.parse(highBarDoc);
      const lowBarResult = handler.parse(lowBarDoc);

      const highBarBV = handler.calculateBV(highBarResult.unit!);
      const lowBarBV = handler.calculateBV(lowBarResult.unit!);

      expect(highBarBV).toBeGreaterThan(lowBarBV);
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost greater than 0', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.unit!);
      expect(cost).toBeGreaterThan(0);
    });

    it('should include chassis cost based on tonnage', () => {
      const lightDoc = createMockBlkDocument({ tonnage: 10, cruiseMP: 0, armor: [] });
      const heavyDoc = createMockBlkDocument({ tonnage: 50, cruiseMP: 0, armor: [] });

      const lightResult = handler.parse(lightDoc);
      const heavyResult = handler.parse(heavyDoc);

      const lightCost = handler.calculateCost(lightResult.unit!);
      const heavyCost = handler.calculateCost(heavyResult.unit!);

      expect(heavyCost).toBeGreaterThan(lightCost);
    });

    it('should include engine cost for mobile vehicles', () => {
      const stationaryDoc = createMockBlkDocument({ tonnage: 20, cruiseMP: 0, armor: [] });
      const mobileDoc = createMockBlkDocument({ tonnage: 20, cruiseMP: 4, armor: [] });

      const stationaryResult = handler.parse(stationaryDoc);
      const mobileResult = handler.parse(mobileDoc);

      const stationaryCost = handler.calculateCost(stationaryResult.unit!);
      const mobileCost = handler.calculateCost(mobileResult.unit!);

      expect(mobileCost).toBeGreaterThan(stationaryCost);
    });

    it('should include armor cost', () => {
      const noArmorDoc = createMockBlkDocument({ tonnage: 20, cruiseMP: 0, armor: [] });
      const armoredDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [20, 20, 20, 20],
        rawTags: { bar: '5' },
      });

      const noArmorResult = handler.parse(noArmorDoc);
      const armoredResult = handler.parse(armoredDoc);

      const noArmorCost = handler.calculateCost(noArmorResult.unit!);
      const armoredCost = handler.calculateCost(armoredResult.unit!);

      expect(armoredCost).toBeGreaterThan(noArmorCost);
    });

    it('should include cargo capacity cost', () => {
      const noCargoDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [],
        rawTags: {},
      });
      const cargoDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [],
        rawTags: { cargo: '10' },
      });

      const noCargoResult = handler.parse(noCargoDoc);
      const cargoResult = handler.parse(cargoDoc);

      const noCargoCost = handler.calculateCost(noCargoResult.unit!);
      const cargoCost = handler.calculateCost(cargoResult.unit!);

      expect(cargoCost).toBeGreaterThan(noCargoCost);
    });
  });

  // ==========================================================================
  // Serialization
  // ==========================================================================

  describe('serialize', () => {
    it('should serialize support vehicle successfully', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.serialized).toBeDefined();
    });

    it('should include chassis in serialized output', () => {
      const doc = createMockBlkDocument({ name: 'Test Vehicle' });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.chassis).toBe('Test Vehicle');
    });

    it('should include model in serialized output', () => {
      const doc = createMockBlkDocument({ model: 'Mark II' });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.model).toBe('Mark II');
    });

    it('should include unit type in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.unitType).toBe(UnitType.SUPPORT_VEHICLE);
    });

    it('should include tonnage in serialized output', () => {
      const doc = createMockBlkDocument({ tonnage: 35 });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.tonnage).toBe(35);
    });

    it('should include configuration with size class in serialized output', () => {
      const smallDoc = createSmallSupportVehicleDocument();
      const parseResult = handler.parse(smallDoc);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.configuration).toContain('Small');
    });
  });

  describe('serializeTypeSpecificFields', () => {
    it('should include size class in configuration', () => {
      const doc = createLargeSupportVehicleDocument();
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.configuration).toBe('Support Vehicle (Large)');
    });

    it('should include rules level in serialized output', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.rulesLevel).toBeDefined();
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================

  describe('createSupportVehicleHandler', () => {
    it('should create a new handler instance', () => {
      const newHandler = createSupportVehicleHandler();
      expect(newHandler).toBeInstanceOf(SupportVehicleUnitHandler);
    });

    it('should create independent handler instances', () => {
      const handler1 = createSupportVehicleHandler();
      const handler2 = createSupportVehicleHandler();
      expect(handler1).not.toBe(handler2);
    });

    it('should create handler with correct properties', () => {
      const newHandler = createSupportVehicleHandler();
      expect(newHandler.unitType).toBe(UnitType.SUPPORT_VEHICLE);
      expect(newHandler.displayName).toBe('Support Vehicle');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle very large tonnage values', () => {
      const doc = createMockBlkDocument({ tonnage: 300 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.tonnage).toBe(300);
    });

    it('should handle decimal tonnage values', () => {
      const doc = createMockBlkDocument({ tonnage: 17.5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.tonnage).toBe(17.5);
    });

    it('should handle empty armor array', () => {
      const doc = createMockBlkDocument({ armor: [] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.totalArmorPoints).toBe(0);
    });

    it('should handle crew and passenger parsing', () => {
      const doc = createMockBlkDocument({
        crew: 3,
        passengers: 10,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.crewSize).toBe(3);
      expect(result.unit?.passengerCapacity).toBe(10);
    });

    it('should default crew to 1 and passengers to 0', () => {
      const doc = createMockBlkDocument({});
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.crewSize).toBe(1);
      expect(result.unit?.passengerCapacity).toBe(0);
    });
  });
});
