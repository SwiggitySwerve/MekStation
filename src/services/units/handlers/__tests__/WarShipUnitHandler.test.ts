/**
 * WarShipUnitHandler Tests
 *
 * Tests for WarShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '../../../../types/enums';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import {
  CapitalArc,
  KFDriveType,
} from '../../../../types/unit/CapitalShipInterfaces';
import {
  WarShipUnitHandler,
  createWarShipHandler,
} from '../WarShipUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock BLK document for WarShip testing
 */
function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'WarShip',
    mappedUnitType: UnitType.WARSHIP,
    name: 'McKenna',
    model: 'Battleship',
    year: 2652,
    type: 'IS Level 3',
    tonnage: 1400000,
    safeThrust: 2,
    structuralIntegrity: 75,
    fuel: 10000,
    heatsinks: 5000,
    sinkType: 1,
    engineType: 0,
    armorType: 0,
    armor: [500, 400, 400, 350, 350, 300, 450, 450],
    crew: 2200,
    officers: 150,
    gunners: 400,
    marines: 60,
    passengers: 20,
    escapePod: 50,
    lifeBoat: 20,
    equipmentByLocation: {
      'Nose Equipment': ['Naval Laser 55', 'Naval PPC'],
      'FL Equipment': ['Naval Autocannon/20'],
      'FR Equipment': ['Naval Autocannon/20'],
      'Aft Equipment': ['Naval Laser 35'],
    },
    transporters: ['mechbay:24', 'asfbay:12:2', 'cargobay:5000.0:1'],
    rawTags: {
      kfdrivetype: 'standard',
      lfbattery: 'true',
      sailarea: '1000',
      hardpoints: '6',
      gravdecks: '3',
      largegravdecks: '1',
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('WarShipUnitHandler', () => {
  let handler: WarShipUnitHandler;

  beforeEach(() => {
    handler = createWarShipHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.WARSHIP);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('WarShip');
    });

    it('should return CapitalArc locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(CapitalArc.NOSE);
      expect(locations).toContain(CapitalArc.AFT);
      expect(locations).toContain(CapitalArc.LEFT_BROADSIDE);
      expect(locations).toContain(CapitalArc.RIGHT_BROADSIDE);
    });
  });

  describe('canHandle', () => {
    it('should handle WarShip unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle mapped WarShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Warship',
        mappedUnitType: UnitType.WARSHIP,
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

    it('should not handle DropShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'DropShip',
        mappedUnitType: UnitType.DROPSHIP,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic WarShip successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.WARSHIP);
      expect(result.data?.unit?.tonnage).toBe(1400000);
      expect(result.data?.unit?.metadata.chassis).toBe('McKenna');
      expect(result.data?.unit?.metadata.model).toBe('Battleship');
    });

    it('should parse movement values correctly', () => {
      const doc = createMockBlkDocument({ safeThrust: 3 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.safeThrust).toBe(3);
      expect(result.data?.unit?.movement.maxThrust).toBe(4); // floor(3 * 1.5)
    });

    it('should parse structural integrity', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 80 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.structuralIntegrity).toBe(80);
    });

    it('should parse armor by arc with broadsides', () => {
      const doc = createMockBlkDocument({
        armor: [500, 400, 400, 350, 350, 300, 450, 450],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByArc.nose).toBe(500);
      expect(result.data?.unit?.armorByArc.frontLeftSide).toBe(400);
      expect(result.data?.unit?.armorByArc.frontRightSide).toBe(400);
      expect(result.data?.unit?.armorByArc.aftLeftSide).toBe(350);
      expect(result.data?.unit?.armorByArc.aftRightSide).toBe(350);
      expect(result.data?.unit?.armorByArc.aft).toBe(300);
      expect(result.data?.unit?.armorByArc.leftBroadside).toBe(450);
      expect(result.data?.unit?.armorByArc.rightBroadside).toBe(450);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [500, 400, 400, 350, 350, 300, 450, 450], // Total: 3200
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(3200);
    });

    it('should parse K-F drive type', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.kfDriveType).toBe(KFDriveType.STANDARD);
    });

    it('should parse compact K-F drive', () => {
      const doc = createMockBlkDocument({
        rawTags: { kfdrivetype: 'compact' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.kfDriveType).toBe(KFDriveType.COMPACT);
    });

    it('should parse lithium-fusion battery', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasLFBattery).toBe(true);
    });

    it('should parse gravity decks', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.gravityDecks.length).toBe(3);
      expect(
        result.data?.unit?.gravityDecks.some((d) => d.size === 'Large'),
      ).toBe(true);
    });

    it('should parse docking hardpoints', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.dockingHardpoints).toBe(6);
    });

    it('should parse crew configuration', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crewConfiguration.crew).toBe(2200);
      expect(result.data?.unit?.crewConfiguration.officers).toBe(150);
      expect(result.data?.unit?.crewConfiguration.gunners).toBe(400);
      expect(result.data?.unit?.crewConfiguration.marines).toBe(60);
    });

    it('should parse transport bays', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.transportBays.length).toBe(3);
    });

    it('should parse equipment with arcs', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBeGreaterThan(0);

      const noseWeapon = result.data?.unit?.equipment.find(
        (e) => e.arc === CapitalArc.NOSE,
      );
      expect(noseWeapon).toBeDefined();
    });

    it('should identify capital weapons', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const capitalWeapon = result.data?.unit?.equipment.find((e) =>
        e.name.toLowerCase().includes('naval'),
      );
      expect(capitalWeapon?.isCapital).toBe(true);
    });

    it('should parse Inner Sphere tech base', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should parse Clan tech base', () => {
      const doc = createMockBlkDocument({ type: 'Clan Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should parse rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid WarShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
    });

    it('should warn for unusually low tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 40000 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('unusually low')),
      ).toBe(true);
    });

    it('should error for excessive tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 3000000 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('2,500,000'))).toBe(
        true,
      );
    });

    it('should error for zero safe thrust', () => {
      const doc = createMockBlkDocument({ safeThrust: 0 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('thrust'))).toBe(
        true,
      );
    });

    it('should error for zero structural integrity', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 0 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('SI'))).toBe(true);
    });

    it('should warn for unusually small crew', () => {
      const doc = createMockBlkDocument({ crew: 50 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('small crew')),
      ).toBe(true);
    });

    it('should warn for no gravity decks', () => {
      const doc = createMockBlkDocument({
        rawTags: { gravdecks: '0' },
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('gravity decks')),
      ).toBe(true);
    });
  });

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(1400000);
    });

    it('should calculate BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should increase BV with LF battery', () => {
      const docWithLF = createMockBlkDocument({
        rawTags: { lfbattery: 'true' },
      });
      const docWithoutLF = createMockBlkDocument({
        rawTags: { lfbattery: 'false' },
      });

      const resultWithLF = handler.parse(docWithLF);
      const resultWithoutLF = handler.parse(docWithoutLF);

      const bvWithLF = handler.calculateBV(resultWithLF.data!.unit);
      const bvWithoutLF = handler.calculateBV(resultWithoutLF.data!.unit);

      expect(bvWithLF).toBeGreaterThan(bvWithoutLF);
    });

    it('should calculate cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should increase cost with LF battery', () => {
      const docWithLF = createMockBlkDocument({
        rawTags: { lfbattery: 'true' },
      });
      const docWithoutLF = createMockBlkDocument({
        rawTags: { lfbattery: 'false' },
      });

      const resultWithLF = handler.parse(docWithLF);
      const resultWithoutLF = handler.parse(docWithoutLF);

      const costWithLF = handler.calculateCost(resultWithLF.data!.unit);
      const costWithoutLF = handler.calculateCost(resultWithoutLF.data!.unit);

      expect(costWithLF).toBeGreaterThan(costWithoutLF);
    });
  });

  describe('serialization', () => {
    it('should serialize WarShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized).toBeDefined();
      expect(serializeResult.data?.serialized?.chassis).toBe('McKenna');
      expect(serializeResult.data?.serialized?.model).toBe('Battleship');
    });

    it('should serialize with spheroid configuration', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toBe('Spheroid');
    });
  });

  describe('deserialization', () => {
    it('should return not implemented error', () => {
      const result = handler.deserialize({
        id: 'warship-test',
        chassis: 'McKenna',
        model: 'Battleship',
        tonnage: 1400000,
        unitType: 'WARSHIP',
        configuration: 'Spheroid',
        techBase: 'Inner Sphere',
        rulesLevel: 'Advanced',
        era: 'Star League',
        year: 2652,
        engine: { type: 'Standard', rating: 100 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Double', count: 5000 },
        movement: { walk: 0, jump: 0 },
        equipment: [],
        criticalSlots: {},
        quirks: [],
      });

      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('not yet implemented')),
      ).toBe(true);
    });
  });
});
