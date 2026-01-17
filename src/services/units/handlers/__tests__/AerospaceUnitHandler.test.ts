/**
 * AerospaceUnitHandler Tests
 *
 * Tests for aerospace fighter BLK parsing and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AerospaceUnitHandler, createAerospaceHandler } from '../AerospaceUnitHandler';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { AerospaceMotionType } from '../../../../types/unit/BaseUnitInterfaces';
import { AerospaceCockpitType } from '../../../../types/unit/AerospaceInterfaces';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Aero',
    mappedUnitType: UnitType.AEROSPACE,
    name: 'Stuka',
    model: 'STU-K5',
    year: 2571,
    type: 'IS Level 2',
    tonnage: 100,
    safeThrust: 5,
    fuel: 400,
    structuralIntegrity: 8,
    heatsinks: 20,
    sinkType: 0,
    armor: [30, 24, 24, 18],
    equipmentByLocation: {
      'Nose Equipment': ['Large Laser', 'Large Laser'],
      'Left Wing Equipment': ['Medium Laser', 'Medium Laser'],
      'Right Wing Equipment': ['Medium Laser', 'Medium Laser'],
    },
    rawTags: {},
    ...overrides,
  };
}

function createLightFighterDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Sparrowhawk',
    model: 'SPR-H5',
    tonnage: 30,
    safeThrust: 9,
    fuel: 200,
    structuralIntegrity: 4,
    heatsinks: 10,
    armor: [15, 10, 10, 8],
    equipmentByLocation: {
      'Nose Equipment': ['Medium Laser', 'Medium Laser'],
    },
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('AerospaceUnitHandler', () => {
  let handler: AerospaceUnitHandler;

  beforeEach(() => {
    handler = createAerospaceHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.AEROSPACE);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Aerospace Fighter');
    });
  });

  describe('canHandle', () => {
    it('should handle Aero unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle Vehicle unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse heavy fighter successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit).toBeDefined();
      expect(result.unit?.unitType).toBe(UnitType.AEROSPACE);
      expect(result.unit?.tonnage).toBe(100);
      expect(result.unit?.metadata.chassis).toBe('Stuka');
    });

    it('should parse thrust values', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.safeThrust).toBe(5);
      expect(result.unit?.movement.maxThrust).toBe(7);
    });

    it('should parse fuel', () => {
      const doc = createMockBlkDocument({ fuel: 400 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.fuel).toBe(400);
    });

    it('should parse structural integrity', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 8 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.structuralIntegrity).toBe(8);
    });

    it('should parse armor by arc', () => {
      const doc = createMockBlkDocument({ armor: [30, 24, 24, 18] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.armorByArc.nose).toBe(30);
      expect(result.unit?.armorByArc.leftWing).toBe(24);
      expect(result.unit?.armorByArc.rightWing).toBe(24);
      expect(result.unit?.armorByArc.aft).toBe(18);
    });

    it('should calculate total armor', () => {
      const doc = createMockBlkDocument({ armor: [30, 24, 24, 18] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.totalArmorPoints).toBe(96);
    });

    it('should parse equipment by arc', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment.length).toBe(6);
    });

    it('should always be aerodyne motion type', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(AerospaceMotionType.AERODYNE);
    });

    it('should parse light fighter', () => {
      const doc = createLightFighterDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.tonnage).toBe(30);
      expect(result.unit?.movement.safeThrust).toBe(9);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid aerospace', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true);
    });

    it('should fail validation for low heat sinks', () => {
      const doc = createMockBlkDocument({ heatsinks: 5 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('heat sinks'))).toBe(true);
    });

    it('should warn about low fuel', () => {
      const doc = createMockBlkDocument({ fuel: 50 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.warnings.some(w => w.toLowerCase().includes('fuel'))).toBe(true);
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
});
