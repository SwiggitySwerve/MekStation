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

  describe('serialize', () => {
    it('should serialize VTOL successfully', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized).toBeDefined();
    });

    it('should include chassis in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.chassis).toBe('Warrior');
    });

    it('should include model in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.model).toBe('H-7');
    });

    it('should include tonnage in serialized output', () => {
      const doc = createMockBlkDocument({ tonnage: 25 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.tonnage).toBe(25);
    });

    it('should include unit type in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.unitType).toBe(UnitType.VTOL);
    });
  });

  // ==========================================================================
  // serializeTypeSpecificFields
  // ==========================================================================

  describe('serializeTypeSpecificFields', () => {
    it('should include VTOL configuration', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toBe('VTOL');
    });

    it('should include rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.rulesLevel).toBeDefined();
    });
  });

  // ==========================================================================
  // deserialize
  // ==========================================================================

  describe('deserialize', () => {
    it('should return not implemented error', () => {
      const serialized = {
        id: 'test-vtol',
        chassis: 'Test',
        model: 'V1',
        unitType: 'VTOL',
        configuration: 'VTOL',
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
        era: 'Succession Wars',
        year: 3025,
        tonnage: 20,
        engine: { type: 'Standard', rating: 160 },
        gyro: { type: 'Standard' },
        cockpit: 'Standard',
        structure: { type: 'Standard' },
        armor: {
          type: 'Standard',
          allocation: {
            Front: 16,
            Left: 10,
            Right: 10,
            Rear: 8,
            Rotor: 2,
          },
        },
        heatSinks: { type: 'Single', count: 10 },
        movement: { walk: 8, jump: 0 },
        equipment: [],
        criticalSlots: {},
      };

      const result = handler.deserialize(serialized);
      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('not yet implemented')),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // createVTOLHandler Helper
  // ==========================================================================

  describe('createVTOLHandler', () => {
    it('should create VTOLUnitHandler instance', () => {
      const handler = createVTOLHandler();
      expect(handler).toBeInstanceOf(VTOLUnitHandler);
    });

    it('should create handler with correct unit type', () => {
      const handler = createVTOLHandler();
      expect(handler.unitType).toBe(UnitType.VTOL);
    });

    it('should create independent handler instances', () => {
      const handler1 = createVTOLHandler();
      const handler2 = createVTOLHandler();
      expect(handler1).not.toBe(handler2);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle empty equipment by location', () => {
      const doc = createMockBlkDocument({
        equipmentByLocation: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment).toHaveLength(0);
    });

    it('should handle missing optional fields', () => {
      const doc = createMockBlkDocument({
        source: undefined,
        role: undefined,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
    });

    it('should handle empty rawTags', () => {
      const doc = createMockBlkDocument({
        rawTags: {},
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Standard');
    });

    it('should handle rawTags with array values for rotortype', () => {
      // Raw tags can have string[] values in the actual type
      const rawTagsWithArray: Record<string, string | string[]> = {
        rotortype: ['Tandem'],
      };
      const doc = createMockBlkDocument({
        rawTags: rawTagsWithArray,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rotorType).toBe('Tandem');
    });
  });
});
