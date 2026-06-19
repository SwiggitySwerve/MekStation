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

  describe('calculations', () => {
    it('should calculate weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBe(3500);
    });

    it('should calculate BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should increase BV with more thrust', () => {
      const docHighThrust = createMockBlkDocument({ safeThrust: 5 });
      const docLowThrust = createMockBlkDocument({ safeThrust: 2 });

      const resultHighThrust = handler.parse(docHighThrust);
      const resultLowThrust = handler.parse(docLowThrust);

      const bvHighThrust = handler.calculateBV(resultHighThrust.data!.unit);
      const bvLowThrust = handler.calculateBV(resultLowThrust.data!.unit);

      expect(bvHighThrust).toBeGreaterThan(bvLowThrust);
    });

    it('should calculate cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should calculate higher cost for military vs civilian', () => {
      const militaryDoc = createMockBlkDocument({ designType: 0 });
      const civilianDoc = createCivilianDropShip();

      const militaryResult = handler.parse(militaryDoc);
      const civilianResult = handler.parse(civilianDoc);

      // Normalize by tonnage for fair comparison
      const militaryCostPerTon =
        handler.calculateCost(militaryResult.data!.unit) /
        militaryResult.data!.unit.tonnage;
      const civilianCostPerTon =
        handler.calculateCost(civilianResult.data!.unit) /
        civilianResult.data!.unit.tonnage;

      expect(militaryCostPerTon).toBeGreaterThan(civilianCostPerTon);
    });
  });
});
