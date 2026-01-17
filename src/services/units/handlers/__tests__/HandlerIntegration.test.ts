/**
 * Handler Integration Tests
 *
 * Tests the full handler registration and parsing flow across all unit types.
 * Validates that all 13 handlers work correctly with the UnitTypeRegistry.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import {
  UnitTypeRegistry,
  getUnitTypeRegistry,
} from '../../UnitTypeRegistry';
import {
  initializeUnitTypeHandlers,
  resetHandlerInitialization,
  getSupportedUnitTypes,
} from '../initializeHandlers';

// ============================================================================
// Test Setup
// ============================================================================

describe('Handler Integration', () => {
  beforeEach(() => {
    // Clear registry before each test
    const registry = getUnitTypeRegistry() as UnitTypeRegistry;
    registry.clear();
    resetHandlerInitialization();
  });

  afterEach(() => {
    // Clean up
    const registry = getUnitTypeRegistry() as UnitTypeRegistry;
    registry.clear();
    resetHandlerInitialization();
  });

  // ==========================================================================
  // Handler Registration Tests
  // ==========================================================================

  describe('handler registration', () => {
    it('should register all 13 handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();
      const registeredTypes = registry.getRegisteredTypes();

      expect(registeredTypes.length).toBe(13);
    });

    it('should register vehicle handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.VEHICLE)).toBeDefined();
      expect(registry.getHandler(UnitType.VTOL)).toBeDefined();
      expect(registry.getHandler(UnitType.SUPPORT_VEHICLE)).toBeDefined();
    });

    it('should register aerospace handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.AEROSPACE)).toBeDefined();
      expect(registry.getHandler(UnitType.CONVENTIONAL_FIGHTER)).toBeDefined();
      expect(registry.getHandler(UnitType.SMALL_CRAFT)).toBeDefined();
    });

    it('should register personnel unit handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.BATTLE_ARMOR)).toBeDefined();
      expect(registry.getHandler(UnitType.INFANTRY)).toBeDefined();
      expect(registry.getHandler(UnitType.PROTOMECH)).toBeDefined();
    });

    it('should register capital ship handlers', () => {
      initializeUnitTypeHandlers();
      const registry = getUnitTypeRegistry();

      expect(registry.getHandler(UnitType.DROPSHIP)).toBeDefined();
      expect(registry.getHandler(UnitType.WARSHIP)).toBeDefined();
      expect(registry.getHandler(UnitType.JUMPSHIP)).toBeDefined();
      expect(registry.getHandler(UnitType.SPACE_STATION)).toBeDefined();
    });

    it('should return correct supported unit types', () => {
      const types = getSupportedUnitTypes();

      expect(types).toContain('Vehicle');
      expect(types).toContain('VTOL');
      expect(types).toContain('Support Vehicle');
      expect(types).toContain('Aerospace');
      expect(types).toContain('Conventional Fighter');
      expect(types).toContain('Small Craft');
      expect(types).toContain('Battle Armor');
      expect(types).toContain('Infantry');
      expect(types).toContain('ProtoMech');
      expect(types).toContain('DropShip');
      expect(types).toContain('WarShip');
      expect(types).toContain('JumpShip');
      expect(types).toContain('Space Station');
    });
  });

  // ==========================================================================
  // Handler Parsing Tests
  // ==========================================================================

  describe('handler parsing', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should parse Vehicle document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.VEHICLE);
      const doc = createVehicleDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.VEHICLE);
      expect(result.unit?.tonnage).toBe(60);
    });

    it('should parse VTOL document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.VTOL);
      const doc = createVTOLDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.VTOL);
      expect(result.unit?.tonnage).toBe(20);
    });

    it('should parse Support Vehicle document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.SUPPORT_VEHICLE);
      const doc = createSupportVehicleDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.SUPPORT_VEHICLE);
    });

    it('should parse Aerospace document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.AEROSPACE);
      const doc = createAerospaceDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.AEROSPACE);
      expect(result.unit?.tonnage).toBe(75);
    });

    it('should parse Conventional Fighter document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.CONVENTIONAL_FIGHTER);
      const doc = createConventionalFighterDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.CONVENTIONAL_FIGHTER);
    });

    it('should parse Small Craft document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.SMALL_CRAFT);
      const doc = createSmallCraftDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.SMALL_CRAFT);
      expect(result.unit?.tonnage).toBe(150);
    });

    it('should parse Battle Armor document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.BATTLE_ARMOR);
      const doc = createBattleArmorDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.BATTLE_ARMOR);
    });

    it('should parse Infantry document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.INFANTRY);
      const doc = createInfantryDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.INFANTRY);
    });

    it('should parse ProtoMech document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.PROTOMECH);
      const doc = createProtoMechDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.PROTOMECH);
    });

    it('should parse DropShip document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.DROPSHIP);
      const doc = createDropShipDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.DROPSHIP);
      expect(result.unit?.tonnage).toBe(3500);
    });

    it('should parse WarShip document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.WARSHIP);
      const doc = createWarShipDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.WARSHIP);
    });

    it('should parse JumpShip document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.JUMPSHIP);
      const doc = createJumpShipDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.JUMPSHIP);
    });

    it('should parse Space Station document', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.SPACE_STATION);
      const doc = createSpaceStationDocument();

      const result = handler!.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.unitType).toBe(UnitType.SPACE_STATION);
    });
  });

  // ==========================================================================
  // Handler Lookup Tests
  // ==========================================================================

  describe('handler lookup by document', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should find handler for Tank document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createVehicleDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.VEHICLE);
    });

    it('should find handler for VTOL document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createVTOLDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.VTOL);
    });

    it('should find handler for Aero document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createAerospaceDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.AEROSPACE);
    });

    it('should find handler for BattleArmor document', () => {
      const registry = getUnitTypeRegistry();
      const doc = createBattleArmorDocument();

      const handler = registry.getHandlerForDocument(doc);

      expect(handler).toBeDefined();
      expect(handler?.unitType).toBe(UnitType.BATTLE_ARMOR);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('handler validation', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should validate parsed Vehicle unit', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.VEHICLE);
      const doc = createVehicleDocument();

      const parseResult = handler!.parse(doc);
      expect(parseResult.success).toBe(true);

      const validationResult = handler!.validate(parseResult.unit!);
      expect(validationResult.isValid).toBe(true);
    });

    it('should validate parsed Aerospace unit', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.AEROSPACE);
      const doc = createAerospaceDocument();

      const parseResult = handler!.parse(doc);
      expect(parseResult.success).toBe(true);

      const validationResult = handler!.validate(parseResult.unit!);
      expect(validationResult.isValid).toBe(true);
    });

    it('should validate parsed DropShip unit', () => {
      const registry = getUnitTypeRegistry();
      const handler = registry.getHandler(UnitType.DROPSHIP);
      const doc = createDropShipDocument();

      const parseResult = handler!.parse(doc);
      expect(parseResult.success).toBe(true);

      const validationResult = handler!.validate(parseResult.unit!);
      expect(validationResult.isValid).toBe(true);
    });
  });

  // ==========================================================================
  // Calculation Tests
  // ==========================================================================

  describe('handler calculations', () => {
    beforeEach(() => {
      initializeUnitTypeHandlers();
    });

    it('should calculate weight for all unit types', () => {
      const registry = getUnitTypeRegistry();

      for (const unitType of registry.getRegisteredTypes()) {
        const handler = registry.getHandler(unitType);
        const doc = createDocumentForUnitType(unitType);
        const parseResult = handler!.parse(doc);

        if (parseResult.success && parseResult.unit) {
          const weight = handler!.calculateWeight(parseResult.unit);
          expect(typeof weight).toBe('number');
          expect(weight).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should calculate BV for all unit types', () => {
      const registry = getUnitTypeRegistry();

      for (const unitType of registry.getRegisteredTypes()) {
        const handler = registry.getHandler(unitType);
        const doc = createDocumentForUnitType(unitType);
        const parseResult = handler!.parse(doc);

        if (parseResult.success && parseResult.unit) {
          const bv = handler!.calculateBV(parseResult.unit);
          expect(typeof bv).toBe('number');
          expect(bv).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should calculate cost for all unit types', () => {
      const registry = getUnitTypeRegistry();

      for (const unitType of registry.getRegisteredTypes()) {
        const handler = registry.getHandler(unitType);
        const doc = createDocumentForUnitType(unitType);
        const parseResult = handler!.parse(doc);

        if (parseResult.success && parseResult.unit) {
          const cost = handler!.calculateCost(parseResult.unit);
          expect(typeof cost).toBe('number');
          expect(cost).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});

// ============================================================================
// Test Document Factories
// ============================================================================

function createBaseDocument(
  unitType: string,
  mappedUnitType: UnitType,
  overrides: Partial<IBlkDocument> = {}
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType,
    mappedUnitType,
    name: 'Test Unit',
    model: 'TU-1',
    year: 3050,
    type: 'IS Level 2',
    tonnage: 50,
    armor: [10, 10, 10, 10],
    equipmentByLocation: {},
    rawTags: {},
    ...overrides,
  };
}

function createVehicleDocument(): IBlkDocument {
  return createBaseDocument('Tank', UnitType.VEHICLE, {
    name: 'Rommel',
    model: 'Tank',
    tonnage: 60,
    cruiseMP: 4,
    motionType: 'Tracked',
    armor: [40, 30, 30, 20, 30],
    equipmentByLocation: {
      'Turret Equipment': ['AC/20'],
    },
  });
}

function createVTOLDocument(): IBlkDocument {
  return createBaseDocument('VTOL', UnitType.VTOL, {
    name: 'Yellow Jacket',
    model: 'Gunship',
    tonnage: 20,
    cruiseMP: 10,
    motionType: 'VTOL',
    armor: [16, 12, 12, 8, 2],
    equipmentByLocation: {
      'Chin Equipment': ['Machine Gun', 'Machine Gun'],
    },
  });
}

function createSupportVehicleDocument(): IBlkDocument {
  return createBaseDocument('SupportTank', UnitType.SUPPORT_VEHICLE, {
    name: 'Cargo Truck',
    model: 'Standard',
    tonnage: 10,
    cruiseMP: 5,
    motionType: 'Wheeled',
    armor: [4, 4, 4, 4],
    rawTags: {
      bar: '5',
      cargo: '5',
    },
  });
}

function createAerospaceDocument(): IBlkDocument {
  return createBaseDocument('Aero', UnitType.AEROSPACE, {
    name: 'Stuka',
    model: 'STU-K5',
    tonnage: 75,
    safeThrust: 5,
    fuel: 400,
    structuralIntegrity: 7,
    heatsinks: 15,
    armor: [80, 50, 50, 40],
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser', 'Large Laser'],
      'Left Wing Equipment': ['Medium Laser'],
      'Right Wing Equipment': ['Medium Laser'],
    },
  });
}

function createConventionalFighterDocument(): IBlkDocument {
  return createBaseDocument('ConvFighter', UnitType.CONVENTIONAL_FIGHTER, {
    name: 'Boomerang',
    model: 'Spotter',
    tonnage: 25,
    safeThrust: 8,
    fuel: 160,
    structuralIntegrity: 4,
    armor: [20, 16, 16, 10],
    rawTags: {
      bar: '6',
    },
  });
}

function createSmallCraftDocument(): IBlkDocument {
  return createBaseDocument('SmallCraft', UnitType.SMALL_CRAFT, {
    name: 'K-1',
    model: 'Dropshuttle',
    tonnage: 150,
    safeThrust: 3,
    fuel: 400,
    structuralIntegrity: 6,
    armor: [60, 50, 50, 40],
    crew: 4,
    passengers: 20,
  });
}

function createBattleArmorDocument(): IBlkDocument {
  return createBaseDocument('BattleArmor', UnitType.BATTLE_ARMOR, {
    name: 'Elemental',
    model: '[Point]',
    tonnage: 1,
    type: 'Clan Level 2',
    rawTags: {
      squadsize: '5',
      chassis: 'biped',
      weightclass: 'Medium',
      groundmp: '1',
      jumpmp: '3',
      armorvalue: '5',
    },
  });
}

function createInfantryDocument(): IBlkDocument {
  return createBaseDocument('Infantry', UnitType.INFANTRY, {
    name: 'Foot Rifle Platoon',
    model: '(Standard)',
    tonnage: 0.1, // Infantry uses minimal tonnage
    motionType: 'Foot',
    squadSize: 7,
    squadn: 4,
    primary: 'Rifle',
    cruiseMP: 1,
    armor: [0],
    rawTags: {},
  });
}

function createProtoMechDocument(): IBlkDocument {
  return createBaseDocument('ProtoMech', UnitType.PROTOMECH, {
    name: 'Centaur',
    model: 'Prime',
    tonnage: 5,
    type: 'Clan Level 2',
    cruiseMP: 5,
    jumpingMP: 4,
    armor: [3, 6, 2, 2, 4],
    equipmentByLocation: {
      'Torso Equipment': ['ER Small Laser'],
      'Main Gun Equipment': ['LRM 3'],
    },
    rawTags: {
      pointsize: '5',
    },
  });
}

function createDropShipDocument(): IBlkDocument {
  return createBaseDocument('Dropship', UnitType.DROPSHIP, {
    name: 'Leopard',
    model: 'CV',
    tonnage: 3500,
    motionType: 'Aerodyne',
    safeThrust: 4,
    fuel: 2500,
    structuralIntegrity: 9,
    heatsinks: 100,
    armor: [200, 180, 180, 160, 160, 120],
    crew: 14,
    passengers: 0,
    transporters: ['mechbay:4', 'asfbay:2'],
    equipmentByLocation: {
      'Nose Equipment': ['LRM 20', 'LRM 20'],
    },
  });
}

function createWarShipDocument(): IBlkDocument {
  return createBaseDocument('Warship', UnitType.WARSHIP, {
    name: 'Congress',
    model: 'D-Class Frigate',
    tonnage: 760000,
    motionType: 'Spheroid',
    safeThrust: 3,
    fuel: 5000,
    structuralIntegrity: 50,
    heatsinks: 2000,
    armor: [500, 400, 400, 350, 350, 300],
    crew: 320,
    rawTags: {
      kfdrive: 'true',
      kfintegrity: '15',
    },
  });
}

function createJumpShipDocument(): IBlkDocument {
  return createBaseDocument('Jumpship', UnitType.JUMPSHIP, {
    name: 'Invader',
    model: 'Class JumpShip',
    tonnage: 152000,
    safeThrust: 0,
    fuel: 1500,
    structuralIntegrity: 30,
    armor: [100, 80, 80, 60, 60, 50],
    crew: 28,
    rawTags: {
      kfdrive: 'true',
      dockingcollars: '3',
    },
  });
}

function createSpaceStationDocument(): IBlkDocument {
  return createBaseDocument('SpaceStation', UnitType.SPACE_STATION, {
    name: 'Olympus',
    model: 'Recharge Station',
    tonnage: 50000,
    safeThrust: 0,
    structuralIntegrity: 20,
    armor: [200, 150, 150, 100, 100, 80],
    crew: 120,
    passengers: 500,
    rawTags: {
      stationtype: 'recharge',
      dockingcollars: '4',
      gravdecks: '2',
    },
  });
}

/**
 * Create a document for any unit type
 */
function createDocumentForUnitType(unitType: UnitType): IBlkDocument {
  switch (unitType) {
    case UnitType.VEHICLE:
      return createVehicleDocument();
    case UnitType.VTOL:
      return createVTOLDocument();
    case UnitType.SUPPORT_VEHICLE:
      return createSupportVehicleDocument();
    case UnitType.AEROSPACE:
      return createAerospaceDocument();
    case UnitType.CONVENTIONAL_FIGHTER:
      return createConventionalFighterDocument();
    case UnitType.SMALL_CRAFT:
      return createSmallCraftDocument();
    case UnitType.BATTLE_ARMOR:
      return createBattleArmorDocument();
    case UnitType.INFANTRY:
      return createInfantryDocument();
    case UnitType.PROTOMECH:
      return createProtoMechDocument();
    case UnitType.DROPSHIP:
      return createDropShipDocument();
    case UnitType.WARSHIP:
      return createWarShipDocument();
    case UnitType.JUMPSHIP:
      return createJumpShipDocument();
    case UnitType.SPACE_STATION:
      return createSpaceStationDocument();
    default:
      return createVehicleDocument();
  }
}
