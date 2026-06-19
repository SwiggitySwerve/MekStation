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

  describe('serialize', () => {
    it('should serialize support vehicle successfully', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized).toBeDefined();
    });

    it('should include chassis in serialized output', () => {
      const doc = createMockBlkDocument({ name: 'Test Vehicle' });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.chassis).toBe('Test Vehicle');
    });

    it('should include model in serialized output', () => {
      const doc = createMockBlkDocument({ model: 'Mark II' });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.model).toBe('Mark II');
    });

    it('should include unit type in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.unitType).toBe(
        UnitType.SUPPORT_VEHICLE,
      );
    });

    it('should include tonnage in serialized output', () => {
      const doc = createMockBlkDocument({ tonnage: 35 });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.tonnage).toBe(35);
    });

    it('should include configuration with size class in serialized output', () => {
      const smallDoc = createSmallSupportVehicleDocument();
      const parseResult = handler.parse(smallDoc);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toContain(
        'Small',
      );
    });
  });

  describe('serializeTypeSpecificFields', () => {
    it('should include size class in configuration', () => {
      const doc = createLargeSupportVehicleDocument();
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toBe(
        'Support Vehicle (Large)',
      );
    });

    it('should include rules level in serialized output', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const parseResult = handler.parse(doc);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.rulesLevel).toBeDefined();
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================

  describe('createSupportVehicleHandler', () => {
    it('should create a new handler instance', () => {
      const newHandler = createSupportVehicleHandler();
      expect(newHandler).toBeInstanceOf(SupportVehicleUnitHandler);
    });

    it('should create independent handler instances', () => {
      const handler1 = createSupportVehicleHandler();
      const handler2 = createSupportVehicleHandler();
      expect(handler1).not.toBe(handler2);
    });

    it('should create handler with correct properties', () => {
      const newHandler = createSupportVehicleHandler();
      expect(newHandler.unitType).toBe(UnitType.SUPPORT_VEHICLE);
      expect(newHandler.displayName).toBe('Support Vehicle');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle very large tonnage values', () => {
      const doc = createMockBlkDocument({ tonnage: 300 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(300);
    });

    it('should handle decimal tonnage values', () => {
      const doc = createMockBlkDocument({ tonnage: 17.5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(17.5);
    });

    it('should handle empty armor array', () => {
      const doc = createMockBlkDocument({ armor: [] });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(0);
    });

    it('should handle crew and passenger parsing', () => {
      const doc = createMockBlkDocument({
        crew: 3,
        passengers: 10,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crewSize).toBe(3);
      expect(result.data?.unit?.passengerCapacity).toBe(10);
    });

    it('should default crew to 1 and passengers to 0', () => {
      const doc = createMockBlkDocument({});
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crewSize).toBe(1);
      expect(result.data?.unit?.passengerCapacity).toBe(0);
    });
  });
});
