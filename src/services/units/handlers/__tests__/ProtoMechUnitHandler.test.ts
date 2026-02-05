/**
 * ProtoMechUnitHandler Tests
 *
 * Tests for ProtoMech BLK parsing and validation
 */

import { TechBase } from '../../../../types/enums';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import {
  ProtoMechUnitHandler,
  createProtoMechHandler,
} from '../ProtoMechUnitHandler';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(
  overrides: Partial<IBlkDocument> = {},
): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'ProtoMech',
    mappedUnitType: UnitType.PROTOMECH,
    name: 'Centaur',
    model: 'Standard',
    year: 3060,
    type: 'Clan Level 3',
    tonnage: 5,
    trooperCount: 5, // Point size
    cruiseMP: 5,
    jumpingMP: 0,
    armor: [2, 7, 2, 2, 4, 1], // Head, Torso, LA, RA, Legs, Main Gun
    equipmentByLocation: {
      'Torso Equipment': ['Medium Pulse Laser'],
      'Main Gun Equipment': ['SRM 2'],
    },
    rawTags: {},
    ...overrides,
  };
}

function createGliderProtoMechDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Roc',
    model: 'Standard',
    tonnage: 8,
    cruiseMP: 4,
    jumpingMP: 4,
    armor: [3, 10, 3, 3, 6, 2],
    rawTags: {
      glider: 'true',
    },
  });
}

function createQuadProtoMechDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Satyr',
    model: 'Standard',
    tonnage: 4,
    cruiseMP: 6,
    armor: [2, 6, 0, 0, 5, 0], // No arms or main gun
    rawTags: {
      quad: 'true',
    },
    equipmentByLocation: {
      'Torso Equipment': ['ER Small Laser', 'ER Small Laser'],
    },
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('ProtoMechUnitHandler', () => {
  let handler: ProtoMechUnitHandler;

  beforeEach(() => {
    handler = createProtoMechHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.PROTOMECH);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('ProtoMech');
    });
  });

  describe('canHandle', () => {
    it('should handle ProtoMech unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle BattleArmor unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleArmor',
        mappedUnitType: UnitType.BATTLE_ARMOR,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse Centaur successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.PROTOMECH);
      expect(result.data?.unit?.metadata.chassis).toBe('Centaur');
    });

    it('should parse point size', () => {
      const doc = createMockBlkDocument({ trooperCount: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.pointSize).toBe(5);
    });

    it('should parse weight per unit', () => {
      const doc = createMockBlkDocument({ tonnage: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightPerUnit).toBe(5);
    });

    it('should parse movement', () => {
      const doc = createMockBlkDocument({ cruiseMP: 5, jumpingMP: 0 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.cruiseMP).toBe(5);
      expect(result.data?.unit?.jumpMP).toBe(0);
    });

    it('should parse armor by location', () => {
      const doc = createMockBlkDocument({ armor: [2, 7, 2, 2, 4, 1] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByLocation['Head']).toBe(2);
      expect(result.data?.unit?.armorByLocation['Torso']).toBe(7);
      expect(result.data?.unit?.armorByLocation['Left Arm']).toBe(2);
      expect(result.data?.unit?.armorByLocation['Main Gun']).toBe(1);
    });

    it('should detect main gun', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasMainGun).toBe(true);
    });

    it('should parse equipment', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBe(2);
    });

    it('should parse glider ProtoMech', () => {
      const doc = createGliderProtoMechDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.isGlider).toBe(true);
      expect(result.data?.unit?.jumpMP).toBe(4);
    });

    it('should parse quad ProtoMech', () => {
      const doc = createQuadProtoMechDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.isQuad).toBe(true);
    });

    it('should always be Clan tech base', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.CLAN);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid ProtoMech', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(true);
    });

    it('should fail validation for too light ProtoMech', () => {
      const doc = createMockBlkDocument({ tonnage: 1 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('2 tons'))).toBe(true);
    });

    it('should fail validation for too heavy ProtoMech', () => {
      const doc = createMockBlkDocument({ tonnage: 12 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('9 tons'))).toBe(true);
    });

    it('should fail validation for quad with main gun', () => {
      const doc = createQuadProtoMechDocument();
      // Add main gun equipment
      const modifiedDoc: IBlkDocument = {
        ...doc,
        equipmentByLocation: {
          ...doc.equipmentByLocation,
          'Main Gun Equipment': ['SRM 2'],
        },
      };
      const result = handler.parse(modifiedDoc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some(
          (e) => e.includes('Quad') && e.includes('main gun'),
        ),
      ).toBe(true);
    });

    it('should fail validation for glider with insufficient jump', () => {
      const doc = createMockBlkDocument({
        jumpingMP: 1,
        rawTags: { glider: 'true' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(false);
      expect(
        validation.errors.some(
          (e) => e.includes('Glider') && e.includes('jump'),
        ),
      ).toBe(true);
    });
  });

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(25); // 5 tons * 5 point size
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
  });
});
