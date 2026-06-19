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

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(1400000);
    });

    it('should calculate BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should increase BV with LF battery', () => {
      const docWithLF = createMockBlkDocument({
        rawTags: { lfbattery: 'true' },
      });
      const docWithoutLF = createMockBlkDocument({
        rawTags: { lfbattery: 'false' },
      });

      const resultWithLF = handler.parse(docWithLF);
      const resultWithoutLF = handler.parse(docWithoutLF);

      const bvWithLF = handler.calculateBV(resultWithLF.data!.unit);
      const bvWithoutLF = handler.calculateBV(resultWithoutLF.data!.unit);

      expect(bvWithLF).toBeGreaterThan(bvWithoutLF);
    });

    it('should calculate cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should increase cost with LF battery', () => {
      const docWithLF = createMockBlkDocument({
        rawTags: { lfbattery: 'true' },
      });
      const docWithoutLF = createMockBlkDocument({
        rawTags: { lfbattery: 'false' },
      });

      const resultWithLF = handler.parse(docWithLF);
      const resultWithoutLF = handler.parse(docWithoutLF);

      const costWithLF = handler.calculateCost(resultWithLF.data!.unit);
      const costWithoutLF = handler.calculateCost(resultWithoutLF.data!.unit);

      expect(costWithLF).toBeGreaterThan(costWithoutLF);
    });
  });
});
