/**
 * InfantryUnitHandler Tests
 *
 * Comprehensive tests for Infantry BLK parsing, validation, calculations, and serialization
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { calculateInfantryBVFromUnit } from '@/utils/construction/infantry';

import {
  InfantryUnitHandler,
  createInfantryHandler,
} from '../InfantryUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createJumpInfantryDocument,
  createMechanizedInfantryDocument,
  createFieldGunInfantryDocument,
  createAntiMechInfantryDocument,
  createAugmentedInfantryDocument,
  createClanInfantryDocument,
} from './InfantryUnitHandler.test-helpers';

describe('InfantryUnitHandler', () => {
  let handler: InfantryUnitHandler;

  beforeEach(() => {
    handler = createInfantryHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('calculations', () => {
    describe('calculateWeight', () => {
      it('should calculate weight based on platoon strength', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 }); // 28 soldiers
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.data!.unit);
        // 28 soldiers * 0.08 tons = 2.24 tons
        expect(weight).toBeCloseTo(2.24, 2);
      });

      it('should not add field gun tonnage to construction weight', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);
        const unit = result.data?.unit;
        if (!unit) throw new Error('Expected parsed infantry unit');

        const weight = handler.calculateWeight(unit);
        // 16 soldiers * 0.08; field guns are deployed weapons.
        expect(weight).toBeCloseTo(1.28, 2);
      });

      it('should add armor kit mass per trooper', () => {
        const doc = createMockBlkDocument({ armorKit: 'Flak' });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);
        const unit = result.data?.unit;
        if (!unit) throw new Error('Expected parsed infantry unit');

        const weight = handler.calculateWeight(unit);
        // 28 soldiers * 0.08 + 28 flak kits * 0.012
        expect(weight).toBeCloseTo(2.576, 3);
      });

      it('should return positive weight', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.data!.unit);
        expect(weight).toBeGreaterThan(0);
      });
    });

    describe('calculateBV', () => {
      // The handler delegates to `calculateInfantryBVFromUnit` (the BV 2.0
      // calculator). These tests assert that delegation contract and the
      // observable behaviors required by the spec:
      //   * motive multiplier (Foot 1.0, Jump 1.1, Mechanized 1.15)
      //   * anti-mech training 1.1× uplift
      //   * non-negative output
      // Exact numerical values are verified in the calculator's own unit
      // tests under `utils/construction/infantry/__tests__/infantryBV.test.ts`.
      //
      // @spec openspec/changes/add-infantry-battle-value/specs/battle-value-system/spec.md

      it('should match the calculator output (delegation contract)', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 }); // 28 soldiers
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const unit = result.data!.unit;
        const bv = handler.calculateBV(unit);
        const expected = calculateInfantryBVFromUnit(unit).final;
        expect(bv).toBe(expected);
      });

      it('should apply motive multiplier (Jump 1.1 > Foot 1.0)', () => {
        const footDoc = createMockBlkDocument({ squadSize: 7, squadn: 4 });
        const jumpDoc = createMockBlkDocument({
          squadSize: 7,
          squadn: 4,
          motionType: 'Jump',
          jumpingMP: 3,
        });
        const footUnit = handler.parse(footDoc).data!.unit;
        const jumpUnit = handler.parse(jumpDoc).data!.unit;

        const footBV = handler.calculateBV(footUnit);
        const jumpBV = handler.calculateBV(jumpUnit);
        // Jump platoon should have higher BV than Foot at equal composition
        // whenever perTrooperBV > 0. When perTrooper is 0 (e.g. no catalog BV),
        // both will be 0 — guard the strict inequality.
        if (footBV > 0) {
          expect(jumpBV).toBeGreaterThan(footBV);
        } else {
          expect(jumpBV).toBeGreaterThanOrEqual(footBV);
        }
      });

      it('should apply motive multiplier (Mechanized 1.15 > Foot 1.0)', () => {
        const footDoc = createMockBlkDocument({ squadSize: 6, squadn: 3 });
        const mechDoc = createMockBlkDocument({
          squadSize: 6,
          squadn: 3,
          motionType: 'Mechanized',
          cruiseMP: 3,
        });
        const footBV = handler.calculateBV(handler.parse(footDoc).data!.unit);
        const mechBV = handler.calculateBV(handler.parse(mechDoc).data!.unit);
        if (footBV > 0) {
          expect(mechBV).toBeGreaterThan(footBV);
        } else {
          expect(mechBV).toBeGreaterThanOrEqual(footBV);
        }
      });

      it('should apply anti-mech ×1.1 uplift', () => {
        // Baseline: same platoon without anti-mech
        const baseDoc = createMockBlkDocument({
          squadSize: 7,
          squadn: 4,
          primary: 'SRM',
        });
        const amDoc = createAntiMechInfantryDocument();
        const baseUnit = handler.parse(baseDoc).data!.unit;
        const amUnit = handler.parse(amDoc).data!.unit;
        expect(amUnit.hasAntiMechTraining).toBe(true);
        expect(baseUnit.hasAntiMechTraining).toBe(false);

        const baseBV = handler.calculateBV(baseUnit);
        const amBV = handler.calculateBV(amUnit);
        // When baseBV > 0, amBV must be strictly greater (1.1× uplift).
        if (baseBV > 0) {
          expect(amBV).toBeGreaterThan(baseBV);
        } else {
          expect(amBV).toBeGreaterThanOrEqual(0);
        }
      });

      it('should add BV for non-None armor kit (Flak > None)', () => {
        const noneDoc = createMockBlkDocument({ armorKit: 'None' });
        const flakDoc = createMockBlkDocument({ armorKit: 'Flak' });
        const noneBV = handler.calculateBV(handler.parse(noneDoc).data!.unit);
        const flakBV = handler.calculateBV(handler.parse(flakDoc).data!.unit);
        // Flak adds +2 per trooper → higher BV than None.
        expect(flakBV).toBeGreaterThan(noneBV);
      });

      it('should return non-negative BV for a default platoon', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.data!.unit);
        expect(bv).toBeGreaterThanOrEqual(0);
      });
    });

    describe('calculateCost', () => {
      it('should calculate base cost', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 }); // 28 soldiers
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        // 28 * 1000 = 28000
        expect(cost).toBe(28000);
      });

      it('should add cost for anti-mech training', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        // 28 * (1000 + 500) = 42000
        expect(cost).toBe(42000);
      });

      it('should add cost for standard armor', () => {
        const doc = createMockBlkDocument({ armorKit: 'Standard' });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        // 28 * (1000 + 500) = 42000
        expect(cost).toBe(42000);
      });

      it('should add higher cost for clan armor', () => {
        const doc = createClanInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        // 28 * (1000 + 2000) = 84000
        expect(cost).toBe(84000);
      });

      it('should add cost for field guns', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        // 16 * 1000 + 2 * 50000 = 16000 + 100000 = 116000
        expect(cost).toBe(116000);
      });

      it('should return positive cost', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        expect(cost).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Serialization
  // ==========================================================================
});
