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

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(100);
    });

    it('should calculate BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should increase BV with more thrust', () => {
      const docHighThrust = createMockBlkDocument({ safeThrust: 6 });
      const docLowThrust = createMockBlkDocument({ safeThrust: 2 });

      const resultHighThrust = handler.parse(docHighThrust);
      const resultLowThrust = handler.parse(docLowThrust);

      const bvHighThrust = handler.calculateBV(resultHighThrust.data!.unit);
      const bvLowThrust = handler.calculateBV(resultLowThrust.data!.unit);

      expect(bvHighThrust).toBeGreaterThan(bvLowThrust);
    });

    it('should increase BV with more armor', () => {
      const docHighArmor = createMockBlkDocument({
        armor: [80, 60, 60, 40], // 240 total
      });
      const docLowArmor = createMockBlkDocument({
        armor: [20, 15, 15, 10], // 60 total
      });

      const resultHighArmor = handler.parse(docHighArmor);
      const resultLowArmor = handler.parse(docLowArmor);

      const bvHighArmor = handler.calculateBV(resultHighArmor.data!.unit);
      const bvLowArmor = handler.calculateBV(resultLowArmor.data!.unit);

      expect(bvHighArmor).toBeGreaterThan(bvLowArmor);
    });

    it('should calculate cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should calculate higher cost for larger craft', () => {
      const docLarge = createMockBlkDocument({ tonnage: 200 });
      const docSmall = createMockBlkDocument({ tonnage: 100 });

      const resultLarge = handler.parse(docLarge);
      const resultSmall = handler.parse(docSmall);

      const costLarge = handler.calculateCost(resultLarge.data!.unit);
      const costSmall = handler.calculateCost(resultSmall.data!.unit);

      expect(costLarge).toBeGreaterThan(costSmall);
    });
  });
});
