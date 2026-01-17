/**
 * Tests for Weight Validation Utilities
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import {
  calculateStructuralWeight,
  getEngineWeight,
  getGyroWeight,
  getStructureWeight,
  getCockpitWeight,
  getHeatSinkWeight,
  getRemainingWeight,
  isWithinWeightLimit,
  getWeightOverflow,
  StructuralWeightParams,
} from '@/utils/validation/weightValidationUtils';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';

describe('Weight Validation Utilities', () => {
  describe('calculateStructuralWeight', () => {
    const baseParams: StructuralWeightParams = {
      tonnage: 50,
      engineType: EngineType.STANDARD,
      engineRating: 200,
      gyroType: GyroType.STANDARD,
      internalStructureType: InternalStructureType.STANDARD,
      cockpitType: CockpitType.STANDARD,
      heatSinkType: HeatSinkType.SINGLE,
      heatSinkCount: 10,
      armorTonnage: 8,
    };

    it('should calculate total structural weight', () => {
      const weight = calculateStructuralWeight(baseParams);

      // Should be a positive number
      expect(weight).toBeGreaterThan(0);

      // Should be less than the mech tonnage
      expect(weight).toBeLessThan(baseParams.tonnage);
    });

    it('should increase with heavier engine', () => {
      const lightEngine = calculateStructuralWeight({
        ...baseParams,
        engineRating: 100,
      });

      const heavyEngine = calculateStructuralWeight({
        ...baseParams,
        engineRating: 300,
      });

      expect(heavyEngine).toBeGreaterThan(lightEngine);
    });

    it('should decrease with XL engine', () => {
      const standard = calculateStructuralWeight({
        ...baseParams,
        engineType: EngineType.STANDARD,
      });

      const xl = calculateStructuralWeight({
        ...baseParams,
        engineType: EngineType.XL_IS,
      });

      expect(xl).toBeLessThan(standard);
    });

    it('should decrease with endo steel structure', () => {
      const standard = calculateStructuralWeight({
        ...baseParams,
        internalStructureType: InternalStructureType.STANDARD,
      });

      const endo = calculateStructuralWeight({
        ...baseParams,
        internalStructureType: InternalStructureType.ENDO_STEEL_IS,
      });

      expect(endo).toBeLessThan(standard);
    });

    it('should add weight for heat sinks beyond 10', () => {
      const tenHeatSinks = calculateStructuralWeight({
        ...baseParams,
        heatSinkCount: 10,
      });

      const fifteenHeatSinks = calculateStructuralWeight({
        ...baseParams,
        heatSinkCount: 15,
      });

      expect(fifteenHeatSinks).toBeGreaterThan(tenHeatSinks);
    });

    it('should include armor tonnage', () => {
      const lowArmor = calculateStructuralWeight({
        ...baseParams,
        armorTonnage: 5,
      });

      const highArmor = calculateStructuralWeight({
        ...baseParams,
        armorTonnage: 15,
      });

      expect(highArmor - lowArmor).toBe(10);
    });

    it('should handle different tonnages', () => {
      const light = calculateStructuralWeight({
        ...baseParams,
        tonnage: 20,
        engineRating: 80,
      });

      const heavy = calculateStructuralWeight({
        ...baseParams,
        tonnage: 100,
        engineRating: 400,
      });

      // Heavier mechs have more structural weight (structure + bigger engine)
      expect(heavy).toBeGreaterThan(light);
    });
  });

  describe('getEngineWeight', () => {
    it('should return positive weight for valid engine', () => {
      const weight = getEngineWeight(200, EngineType.STANDARD);
      expect(weight).toBeGreaterThan(0);
    });

    it('should apply XL multiplier', () => {
      const standard = getEngineWeight(200, EngineType.STANDARD);
      const xl = getEngineWeight(200, EngineType.XL_IS);
      expect(xl).toBeLessThan(standard);
    });

    it('should handle different ratings', () => {
      const small = getEngineWeight(100, EngineType.STANDARD);
      const large = getEngineWeight(400, EngineType.STANDARD);
      expect(large).toBeGreaterThan(small);
    });
  });

  describe('getGyroWeight', () => {
    it('should return positive weight for valid gyro', () => {
      const weight = getGyroWeight(200, GyroType.STANDARD);
      expect(weight).toBeGreaterThan(0);
    });

    it('should scale with engine rating', () => {
      const small = getGyroWeight(100, GyroType.STANDARD);
      const large = getGyroWeight(300, GyroType.STANDARD);
      expect(large).toBeGreaterThan(small);
    });

    it('should apply type multipliers', () => {
      const standard = getGyroWeight(200, GyroType.STANDARD);
      const xl = getGyroWeight(200, GyroType.XL);
      const compact = getGyroWeight(200, GyroType.COMPACT);
      const heavy = getGyroWeight(200, GyroType.HEAVY_DUTY);

      // XL gyro is half weight
      expect(xl).toBeLessThan(standard);
      // Compact gyro is 1.5x weight
      expect(compact).toBeGreaterThan(standard);
      // Heavy duty is 2x weight
      expect(heavy).toBeGreaterThan(standard);
    });
  });

  describe('getStructureWeight', () => {
    it('should return positive weight for standard structure', () => {
      const weight = getStructureWeight(50, InternalStructureType.STANDARD);
      expect(weight).toBeGreaterThan(0);
    });

    it('should scale with tonnage', () => {
      const light = getStructureWeight(20, InternalStructureType.STANDARD);
      const heavy = getStructureWeight(100, InternalStructureType.STANDARD);
      expect(heavy).toBeGreaterThan(light);
    });

    it('should be lighter with endo steel', () => {
      const standard = getStructureWeight(50, InternalStructureType.STANDARD);
      const endo = getStructureWeight(50, InternalStructureType.ENDO_STEEL_IS);
      expect(endo).toBeLessThan(standard);
    });
  });

  describe('getCockpitWeight', () => {
    it('should return weight for standard cockpit', () => {
      const weight = getCockpitWeight(CockpitType.STANDARD);
      expect(weight).toBe(3);
    });

    it('should return weight for small cockpit', () => {
      const weight = getCockpitWeight(CockpitType.SMALL);
      expect(weight).toBe(2);
    });

    it('should return default 3 for unknown type', () => {
      const weight = getCockpitWeight('unknown-type');
      expect(weight).toBe(3);
    });
  });

  describe('getHeatSinkWeight', () => {
    it('should return 0 for 10 or fewer heat sinks', () => {
      expect(getHeatSinkWeight(10, HeatSinkType.SINGLE)).toBe(0);
      expect(getHeatSinkWeight(5, HeatSinkType.SINGLE)).toBe(0);
      expect(getHeatSinkWeight(0, HeatSinkType.SINGLE)).toBe(0);
    });

    it('should charge for heat sinks beyond 10', () => {
      expect(getHeatSinkWeight(11, HeatSinkType.SINGLE)).toBe(1);
      expect(getHeatSinkWeight(15, HeatSinkType.SINGLE)).toBe(5);
      expect(getHeatSinkWeight(20, HeatSinkType.SINGLE)).toBe(10);
    });

    it('should use correct weight per heat sink type', () => {
      // Both single and double heat sinks weigh 1 ton each
      const single = getHeatSinkWeight(15, HeatSinkType.SINGLE);
      const double = getHeatSinkWeight(15, HeatSinkType.DOUBLE_IS);
      expect(single).toBe(double);
    });
  });

  describe('getRemainingWeight', () => {
    it('should calculate remaining weight correctly', () => {
      expect(getRemainingWeight(50, 30)).toBe(20);
      expect(getRemainingWeight(100, 80)).toBe(20);
      expect(getRemainingWeight(50, 50)).toBe(0);
    });

    it('should return negative when over weight', () => {
      expect(getRemainingWeight(50, 60)).toBe(-10);
    });
  });

  describe('isWithinWeightLimit', () => {
    it('should return true when within limit', () => {
      expect(isWithinWeightLimit(50, 30)).toBe(true);
      expect(isWithinWeightLimit(50, 50)).toBe(true);
    });

    it('should return false when over limit', () => {
      expect(isWithinWeightLimit(50, 51)).toBe(false);
      expect(isWithinWeightLimit(50, 100)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isWithinWeightLimit(0, 0)).toBe(true);
      expect(isWithinWeightLimit(50, 0)).toBe(true);
    });
  });

  describe('getWeightOverflow', () => {
    it('should return 0 when within limit', () => {
      expect(getWeightOverflow(50, 30)).toBe(0);
      expect(getWeightOverflow(50, 50)).toBe(0);
    });

    it('should return overflow amount when over limit', () => {
      expect(getWeightOverflow(50, 55)).toBe(5);
      expect(getWeightOverflow(50, 100)).toBe(50);
    });
  });
});
