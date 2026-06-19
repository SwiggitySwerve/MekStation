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

  describe('parse - armor', () => {
    it('should parse armor array by location', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.FRONT]).toBe(16);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.LEFT]).toBe(10);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.RIGHT]).toBe(10);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.REAR]).toBe(8);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.ROTOR]).toBe(2);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2], // Total: 46
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(46);
    });

    it('should calculate max armor points as tonnage * 3.5', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.maxArmorPoints).toBe(70); // 20 * 3.5 = 70
    });

    it('should floor max armor for odd tonnages', () => {
      const doc = createMockBlkDocument({ tonnage: 21 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.maxArmorPoints).toBe(73); // floor(21 * 3.5) = 73
    });

    it('should parse armor type', () => {
      const doc = createMockBlkDocument({ armorType: 2 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorType).toBe(2);
    });

    it('should handle short armor arrays', () => {
      const doc = createMockBlkDocument({
        armor: [10, 8, 8], // Only 3 values
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.FRONT]).toBe(10);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.LEFT]).toBe(8);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.RIGHT]).toBe(8);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.REAR]).toBe(0);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.ROTOR]).toBe(0);
    });

    it('should initialize unparsed locations to 0', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.TURRET]).toBe(0);
      expect(result.data?.unit?.armorByLocation[VTOLLocation.BODY]).toBe(0);
    });
  });

  // ==========================================================================
  // Parsing - Chin Turret
  // ==========================================================================

  describe('parse - chin turret', () => {
    it('should parse chin turret from turrettype tag', () => {
      const doc = createChinTurretVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
      expect(result.data?.unit?.chinTurret?.type).toBe(TurretType.CHIN);
    });

    it('should set chin turret rotation arc to 180', () => {
      const doc = createChinTurretVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret?.rotationArc).toBe(180);
    });

    it('should calculate chin turret max weight as 10% of tonnage', () => {
      const doc = createMockBlkDocument({
        tonnage: 25,
        equipmentByLocation: { Chin: ['SRM 2'] },
        rawTags: { turrettype: 'Chin' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret?.maxWeight).toBe(2.5); // 25 * 0.1
    });

    it('should detect chin turret from Chin equipment location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: { Chin: ['Machine Gun'] },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
    });

    it('should detect chin turret from Turret equipment location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: { Turret: ['Small Laser'] },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
    });

    it('should detect chin turret from Turret Equipment location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: { 'Turret Equipment': ['SRM 2'] },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeDefined();
    });

    it('should not create turret when no turret equipment', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Medium Laser'],
          'Body Equipment': [],
        },
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.chinTurret).toBeUndefined();
    });
  });

  // ==========================================================================
  // Parsing - Equipment
  // ==========================================================================

  describe('parse - equipment', () => {
    it('should parse front equipment', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Medium Laser', 'Small Laser'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const frontEquip = result.data?.unit?.equipment.filter(
        (e) => e.location === VTOLLocation.FRONT,
      );
      expect(frontEquip?.length).toBe(2);
    });

    it('should mark turret equipment as turret mounted', () => {
      const doc = createClanVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const turretEquip = result.data?.unit?.equipment.find(
        (e) => e.name === 'Streak SRM 2',
      );
      expect(turretEquip?.isTurretMounted).toBe(true);
    });

    it('should mark chin equipment as turret mounted', () => {
      const doc = createChinTurretVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const chinEquip = result.data?.unit?.equipment.find(
        (e) => e.name === 'SRM 2',
      );
      expect(chinEquip?.isTurretMounted).toBe(true);
    });

    it('should mark non-turret equipment as not turret mounted', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Medium Laser'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const frontEquip = result.data?.unit?.equipment.find(
        (e) => e.name === 'Medium Laser',
      );
      expect(frontEquip?.isTurretMounted).toBe(false);
    });

    it('should assign unique mount IDs', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'Front Equipment': ['Machine Gun', 'Machine Gun'],
          'Body Equipment': ['Ammo MG'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const ids = result.data?.unit?.equipment.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids?.length);
    });

    it('should normalize location names', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {
          'left side': ['Small Laser'],
          right: ['Machine Gun'],
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(
        result.data?.unit?.equipment.some(
          (e) => e.location === VTOLLocation.LEFT,
        ),
      ).toBe(true);
      expect(
        result.data?.unit?.equipment.some(
          (e) => e.location === VTOLLocation.RIGHT,
        ),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Parsing - Rotor
  // ==========================================================================

  describe('parse - rotor', () => {
    it('should set rotor hits to 2', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorHits).toBe(2);
    });

    it('should parse rotor type from raw tags', () => {
      const doc = createCustomRotorVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Coaxial');
    });

    it('should default rotor type to Standard', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Standard');
    });
  });

  // ==========================================================================
  // Parsing - Tonnage Limit
  // ==========================================================================
});
