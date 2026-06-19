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

  describe('parse - tonnage limit', () => {
    it('should fail parsing when tonnage exceeds 30', () => {
      const doc = createOverweightVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('cannot exceed 30 tons')),
      ).toBe(true);
    });

    it('should pass parsing at exactly 30 tons', () => {
      const doc = createHeavyVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(30);
    });

    it('should pass parsing for light VTOL', () => {
      const doc = createScoutVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.tonnage).toBe(15);
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
      const doc = createClanVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should default to Inner Sphere for unspecified tech', () => {
      const doc = createMockBlkDocument({ type: 'Level 1' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
    });
  });

  // ==========================================================================
  // Parsing - Rules Level
  // ==========================================================================

  describe('parse - rules level', () => {
    it('should parse Introductory rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 1' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
    });

    it('should parse Standard rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
    });

    it('should parse Advanced rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
    });

    it('should parse Experimental rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 4' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.EXPERIMENTAL);
    });
  });

  // ==========================================================================
  // Parsing - Weight Class
  // ==========================================================================

  describe('parse - weight class', () => {
    it('should always return LIGHT weight class for VTOLs', () => {
      const doc = createMockBlkDocument({ tonnage: 21 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
    });

    it('should return LIGHT even at max 30 tons', () => {
      const doc = createHeavyVTOLDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe('validate', () => {
    it('should pass validation for valid VTOL', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
      expect(validateResult.errors).toHaveLength(0);
    });

    it('should fail validation for tonnage below 1', () => {
      // Create a mock unit directly since parsing would fail
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually create an invalid unit for validation testing
      const invalidUnit = {
        ...parseResult.data!.unit,
        tonnage: 0,
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('at least 1 ton')),
      ).toBe(true);
    });

    it('should fail validation for tonnage over 30', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const invalidUnit = {
        ...parseResult.data!.unit,
        tonnage: 35,
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('cannot exceed 30 tons')),
      ).toBe(true);
    });

    it('should fail validation for zero cruise MP', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const invalidUnit = {
        ...parseResult.data!.unit,
        movement: { cruiseMP: 0, flankMP: 0, jumpMP: 0 },
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('at least 1 cruise MP')),
      ).toBe(true);
    });

    it('should fail validation when armor exceeds max', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const invalidUnit = {
        ...parseResult.data!.unit,
        totalArmorPoints: 200,
        maxArmorPoints: 70,
      } as IVTOL;

      const validateResult = handler.validate(invalidUnit);
      expect(validateResult.isValid).toBe(false);
      expect(
        validateResult.errors.some((e) => e.includes('exceeds maximum')),
      ).toBe(true);
    });

    it('should warn when rotor armor exceeds 2 points', () => {
      const doc = createExcessiveRotorArmorDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('rotor armor exceeds')),
      ).toBe(true);
    });

    it('should not warn when rotor armor is 2 or less', () => {
      const doc = createMockBlkDocument({
        armor: [16, 10, 10, 8, 2],
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('rotor armor')),
      ).toBe(false);
    });
  });

  // ==========================================================================
  // Calculations - Weight
  // ==========================================================================
});
