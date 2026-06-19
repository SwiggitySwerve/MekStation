/**
 * SmallCraftUnitHandler Tests
 *
 * Tests for Small Craft BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { SmallCraftLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  SmallCraftUnitHandler,
  createSmallCraftHandler,
} from '../SmallCraftUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createSpheroidSmallCraft,
  createAssaultBoat,
} from './SmallCraftUnitHandler.test-helpers';

describe('SmallCraftUnitHandler', () => {
  let handler: SmallCraftUnitHandler;

  beforeEach(() => {
    handler = createSmallCraftHandler();
  });

  describe('validate', () => {
    it('should pass validation for valid Small Craft', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
    });

    it('should error for tonnage under 100', () => {
      const doc = createMockBlkDocument({ tonnage: 100 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const unit = { ...parseResult.data!.unit, tonnage: 80 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('100'))).toBe(true);
    });

    it('should error for tonnage over 200', () => {
      const doc = createMockBlkDocument({ tonnage: 100 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const unit = { ...parseResult.data!.unit, tonnage: 250 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('200'))).toBe(true);
    });

    it('should error for zero safe thrust', () => {
      const doc = createMockBlkDocument({ safeThrust: 1 }); // Valid for parse
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually set to 0 for validation test
      const unit = {
        ...parseResult.data!.unit,
        movement: {
          ...parseResult.data!.unit.movement,
          safeThrust: 0,
          maxThrust: 0,
        },
      };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('thrust'))).toBe(
        true,
      );
    });

    it('should error for zero structural integrity', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 0 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('SI'))).toBe(true);
    });

    it('should warn for no crew', () => {
      // Note: SmallCraft defaults crew to 2 if not specified or 0
      // So we need to manually set it to 0 after parsing to test validation
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      // Manually set crew to 0 to test validation
      const unitWithNoCrew = { ...parseResult.data!.unit, crew: 0 };
      const validateResult = handler.validate(unitWithNoCrew);
      expect(
        validateResult.warnings.some((w) => w.includes('no crew assigned')),
      ).toBe(true);
    });

    it('should warn for insufficient escape capacity', () => {
      const doc = createMockBlkDocument({
        crew: 10,
        passengers: 20,
        escapePod: 1,
        lifeBoat: 0,
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('escape capacity')),
      ).toBe(true);
    });
  });
});
