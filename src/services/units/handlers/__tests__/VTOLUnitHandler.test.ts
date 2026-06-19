/**
 * VTOLUnitHandler Tests
 *
 * Tests for VTOL BLK parsing, validation, and serialization
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.2.8
 */

import { VTOLLocation } from '@/types/construction/UnitLocation';
import { TechBase, WeightClass, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType, IVTOL } from '@/types/unit/VehicleInterfaces';

import { VTOLUnitHandler, createVTOLHandler } from '../VTOLUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createChinTurretVTOLDocument,
  createScoutVTOLDocument,
  createHeavyVTOLDocument,
  createClanVTOLDocument,
  createOverweightVTOLDocument,
  createNoMovementVTOLDocument,
  createCustomRotorVTOLDocument,
  createExcessiveRotorArmorDocument,
} from './VTOLUnitHandler.test-helpers';

describe('VTOLUnitHandler', () => {
  let handler: VTOLUnitHandler;

  beforeEach(() => {
    handler = createVTOLHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.VTOL);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('VTOL');
    });

    it('should return VTOL locations', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(VTOLLocation.FRONT);
      expect(locations).toContain(VTOLLocation.LEFT);
      expect(locations).toContain(VTOLLocation.RIGHT);
      expect(locations).toContain(VTOLLocation.REAR);
      expect(locations).toContain(VTOLLocation.TURRET);
      expect(locations).toContain(VTOLLocation.ROTOR);
      expect(locations).toContain(VTOLLocation.BODY);
    });

    it('should return all VTOLLocation enum values', () => {
      const locations = handler.getLocations();
      const enumValues = Object.values(VTOLLocation);
      expect(locations.length).toBe(enumValues.length);
      for (const val of enumValues) {
        expect(locations).toContain(val);
      }
    });
  });

  // ==========================================================================
  // canHandle
  // ==========================================================================

  describe('canHandle', () => {
    it('should handle VTOL unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle mapped VTOL unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'vtol',
        mappedUnitType: UnitType.VTOL,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle Vehicle unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle BattleMech unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleMech',
        mappedUnitType: UnitType.BATTLEMECH,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Aerospace unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing - Basic
  // ==========================================================================

  describe('parse - basic', () => {
    it('should parse valid BLK document successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
    });

    it('should parse unit type as VTOL', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.unitType).toBe(UnitType.VTOL);
    });

    it('should parse chassis and model', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.metadata.chassis).toBe('Warrior');
      expect(result.data?.unit?.metadata.model).toBe('H-7');
    });

    it('should parse tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 25 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(25);
    });

    it('should construct name from chassis and model', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.name).toBe('Warrior H-7');
    });
  });

  // ==========================================================================
  // Parsing - Motion Type
  // ==========================================================================

  describe('parse - motion type', () => {
    it('should always set motion type to VTOL', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.VTOL);
    });

    it('should ignore motion type override', () => {
      const doc = createMockBlkDocument({ motionType: 'Hover' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.VTOL);
    });
  });

  // ==========================================================================
  // Parsing - Movement
  // ==========================================================================

  describe('parse - movement', () => {
    it('should parse cruise MP', () => {
      const doc = createMockBlkDocument({ cruiseMP: 10 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.cruiseMP).toBe(10);
    });

    it('should calculate flank MP as 1.5x cruise', () => {
      const doc = createMockBlkDocument({ cruiseMP: 8 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.flankMP).toBe(12); // 8 * 1.5 = 12
    });

    // Audit 2026-06-09 C-14: was pinned to floor(7 * 1.5) = 10 — MegaMek
    // Entity.getRunMP rounds UP (ceil(walk MP * 1.5)).
    it('should round flank MP up for odd cruise values', () => {
      const doc = createMockBlkDocument({ cruiseMP: 7 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.flankMP).toBe(11); // ceil(7 * 1.5) = 11
    });

    it('should set jump MP to 0 (VTOLs fly, not jump)', () => {
      const doc = createMockBlkDocument({ jumpingMP: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.jumpMP).toBe(0);
    });

    it('should fail parsing when cruise MP is 0', () => {
      const doc = createNoMovementVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('at least 1 cruise MP')),
      ).toBe(true);
    });

    it('should parse fast scout VTOL movement', () => {
      const doc = createScoutVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.cruiseMP).toBe(12);
      expect(result.data?.unit?.movement.flankMP).toBe(18);
    });
  });

  // ==========================================================================
  // Parsing - Engine
  // ==========================================================================

  describe('parse - engine', () => {
    it('should calculate engine rating as cruise * tonnage', () => {
      const doc = createMockBlkDocument({ cruiseMP: 10, tonnage: 21 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineRating).toBe(210); // 10 * 21
    });

    it('should parse engine type', () => {
      const doc = createMockBlkDocument({ engineType: 1 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineType).toBe(1);
    });

    it('should default engine type to 0', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.engineType).toBe(0);
    });
  });

  // ==========================================================================
  // Parsing - Armor
  // ==========================================================================
});
