/**
 * VehicleUnitHandler Tests
 *
 * Tests for vehicle BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.2.8
 */

import { VehicleUnitHandler, createVehicleHandler } from '../VehicleUnitHandler';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { GroundMotionType } from '../../../../types/unit/BaseUnitInterfaces';
import { VehicleLocation } from '../../../../types/construction/UnitLocation';
import { TurretType } from '../../../../types/unit/VehicleInterfaces';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for testing
 */
function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {}
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Tank',
    mappedUnitType: UnitType.VEHICLE,
    name: 'Scorpion',
    model: 'Light Tank',
    year: 2807,
    type: 'IS Level 1',
    tonnage: 25,
    cruiseMP: 4,
    armor: [16, 12, 12, 10, 8],
    equipmentByLocation: {
      'Front Equipment': ['Medium Laser'],
      'Turret Equipment': ['AC/5', 'Ammo AC/5'],
    },
    rawTags: {},
    ...overrides,
  };
}

/**
 * Create a tracked tank document
 */
function createTrackedTankDocument(): IBlkDocument {
  return createMockBlkDocument({
    motionType: 'Tracked',
    tonnage: 60,
    cruiseMP: 4,
    armor: [40, 30, 30, 20, 30],
    equipmentByLocation: {
      'Turret Equipment': ['Large Laser', 'Medium Laser', 'Medium Laser'],
      'Front Equipment': ['Machine Gun'],
      'Body Equipment': ['Ammo MG (100)'],
    },
    rawTags: {},
  });
}

/**
 * Create a hover tank document
 */
function createHoverTankDocument(): IBlkDocument {
  return createMockBlkDocument({
    motionType: 'Hover',
    tonnage: 35,
    cruiseMP: 8,
    jumpingMP: 0,
    armor: [24, 18, 18, 12, 16],
    equipmentByLocation: {
      'Turret Equipment': ['SRM 4', 'SRM 4'],
      'Body Equipment': ['Ammo SRM 4 (25)'],
    },
    rawTags: {},
  });
}

/**
 * Create a superheavy vehicle document
 */
function createSuperheavyDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Behemoth',
    model: 'II',
    tonnage: 150,
    motionType: 'Tracked',
    cruiseMP: 2,
    armor: [100, 80, 80, 60, 60],
    type: 'IS Level 2',
    equipmentByLocation: {
      'Turret Equipment': ['Gauss Rifle', 'Large Laser', 'Large Laser'],
    },
    rawTags: {},
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('VehicleUnitHandler', () => {
  let handler: VehicleUnitHandler;

  beforeEach(() => {
    handler = createVehicleHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.VEHICLE);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Combat Vehicle');
    });

    it('should return vehicle locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(VehicleLocation.FRONT);
      expect(locations).toContain(VehicleLocation.TURRET);
      expect(locations).toContain(VehicleLocation.BODY);
    });
  });

  describe('canHandle', () => {
    it('should handle Tank unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle mapped Vehicle unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Naval',
        mappedUnitType: UnitType.VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic tank successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit).toBeDefined();
      expect(result.unit?.unitType).toBe(UnitType.VEHICLE);
      expect(result.unit?.tonnage).toBe(25);
      expect(result.unit?.metadata.chassis).toBe('Scorpion');
      expect(result.unit?.metadata.model).toBe('Light Tank');
    });

    it('should parse tracked tank motion type', () => {
      const doc = createTrackedTankDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.TRACKED);
    });

    it('should parse hover tank motion type', () => {
      const doc = createHoverTankDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(GroundMotionType.HOVER);
    });

    it('should calculate flank MP correctly', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.cruiseMP).toBe(4);
      expect(result.unit?.movement.flankMP).toBe(6); // 4 * 1.5 = 6
    });

    it('should parse armor by location', () => {
      const doc = createMockBlkDocument({
        armor: [20, 15, 15, 10, 12],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.armorByLocation[VehicleLocation.FRONT]).toBe(20);
      expect(result.unit?.armorByLocation[VehicleLocation.LEFT]).toBe(15);
      expect(result.unit?.armorByLocation[VehicleLocation.RIGHT]).toBe(15);
      expect(result.unit?.armorByLocation[VehicleLocation.REAR]).toBe(10);
      expect(result.unit?.armorByLocation[VehicleLocation.TURRET]).toBe(12);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [20, 15, 15, 10, 12], // Total: 72
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.totalArmorPoints).toBe(72);
    });

    it('should detect turret from equipment', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Turret Equipment': ['AC/5'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.turret).toBeDefined();
      expect(result.unit?.turret?.type).toBe(TurretType.SINGLE);
    });

    it('should parse equipment locations', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Medium Laser'],
          'Turret Equipment': ['AC/5'],
          'Body Equipment': ['Ammo AC/5'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment.length).toBe(3);

      const frontEquip = result.unit?.equipment.find(
        (e) => e.location === VehicleLocation.FRONT
      );
      expect(frontEquip?.name).toBe('Medium Laser');
      expect(frontEquip?.isTurretMounted).toBe(false);

      const turretEquip = result.unit?.equipment.find(
        (e) => e.location === VehicleLocation.TURRET
      );
      expect(turretEquip?.name).toBe('AC/5');
      expect(turretEquip?.isTurretMounted).toBe(true);
    });

    it('should identify superheavy vehicles', () => {
      const doc = createSuperheavyDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.isSuperheavy).toBe(true);
    });

    it('should parse tech base from type string', () => {
      const isDoc = createMockBlkDocument({ type: 'IS Level 2' });
      const clanDoc = createMockBlkDocument({ type: 'Clan Level 3' });

      const isResult = handler.parse(isDoc);
      const clanResult = handler.parse(clanDoc);

      expect(isResult.unit?.techBase).toBe('Inner Sphere');
      expect(clanResult.unit?.techBase).toBe('Clan');
    });
  });

  describe('validate', () => {
    it('should pass validation for valid vehicle', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.unit!);
      expect(validateResult.isValid).toBe(true);
      expect(validateResult.errors).toHaveLength(0);
    });

    it('should fail validation for zero tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 0 });
      const parseResult = handler.parse(doc);

      // Parse will fail due to invalid tonnage
      expect(parseResult.success).toBe(false);
      expect(parseResult.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation for excessive armor', () => {
      const doc = createMockBlkDocument({
        tonnage: 25,
        armor: [100, 100, 100, 100, 100], // Way over max
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.unit!);
      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('exceeds maximum'))).toBe(
        true
      );
    });

    it('should warn about hover vehicles over 50 tons', () => {
      const baseDoc = createHoverTankDocument();
      const modifiedDoc: IBlkDocument = { ...baseDoc, tonnage: 55 };
      const parseResult = handler.parse(modifiedDoc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.unit!);
      expect(
        validateResult.warnings.some((w) => w.includes('Hover vehicles over 50 tons'))
      ).toBe(true);
    });
  });

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.unit!);
      expect(weight).toBeGreaterThan(0);
    });

    it('should calculate BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.unit!);
      expect(bv).toBeGreaterThan(0);
    });

    it('should calculate cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.unit!);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('serialization', () => {
    it('should serialize vehicle', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.serialized).toBeDefined();
      expect(serializeResult.serialized?.chassis).toBe('Scorpion');
      expect(serializeResult.serialized?.model).toBe('Light Tank');
    });
  });
});
