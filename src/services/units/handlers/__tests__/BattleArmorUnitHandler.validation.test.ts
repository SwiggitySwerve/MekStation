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

  describe('validate - squad size', () => {
    it('should pass validation for valid squad size of 4', () => {
      const doc = createMockBlkDocument({ trooperCount: 4 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(true);
    });

    it('should pass validation for valid squad size of 5', () => {
      const doc = createMockBlkDocument({ trooperCount: 5 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(true);
    });

    it('should pass validation for valid squad size of 6', () => {
      const doc = createUnusualSquadSizeDocument(6);
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(true);
    });

    it('should pass validation for valid squad size of 1', () => {
      const doc = createUnusualSquadSizeDocument(1);
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(true);
    });

    it('should not reject zero tonnage: BA BLKs have no Tonnage tag', () => {
      // createUnusualSquadSizeDocument(0) also gives tonnage 0, which is what
      // the parser produces for every BA source (BLKBattleArmorFile.java:90).
      const result = handler.parse(createUnusualSquadSizeDocument(0));

      expect(result.success).toBe(true);
    });

    it('should default trooperCount 0 to 4 when tonnage is valid', () => {
      // Test with valid tonnage but trooperCount: 0
      // Due to || operator, trooperCount: 0 defaults to 4
      const doc = createMockBlkDocument({
        name: 'Test BA',
        trooperCount: 0, // Will default to 4 due to || operator
        tonnage: 4, // Valid tonnage
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.squadSize).toBe(4); // Defaults to 4
    });

    it('should fail validation for squad size of 7', () => {
      const doc = createUnusualSquadSizeDocument(7);
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('squad size'))).toBe(
        true,
      );
    });

    it('should fail validation for squad size of 10', () => {
      const doc = createUnusualSquadSizeDocument(10);
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('squad size'))).toBe(
        true,
      );
    });
  });

  // ==========================================================================
  // Validation - Weight Per Trooper vs Weight Class
  // ==========================================================================

  describe('validate - weight per trooper vs weight class', () => {
    it('should pass for PA(L) with weight 80-400kg', () => {
      const doc = createMockBlkDocument({
        tonnage: 1.6, // 400kg per trooper * 4
        trooperCount: 4,
        weightClass: 0, // PA(L)
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      // May have warnings but should not have errors for weight
      expect(
        validation.errors.filter((e) => e.includes('Weight per trooper'))
          .length,
      ).toBe(0);
    });

    it('should pass for LIGHT with weight 401-750kg', () => {
      const doc = createMockBlkDocument({
        tonnage: 2.5, // ~625kg per trooper * 4
        trooperCount: 4,
        weightClass: 1, // Light
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(
        validation.errors.filter((e) => e.includes('Weight per trooper'))
          .length,
      ).toBe(0);
    });

    it('should pass for MEDIUM with weight 751-1000kg', () => {
      const doc = createMockBlkDocument({
        tonnage: 4, // 1000kg per trooper * 4
        trooperCount: 4,
        weightClass: 2, // Medium
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(
        validation.errors.filter((e) => e.includes('Weight per trooper'))
          .length,
      ).toBe(0);
    });

    it('should pass for HEAVY with weight 1001-1500kg', () => {
      const doc = createMockBlkDocument({
        tonnage: 5, // 1250kg per trooper * 4
        trooperCount: 4,
        weightClass: 3, // Heavy
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(
        validation.errors.filter((e) => e.includes('Weight per trooper'))
          .length,
      ).toBe(0);
    });

    it('should pass for ASSAULT with weight 1501-2000kg', () => {
      const doc = createMockBlkDocument({
        tonnage: 8, // 2000kg per trooper * 4
        trooperCount: 4,
        weightClass: 4, // Assault
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(
        validation.errors.filter((e) => e.includes('Weight per trooper'))
          .length,
      ).toBe(0);
    });

    it('should warn when weight does not match class', () => {
      const doc = createMockBlkDocument({
        tonnage: 8, // 2000kg per trooper - Assault weight
        trooperCount: 4,
        weightClass: 1, // Loaded trooper weight is the light class limit.
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate({
        ...result.data!.unit,
        weightPerTrooper: 2000, // An invalid edited/imported trooper weight.
      });
      expect(
        validation.warnings.some((w) => w.includes('Weight per trooper')),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Validation - Assault BA Limitations
  // ==========================================================================

  describe('validate - assault BA limitations', () => {
    it('should fail if assault BA has canSwarm true', () => {
      const doc = createAssaultBADocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      // Force canSwarm to true (simulating invalid state)
      const invalidUnit = {
        ...result.data!.unit,
        canSwarm: true,
      };

      const validation = handler.validate(invalidUnit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('swarm'))).toBe(true);
    });

    it('should fail if assault BA has canMountOmni true', () => {
      const doc = createAssaultBADocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      // Force canMountOmni to true (simulating invalid state)
      const invalidUnit = {
        ...result.data!.unit,
        canMountOmni: true,
      };

      const validation = handler.validate(invalidUnit);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.includes('OmniMech'))).toBe(true);
    });

    it('should pass for correctly configured assault BA', () => {
      const doc = createAssaultBADocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      // Should not have assault-specific errors
      expect(validation.errors.filter((e) => e.includes('swarm')).length).toBe(
        0,
      );
      expect(
        validation.errors.filter((e) => e.includes('OmniMech')).length,
      ).toBe(0);
    });
  });

  // ==========================================================================
  // Validation - Armor Per Trooper
  // ==========================================================================

  describe('validate - armor per trooper', () => {
    it('should pass for PA(L) with armor <= 2', () => {
      const doc = createMockBlkDocument({
        armor: [2],
        weightClass: 0, // PA(L)
        tonnage: 0.4,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.filter((e) => e.includes('Armor')).length).toBe(
        0,
      );
    });

    it('should fail for PA(L) with armor > 2', () => {
      const doc = createMockBlkDocument({
        armor: [3],
        weightClass: 0,
        tonnage: 2,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.some((e) => e.includes('Armor'))).toBe(true);
    });

    it('should pass for LIGHT with armor <= 5', () => {
      const doc = createMockBlkDocument({
        armor: [5],
        weightClass: 1, // Light
        tonnage: 2,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.filter((e) => e.includes('Armor')).length).toBe(
        0,
      );
    });

    it('should fail for LIGHT with armor > 6', () => {
      const doc = createMockBlkDocument({
        armor: [7],
        weightClass: 1, // Light
        tonnage: 2,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.some((e) => e.includes('Armor'))).toBe(true);
    });

    it('should pass for MEDIUM with armor <= 8', () => {
      const doc = createMockBlkDocument({
        armor: [8],
        weightClass: 2, // Medium
        tonnage: 4,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.filter((e) => e.includes('Armor')).length).toBe(
        0,
      );
    });

    it('should fail for MEDIUM with armor > 10', () => {
      const doc = createMockBlkDocument({
        armor: [11],
        weightClass: 2, // Medium
        tonnage: 4,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.some((e) => e.includes('Armor'))).toBe(true);
    });

    it('should pass for HEAVY with armor <= 10', () => {
      const doc = createMockBlkDocument({
        armor: [10],
        weightClass: 3, // Heavy
        tonnage: 5,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.filter((e) => e.includes('Armor')).length).toBe(
        0,
      );
    });

    it('should fail for HEAVY with armor > 14', () => {
      const doc = createMockBlkDocument({
        armor: [15],
        weightClass: 3, // Heavy
        tonnage: 5,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.some((e) => e.includes('Armor'))).toBe(true);
    });

    it('should pass for ASSAULT with armor <= 14', () => {
      const doc = createMockBlkDocument({
        armor: [14],
        weightClass: 4, // Assault
        tonnage: 8,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.filter((e) => e.includes('Armor')).length).toBe(
        0,
      );
    });

    it('should fail for ASSAULT with armor > 18', () => {
      const doc = createMockBlkDocument({
        armor: [19],
        weightClass: 4, // Assault
        tonnage: 8,
        trooperCount: 4,
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.data!.unit);
      expect(validation.errors.some((e) => e.includes('Armor'))).toBe(true);
    });
  });

  // ==========================================================================
  // Calculations - Weight
  // ==========================================================================
});
