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

  describe('parse - motion type', () => {
    it('should parse jump motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'jump' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.JUMP);
    });

    it('should parse leg/foot motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'leg' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.FOOT);
    });

    it('should parse foot motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'foot' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.FOOT);
    });

    it('should parse VTOL motion type', () => {
      const doc = createVTOLBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.VTOL);
    });

    it('should parse UMU motion type', () => {
      const doc = createUMUBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.UMU);
    });

    it('should parse mechanized motion type', () => {
      const doc = createMechanizedBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.MECHANIZED);
    });

    it('should default to jump for unspecified motion type', () => {
      const doc = createMockBlkDocument({ motionType: undefined });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.JUMP);
    });

    it('should default to jump for unknown motion type', () => {
      const doc = createMockBlkDocument({ motionType: 'unknown' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(SquadMotionType.JUMP);
    });
  });

  // ==========================================================================
  // Parsing - Movement
  // ==========================================================================

  describe('parse - movement', () => {
    it('should parse ground MP', () => {
      const doc = createMockBlkDocument({ cruiseMP: 2 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.groundMP).toBe(2);
    });

    it('should parse jump MP', () => {
      const doc = createMockBlkDocument({ jumpingMP: 3 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.jumpMP).toBe(3);
      expect(result.data?.unit?.movement.jumpMP).toBe(3);
    });

    it('should parse UMU MP from raw tags', () => {
      const doc = createUMUBADocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.umuMP).toBe(4);
      expect(result.data?.unit?.movement.umuMP).toBe(4);
    });

    it('should default ground MP to 1', () => {
      const doc = createMockBlkDocument({ cruiseMP: undefined });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.groundMP).toBe(1);
    });

    it('should default jump MP to 0', () => {
      const doc = createMockBlkDocument({ jumpingMP: undefined });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.jumpMP).toBe(0);
    });

    it('should default UMU MP to 0', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.umuMP).toBe(0);
    });
  });

  // ==========================================================================
  // Parsing - Manipulators
  // ==========================================================================

  describe('parse - manipulators', () => {
    it('should parse armored glove manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Armored Glove',
          rightmanipulator: 'Armored Glove',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.ARMORED_GLOVE,
      );
      expect(result.data?.unit?.rightManipulator).toBe(
        ManipulatorType.ARMORED_GLOVE,
      );
    });

    it('should parse basic manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Basic',
          rightmanipulator: 'Basic',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(ManipulatorType.BASIC);
      expect(result.data?.unit?.rightManipulator).toBe(ManipulatorType.BASIC);
    });

    it('should parse battle manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Battle',
          rightmanipulator: 'Battle',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(ManipulatorType.BATTLE);
      expect(result.data?.unit?.rightManipulator).toBe(ManipulatorType.BATTLE);
    });

    it('should parse heavy battle manipulator', () => {
      const doc = createBAWithManipulatorsDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.HEAVY_BATTLE,
      );
      expect(result.data?.unit?.rightManipulator).toBe(
        ManipulatorType.HEAVY_BATTLE,
      );
    });

    it('should parse battle vibro manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Battle Vibro Claw',
          rightmanipulator: 'Battle Vibro Claw',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.BATTLE_VIBRO,
      );
      expect(result.data?.unit?.rightManipulator).toBe(
        ManipulatorType.BATTLE_VIBRO,
      );
    });

    it('should parse heavy battle vibro manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Heavy Battle Vibro Claw',
          rightmanipulator: 'Heavy Battle Vibro Claw',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.HEAVY_BATTLE_VIBRO,
      );
      expect(result.data?.unit?.rightManipulator).toBe(
        ManipulatorType.HEAVY_BATTLE_VIBRO,
      );
    });

    it('should parse cargo lifter manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Cargo Lifter',
          rightmanipulator: 'None',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.CARGO_LIFTER,
      );
      expect(result.data?.unit?.rightManipulator).toBe(ManipulatorType.NONE);
    });

    it('should parse industrial drill manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Industrial Drill',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.INDUSTRIAL_DRILL,
      );
    });

    it('should parse salvage arm manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Salvage Arm',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.SALVAGE_ARM,
      );
    });

    it('should parse basic mine clearance manipulator', () => {
      const doc = createMockBlkDocument({
        rawTags: {
          leftmanipulator: 'Basic Mine Clearance',
        },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(
        ManipulatorType.BASIC_MINE_CLEARANCE,
      );
    });

    it('should default to NONE for unspecified manipulator', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.leftManipulator).toBe(ManipulatorType.NONE);
      expect(result.data?.unit?.rightManipulator).toBe(ManipulatorType.NONE);
    });
  });

  // ==========================================================================
  // Parsing - Armor
  // ==========================================================================
});
