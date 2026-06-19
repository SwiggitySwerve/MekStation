/**
 * SupportVehicleUnitHandler Tests
 *
 * Tests for Support Vehicle BLK parsing, validation, and calculations
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel, WeightClass } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { SupportVehicleSizeClass } from '@/types/unit/VehicleInterfaces';

import {
  SupportVehicleUnitHandler,
  createSupportVehicleHandler,
} from '../SupportVehicleUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createSmallSupportVehicleDocument,
  createMediumSupportVehicleDocument,
  createLargeSupportVehicleDocument,
  createHoverSupportVehicleDocument,
  createVTOLSupportVehicleDocument,
  createNavalSupportVehicleDocument,
  createHydrofoilSupportVehicleDocument,
  createSubmarineSupportVehicleDocument,
  createWiGESupportVehicleDocument,
  createRailSupportVehicleDocument,
  createMaglevSupportVehicleDocument,
  createClanSupportVehicleDocument,
  createStationarySupportVehicleDocument,
  createMultiLocationEquipmentDocument,
} from './SupportVehicleUnitHandler.test-helpers';

describe('SupportVehicleUnitHandler', () => {
  let handler: SupportVehicleUnitHandler;

  beforeEach(() => {
    handler = createSupportVehicleHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('parse - cargo capacity', () => {
    it('should parse cargo capacity from cargo tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargo: '10' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.cargoCapacity).toBe(10);
    });

    it('should parse cargo capacity from cargocapacity tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargocapacity: '15.5' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.cargoCapacity).toBe(15.5);
    });

    it('should default cargo capacity to 0', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.cargoCapacity).toBe(0);
    });

    it('should parse cargo from array value', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargo: ['20', '30'] },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.cargoCapacity).toBe(20);
    });
  });

  // ==========================================================================
  // Parsing - Tech Ratings
  // ==========================================================================

  describe('parse - tech ratings', () => {
    it('should parse structural tech rating', () => {
      const doc = createMockBlkDocument({
        rawTags: { structuraltechrating: '6' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.structuralTechRating).toBe(6);
    });

    it('should parse armor tech rating', () => {
      const doc = createMockBlkDocument({
        rawTags: { armortechrating: '7' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorTechRating).toBe(7);
    });

    it('should parse engine tech rating', () => {
      const doc = createMockBlkDocument({
        rawTags: { enginetechrating: '8' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineTechRating).toBe(8);
    });

    it('should default tech ratings to 5', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.structuralTechRating).toBe(5);
      expect(result.data?.unit?.armorTechRating).toBe(5);
      expect(result.data?.unit?.engineTechRating).toBe(5);
    });
  });

  // ==========================================================================
  // Parsing - Armor
  // ==========================================================================

  describe('parse - armor', () => {
    it('should parse armor array', () => {
      const doc = createMockBlkDocument({
        armor: [10, 8, 8, 6],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armor).toEqual([10, 8, 8, 6]);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [10, 8, 8, 6],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(32);
    });

    it('should calculate max armor based on tonnage and BAR', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      // Max = floor(20 * 3.5 * (10/10)) = floor(70) = 70
      expect(result.data?.unit?.maxArmorPoints).toBe(70);
    });

    it('should calculate reduced max armor for lower BAR', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        rawTags: { bar: '5' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      // Max = floor(20 * 3.5 * (5/10)) = floor(35) = 35
      expect(result.data?.unit?.maxArmorPoints).toBe(35);
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
      const doc = createClanSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should default to Inner Sphere for unspecified tech base', () => {
      const doc = createMockBlkDocument({ type: '' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });

    it('should handle mixed tech as Inner Sphere', () => {
      const doc = createMockBlkDocument({ type: 'Mixed (IS Chassis)' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });
  });

  // ==========================================================================
  // Parsing - Rules Level
  // ==========================================================================

  describe('parse - rules level', () => {
    it('should parse introductory rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 1' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
    });

    it('should parse standard rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
    });

    it('should parse advanced rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
    });

    it('should parse experimental rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 4' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.EXPERIMENTAL);
    });

    it('should default to standard rules level', () => {
      const doc = createMockBlkDocument({ type: 'Unknown' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
    });
  });

  // ==========================================================================
  // Parsing - Weight Class
  // ==========================================================================

  describe('parse - weight class', () => {
    it('should classify light weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
    });

    it('should classify medium weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 50 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.MEDIUM);
    });

    it('should classify heavy weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 70 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.HEAVY);
    });

    it('should classify assault weight class', () => {
      const doc = createMockBlkDocument({ tonnage: 100 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.ASSAULT);
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================
});
