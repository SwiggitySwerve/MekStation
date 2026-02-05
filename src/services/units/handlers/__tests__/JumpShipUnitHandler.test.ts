/**
 * JumpShipUnitHandler Tests
 *
 * Tests for JumpShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { CapitalShipLocation } from '../../../../types/construction/UnitLocation';
import { TechBase, RulesLevel } from '../../../../types/enums';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import {
  JumpShipUnitHandler,
  createJumpShipHandler,
} from '../JumpShipUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'JumpShip',
    mappedUnitType: UnitType.JUMPSHIP,
    name: 'Invader',
    model: 'Standard',
    year: 2631,
    type: 'IS Level 2',
    tonnage: 152000,
    safeThrust: 0,
    structuralIntegrity: 35,
    fuel: 7500,
    heatsinks: 100,
    sinkType: 0,
    engineType: 0,
    armorType: 0,
    armor: [30, 25, 25, 20, 20, 15],
    crew: 25,
    officers: 8,
    gunners: 2,
    passengers: 10,
    escapePod: 5,
    lifeBoat: 2,
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser'],
    },
    transporters: ['cargobay:100.0:1'],
    rawTags: {
      dockingcollars: '3',
      gravdecks: '2',
      kfrating: '15',
      kfintegrity: '4',
      lithiumfusion: 'false',
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('JumpShipUnitHandler', () => {
  let handler: JumpShipUnitHandler;

  beforeEach(() => {
    handler = createJumpShipHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.JUMPSHIP);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('JumpShip');
    });

    it('should return CapitalShip locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(CapitalShipLocation.NOSE);
      expect(locations).toContain(CapitalShipLocation.AFT);
    });
  });

  describe('canHandle', () => {
    it('should handle JumpShip unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle WarShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'WarShip',
        mappedUnitType: UnitType.WARSHIP,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic JumpShip successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.JUMPSHIP);
      expect(result.data?.unit?.tonnage).toBe(152000);
      expect(result.data?.unit?.metadata.chassis).toBe('Invader');
    });

    it('should parse K-F drive configuration', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.kfDrive.rating).toBe(15);
      expect(result.data?.unit?.kfDrive.integrityPoints).toBe(4);
      expect(result.data?.unit?.kfDrive.hasDriveCore).toBe(true);
      expect(result.data?.unit?.kfDrive.hasLithiumFusion).toBe(false);
    });

    it('should parse lithium-fusion battery', () => {
      const doc = createMockBlkDocument({
        rawTags: { lithiumfusion: 'true', dockingcollars: '3' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.kfDrive.hasLithiumFusion).toBe(true);
    });

    it('should parse docking collars', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.dockingCollars).toBe(3);
    });

    it('should parse gravity decks', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.gravDecks).toBe(2);
    });

    it('should parse armor by arc', () => {
      const doc = createMockBlkDocument({
        armor: [30, 25, 25, 20, 20, 15],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByArc.nose).toBe(30);
      expect(result.data?.unit?.armorByArc.frontLeftSide).toBe(25);
      expect(result.data?.unit?.armorByArc.aft).toBe(15);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [30, 25, 25, 20, 20, 15], // Total: 135
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(135);
    });

    it('should parse crew configuration', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crewConfiguration.crew).toBe(25);
      expect(result.data?.unit?.crewConfiguration.officers).toBe(8);
      expect(result.data?.unit?.crewConfiguration.pilots).toBe(2);
    });

    it('should parse tech base', () => {
      const isDoc = createMockBlkDocument({ type: 'IS Level 2' });
      const clanDoc = createMockBlkDocument({ type: 'Clan Level 2' });

      const isResult = handler.parse(isDoc);
      const clanResult = handler.parse(clanDoc);

      expect(isResult.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      expect(clanResult.data?.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should fail parse for under-tonnage ships', () => {
      const doc = createMockBlkDocument({ tonnage: 40000 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('50,000'))).toBe(true);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid JumpShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
    });

    it('should error for tonnage under 50,000', () => {
      const doc = createMockBlkDocument({ tonnage: 152000 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually modify tonnage for validation test
      const unit = { ...parseResult.data!.unit, tonnage: 40000 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('50,000'))).toBe(
        true,
      );
    });

    it('should error for tonnage over 500,000', () => {
      const doc = createMockBlkDocument({ tonnage: 152000 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const unit = { ...parseResult.data!.unit, tonnage: 600000 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('500,000'))).toBe(
        true,
      );
    });

    it('should warn for no docking collars', () => {
      // Note: JumpShip defaults dockingCollars to 1 if not specified or 0
      // So we need to manually set it to 0 after parsing to test validation
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually set docking collars to 0 to test validation
      const unitWithNoCollars = {
        ...parseResult.data!.unit,
        dockingCollars: 0,
      };
      const validateResult = handler.validate(unitWithNoCollars);
      expect(
        validateResult.warnings.some((w) => w.includes('no docking collars')),
      ).toBe(true);
    });

    it('should warn for no crew', () => {
      const doc = createMockBlkDocument({ crew: 0 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.warnings.some((w) => w.includes('no crew'))).toBe(
        true,
      );
    });

    it('should info for lithium-fusion batteries', () => {
      const doc = createMockBlkDocument({
        rawTags: { lithiumfusion: 'true', dockingcollars: '3' },
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.infos.some((i) => i.includes('Lithium-Fusion')),
      ).toBe(true);
    });
  });

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(152000);
    });

    it('should calculate BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should calculate cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should increase cost with lithium-fusion', () => {
      const docWithLF = createMockBlkDocument({
        rawTags: { lithiumfusion: 'true', dockingcollars: '3' },
      });
      const docWithoutLF = createMockBlkDocument({
        rawTags: { lithiumfusion: 'false', dockingcollars: '3' },
      });

      const resultWithLF = handler.parse(docWithLF);
      const resultWithoutLF = handler.parse(docWithoutLF);

      const costWithLF = handler.calculateCost(resultWithLF.data!.unit);
      const costWithoutLF = handler.calculateCost(resultWithoutLF.data!.unit);

      expect(costWithLF).toBeGreaterThan(costWithoutLF);
    });
  });

  describe('serialization', () => {
    it('should serialize JumpShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized?.chassis).toBe('Invader');
      expect(serializeResult.data?.serialized?.configuration).toBe('JumpShip');
    });
  });

  describe('deserialization', () => {
    it('should return not implemented error', () => {
      const result = handler.deserialize({
        id: 'jumpship-test',
        chassis: 'Invader',
        model: 'Standard',
        tonnage: 152000,
        unitType: 'JUMPSHIP',
        configuration: 'JumpShip',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Star League',
        year: 2631,
        engine: { type: 'Standard', rating: 100 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Single', count: 100 },
        movement: { walk: 0, jump: 0 },
        equipment: [],
        criticalSlots: {},
      });

      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('not yet implemented')),
      ).toBe(true);
    });
  });
});
