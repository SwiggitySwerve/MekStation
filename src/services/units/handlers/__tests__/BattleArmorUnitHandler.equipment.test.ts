/**
 * BattleArmorUnitHandler Tests
 *
 * Comprehensive tests for Battle Armor BLK parsing, validation, and calculations.
 *
 * @see BattleArmorUnitHandler.ts
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.4
 */

import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  BattleArmorWeightClass,
  BattleArmorChassisType,
  ManipulatorType,
} from '@/types/unit/PersonnelInterfaces';

import {
  BattleArmorUnitHandler,
  createBattleArmorHandler,
} from '../BattleArmorUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createPALDocument,
  createLightBADocument,
  createMediumBADocument,
  createHeavyBADocument,
  createAssaultBADocument,
  createQuadBADocument,
  createVTOLBADocument,
  createUMUBADocument,
  createMechanizedBADocument,
  createBAWithManipulatorsDocument,
  createBAWithSpecialEquipmentDocument,
  createBAWithTurretDocument,
  createBAWithAPMountDocument,
  createBAWithMultipleLocationsDocument,
  createMinimalBADocument,
  createUnusualSquadSizeDocument,
} from './BattleArmorUnitHandler.test-helpers';

describe('BattleArmorUnitHandler', () => {
  let handler: BattleArmorUnitHandler;

  beforeEach(() => {
    handler = createBattleArmorHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('parse - armor', () => {
    it('should parse armor per trooper', () => {
      const doc = createMockBlkDocument({ armor: [10] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorPerTrooper).toBe(10);
    });

    it('should parse zero armor', () => {
      const doc = createMockBlkDocument({ armor: [0] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorPerTrooper).toBe(0);
    });

    it('should default to 0 armor for undefined', () => {
      const doc = createMockBlkDocument({ armor: [] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorPerTrooper).toBe(0);
    });

    it('should parse armor type', () => {
      const doc = createMockBlkDocument({ armorType: 1 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorType).toBe(1);
    });
  });

  // ==========================================================================
  // Parsing - Equipment
  // ==========================================================================

  describe('parse - equipment', () => {
    it('should parse squad equipment', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBe(2);
      expect(result.data?.unit?.equipment[0].name).toBe('BA Small Laser');
      expect(result.data?.unit?.equipment[1].name).toBe('BA SRM-2');
    });

    it('should normalize equipment location to SQUAD', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment[0].location).toBe(
        BattleArmorLocation.SQUAD,
      );
    });

    it('should parse body equipment with correct location', () => {
      const doc = createBAWithMultipleLocationsDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const bodyEquip = result.data?.unit?.equipment.find(
        (e) => e.name === 'BA ECM Suite',
      );
      expect(bodyEquip?.location).toBe(BattleArmorLocation.BODY);
    });

    it('should parse left arm equipment with correct location', () => {
      const doc = createBAWithMultipleLocationsDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const leftArmEquip = result.data?.unit?.equipment.find(
        (e) => e.location === BattleArmorLocation.LEFT_ARM,
      );
      expect(leftArmEquip).toBeDefined();
    });

    it('should parse right arm equipment with correct location', () => {
      const doc = createBAWithMultipleLocationsDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const rightArmEquip = result.data?.unit?.equipment.find(
        (e) => e.location === BattleArmorLocation.RIGHT_ARM,
      );
      expect(rightArmEquip).toBeDefined();
    });

    it('should mark turret equipment correctly', () => {
      const doc = createBAWithTurretDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const turretEquip = result.data?.unit?.equipment.find(
        (e) => e.isTurretMounted,
      );
      expect(turretEquip).toBeDefined();
      expect(turretEquip?.location).toBe(BattleArmorLocation.TURRET);
    });

    it('should mark AP mount equipment correctly', () => {
      const doc = createBAWithAPMountDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const apEquip = result.data?.unit?.equipment.find((e) => e.isAPMount);
      expect(apEquip).toBeDefined();
    });

    it('should handle empty equipment', () => {
      const doc = createMinimalBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBe(0);
    });

    it('should assign unique IDs to equipment mounts', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const ids = result.data?.unit?.equipment.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids?.length);
    });
  });

  // ==========================================================================
  // Parsing - Special Features
  // ==========================================================================

  describe('parse - special features', () => {
    it('should parse AP mount feature', () => {
      const doc = createBAWithSpecialEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasAPMount).toBe(true);
    });

    it('should parse modular mount feature', () => {
      const doc = createBAWithSpecialEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasModularMount).toBe(true);
    });

    it('should parse turret mount feature', () => {
      const doc = createBAWithSpecialEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasTurretMount).toBe(true);
    });

    it('should parse stealth system feature', () => {
      const doc = createBAWithSpecialEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasStealthSystem).toBe(true);
    });

    it('should parse mimetic armor feature as false', () => {
      const doc = createBAWithSpecialEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasMimeticArmor).toBe(false);
    });

    it('should parse fire resistant armor feature', () => {
      const doc = createBAWithSpecialEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasFireResistantArmor).toBe(true);
    });

    it('should parse mechanical jump boosters feature', () => {
      const doc = createBAWithSpecialEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasMechanicalJumpBoosters).toBe(true);
    });

    it('should default special features to false', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasAPMount).toBe(false);
      expect(result.data?.unit?.hasModularMount).toBe(false);
      expect(result.data?.unit?.hasTurretMount).toBe(false);
      expect(result.data?.unit?.hasStealthSystem).toBe(false);
      expect(result.data?.unit?.hasMimeticArmor).toBe(false);
      expect(result.data?.unit?.hasFireResistantArmor).toBe(false);
      expect(result.data?.unit?.hasMechanicalJumpBoosters).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing - Capabilities
  // ==========================================================================

  describe('parse - capabilities', () => {
    it('should allow swarm for non-assault BA', () => {
      const doc = createMediumBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.canSwarm).toBe(true);
    });

    it('should disallow swarm for assault BA', () => {
      const doc = createAssaultBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.canSwarm).toBe(false);
    });

    it('should allow leg attack for all BA', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.canLegAttack).toBe(true);
    });

    it('should allow omni mount for non-assault BA', () => {
      const doc = createMediumBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.canMountOmni).toBe(true);
    });

    it('should disallow omni mount for assault BA', () => {
      const doc = createAssaultBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.canMountOmni).toBe(false);
    });

    it('should allow anti-mech for all BA', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.canAntiMech).toBe(true);
    });
  });

  // ==========================================================================
  // Parsing - Tech Base
  // ==========================================================================

  describe('parse - tech base', () => {
    it('should parse Clan tech base', () => {
      const doc = createMockBlkDocument({ type: 'Clan Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe('Clan');
    });

    it('should parse Inner Sphere tech base', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe('Inner Sphere');
    });

    it('should default to Inner Sphere for mixed tech', () => {
      const doc = createMockBlkDocument({ type: 'Mixed Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe('Inner Sphere');
    });
  });

  // ==========================================================================
  // Parsing - Weight Per Trooper
  // ==========================================================================

  describe('parse - weight per trooper', () => {
    it('should calculate weight per trooper correctly for standard squad', () => {
      const doc = createMockBlkDocument({
        tonnage: 4,
        trooperCount: 4,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      // 4 tons / 4 troopers = 1 ton = 1000 kg per trooper
      expect(result.data?.unit?.weightPerTrooper).toBe(1000);
    });

    it('should calculate weight per trooper for 5-trooper squad', () => {
      const doc = createMockBlkDocument({
        tonnage: 5,
        trooperCount: 5,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      // 5 tons / 5 troopers = 1 ton = 1000 kg per trooper
      expect(result.data?.unit?.weightPerTrooper).toBe(1000);
    });

    it('should calculate weight per trooper for PA(L)', () => {
      const doc = createPALDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      // 0.4 tons / 4 troopers = 0.1 tons = 100 kg per trooper
      expect(result.data?.unit?.weightPerTrooper).toBe(100);
    });
  });

  // ==========================================================================
  // Validation - Squad Size
  // ==========================================================================
});
