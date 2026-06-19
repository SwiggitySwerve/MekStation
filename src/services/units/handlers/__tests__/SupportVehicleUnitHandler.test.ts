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

  describe('constructor and properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.SUPPORT_VEHICLE);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Support Vehicle');
    });

    it('should return VehicleLocation values from getLocations()', () => {
      const locations = handler.getLocations();
      expect(locations).toContain(VehicleLocation.FRONT);
      expect(locations).toContain(VehicleLocation.LEFT);
      expect(locations).toContain(VehicleLocation.RIGHT);
      expect(locations).toContain(VehicleLocation.REAR);
      expect(locations).toContain(VehicleLocation.TURRET);
      expect(locations).toContain(VehicleLocation.BODY);
    });

    it('should return all VehicleLocation enum values', () => {
      const locations = handler.getLocations();
      const vehicleLocationValues = Object.values(VehicleLocation);
      expect(locations.length).toBe(vehicleLocationValues.length);
      for (const loc of vehicleLocationValues) {
        expect(locations).toContain(loc);
      }
    });
  });

  // ==========================================================================
  // canHandle
  // ==========================================================================

  describe('canHandle', () => {
    it('should handle SupportTank unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle SupportVTOL unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'SupportVTOL',
        mappedUnitType: UnitType.SUPPORT_VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should handle mapped SUPPORT_VEHICLE unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Custom',
        mappedUnitType: UnitType.SUPPORT_VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle Tank (combat vehicle) unit type', () => {
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
  });

  // ==========================================================================
  // Parsing - Basic
  // ==========================================================================

  describe('parse - basic functionality', () => {
    it('should parse basic support vehicle successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.SUPPORT_VEHICLE);
      expect(result.data?.unit?.tonnage).toBe(20);
      expect(result.data?.unit?.metadata.chassis).toBe('Cargo Truck');
      expect(result.data?.unit?.metadata.model).toBe('Standard');
    });

    it('should parse name and model correctly', () => {
      const doc = createMockBlkDocument({
        name: 'Custom Transport',
        model: 'Mark IV',
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.name).toBe('Custom Transport Mark IV');
      expect(result.data?.unit?.metadata.chassis).toBe('Custom Transport');
      expect(result.data?.unit?.metadata.model).toBe('Mark IV');
    });

    it('should parse year correctly', () => {
      const doc = createMockBlkDocument({ year: 2750 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.metadata.year).toBe(2750);
    });

    it('should fail parsing with missing name', () => {
      const doc = createMockBlkDocument({ name: '' });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.length).toBeGreaterThan(0);
    });

    it('should fail parsing with zero tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 0 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.toLowerCase().includes('tonnage')),
      ).toBe(true);
    });

    it('should fail parsing with negative tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: -10 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing - Motion Types
  // ==========================================================================

  describe('parse - motion types', () => {
    it('should parse tracked motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'Tracked' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.TRACKED);
    });

    it('should parse wheeled motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'Wheeled' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.WHEELED);
    });

    it('should parse hover motion type', () => {
      const doc = createHoverSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.HOVER);
    });

    it('should parse VTOL motion type', () => {
      const doc = createVTOLSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.VTOL);
    });

    it('should parse naval motion type', () => {
      const doc = createNavalSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.NAVAL);
    });

    it('should parse hydrofoil motion type', () => {
      const doc = createHydrofoilSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.HYDROFOIL);
    });

    it('should parse submarine motion type', () => {
      const doc = createSubmarineSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.SUBMARINE);
    });

    it('should parse WiGE motion type', () => {
      const doc = createWiGESupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.WIGE);
    });

    it('should parse rail motion type', () => {
      const doc = createRailSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.RAIL);
    });

    it('should parse maglev motion type', () => {
      const doc = createMaglevSupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.MAGLEV);
    });

    it('should default to wheeled for unknown motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'UnknownType' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.WHEELED);
    });

    it('should default to wheeled for undefined motion type', () => {
      const doc = createMockBlkDocument({ motionType: undefined });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.WHEELED);
    });

    it('should handle case-insensitive motion type parsing', () => {
      const doc = createMockBlkDocument({ motionType: 'HOVER' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.HOVER);
    });

    it('should map airship to hover motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'Airship' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.HOVER);
    });

    it('should map fixed to tracked motion type', () => {
      const doc = createStationarySupportVehicleDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(GroundMotionType.TRACKED);
    });
  });

  // ==========================================================================
  // Parsing - Movement
  // ==========================================================================
});
