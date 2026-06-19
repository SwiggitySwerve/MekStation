/**
 * DropShipUnitHandler Tests
 *
 * Tests for DropShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  CapitalArc,
  DropShipDesignType,
  BayType,
} from '@/types/unit/CapitalShipInterfaces';

import {
  DropShipUnitHandler,
  createDropShipHandler,
} from '../DropShipUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createAerodyneDropShip,
  createCivilianDropShip,
} from './DropShipUnitHandler.test-helpers';

describe('DropShipUnitHandler', () => {
  let handler: DropShipUnitHandler;

  beforeEach(() => {
    handler = createDropShipHandler();
  });

  describe('validate', () => {
    it('should pass validation for valid DropShip', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.isValid).toBe(true);
    });

    it('should error for tonnage under 200', () => {
      const doc = createMockBlkDocument({ tonnage: 3500 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const unit = { ...parseResult.data!.unit, tonnage: 150 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('200'))).toBe(true);
    });

    it('should error for tonnage over 100,000', () => {
      const doc = createMockBlkDocument({ tonnage: 3500 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const unit = { ...parseResult.data!.unit, tonnage: 150000 };
      const validateResult = handler.validate(unit);

      expect(validateResult.isValid).toBe(false);
      expect(validateResult.errors.some((e) => e.includes('100,000'))).toBe(
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

    it('should warn for no crew', () => {
      const doc = createMockBlkDocument({ crew: 0 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const validateResult = handler.validate(parseResult.data!.unit);
      expect(validateResult.warnings.some((w) => w.includes('no crew'))).toBe(
        true,
      );
    });

    it('should warn for insufficient escape capacity', () => {
      const doc = createMockBlkDocument({
        crew: 50,
        passengers: 100,
        marines: 20,
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
