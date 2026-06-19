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

  describe('serialize', () => {
    it('should serialize successfully', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.data?.serialized).toBeDefined();
    });

    it('should include unit type in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.unitType).toBe(
        UnitType.BATTLE_ARMOR,
      );
    });

    it('should include tonnage in serialized output', () => {
      const doc = createMockBlkDocument({ tonnage: 5 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.tonnage).toBe(5);
    });

    it('should include chassis in serialized output', () => {
      const doc = createMockBlkDocument({ name: 'Elemental' });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.chassis).toBe('Elemental');
    });
  });

  // ==========================================================================
  // serializeTypeSpecificFields
  // ==========================================================================

  describe('serializeTypeSpecificFields (via serialize)', () => {
    it('should include configuration (chassis type) in output', () => {
      const doc = createQuadBADocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.configuration).toBe(
        BattleArmorChassisType.QUAD,
      );
    });

    it('should include rulesLevel in output', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 2' });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.data?.serialized?.rulesLevel).toBeDefined();
    });
  });

  // ==========================================================================
  // Deserialize
  // ==========================================================================

  describe('deserialize', () => {
    it('should return failure (not implemented)', () => {
      // Parse a valid BA to get a serializable unit, then serialize it
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.data!.unit);
      expect(serializeResult.success).toBe(true);

      // Now try to deserialize - should fail as not implemented
      const result = handler.deserialize(serializeResult.data!.serialized);
      expect(result.success).toBe(false);
      expect(
        result.error!.errors.some((e) => e.includes('not yet implemented')),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================

  describe('createBattleArmorHandler', () => {
    it('should create a BattleArmorUnitHandler instance', () => {
      const newHandler = createBattleArmorHandler();
      expect(newHandler).toBeInstanceOf(BattleArmorUnitHandler);
    });

    it('should create independent instances', () => {
      const handler1 = createBattleArmorHandler();
      const handler2 = createBattleArmorHandler();
      expect(handler1).not.toBe(handler2);
    });
  });
});
