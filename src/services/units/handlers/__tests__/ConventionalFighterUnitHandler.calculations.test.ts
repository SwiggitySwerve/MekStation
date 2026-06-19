/**
 * ConventionalFighterUnitHandler Tests
 *
 * Tests for conventional fighter BLK parsing, validation, and serialization.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ConventionalFighterEngineType,
  AerospaceCockpitType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  ConventionalFighterUnitHandler,
  createConventionalFighterHandler,
} from '../ConventionalFighterUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createLightFighterDocument,
  createMediumFighterDocument,
  createHeavyFighterDocument,
} from './ConventionalFighterUnitHandler.test-helpers';

describe('ConventionalFighterUnitHandler', () => {
  let handler: ConventionalFighterUnitHandler;

  beforeEach(() => {
    handler = createConventionalFighterHandler();
  });

  describe('calculations', () => {
    describe('calculateWeight', () => {
      it('should calculate weight greater than 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.data!.unit);
        expect(weight).toBeGreaterThan(0);
      });

      it('should include engine weight component', () => {
        // Higher thrust should mean more engine weight
        const lowThrustDoc = createMockBlkDocument({ safeThrust: 3 });
        const highThrustDoc = createMockBlkDocument({ safeThrust: 10 });

        const lowResult = handler.parse(lowThrustDoc);
        const highResult = handler.parse(highThrustDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowWeight = handler.calculateWeight(lowResult.data!.unit);
        const highWeight = handler.calculateWeight(highResult.data!.unit);

        expect(highWeight).toBeGreaterThan(lowWeight);
      });

      it('should include armor weight component', () => {
        const lowArmorDoc = createMockBlkDocument({ armor: [10, 5, 5, 5] });
        const highArmorDoc = createMockBlkDocument({ armor: [40, 30, 30, 20] });

        const lowResult = handler.parse(lowArmorDoc);
        const highResult = handler.parse(highArmorDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowWeight = handler.calculateWeight(lowResult.data!.unit);
        const highWeight = handler.calculateWeight(highResult.data!.unit);

        expect(highWeight).toBeGreaterThan(lowWeight);
      });

      it('should include fuel weight component', () => {
        const lowFuelDoc = createMockBlkDocument({ fuel: 50 });
        const highFuelDoc = createMockBlkDocument({ fuel: 500 });

        const lowResult = handler.parse(lowFuelDoc);
        const highResult = handler.parse(highFuelDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowWeight = handler.calculateWeight(lowResult.data!.unit);
        const highWeight = handler.calculateWeight(highResult.data!.unit);

        expect(highWeight).toBeGreaterThan(lowWeight);
      });

      it('should include structural weight based on tonnage', () => {
        const lightDoc = createMockBlkDocument({ tonnage: 20, safeThrust: 10 });
        const heavyDoc = createMockBlkDocument({
          tonnage: 100,
          safeThrust: 10,
        });

        const lightResult = handler.parse(lightDoc);
        const heavyResult = handler.parse(heavyDoc);

        expect(lightResult.success).toBe(true);
        expect(heavyResult.success).toBe(true);

        const lightWeight = handler.calculateWeight(lightResult.data!.unit);
        const heavyWeight = handler.calculateWeight(heavyResult.data!.unit);

        expect(heavyWeight).toBeGreaterThan(lightWeight);
      });

      it('should include cockpit weight (2 tons)', () => {
        const doc = createMockBlkDocument({
          tonnage: 50,
          safeThrust: 5,
          armor: [0, 0, 0, 0],
          fuel: 0,
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.data!.unit);
        // Weight should include at least cockpit (2) + structure (5) + engine
        expect(weight).toBeGreaterThanOrEqual(7);
      });
    });

    describe('calculateBV', () => {
      it('should calculate BV greater than 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.data!.unit);
        expect(bv).toBeGreaterThan(0);
      });

      it('should include armor BV contribution', () => {
        const lowArmorDoc = createMockBlkDocument({ armor: [5, 5, 5, 5] });
        const highArmorDoc = createMockBlkDocument({ armor: [40, 30, 30, 20] });

        const lowResult = handler.parse(lowArmorDoc);
        const highResult = handler.parse(highArmorDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowBV = handler.calculateBV(lowResult.data!.unit);
        const highBV = handler.calculateBV(highResult.data!.unit);

        expect(highBV).toBeGreaterThan(lowBV);
      });

      it('should include SI BV contribution', () => {
        const lowSIDoc = createMockBlkDocument({ structuralIntegrity: 2 });
        const highSIDoc = createMockBlkDocument({ structuralIntegrity: 10 });

        const lowResult = handler.parse(lowSIDoc);
        const highResult = handler.parse(highSIDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowBV = handler.calculateBV(lowResult.data!.unit);
        const highBV = handler.calculateBV(highResult.data!.unit);

        expect(highBV).toBeGreaterThan(lowBV);
      });

      it('should apply thrust modifier to BV', () => {
        const lowThrustDoc = createMockBlkDocument({ safeThrust: 3 });
        const highThrustDoc = createMockBlkDocument({ safeThrust: 10 });

        const lowResult = handler.parse(lowThrustDoc);
        const highResult = handler.parse(highThrustDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowBV = handler.calculateBV(lowResult.data!.unit);
        const highBV = handler.calculateBV(highResult.data!.unit);

        expect(highBV).toBeGreaterThan(lowBV);
      });

      it('should return rounded integer BV', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.data!.unit);
        expect(Number.isInteger(bv)).toBe(true);
      });
    });

    describe('calculateCost', () => {
      it('should calculate cost greater than 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        expect(cost).toBeGreaterThan(0);
      });

      it('should include base structure cost (tonnage * 20000)', () => {
        const lightDoc = createMockBlkDocument({ tonnage: 20, safeThrust: 1 });
        const heavyDoc = createMockBlkDocument({ tonnage: 100, safeThrust: 1 });

        const lightResult = handler.parse(lightDoc);
        const heavyResult = handler.parse(heavyDoc);

        expect(lightResult.success).toBe(true);
        expect(heavyResult.success).toBe(true);

        const lightCost = handler.calculateCost(lightResult.data!.unit);
        const heavyCost = handler.calculateCost(heavyResult.data!.unit);

        expect(heavyCost).toBeGreaterThan(lightCost);
      });

      it('should include engine cost based on thrust rating', () => {
        const lowThrustDoc = createMockBlkDocument({ safeThrust: 2 });
        const highThrustDoc = createMockBlkDocument({ safeThrust: 10 });

        const lowResult = handler.parse(lowThrustDoc);
        const highResult = handler.parse(highThrustDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowCost = handler.calculateCost(lowResult.data!.unit);
        const highCost = handler.calculateCost(highResult.data!.unit);

        expect(highCost).toBeGreaterThan(lowCost);
      });

      it('should include armor cost (points * 5000)', () => {
        const lowArmorDoc = createMockBlkDocument({ armor: [5, 5, 5, 5] });
        const highArmorDoc = createMockBlkDocument({ armor: [40, 30, 30, 20] });

        const lowResult = handler.parse(lowArmorDoc);
        const highResult = handler.parse(highArmorDoc);

        expect(lowResult.success).toBe(true);
        expect(highResult.success).toBe(true);

        const lowCost = handler.calculateCost(lowResult.data!.unit);
        const highCost = handler.calculateCost(highResult.data!.unit);

        expect(highCost).toBeGreaterThan(lowCost);
      });

      it('should include avionics cost (50000)', () => {
        const doc = createMockBlkDocument({
          tonnage: 50,
          safeThrust: 5,
          armor: [0, 0, 0, 0],
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        // Should include structure (1M) + engine + avionics (50k)
        expect(cost).toBeGreaterThanOrEqual(1050000);
      });

      it('should return rounded integer cost', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.data!.unit);
        expect(Number.isInteger(cost)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Serialization Tests
  // ============================================================================
});
