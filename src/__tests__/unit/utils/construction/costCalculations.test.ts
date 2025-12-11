import {
  calculateEngineCost,
  calculateGyroCost,
  calculateStructureCost,
  calculateCockpitCost,
  calculateHeatSinkCost,
  calculateChassisCost,
  calculateTotalCost,
  getCostBreakdown,
  ENGINE_COST_MULTIPLIERS,
  GYRO_COST_MULTIPLIERS,
} from '@/utils/construction/costCalculations';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';

describe('costCalculations', () => {
  describe('calculateEngineCost()', () => {
    it('should calculate standard engine cost', () => {
      const cost = calculateEngineCost(250, EngineType.STANDARD);
      // Formula: rating^2 × 5000 × multiplier
      // 250^2 × 5000 × 1.0 = 312,500,000
      expect(cost).toBeGreaterThan(0);
    });

    it('should apply XL multiplier', () => {
      const standardCost = calculateEngineCost(250, EngineType.STANDARD);
      const xlCost = calculateEngineCost(250, EngineType.XL_IS);
      
      expect(xlCost).toBeGreaterThan(standardCost);
      expect(xlCost).toBeCloseTo(standardCost * 2, -5);
    });

    it('should handle different ratings', () => {
      const cost200 = calculateEngineCost(200, EngineType.STANDARD);
      const cost300 = calculateEngineCost(300, EngineType.STANDARD);
      
      expect(cost300).toBeGreaterThan(cost200);
    });
  });

  describe('calculateGyroCost()', () => {
    it('should calculate standard gyro cost', () => {
      const cost = calculateGyroCost(250, GyroType.STANDARD);
      // Formula: ceil(rating / 100) × 300000 × multiplier
      // ceil(250 / 100) × 300000 × 1.0 = 3 × 300000 = 900000
      expect(cost).toBeGreaterThan(0);
    });

    it('should apply compact multiplier', () => {
      const standardCost = calculateGyroCost(250, GyroType.STANDARD);
      const compactCost = calculateGyroCost(250, GyroType.COMPACT);
      
      expect(compactCost).toBeGreaterThan(standardCost);
    });
  });

  describe('calculateStructureCost()', () => {
    it('should calculate standard structure cost', () => {
      const cost = calculateStructureCost(5, InternalStructureType.STANDARD);
      // 5 tons × 400 = 2000
      expect(cost).toBe(2000);
    });

    it('should apply Endo Steel multiplier', () => {
      const standardCost = calculateStructureCost(5, InternalStructureType.STANDARD);
      const endoCost = calculateStructureCost(5, InternalStructureType.ENDO_STEEL_IS);
      
      expect(endoCost).toBeGreaterThan(standardCost);
    });
  });

  describe('calculateCockpitCost()', () => {
    it('should return standard cockpit cost', () => {
      const cost = calculateCockpitCost(CockpitType.STANDARD);
      expect(cost).toBe(200000);
    });

    it('should return command console cost', () => {
      const cost = calculateCockpitCost(CockpitType.COMMAND_CONSOLE);
      expect(cost).toBe(500000);
    });
  });

  describe('calculateHeatSinkCost()', () => {
    it('should calculate single heat sink cost', () => {
      const cost = calculateHeatSinkCost(10, HeatSinkType.SINGLE);
      // 10 × 2000 = 20000
      expect(cost).toBe(20000);
    });

    it('should calculate double heat sink cost', () => {
      const cost = calculateHeatSinkCost(10, HeatSinkType.DOUBLE_IS);
      // 10 × 6000 = 60000
      expect(cost).toBe(60000);
    });
  });

  describe('calculateChassisCost()', () => {
    it('should scale linearly with tonnage', () => {
      expect(calculateChassisCost(50)).toBe(500000);
      expect(calculateChassisCost(75)).toBe(750000);
    });
  });

  describe('calculateTotalCost() and getCostBreakdown()', () => {
    const config = {
      tonnage: 50,
      engineRating: 250,
      engineType: EngineType.STANDARD,
      gyroType: GyroType.STANDARD,
      structureType: InternalStructureType.ENDO_STEEL_IS,
      armorType: ArmorTypeEnum.STANDARD,
      totalArmorPoints: 184,
      cockpitType: CockpitType.STANDARD,
      heatSinkType: HeatSinkType.DOUBLE_IS,
      externalHeatSinks: 5,
      equipmentCost: 1_000_000,
    };

    it('should calculate aggregate unit cost', () => {
      const total = calculateTotalCost(config);
      expect(total).toBeGreaterThan(config.equipmentCost);
    });

    it('should provide a detailed cost breakdown', () => {
      const breakdown = getCostBreakdown(config);
      expect(breakdown.chassis).toBe(calculateChassisCost(config.tonnage));
      expect(breakdown.engine).toBeGreaterThan(0);
      expect(breakdown.armor).toBeGreaterThan(0);
      expect(breakdown.total).toBe(
        breakdown.chassis +
          breakdown.engine +
          breakdown.gyro +
          breakdown.structure +
          breakdown.armor +
          breakdown.cockpit +
          breakdown.heatSinks +
          breakdown.equipment
      );
    });
  });

  describe('cost multipliers', () => {
    it('should have ENGINE_COST_MULTIPLIERS defined', () => {
      expect(ENGINE_COST_MULTIPLIERS[EngineType.STANDARD]).toBe(1.0);
      expect(ENGINE_COST_MULTIPLIERS[EngineType.XL_IS]).toBe(2.0);
    });

    it('should have GYRO_COST_MULTIPLIERS defined', () => {
      expect(GYRO_COST_MULTIPLIERS[GyroType.STANDARD]).toBe(1.0);
      expect(GYRO_COST_MULTIPLIERS[GyroType.COMPACT]).toBe(1.5);
    });
  });
});

