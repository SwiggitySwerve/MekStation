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

  describe('parse - movement', () => {
    it('should calculate cruiseMP correctly', () => {
      const doc = createMockBlkDocument({ cruiseMP: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.cruiseMP).toBe(5);
    });

    it('should calculate flankMP as 1.5x cruiseMP', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.flankMP).toBe(6); // 4 * 1.5 = 6
    });

    // Audit 2026-06-09 C-14: was pinned to floor(5 * 1.5) = 7 — MegaMek
    // Entity.getRunMP rounds UP (ceil(walk MP * 1.5)).
    it('should round flankMP up for odd cruise values', () => {
      const doc = createMockBlkDocument({ cruiseMP: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.flankMP).toBe(8); // ceil(5 * 1.5) = 8
    });

    it('should parse jumpMP correctly', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4, jumpingMP: 2 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.jumpMP).toBe(2);
    });

    it('should default jumpMP to 0', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.jumpMP).toBe(0);
    });

    it('should handle zero cruise MP for stationary vehicles', () => {
      const doc = createStationarySupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.cruiseMP).toBe(0);
      expect(result.data?.unit?.movement.flankMP).toBe(0);
    });

    it('should calculate engine rating from cruiseMP and tonnage', () => {
      const doc = createMockBlkDocument({ cruiseMP: 4, tonnage: 20 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineRating).toBe(80); // 4 * 20 = 80
    });
  });

  // ==========================================================================
  // Parsing - BAR Rating
  // ==========================================================================

  describe('parse - BAR rating', () => {
    it('should parse BAR rating from bar tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: '7' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.barRating).toBe(7);
    });

    it('should parse BAR rating from barrating tag', () => {
      const doc = createMockBlkDocument({
        rawTags: { barrating: '8' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.barRating).toBe(8);
    });

    it('should default BAR rating to 5 when not specified', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.barRating).toBe(5);
    });

    it('should parse BAR rating from array value', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: ['6', '7'] },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.barRating).toBe(6); // First value
    });

    it('should default to 5 for invalid BAR string', () => {
      const doc = createMockBlkDocument({
        rawTags: { bar: 'invalid' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.barRating).toBe(5);
    });
  });

  // ==========================================================================
  // Parsing - Size Class
  // ==========================================================================

  describe('parse - size class determination', () => {
    it('should classify tonnage <= 5 as SMALL', () => {
      const doc = createSmallSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.sizeClass).toBe(SupportVehicleSizeClass.SMALL);
    });

    it('should classify 5 tons as SMALL', () => {
      const doc = createMockBlkDocument({ tonnage: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.sizeClass).toBe(SupportVehicleSizeClass.SMALL);
    });

    it('should classify 6 tons as MEDIUM', () => {
      const doc = createMockBlkDocument({ tonnage: 6 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.sizeClass).toBe(SupportVehicleSizeClass.MEDIUM);
    });

    it('should classify tonnage 6-80 as MEDIUM', () => {
      const doc = createMediumSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.sizeClass).toBe(SupportVehicleSizeClass.MEDIUM);
    });

    it('should classify 80 tons as MEDIUM', () => {
      const doc = createMockBlkDocument({ tonnage: 80 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.sizeClass).toBe(SupportVehicleSizeClass.MEDIUM);
    });

    it('should classify 81 tons as LARGE', () => {
      const doc = createMockBlkDocument({ tonnage: 81 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.sizeClass).toBe(SupportVehicleSizeClass.LARGE);
    });

    it('should classify tonnage > 80 as LARGE', () => {
      const doc = createLargeSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.sizeClass).toBe(SupportVehicleSizeClass.LARGE);
    });
  });

  // ==========================================================================
  // Parsing - Equipment
  // ==========================================================================

  describe('parse - equipment', () => {
    it('should parse equipment from Body location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Body Equipment': ['Cargo (5 tons)'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBe(1);
      expect(result.data?.unit?.equipment[0].name).toBe('Cargo (5 tons)');
      expect(result.data?.unit?.equipment[0].location).toBe(
        VehicleLocation.BODY,
      );
    });

    it('should parse equipment from multiple locations', () => {
      const doc = createMultiLocationEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBe(4);

      const frontEquip = result.data?.unit?.equipment.find(
        (e) => e.location === VehicleLocation.FRONT,
      );
      expect(frontEquip?.name).toBe('Bulldozer Blade');

      const turretEquip = result.data?.unit?.equipment.find(
        (e) => e.location === VehicleLocation.TURRET,
      );
      expect(turretEquip?.name).toBe('Crane Arm');
      expect(turretEquip?.isTurretMounted).toBe(true);
    });

    it('should normalize location names correctly', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Item A'],
          'Left Side Equipment': ['Item B'],
          'Right Side Equipment': ['Item C'],
          'Rear Equipment': ['Item D'],
          'Turret Equipment': ['Item E'],
          'Body Equipment': ['Item F'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);

      const locations = result.data?.unit?.equipment.map((e) => e.location);
      expect(locations).toContain(VehicleLocation.FRONT);
      expect(locations).toContain(VehicleLocation.LEFT);
      expect(locations).toContain(VehicleLocation.RIGHT);
      expect(locations).toContain(VehicleLocation.REAR);
      expect(locations).toContain(VehicleLocation.TURRET);
      expect(locations).toContain(VehicleLocation.BODY);
    });

    it('should mark turret equipment as turret mounted', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Turret Equipment': ['Pintle Mount'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment[0].isTurretMounted).toBe(true);
    });

    it('should not mark non-turret equipment as turret mounted', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Bulldozer Blade'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment[0].isTurretMounted).toBe(false);
    });

    it('should assign unique IDs to equipment mounts', () => {
      const doc = createMultiLocationEquipmentDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const ids = result.data?.unit?.equipment.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids?.length);
    });

    it('should handle empty equipment list', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBe(0);
    });
  });

  // ==========================================================================
  // Parsing - Cargo Capacity
  // ==========================================================================
});
