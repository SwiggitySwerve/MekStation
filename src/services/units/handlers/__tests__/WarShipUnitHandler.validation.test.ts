/**
 * WarShipUnitHandler Tests
 *
 * Tests for WarShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc, KFDriveType } from '@/types/unit/CapitalShipInterfaces';

import {
  WarShipUnitHandler,
  createWarShipHandler,
} from '../WarShipUnitHandler';
// ============================================================================
import { createMockBlkDocument } from './WarShipUnitHandler.test-helpers';

describe('WarShipUnitHandler', () => {
  let handler: WarShipUnitHandler;

  beforeEach(() => {
    handler = createWarShipHandler();
  });

  describe('validate', () => {
    it('should pass validation for valid WarShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
    });

    it('should warn for unusually low tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 40000 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('unusually low')),
      ).toBe(true);
    });

    it('should error for excessive tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 3000000 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('2,500,000'))).toBe(
        true,
      );
    });

    it('should error for zero safe thrust', () => {
      const doc = createMockBlkDocument({ safeThrust: 0 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
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

    it('should warn for unusually small crew', () => {
      const doc = createMockBlkDocument({ crew: 50 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('small crew')),
      ).toBe(true);
    });

    it('should warn for no gravity decks', () => {
      const doc = createMockBlkDocument({
        rawTags: { gravdecks: '0' },
      });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(
        validateResult.warnings.some((w) => w.includes('gravity decks')),
      ).toBe(true);
    });
  });
});
