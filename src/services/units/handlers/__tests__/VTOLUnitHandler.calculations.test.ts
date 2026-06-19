/**
 * VTOLUnitHandler Tests
 *
 * Tests for VTOL BLK parsing, validation, and serialization
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 2.2.8
 */

import { VTOLLocation } from '@/types/construction/UnitLocation';
import { TechBase, WeightClass, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType, IVTOL } from '@/types/unit/VehicleInterfaces';

import { VTOLUnitHandler, createVTOLHandler } from '../VTOLUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createChinTurretVTOLDocument,
  createScoutVTOLDocument,
  createHeavyVTOLDocument,
  createClanVTOLDocument,
  createOverweightVTOLDocument,
  createNoMovementVTOLDocument,
  createCustomRotorVTOLDocument,
  createExcessiveRotorArmorDocument,
} from './VTOLUnitHandler.test-helpers';

describe('VTOLUnitHandler', () => {
  let handler: VTOLUnitHandler;

  beforeEach(() => {
    handler = createVTOLHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('calculateWeight', () => {
    it('should calculate positive weight', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBeGreaterThan(0);
    });

    it('should include engine weight based on rating', () => {
      const doc1 = createMockBlkDocument({ cruiseMP: 6, tonnage: 20 });
      const doc2 = createMockBlkDocument({ cruiseMP: 10, tonnage: 20 });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const weight1 = handler.calculateWeight(result1.data!.unit);
      const weight2 = handler.calculateWeight(result2.data!.unit);

      // Higher cruise MP should mean heavier engine
      expect(weight2).toBeGreaterThan(weight1);
    });

    it('should include rotor weight as 10% of tonnage', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      // Rotor should contribute 2 tons (20 * 0.1)
      expect(weight).toBeGreaterThanOrEqual(2);
    });

    it('should include structural weight', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      // Structure should contribute 2 tons (20 * 0.1)
      expect(weight).toBeGreaterThanOrEqual(2);
    });

    it('should include armor weight', () => {
      const doc1 = createMockBlkDocument({ armor: [10, 8, 8, 6, 2] });
      const doc2 = createMockBlkDocument({ armor: [20, 16, 16, 12, 2] });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const weight1 = handler.calculateWeight(result1.data!.unit);
      const weight2 = handler.calculateWeight(result2.data!.unit);

      // More armor should mean more weight
      expect(weight2).toBeGreaterThan(weight1);
    });
  });

  // ==========================================================================
  // Calculations - BV
  // ==========================================================================

  describe('calculateBV', () => {
    it('should calculate positive BV', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(bv).toBeGreaterThan(0);
    });

    it('should include armor contribution to BV', () => {
      const doc1 = createMockBlkDocument({
        cruiseMP: 8,
        armor: [10, 8, 8, 6, 2],
      });
      const doc2 = createMockBlkDocument({
        cruiseMP: 8,
        armor: [20, 16, 16, 12, 2],
      });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const bv1 = handler.calculateBV(result1.data!.unit);
      const bv2 = handler.calculateBV(result2.data!.unit);

      // More armor should mean higher BV
      expect(bv2).toBeGreaterThan(bv1);
    });

    it('should apply movement modifier to BV', () => {
      const doc1 = createMockBlkDocument({
        cruiseMP: 6,
        armor: [16, 10, 10, 8, 2],
      });
      const doc2 = createMockBlkDocument({
        cruiseMP: 10,
        armor: [16, 10, 10, 8, 2],
      });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const bv1 = handler.calculateBV(result1.data!.unit);
      const bv2 = handler.calculateBV(result2.data!.unit);

      // Higher cruise MP should give higher BV modifier
      expect(bv2).toBeGreaterThan(bv1);
    });

    it('should return integer BV value', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      expect(Number.isInteger(bv)).toBe(true);
    });
  });

  // ==========================================================================
  // Calculations - Cost
  // ==========================================================================

  describe('calculateCost', () => {
    it('should calculate positive cost', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(cost).toBeGreaterThan(0);
    });

    it('should include base structure cost', () => {
      const doc1 = createMockBlkDocument({ tonnage: 15, cruiseMP: 8 });
      const doc2 = createMockBlkDocument({ tonnage: 30, cruiseMP: 8 });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const cost1 = handler.calculateCost(result1.data!.unit);
      const cost2 = handler.calculateCost(result2.data!.unit);

      // Heavier VTOL should cost more
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should include engine cost', () => {
      const doc1 = createMockBlkDocument({ tonnage: 20, cruiseMP: 6 });
      const doc2 = createMockBlkDocument({ tonnage: 20, cruiseMP: 10 });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const cost1 = handler.calculateCost(result1.data!.unit);
      const cost2 = handler.calculateCost(result2.data!.unit);

      // Higher engine rating should cost more
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should include rotor cost', () => {
      const doc = createMockBlkDocument({ tonnage: 20 });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      // Rotor cost is tonnage * 40000 = 800000
      expect(cost).toBeGreaterThan(800000);
    });

    it('should include armor cost', () => {
      const doc1 = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 8,
        armor: [10, 8, 8, 6, 2],
      });
      const doc2 = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 8,
        armor: [20, 16, 16, 12, 2],
      });
      const result1 = handler.parse(doc1);
      const result2 = handler.parse(doc2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const cost1 = handler.calculateCost(result1.data!.unit);
      const cost2 = handler.calculateCost(result2.data!.unit);

      // More armor should cost more
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('should return integer cost value', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const cost = handler.calculateCost(result.data!.unit);
      expect(Number.isInteger(cost)).toBe(true);
    });
  });

  // ==========================================================================
  // Serialization
  // ==========================================================================
});
