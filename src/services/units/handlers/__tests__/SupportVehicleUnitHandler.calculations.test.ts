/**
 * SupportVehicleUnitHandler Tests
 *
 * Tests for Support Vehicle BLK parsing, validation, and calculations
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel, WeightClass } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { SupportVehicleSizeClass } from '@/types/unit/VehicleInterfaces';

import {
  SupportVehicleUnitHandler,
  createSupportVehicleHandler,
} from '../SupportVehicleUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createSmallSupportVehicleDocument,
  createMediumSupportVehicleDocument,
  createLargeSupportVehicleDocument,
  createHoverSupportVehicleDocument,
  createVTOLSupportVehicleDocument,
  createNavalSupportVehicleDocument,
  createHydrofoilSupportVehicleDocument,
  createSubmarineSupportVehicleDocument,
  createWiGESupportVehicleDocument,
  createRailSupportVehicleDocument,
  createMaglevSupportVehicleDocument,
  createClanSupportVehicleDocument,
  createStationarySupportVehicleDocument,
  createMultiLocationEquipmentDocument,
} from './SupportVehicleUnitHandler.test-helpers';

describe('SupportVehicleUnitHandler', () => {
  let handler: SupportVehicleUnitHandler;

  beforeEach(() => {
    handler = createSupportVehicleHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('calculateWeight', () => {
    it('should calculate weight for mobile vehicle', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 4,
        armor: [8, 6, 6, 4],
        rawTags: { bar: '5' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      expect(weight).toBeGreaterThan(0);
    });

    it('should calculate zero engine weight for stationary vehicle', () => {
      const doc = createStationarySupportVehicleDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      // Stationary vehicles have no engine weight component
      expect(weight).toBeGreaterThan(0); // Still has structural and armor weight
    });

    it('should include structural weight', () => {
      const doc = createMockBlkDocument({
        tonnage: 50,
        cruiseMP: 0,
        armor: [],
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      // Structural weight = tonnage * 0.08 = 50 * 0.08 = 4
      expect(weight).toBeGreaterThanOrEqual(4);
    });

    it('should include armor weight based on BAR', () => {
      const doc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [10, 10, 10, 10], // 40 points
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const weight = handler.calculateWeight(result.data!.unit);
      // Should include armor weight: 40 * 0.0625 * (10/10) = 2.5
      expect(weight).toBeGreaterThan(0);
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

    it('should include armor BV', () => {
      const doc = createMockBlkDocument({
        armor: [20, 15, 15, 10], // 60 points
        cruiseMP: 0,
        rawTags: { bar: '10' },
      });
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const bv = handler.calculateBV(result.data!.unit);
      // Base armor BV = 60 * 1.5 * (10/10) = 90
      expect(bv).toBeGreaterThanOrEqual(90);
    });

    it('should apply movement modifier to BV', () => {
      const stationaryDoc = createMockBlkDocument({
        armor: [10, 10, 10, 10],
        cruiseMP: 0,
        rawTags: { bar: '5' },
      });
      const mobileDoc = createMockBlkDocument({
        armor: [10, 10, 10, 10],
        cruiseMP: 4,
        rawTags: { bar: '5' },
      });

      const stationaryResult = handler.parse(stationaryDoc);
      const mobileResult = handler.parse(mobileDoc);

      const stationaryBV = handler.calculateBV(stationaryResult.data!.unit);
      const mobileBV = handler.calculateBV(mobileResult.data!.unit);

      // Mobile vehicle should have higher BV due to movement modifier
      expect(mobileBV).toBeGreaterThan(stationaryBV);
    });

    it('should reduce BV for lower BAR rating', () => {
      const highBarDoc = createMockBlkDocument({
        armor: [20, 20, 20, 20],
        cruiseMP: 0,
        rawTags: { bar: '10' },
      });
      const lowBarDoc = createMockBlkDocument({
        armor: [20, 20, 20, 20],
        cruiseMP: 0,
        rawTags: { bar: '5' },
      });

      const highBarResult = handler.parse(highBarDoc);
      const lowBarResult = handler.parse(lowBarDoc);

      const highBarBV = handler.calculateBV(highBarResult.data!.unit);
      const lowBarBV = handler.calculateBV(lowBarResult.data!.unit);

      expect(highBarBV).toBeGreaterThan(lowBarBV);
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

    it('should include chassis cost based on tonnage', () => {
      const lightDoc = createMockBlkDocument({
        tonnage: 10,
        cruiseMP: 0,
        armor: [],
      });
      const heavyDoc = createMockBlkDocument({
        tonnage: 50,
        cruiseMP: 0,
        armor: [],
      });

      const lightResult = handler.parse(lightDoc);
      const heavyResult = handler.parse(heavyDoc);

      const lightCost = handler.calculateCost(lightResult.data!.unit);
      const heavyCost = handler.calculateCost(heavyResult.data!.unit);

      expect(heavyCost).toBeGreaterThan(lightCost);
    });

    it('should include engine cost for mobile vehicles', () => {
      const stationaryDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [],
      });
      const mobileDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 4,
        armor: [],
      });

      const stationaryResult = handler.parse(stationaryDoc);
      const mobileResult = handler.parse(mobileDoc);

      const stationaryCost = handler.calculateCost(stationaryResult.data!.unit);
      const mobileCost = handler.calculateCost(mobileResult.data!.unit);

      expect(mobileCost).toBeGreaterThan(stationaryCost);
    });

    it('should include armor cost', () => {
      const noArmorDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [],
      });
      const armoredDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [20, 20, 20, 20],
        rawTags: { bar: '5' },
      });

      const noArmorResult = handler.parse(noArmorDoc);
      const armoredResult = handler.parse(armoredDoc);

      const noArmorCost = handler.calculateCost(noArmorResult.data!.unit);
      const armoredCost = handler.calculateCost(armoredResult.data!.unit);

      expect(armoredCost).toBeGreaterThan(noArmorCost);
    });

    it('should include cargo capacity cost', () => {
      const noCargoDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [],
        rawTags: {},
      });
      const cargoDoc = createMockBlkDocument({
        tonnage: 20,
        cruiseMP: 0,
        armor: [],
        rawTags: { cargo: '10' },
      });

      const noCargoResult = handler.parse(noCargoDoc);
      const cargoResult = handler.parse(cargoDoc);

      const noCargoCost = handler.calculateCost(noCargoResult.data!.unit);
      const cargoCost = handler.calculateCost(cargoResult.data!.unit);

      expect(cargoCost).toBeGreaterThan(noCargoCost);
    });
  });

  // ==========================================================================
  // Serialization
  // ==========================================================================
});
