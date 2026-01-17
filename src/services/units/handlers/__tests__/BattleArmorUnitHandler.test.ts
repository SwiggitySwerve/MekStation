/**
 * BattleArmorUnitHandler Tests
 *
 * Tests for Battle Armor BLK parsing and validation
 */

import { BattleArmorUnitHandler, createBattleArmorHandler } from '../BattleArmorUnitHandler';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { BattleArmorWeightClass, BattleArmorChassisType } from '../../../../types/unit/PersonnelInterfaces';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'BattleArmor',
    mappedUnitType: UnitType.BATTLE_ARMOR,
    name: 'Elemental',
    model: 'Point',
    year: 2868,
    type: 'Clan Level 2',
    tonnage: 4, // Total squad weight (4 troopers * 1 ton each)
    chassis: 'biped',
    trooperCount: 5,
    weightClass: 3, // Heavy
    cruiseMP: 1,
    jumpingMP: 3,
    armor: [10], // Armor per trooper
    equipmentByLocation: {
      'Squad Equipment': ['BA Small Laser', 'BA SRM-2'],
    },
    rawTags: {},
    ...overrides,
  };
}

function createLightBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Infiltrator Mk I',
    model: 'Standard',
    type: 'IS Level 2',
    tonnage: 2,
    weightClass: 1, // Light
    trooperCount: 4,
    cruiseMP: 2,
    jumpingMP: 2,
    armor: [4],
    equipmentByLocation: {
      'Squad Equipment': ['BA Laser Rifle'],
    },
  });
}

function createAssaultBADocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Kanazuchi',
    model: 'Standard',
    type: 'IS Level 3',
    tonnage: 8,
    weightClass: 4, // Assault
    trooperCount: 4,
    cruiseMP: 1,
    jumpingMP: 0,
    armor: [14],
    equipmentByLocation: {
      'Squad Equipment': ['BA Heavy Machine Gun', 'BA Heavy Recoilless Rifle'],
    },
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('BattleArmorUnitHandler', () => {
  let handler: BattleArmorUnitHandler;

  beforeEach(() => {
    handler = createBattleArmorHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.BATTLE_ARMOR);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Battle Armor');
    });
  });

  describe('canHandle', () => {
    it('should handle BattleArmor unit type', () => {
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
    it('should parse Elemental successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit).toBeDefined();
      expect(result.unit?.unitType).toBe(UnitType.BATTLE_ARMOR);
      expect(result.unit?.metadata.chassis).toBe('Elemental');
    });

    it('should parse squad size', () => {
      const doc = createMockBlkDocument({ trooperCount: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.squadSize).toBe(5);
    });

    it('should parse chassis type', () => {
      const doc = createMockBlkDocument({ chassis: 'quad' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.chassisType).toBe(BattleArmorChassisType.QUAD);
    });

    it('should parse weight class', () => {
      const doc = createMockBlkDocument({ weightClass: 3 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.baWeightClass).toBe(BattleArmorWeightClass.HEAVY);
    });

    it('should parse light BA', () => {
      const doc = createLightBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.baWeightClass).toBe(BattleArmorWeightClass.LIGHT);
    });

    it('should parse assault BA', () => {
      const doc = createAssaultBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.baWeightClass).toBe(BattleArmorWeightClass.ASSAULT);
    });

    it('should parse movement', () => {
      const doc = createMockBlkDocument({ cruiseMP: 1, jumpingMP: 3 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.movement.groundMP).toBe(1);
      expect(result.unit?.jumpMP).toBe(3);
    });

    it('should parse armor per trooper', () => {
      const doc = createMockBlkDocument({ armor: [10] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.armorPerTrooper).toBe(10);
    });

    it('should parse equipment', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.equipment.length).toBe(2);
    });

    it('should set swarm capability based on weight class', () => {
      const elementalDoc = createMockBlkDocument();
      const assaultDoc = createAssaultBADocument();

      const elementalResult = handler.parse(elementalDoc);
      const assaultResult = handler.parse(assaultDoc);

      expect(elementalResult.unit?.canSwarm).toBe(true);
      expect(assaultResult.unit?.canSwarm).toBe(false);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid BA', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true);
    });

    it('should fail validation for invalid squad size', () => {
      const doc = createMockBlkDocument({ trooperCount: 10 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('squad size'))).toBe(true);
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
