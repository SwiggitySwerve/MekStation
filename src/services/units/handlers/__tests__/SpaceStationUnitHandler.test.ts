/**
 * SpaceStationUnitHandler Tests
 *
 * Tests for Space Station BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { CapitalShipLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  SpaceStationUnitHandler,
  createSpaceStationHandler,
  SpaceStationType,
} from '../SpaceStationUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Space Station',
    mappedUnitType: UnitType.SPACE_STATION,
    name: 'Olympus',
    model: 'Recharge Station',
    year: 2785,
    type: 'IS Level 2',
    tonnage: 50000,
    safeThrust: 0,
    structuralIntegrity: 50,
    fuel: 1000,
    heatsinks: 200,
    sinkType: 0,
    armorType: 0,
    armor: [100, 80, 80, 60, 60, 40],
    crew: 150,
    officers: 20,
    gunners: 10,
    passengers: 500,
    escapePod: 100,
    lifeBoat: 20,
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser', 'Large Laser'],
    },
    transporters: ['cargobay:10000.0:4', 'mechbay:12', 'asfbay:6:1'],
    rawTags: {
      stationtype: 'recharge',
      dockingcollars: '6',
      gravdecks: '3',
      hpg: 'true',
      pressurizedmodules: '10',
    },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('SpaceStationUnitHandler', () => {
  let handler: SpaceStationUnitHandler;

  beforeEach(() => {
    handler = createSpaceStationHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.SPACE_STATION);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Space Station');
    });

    it('should return CapitalShip locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(CapitalShipLocation.NOSE);
      expect(locations).toContain(CapitalShipLocation.AFT);
    });
  });

  describe('canHandle', () => {
    it('should handle Space Station unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
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
    it('should parse basic Space Station successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.SPACE_STATION);
      expect(result.data?.unit?.tonnage).toBe(50000);
      expect(result.data?.unit?.metadata.chassis).toBe('Olympus');
    });

    it('should parse station type - recharge', () => {
      const doc = createMockBlkDocument({
        rawTags: { stationtype: 'recharge' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.stationType).toBe(
        SpaceStationType.RECHARGE_STATION,
      );
    });

    it('should parse station type - shipyard', () => {
      const doc = createMockBlkDocument({
        rawTags: { stationtype: 'shipyard' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.stationType).toBe(SpaceStationType.SHIPYARD);
    });

    it('should parse station type - habitat', () => {
      const doc = createMockBlkDocument({
        rawTags: { stationtype: 'habitat' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.stationType).toBe(SpaceStationType.HABITAT);
    });

    it('should parse station type - military', () => {
      const doc = createMockBlkDocument({
        rawTags: { stationtype: 'military' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.stationType).toBe(SpaceStationType.MILITARY);
    });

    it('should default to orbital station type', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.stationType).toBe(SpaceStationType.ORBITAL);
    });

    it('should parse docking collars', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.dockingCollars).toBe(6);
    });

    it('should parse gravity decks', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.gravDecks).toBe(3);
    });

    it('should parse HPG capability', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasHPG).toBe(true);
    });

    it('should parse K-F drive capability', () => {
      const doc = createMockBlkDocument({
        rawTags: { kfdrive: 'true' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasKFDrive).toBe(true);
    });

    it('should parse pressurized modules', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.pressurizedModules).toBe(10);
    });

    it('should parse armor by arc', () => {
      const doc = createMockBlkDocument({
        armor: [100, 80, 80, 60, 60, 40],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByArc.nose).toBe(100);
      expect(result.data?.unit?.armorByArc.aft).toBe(40);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [100, 80, 80, 60, 60, 40], // Total: 420
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(420);
    });

    it('should parse crew configuration', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crewConfiguration.crew).toBe(150);
      expect(result.data?.unit?.crewConfiguration.passengers).toBe(500);
      expect(result.data?.unit?.crewConfiguration.pilots).toBe(0); // Stations don't have pilots
    });

    it('should parse transport bays', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.transportBays.length).toBe(3);
    });

    it('should warn for low tonnage stations', () => {
      const doc = createMockBlkDocument({ tonnage: 3000 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data!.warnings.some((w) => w.includes('5,000'))).toBe(true);
    });

    it('should parse tech base', () => {
      const isDoc = createMockBlkDocument({ type: 'IS Level 2' });
      const clanDoc = createMockBlkDocument({ type: 'Clan Level 2' });

      const isResult = handler.parse(isDoc);
      const clanResult = handler.parse(clanDoc);

      expect(isResult.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      expect(clanResult.data?.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should parse rules level', () => {
      const introDoc = createMockBlkDocument({ type: 'IS Level 1' });
      const standardDoc = createMockBlkDocument({ type: 'IS Level 2' });
      const advancedDoc = createMockBlkDocument({ type: 'IS Level 3' });

      expect(handler.parse(introDoc).data?.unit?.rulesLevel).toBe(
        RulesLevel.INTRODUCTORY,
      );
      expect(handler.parse(standardDoc).data?.unit?.rulesLevel).toBe(
        RulesLevel.STANDARD,
      );
      expect(handler.parse(advancedDoc).data?.unit?.rulesLevel).toBe(
        RulesLevel.ADVANCED,
      );
    });
  });

  describe('validate', () => {
    it('should pass validation for valid station', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
    });

    it('should error for zero SI', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 0 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('SI'))).toBe(true);
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

    it('should warn for insufficient escape capacity', () => {
      const doc = createMockBlkDocument({
        crew: 200,
        passengers: 500,
        marines: 50,
        escapePod: 1,
        lifeBoat: 1,
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('escape capacity')),
      ).toBe(true);
    });

    it('should include station type info', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.infos.some((i) => i.includes('Station type'))).toBe(
        true,
      );
    });

    it('should include HPG info when present', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.infos.some((i) => i.includes('HPG'))).toBe(true);
    });

    it('should include K-F drive info when present', () => {
      const doc = createMockBlkDocument({
        rawTags: { kfdrive: 'true' },
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.infos.some((i) => i.includes('K-F drive'))).toBe(
        true,
      );
    });
  });

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(50000);
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

    it('should increase cost with HPG', () => {
      const docWithHPG = createMockBlkDocument({
        rawTags: { hpg: 'true' },
      });
      const docWithoutHPG = createMockBlkDocument({
        rawTags: { hpg: 'false' },
      });

      const resultWithHPG = handler.parse(docWithHPG);
      const resultWithoutHPG = handler.parse(docWithoutHPG);

      const costWithHPG = handler.calculateCost(resultWithHPG.data!.unit);
      const costWithoutHPG = handler.calculateCost(resultWithoutHPG.data!.unit);

      expect(costWithHPG).toBeGreaterThan(costWithoutHPG);
    });

    it('should increase cost with K-F drive', () => {
      const docWithKF = createMockBlkDocument({
        rawTags: { kfdrive: 'true' },
      });
      const docWithoutKF = createMockBlkDocument({
        rawTags: { kfdrive: 'false' },
      });

      const resultWithKF = handler.parse(docWithKF);
      const resultWithoutKF = handler.parse(docWithoutKF);

      const costWithKF = handler.calculateCost(resultWithKF.data!.unit);
      const costWithoutKF = handler.calculateCost(resultWithoutKF.data!.unit);

      expect(costWithKF).toBeGreaterThan(costWithoutKF);
    });
  });

  describe('serialization', () => {
    it('should serialize Space Station', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized?.chassis).toBe('Olympus');
      expect(serializeResult.data?.serialized?.configuration).toContain(
        'Space Station',
      );
    });
  });

  describe('deserialization', () => {
    it('should return not implemented error', () => {
      const result = handler.deserialize({
        id: 'station-test',
        chassis: 'Olympus',
        model: 'Recharge Station',
        tonnage: 50000,
        unitType: 'SPACE_STATION',
        configuration: 'Space Station',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Succession Wars',
        year: 2785,
        engine: { type: 'Standard', rating: 100 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Single', count: 200 },
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
