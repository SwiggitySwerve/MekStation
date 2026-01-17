/**
 * InfantryUnitHandler Tests
 *
 * Tests for Infantry BLK parsing and validation
 */

import { InfantryUnitHandler, createInfantryHandler } from '../InfantryUnitHandler';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { SquadMotionType } from '../../../../types/unit/BaseUnitInterfaces';
import { InfantryArmorKit } from '../../../../types/unit/PersonnelInterfaces';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Infantry',
    mappedUnitType: UnitType.INFANTRY,
    name: 'Foot Rifle Platoon',
    model: 'Standard',
    year: 2750,
    type: 'IS Level 1',
    tonnage: 0.1,
    motionType: 'Foot',
    squadSize: 7,
    squadn: 4,
    primary: 'Rifle',
    cruiseMP: 1,
    armor: [0],
    equipmentByLocation: {},
    rawTags: {},
    ...overrides,
  };
}

function createJumpInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Jump Rifle Platoon',
    motionType: 'Jump',
    cruiseMP: 1,
    jumpingMP: 3,
    armorKit: 'Flak',
    armor: [1],
  });
}

function createMechanizedInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Mechanized Rifle Platoon',
    motionType: 'Mechanized',
    cruiseMP: 3,
    squadSize: 6,
    squadn: 3,
    primary: 'Auto-Rifle',
    armorKit: 'Standard',
    armor: [1],
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('InfantryUnitHandler', () => {
  let handler: InfantryUnitHandler;

  beforeEach(() => {
    handler = createInfantryHandler();
  });

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.INFANTRY);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Infantry');
    });
  });

  describe('canHandle', () => {
    it('should handle Infantry unit type', () => {
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
    it('should parse foot rifle platoon successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit).toBeDefined();
      expect(result.unit?.unitType).toBe(UnitType.INFANTRY);
      expect(result.unit?.metadata.chassis).toBe('Foot Rifle Platoon');
    });

    it('should parse squad configuration', () => {
      const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.squadSize).toBe(7);
      expect(result.unit?.numberOfSquads).toBe(4);
      expect(result.unit?.platoonStrength).toBe(28);
    });

    it('should parse motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'Foot' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(SquadMotionType.FOOT);
    });

    it('should parse jump infantry', () => {
      const doc = createJumpInfantryDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(SquadMotionType.JUMP);
      expect(result.unit?.movement.jumpMP).toBe(3);
    });

    it('should parse mechanized infantry', () => {
      const doc = createMechanizedInfantryDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.motionType).toBe(SquadMotionType.MECHANIZED);
      expect(result.unit?.movement.groundMP).toBe(3);
    });

    it('should parse primary weapon', () => {
      const doc = createMockBlkDocument({ primary: 'Rifle' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.primaryWeapon).toBe('Rifle');
    });

    it('should parse secondary weapon', () => {
      const doc = createMockBlkDocument({
        primary: 'Rifle',
        secondary: 'SRM',
        secondn: 2,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.secondaryWeapon).toBe('SRM');
      expect(result.unit?.secondaryWeaponCount).toBe(2);
    });

    it('should parse armor kit', () => {
      const doc = createMockBlkDocument({ armorKit: 'Flak' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.unit?.armorKit).toBe(InfantryArmorKit.FLAK);
    });
  });

  describe('validate', () => {
    it('should pass validation for valid infantry', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true);
    });

    it('should fail validation for invalid squad size', () => {
      const doc = createMockBlkDocument({ squadSize: 15 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes('squad size'))).toBe(true);
    });

    it('should warn about unusual squad count', () => {
      const doc = createMockBlkDocument({ squadn: 6 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.warnings.some(w => w.includes('squads'))).toBe(true);
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
