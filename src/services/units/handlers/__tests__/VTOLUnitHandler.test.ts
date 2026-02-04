/**
 * VTOLUnitHandler Tests
 *
 * Tests for VTOL BLK parsing, validation, and serialization
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.2.8
 */

import { VTOLUnitHandler, createVTOLHandler } from '../VTOLUnitHandler';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { GroundMotionType } from '../../../../types/unit/BaseUnitInterfaces';
import { VTOLLocation } from '../../../../types/construction/UnitLocation';
import { TurretType, IVTOL } from '../../../../types/unit/VehicleInterfaces';
import { TechBase, WeightClass, RulesLevel } from '../../../../types/enums';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for VTOL testing
 */
function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {}
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
function createChinTurretVTOLDocument(): IBlkDocument {
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
function createScoutVTOLDocument(): IBlkDocument {
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
function createHeavyVTOLDocument(): IBlkDocument {
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
function createClanVTOLDocument(): IBlkDocument {
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
function createOverweightVTOLDocument(): IBlkDocument {
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
function createNoMovementVTOLDocument(): IBlkDocument {
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
function createCustomRotorVTOLDocument(): IBlkDocument {
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
function createExcessiveRotorArmorDocument(): IBlkDocument {
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

describe('VTOLUnitHandler', () => {
  let handler: VTOLUnitHandler;

  beforeEach(() => {
    handler = createVTOLHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.VTOL);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('VTOL');
    });

    it('should return VTOL locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(VTOLLocation.FRONT);
      expect(locations).toContain(VTOLLocation.LEFT);
      expect(locations).toContain(VTOLLocation.RIGHT);
      expect(locations).toContain(VTOLLocation.REAR);
      expect(locations).toContain(VTOLLocation.TURRET);
      expect(locations).toContain(VTOLLocation.ROTOR);
      expect(locations).toContain(VTOLLocation.BODY);
    });

    it('should return all VTOLLocation enum values', () => {
      const locations = handler.getLocations();
      const enumValues = Object.values(VTOLLocation);
      expect(locations.length).toBe(enumValues.length);
      for (const val of enumValues) {
        expect(locations).toContain(val);
      }
    });
  });

  // ==========================================================================
  // canHandle
  // ==========================================================================

  describe('canHandle', () => {
    it('should handle VTOL unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle mapped VTOL unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'vtol',
        mappedUnitType: UnitType.VTOL,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle Vehicle unit type', () => {
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

    it('should not handle Aerospace unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing - Basic
  // ==========================================================================

  describe('parse - basic', () => {
    it('should parse valid BLK document successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
    });

    it('should parse unit type as VTOL', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.VTOL);
    });

    it('should parse chassis and model', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.metadata.chassis).toBe('Warrior');
      expect(result.data?.unit?.metadata.model).toBe('H-7');
    });

    it('should parse tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 25 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(25);
    });

    it('should construct name from chassis and model', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.name).toBe('Warrior H-7');
    });
  });

  // ==========================================================================
  // Parsing - Motion Type
  // ==========================================================================

  describe('parse - motion type', () => {
    it('should always set motion type to VTOL', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.VTOL);
    });

    it('should ignore motion type override', () => {
      const doc = createMockBlkDocument({ motionType: 'Hover' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.VTOL);
    });
  });

  // ==========================================================================
  // Parsing - Movement
  // ==========================================================================

  describe('parse - movement', () => {
    it('should parse cruise MP', () => {
      const doc = createMockBlkDocument({ cruiseMP: 10 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.cruiseMP).toBe(10);
    });

    it('should calculate flank MP as 1.5x cruise', () => {
      const doc = createMockBlkDocument({ cruiseMP: 8 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.flankMP).toBe(12); // 8 * 1.5 = 12
    });

    it('should floor flank MP for odd cruise values', () => {
      const doc = createMockBlkDocument({ cruiseMP: 7 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.flankMP).toBe(10); // floor(7 * 1.5) = 10
    });

    it('should set jump MP to 0 (VTOLs fly, not jump)', () => {
      const doc = createMockBlkDocument({ jumpingMP: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.jumpMP).toBe(0);
    });

    it('should fail parsing when cruise MP is 0', () => {
      const doc = createNoMovementVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('at least 1 cruise MP'))).toBe(true);
    });

    it('should parse fast scout VTOL movement', () => {
      const doc = createScoutVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.cruiseMP).toBe(12);
      expect(result.data?.unit?.movement.flankMP).toBe(18);
    });
  });

  // ==========================================================================
  // Parsing - Engine
  // ==========================================================================

  describe('parse - engine', () => {
    it('should calculate engine rating as cruise * tonnage', () => {
      const doc = createMockBlkDocument({ cruiseMP: 10, tonnage: 21 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineRating).toBe(210); // 10 * 21
    });

    it('should parse engine type', () => {
      const doc = createMockBlkDocument({ engineType: 1 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineType).toBe(1);
    });

    it('should default engine type to 0', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineType).toBe(0);
    });
  });

  // ==========================================================================
  // Parsing - Armor
  // ==========================================================================

  describe('parse - armor', () => {
    it('should parse armor array by location', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.FRONT]).toBe(16);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.LEFT]).toBe(10);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.RIGHT]).toBe(10);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.REAR]).toBe(8);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.ROTOR]).toBe(2);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2], // Total: 46
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(46);
    });

    it('should calculate max armor points as tonnage * 3.5', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.maxArmorPoints).toBe(70); // 20 * 3.5 = 70
    });

    it('should floor max armor for odd tonnages', () => {
      const doc = createMockBlkDocument({ tonnage: 21 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.maxArmorPoints).toBe(73); // floor(21 * 3.5) = 73
    });

    it('should parse armor type', () => {
      const doc = createMockBlkDocument({ armorType: 2 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorType).toBe(2);
    });

    it('should handle short armor arrays', () => {
      const doc = createMockBlkDocument({
        armor: [10, 8, 8], // Only 3 values
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.FRONT]).toBe(10);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.LEFT]).toBe(8);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.RIGHT]).toBe(8);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.REAR]).toBe(0);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.ROTOR]).toBe(0);
    });

    it('should initialize unparsed locations to 0', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.TURRET]).toBe(0);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.BODY]).toBe(0);
    });
  });

  // ==========================================================================
  // Parsing - Chin Turret
  // ==========================================================================

  describe('parse - chin turret', () => {
    it('should parse chin turret from turrettype tag', () => {
      const doc = createChinTurretVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
      expect(result.data?.unit?.chinTurret?.type).toBe(TurretType.CHIN);
    });

    it('should set chin turret rotation arc to 180', () => {
      const doc = createChinTurretVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret?.rotationArc).toBe(180);
    });

    it('should calculate chin turret max weight as 10% of tonnage', () => {
      const doc = createMockBlkDocument({
        tonnage: 25,
        equipmentByLocation: { Chin: ['SRM 2'] },
        rawTags: { turrettype: 'Chin' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret?.maxWeight).toBe(2.5); // 25 * 0.1
    });

    it('should detect chin turret from Chin equipment location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: { Chin: ['Machine Gun'] },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
    });

    it('should detect chin turret from Turret equipment location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: { Turret: ['Small Laser'] },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
    });

    it('should detect chin turret from Turret Equipment location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: { 'Turret Equipment': ['SRM 2'] },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
    });

    it('should not create turret when no turret equipment', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Medium Laser'],
          'Body Equipment': [],
        },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeUndefined();
    });
  });

  // ==========================================================================
  // Parsing - Equipment
  // ==========================================================================

  describe('parse - equipment', () => {
    it('should parse front equipment', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Medium Laser', 'Small Laser'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const frontEquip = result.data?.unit?.equipment.filter(
        (e) => e.location === VTOLLocation.FRONT
      );
      expect(frontEquip?.length).toBe(2);
    });

    it('should mark turret equipment as turret mounted', () => {
      const doc = createClanVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const turretEquip = result.data?.unit?.equipment.find(
        (e) => e.name === 'Streak SRM 2'
      );
      expect(turretEquip?.isTurretMounted).toBe(true);
    });

    it('should mark chin equipment as turret mounted', () => {
      const doc = createChinTurretVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const chinEquip = result.data?.unit?.equipment.find((e) => e.name === 'SRM 2');
      expect(chinEquip?.isTurretMounted).toBe(true);
    });

    it('should mark non-turret equipment as not turret mounted', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Medium Laser'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const frontEquip = result.data?.unit?.equipment.find(
        (e) => e.name === 'Medium Laser'
      );
      expect(frontEquip?.isTurretMounted).toBe(false);
    });

    it('should assign unique mount IDs', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Machine Gun', 'Machine Gun'],
          'Body Equipment': ['Ammo MG'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const ids = result.data?.unit?.equipment.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids?.length);
    });

    it('should normalize location names', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'left side': ['Small Laser'],
          right: ['Machine Gun'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(
        result.data?.unit?.equipment.some((e) => e.location === VTOLLocation.LEFT)
      ).toBe(true);
      expect(
        result.data?.unit?.equipment.some((e) => e.location === VTOLLocation.RIGHT)
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Parsing - Rotor
  // ==========================================================================

  describe('parse - rotor', () => {
    it('should set rotor hits to 2', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorHits).toBe(2);
    });

    it('should parse rotor type from raw tags', () => {
      const doc = createCustomRotorVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Coaxial');
    });

    it('should default rotor type to Standard', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Standard');
    });
  });

  // ==========================================================================
  // Parsing - Tonnage Limit
  // ==========================================================================

  describe('parse - tonnage limit', () => {
    it('should fail parsing when tonnage exceeds 30', () => {
      const doc = createOverweightVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('cannot exceed 30 tons'))).toBe(
        true
      );
    });

    it('should pass parsing at exactly 30 tons', () => {
      const doc = createHeavyVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(30);
    });

    it('should pass parsing for light VTOL', () => {
      const doc = createScoutVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(15);
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
      expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should parse Clan tech base', () => {
      const doc = createClanVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should default to Inner Sphere for unspecified tech', () => {
      const doc = createMockBlkDocument({ type: 'Level 1' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });
  });

  // ==========================================================================
  // Parsing - Rules Level
  // ==========================================================================

  describe('parse - rules level', () => {
    it('should parse Introductory rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 1' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
    });

    it('should parse Standard rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
    });

    it('should parse Advanced rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
    });

    it('should parse Experimental rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 4' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.EXPERIMENTAL);
    });
  });

  // ==========================================================================
  // Parsing - Weight Class
  // ==========================================================================

  describe('parse - weight class', () => {
    it('should always return LIGHT weight class for VTOLs', () => {
      const doc = createMockBlkDocument({ tonnage: 21 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
    });

    it('should return LIGHT even at max 30 tons', () => {
      const doc = createHeavyVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe('validate', () => {
    it('should pass validation for valid VTOL', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
      expect(validateResult.errors).toHaveLength(0);
    });

    it('should fail validation for tonnage below 1', () => {
      // Create a mock unit directly since parsing would fail
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually create an invalid unit for validation testing
      const invalidUnit = {
        ...parseResult.data!.unit,
        tonnage: 0,
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('at least 1 ton'))
      ).toBe(true);
    });

    it('should fail validation for tonnage over 30', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const invalidUnit = {
        ...parseResult.data!.unit,
        tonnage: 35,
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('cannot exceed 30 tons'))
      ).toBe(true);
    });

    it('should fail validation for zero cruise MP', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const invalidUnit = {
        ...parseResult.data!.unit,
        movement: { cruiseMP: 0, flankMP: 0, jumpMP: 0 },
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('at least 1 cruise MP'))
      ).toBe(true);
    });

    it('should fail validation when armor exceeds max', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const invalidUnit = {
        ...parseResult.data!.unit,
        totalArmorPoints: 200,
        maxArmorPoints: 70,
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('exceeds maximum'))
      ).toBe(true);
    });

    it('should warn when rotor armor exceeds 2 points', () => {
      const doc = createExcessiveRotorArmorDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('rotor armor exceeds'))
      ).toBe(true);
    });

    it('should not warn when rotor armor is 2 or less', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2],
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('rotor armor'))
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Calculations - Weight
  // ==========================================================================

  describe('calculateWeight', () => {
    it('should calculate positive weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBeGreaterThan(0);
    });

    it('should include engine weight based on rating', () => {
      const doc1 = createMockBlkDocument({ cruiseMP: 6, tonnage: 20 });
      const doc2 = createMockBlkDocument({ cruiseMP: 10, tonnage: 20 });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const weight1 = handler.calculateWeight(result1.data!.unit);
      const weight2 = handler.calculateWeight(result2.data!.unit);

      // Higher cruise MP should mean heavier engine
      expect(weight2).toBeGreaterThan(weight1);
    });

    it('should include rotor weight as 10% of tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      // Rotor should contribute 2 tons (20 * 0.1)
      expect(weight).toBeGreaterThanOrEqual(2);
    });

    it('should include structural weight', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      // Structure should contribute 2 tons (20 * 0.1)
      expect(weight).toBeGreaterThanOrEqual(2);
    });

    it('should include armor weight', () => {
      const doc1 = createMockBlkDocument({ armor: [10, 8, 8, 6, 2] });
      const doc2 = createMockBlkDocument({ armor: [20, 16, 16, 12, 2] });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const weight1 = handler.calculateWeight(result1.data!.unit);
      const weight2 = handler.calculateWeight(result2.data!.unit);

      // More armor should mean more weight
      expect(weight2).toBeGreaterThan(weight1);
    });
  });

  // ==========================================================================
  // Calculations - BV
  // ==========================================================================

  describe('calculateBV', () => {
    it('should calculate positive BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should include armor contribution to BV', () => {
      const doc1 = createMockBlkDocument({
        cruiseMP: 8,
        armor: [10, 8, 8, 6, 2],
      });
      const doc2 = createMockBlkDocument({
        cruiseMP: 8,
        armor: [20, 16, 16, 12, 2],
      });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const bv1 = handler.calculateBV(result1.data!.unit);
      const bv2 = handler.calculateBV(result2.data!.unit);

      // More armor should mean higher BV
      expect(bv2).toBeGreaterThan(bv1);
    });

    it('should apply movement modifier to BV', () => {
      const doc1 = createMockBlkDocument({
        cruiseMP: 6,
        armor: [16, 10, 10, 8, 2],
      });
      const doc2 = createMockBlkDocument({
        cruiseMP: 10,
        armor: [16, 10, 10, 8, 2],
      });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const bv1 = handler.calculateBV(result1.data!.unit);
      const bv2 = handler.calculateBV(result2.data!.unit);

      // Higher cruise MP should give higher BV modifier
      expect(bv2).toBeGreaterThan(bv1);
    });

    it('should return integer BV value', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(Number.isInteger(bv)).toBe(true);
    });
  });

  // ==========================================================================
  // Calculations - Cost
  // ==========================================================================

  describe('calculateCost', () => {
    it('should calculate positive cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should include base structure cost', () => {
      const doc1 = createMockBlkDocument({ tonnage: 15, cruiseMP: 8 });
      const doc2 = createMockBlkDocument({ tonnage: 30, cruiseMP: 8 });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const cost1 = handler.calculateCost(result1.data!.unit);
      const cost2 = handler.calculateCost(result2.data!.unit);

      // Heavier VTOL should cost more
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should include engine cost', () => {
      const doc1 = createMockBlkDocument({ tonnage: 20, cruiseMP: 6 });
      const doc2 = createMockBlkDocument({ tonnage: 20, cruiseMP: 10 });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const cost1 = handler.calculateCost(result1.data!.unit);
      const cost2 = handler.calculateCost(result2.data!.unit);

      // Higher engine rating should cost more
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should include rotor cost', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      // Rotor cost is tonnage * 40000 = 800000
      expect(cost).toBeGreaterThan(800000);
    });

    it('should include armor cost', () => {
      const doc1 = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 8,
        armor: [10, 8, 8, 6, 2],
      });
      const doc2 = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 8,
        armor: [20, 16, 16, 12, 2],
      });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const cost1 = handler.calculateCost(result1.data!.unit);
      const cost2 = handler.calculateCost(result2.data!.unit);

      // More armor should cost more
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should return integer cost value', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(Number.isInteger(cost)).toBe(true);
    });
  });

  // ==========================================================================
  // Serialization
  // ==========================================================================

  describe('serialize', () => {
    it('should serialize VTOL successfully', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized).toBeDefined();
    });

    it('should include chassis in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.chassis).toBe('Warrior');
    });

    it('should include model in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.model).toBe('H-7');
    });

    it('should include tonnage in serialized output', () => {
      const doc = createMockBlkDocument({ tonnage: 25 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.tonnage).toBe(25);
    });

    it('should include unit type in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.unitType).toBe(UnitType.VTOL);
    });
  });

  // ==========================================================================
  // serializeTypeSpecificFields
  // ==========================================================================

  describe('serializeTypeSpecificFields', () => {
    it('should include VTOL configuration', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toBe('VTOL');
    });

    it('should include rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.rulesLevel).toBeDefined();
    });
  });

  // ==========================================================================
  // deserialize
  // ==========================================================================

  describe('deserialize', () => {
    it('should return not implemented error', () => {
      const serialized = {
        id: 'test-vtol',
        chassis: 'Test',
        model: 'V1',
        unitType: 'VTOL',
        configuration: 'VTOL',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Succession Wars',
        year: 3025,
        tonnage: 20,
        engine: { type: 'Standard', rating: 160 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: {
          type: 'Standard',
          allocation: {
            Front: 16,
            Left: 10,
            Right: 10,
            Rear: 8,
            Rotor: 2,
          },
        },
        heatSinks: { type: 'Single', count: 10 },
        movement: { walk: 8, jump: 0 },
        equipment: [],
        criticalSlots: {},
      };

      const result = handler.deserialize(serialized);
      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('not yet implemented'))).toBe(
        true
      );
    });
  });

  // ==========================================================================
  // createVTOLHandler Helper
  // ==========================================================================

  describe('createVTOLHandler', () => {
    it('should create VTOLUnitHandler instance', () => {
      const handler = createVTOLHandler();
      expect(handler).toBeInstanceOf(VTOLUnitHandler);
    });

    it('should create handler with correct unit type', () => {
      const handler = createVTOLHandler();
      expect(handler.unitType).toBe(UnitType.VTOL);
    });

    it('should create independent handler instances', () => {
      const handler1 = createVTOLHandler();
      const handler2 = createVTOLHandler();
      expect(handler1).not.toBe(handler2);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty equipment by location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment).toHaveLength(0);
    });

    it('should handle missing optional fields', () => {
      const doc = createMockBlkDocument({
        source: undefined,
        role: undefined,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
    });

    it('should handle empty rawTags', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Standard');
    });

    it('should handle rawTags with array values for rotortype', () => {
      // Raw tags can have string[] values in the actual type
      const rawTagsWithArray: Record<string, string | string[]> = {
        rotortype: ['Tandem'],
      };
      const doc = createMockBlkDocument({
        rawTags: rawTagsWithArray,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Tandem');
    });
  });
});
