/**
 * SmallCraftUnitHandler Tests
 *
 * Tests for Small Craft BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { SmallCraftLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  SmallCraftUnitHandler,
  createSmallCraftHandler,
} from '../SmallCraftUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Small Craft',
    mappedUnitType: UnitType.SMALL_CRAFT,
    name: 'K-1',
    model: 'Shuttle',
    year: 2470,
    type: 'IS Level 2',
    tonnage: 100,
    motionType: 'Aerodyne',
    safeThrust: 5,
    structuralIntegrity: 5,
    fuel: 500,
    heatsinks: 10,
    sinkType: 0,
    engineType: 0,
    armorType: 0,
    armor: [40, 30, 30, 20],
    crew: 2,
    passengers: 8,
    escapePod: 2,
    lifeBoat: 0,
    equipmentByLocation: {
      'Nose Equipment': ['Medium Laser', 'Medium Laser'],
    },
    rawTags: {
      cargo: '5.0',
    },
    ...overrides,
  };
}

function createSpheroidSmallCraft(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Hunter',
    model: 'Killer Whale Carrier',
    motionType: 'Spheroid',
    tonnage: 200,
    safeThrust: 3,
    structuralIntegrity: 8,
    armor: [80, 60, 60, 40],
    crew: 4,
    passengers: 0,
    equipmentByLocation: {
      'Nose Equipment': ['Killer Whale', 'Killer Whale'],
      'Aft Equipment': ['Medium Laser'],
    },
  });
}

function createAssaultBoat(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Assault',
    model: 'Boat',
    tonnage: 200,
    safeThrust: 6,
    structuralIntegrity: 6,
    armor: [100, 80, 80, 60],
    crew: 4,
    passengers: 20, // Marines
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser', 'Large Laser'],
      'Left Side Equipment': ['Medium Laser'],
      'Right Side Equipment': ['Medium Laser'],
    },
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('SmallCraftUnitHandler', () => {
  let handler: SmallCraftUnitHandler;

  beforeEach(() => {
    handler = createSmallCraftHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.SMALL_CRAFT);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Small Craft');
    });

    it('should return SmallCraft locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(SmallCraftLocation.NOSE);
      expect(locations).toContain(SmallCraftLocation.AFT);
      expect(locations).toContain(SmallCraftLocation.LEFT_SIDE);
      expect(locations).toContain(SmallCraftLocation.RIGHT_SIDE);
      expect(locations).toContain(SmallCraftLocation.HULL);
    });
  });

  describe('canHandle', () => {
    it('should handle Small Craft unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle DropShip unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'DropShip',
        mappedUnitType: UnitType.DROPSHIP,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Aerospace Fighter unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic aerodyne Small Craft successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.SMALL_CRAFT);
      expect(result.data?.unit?.tonnage).toBe(100);
      expect(result.data?.unit?.metadata.chassis).toBe('K-1');
      expect(result.data?.unit?.motionType).toBe(AerospaceMotionType.AERODYNE);
    });

    it('should parse spheroid Small Craft', () => {
      const doc = createSpheroidSmallCraft();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(AerospaceMotionType.SPHEROID);
      expect(result.data?.unit?.metadata.chassis).toBe('Hunter');
    });

    it('should parse movement values correctly', () => {
      const doc = createMockBlkDocument({ safeThrust: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.safeThrust).toBe(5);
      expect(result.data?.unit?.movement.maxThrust).toBe(7); // floor(5 * 1.5)
    });

    it('should parse structural integrity', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 6 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.structuralIntegrity).toBe(6);
    });

    it('should parse armor by arc', () => {
      const doc = createMockBlkDocument({
        armor: [40, 30, 30, 20],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByArc.nose).toBe(40);
      expect(result.data?.unit?.armorByArc.leftSide).toBe(30);
      expect(result.data?.unit?.armorByArc.rightSide).toBe(30);
      expect(result.data?.unit?.armorByArc.aft).toBe(20);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [40, 30, 30, 20], // Total: 120
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(120);
    });

    it('should parse crew and passengers', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crew).toBe(2);
      expect(result.data?.unit?.passengers).toBe(8);
    });

    it('should parse cargo capacity', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargo: '10.5' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.cargoCapacity).toBe(10.5);
    });

    it('should parse escape pods and life boats', () => {
      const doc = createMockBlkDocument({
        escapePod: 3,
        lifeBoat: 1,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.escapePods).toBe(3);
      expect(result.data?.unit?.lifeBoats).toBe(1);
    });

    it('should parse equipment with locations', () => {
      const doc = createAssaultBoat();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBeGreaterThan(0);

      const noseWeapon = result.data?.unit?.equipment.find(
        (e) => e.location === SmallCraftLocation.NOSE,
      );
      expect(noseWeapon).toBeDefined();
    });

    it('should fail parse for under-tonnage craft', () => {
      const doc = createMockBlkDocument({ tonnage: 50 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('100'))).toBe(true);
    });

    it('should fail parse for over-tonnage craft', () => {
      const doc = createMockBlkDocument({ tonnage: 250 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('200'))).toBe(true);
    });

    it('should fail parse for zero thrust', () => {
      const doc = createMockBlkDocument({ safeThrust: 0 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('thrust'))).toBe(true);
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
    it('should pass validation for valid Small Craft', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
    });

    it('should error for tonnage under 100', () => {
      const doc = createMockBlkDocument({ tonnage: 100 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const unit = { ...parseResult.data!.unit, tonnage: 80 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('100'))).toBe(true);
    });

    it('should error for tonnage over 200', () => {
      const doc = createMockBlkDocument({ tonnage: 100 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const unit = { ...parseResult.data!.unit, tonnage: 250 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('200'))).toBe(true);
    });

    it('should error for zero safe thrust', () => {
      const doc = createMockBlkDocument({ safeThrust: 1 }); // Valid for parse
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually set to 0 for validation test
      const unit = {
        ...parseResult.data!.unit,
        movement: {
          ...parseResult.data!.unit.movement,
          safeThrust: 0,
          maxThrust: 0,
        },
      };
      const validateResult = handler.validate(unit);

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

    it('should warn for no crew', () => {
      // Note: SmallCraft defaults crew to 2 if not specified or 0
      // So we need to manually set it to 0 after parsing to test validation
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually set crew to 0 to test validation
      const unitWithNoCrew = { ...parseResult.data!.unit, crew: 0 };
      const validateResult = handler.validate(unitWithNoCrew);
      expect(
        validateResult.warnings.some((w) => w.includes('no crew assigned')),
      ).toBe(true);
    });

    it('should warn for insufficient escape capacity', () => {
      const doc = createMockBlkDocument({
        crew: 10,
        passengers: 20,
        escapePod: 1,
        lifeBoat: 0,
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('escape capacity')),
      ).toBe(true);
    });
  });

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(100);
    });

    it('should calculate BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should increase BV with more thrust', () => {
      const docHighThrust = createMockBlkDocument({ safeThrust: 6 });
      const docLowThrust = createMockBlkDocument({ safeThrust: 2 });

      const resultHighThrust = handler.parse(docHighThrust);
      const resultLowThrust = handler.parse(docLowThrust);

      const bvHighThrust = handler.calculateBV(resultHighThrust.data!.unit);
      const bvLowThrust = handler.calculateBV(resultLowThrust.data!.unit);

      expect(bvHighThrust).toBeGreaterThan(bvLowThrust);
    });

    it('should increase BV with more armor', () => {
      const docHighArmor = createMockBlkDocument({
        armor: [80, 60, 60, 40], // 240 total
      });
      const docLowArmor = createMockBlkDocument({
        armor: [20, 15, 15, 10], // 60 total
      });

      const resultHighArmor = handler.parse(docHighArmor);
      const resultLowArmor = handler.parse(docLowArmor);

      const bvHighArmor = handler.calculateBV(resultHighArmor.data!.unit);
      const bvLowArmor = handler.calculateBV(resultLowArmor.data!.unit);

      expect(bvHighArmor).toBeGreaterThan(bvLowArmor);
    });

    it('should calculate cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should calculate higher cost for larger craft', () => {
      const docLarge = createMockBlkDocument({ tonnage: 200 });
      const docSmall = createMockBlkDocument({ tonnage: 100 });

      const resultLarge = handler.parse(docLarge);
      const resultSmall = handler.parse(docSmall);

      const costLarge = handler.calculateCost(resultLarge.data!.unit);
      const costSmall = handler.calculateCost(resultSmall.data!.unit);

      expect(costLarge).toBeGreaterThan(costSmall);
    });
  });

  describe('serialization', () => {
    it('should serialize Small Craft', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized?.chassis).toBe('K-1');
    });

    it('should serialize with motion type configuration', () => {
      const aerodyneDoc = createMockBlkDocument();
      const spheroidDoc = createSpheroidSmallCraft();

      const aerodyneResult = handler.parse(aerodyneDoc);
      const spheroidResult = handler.parse(spheroidDoc);

      const aerodyneSerialized = handler.serialize(aerodyneResult.data!.unit);
      const spheroidSerialized = handler.serialize(spheroidResult.data!.unit);

      expect(aerodyneSerialized.data?.serialized?.configuration).toBe(
        String(AerospaceMotionType.AERODYNE),
      );
      expect(spheroidSerialized.data?.serialized?.configuration).toBe(
        String(AerospaceMotionType.SPHEROID),
      );
    });
  });

  describe('deserialization', () => {
    it('should return not implemented error', () => {
      const result = handler.deserialize({
        id: 'smallcraft-test',
        chassis: 'K-1',
        model: 'Shuttle',
        tonnage: 100,
        unitType: 'SMALL_CRAFT',
        configuration: 'Aerodyne',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Succession Wars',
        year: 2470,
        engine: { type: 'Standard', rating: 100 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: { type: 'Standard', allocation: {} },
        heatSinks: { type: 'Single', count: 10 },
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
