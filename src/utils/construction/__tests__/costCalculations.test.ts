/**
 * cBill cost calculation invariants.
 *
 * Per TechManual:
 *   chassis        = tonnage × 10 000
 *   engine         = rating² × 5000 × type-multiplier
 *   gyro           = ceil(rating/100) × 300 000 × type-multiplier
 *   structure      = tonnage × cost/ton
 *   armor          = points × 10 000 × cost-multiplier
 *   cockpit        = flat per type
 *   heat sink      = external × cost-each (integral free)
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import {
  calculateChassisCost,
  calculateCockpitCost,
  calculateEngineCost,
  calculateGyroCost,
  calculateHeatSinkCost,
  calculateStructureCost,
  calculateTotalCost,
  COCKPIT_COSTS,
  ENGINE_COST_MULTIPLIERS,
  getCostBreakdown,
  GYRO_COST_MULTIPLIERS,
  HEAT_SINK_COSTS,
  STRUCTURE_COST_PER_TON,
} from '../costCalculations';

describe('cost multiplier tables', () => {
  it('engine multipliers match TechManual ratios', () => {
    expect(ENGINE_COST_MULTIPLIERS[EngineType.STANDARD]).toBe(1.0);
    expect(ENGINE_COST_MULTIPLIERS[EngineType.XL_IS]).toBe(2.0);
    expect(ENGINE_COST_MULTIPLIERS[EngineType.XL_CLAN]).toBe(2.0);
    expect(ENGINE_COST_MULTIPLIERS[EngineType.LIGHT]).toBe(1.5);
    expect(ENGINE_COST_MULTIPLIERS[EngineType.XXL]).toBe(3.0);
    expect(ENGINE_COST_MULTIPLIERS[EngineType.ICE]).toBe(0.3);
  });

  it('gyro multipliers (XL gyro is half-cost; heavy-duty is double)', () => {
    expect(GYRO_COST_MULTIPLIERS[GyroType.STANDARD]).toBe(1.0);
    expect(GYRO_COST_MULTIPLIERS[GyroType.XL]).toBe(0.5);
    expect(GYRO_COST_MULTIPLIERS[GyroType.HEAVY_DUTY]).toBe(2.0);
  });

  it('structure cost-per-ton (standard 400, endo-steel 1600, reinforced 6400)', () => {
    expect(STRUCTURE_COST_PER_TON[InternalStructureType.STANDARD]).toBe(400);
    expect(STRUCTURE_COST_PER_TON[InternalStructureType.ENDO_STEEL_IS]).toBe(
      1600,
    );
    expect(STRUCTURE_COST_PER_TON[InternalStructureType.REINFORCED]).toBe(6400);
  });

  it('cockpit costs (standard 200k, small 175k, torso 750k)', () => {
    expect(COCKPIT_COSTS[CockpitType.STANDARD]).toBe(200_000);
    expect(COCKPIT_COSTS[CockpitType.SMALL]).toBe(175_000);
    expect(COCKPIT_COSTS[CockpitType.TORSO_MOUNTED]).toBe(750_000);
  });

  it('heat sink costs (single 2000, double 6000)', () => {
    expect(HEAT_SINK_COSTS[HeatSinkType.SINGLE]).toBe(2000);
    expect(HEAT_SINK_COSTS[HeatSinkType.DOUBLE_IS]).toBe(6000);
    expect(HEAT_SINK_COSTS[HeatSinkType.DOUBLE_CLAN]).toBe(6000);
  });
});

describe('calculateChassisCost', () => {
  it('returns tonnage × 10 000', () => {
    expect(calculateChassisCost(50)).toBe(500_000);
    expect(calculateChassisCost(100)).toBe(1_000_000);
  });
});

describe('calculateEngineCost (rating² × 5000 × multiplier)', () => {
  it('standard fusion: rating² × 5000', () => {
    expect(calculateEngineCost(200, EngineType.STANDARD)).toBe(
      200 * 200 * 5000,
    );
  });

  it('XL doubles the standard fusion cost', () => {
    expect(calculateEngineCost(200, EngineType.XL_IS)).toBe(
      200 * 200 * 5000 * 2,
    );
  });

  it('ICE is 30% of standard cost', () => {
    expect(calculateEngineCost(200, EngineType.ICE)).toBe(
      200 * 200 * 5000 * 0.3,
    );
  });
});

describe('calculateGyroCost', () => {
  it('rating 200 → ceil(200/100) = 2 t → 2 × 300 000 × 1.0 = 600 000', () => {
    expect(calculateGyroCost(200, GyroType.STANDARD)).toBe(600_000);
  });

  it('XL gyro halves the standard cost', () => {
    expect(calculateGyroCost(200, GyroType.XL)).toBe(300_000);
  });

  it('rounds up the rating/100 (rating 201 → 3 t)', () => {
    expect(calculateGyroCost(201, GyroType.STANDARD)).toBe(900_000);
  });
});

describe('calculateStructureCost', () => {
  it('Standard structure: tonnage × 400', () => {
    expect(calculateStructureCost(50, InternalStructureType.STANDARD)).toBe(
      20_000,
    );
  });

  it('Endo-Steel IS: tonnage × 1600', () => {
    expect(
      calculateStructureCost(50, InternalStructureType.ENDO_STEEL_IS),
    ).toBe(80_000);
  });
});

describe('calculateCockpitCost', () => {
  it('returns the per-type cost', () => {
    expect(calculateCockpitCost(CockpitType.STANDARD)).toBe(200_000);
    expect(calculateCockpitCost(CockpitType.TORSO_MOUNTED)).toBe(750_000);
  });
});

describe('calculateHeatSinkCost (external only — integral are free)', () => {
  it('returns externalCount × per-sink cost', () => {
    expect(calculateHeatSinkCost(5, HeatSinkType.SINGLE)).toBe(10_000);
    expect(calculateHeatSinkCost(5, HeatSinkType.DOUBLE_IS)).toBe(30_000);
  });

  it('returns 0 for zero externals', () => {
    expect(calculateHeatSinkCost(0, HeatSinkType.SINGLE)).toBe(0);
  });
});

describe('calculateTotalCost / getCostBreakdown', () => {
  const config = {
    tonnage: 50,
    engineRating: 200,
    engineType: EngineType.STANDARD,
    gyroType: GyroType.STANDARD,
    structureType: InternalStructureType.STANDARD,
    armorType: ArmorTypeEnum.STANDARD,
    totalArmorPoints: 100,
    cockpitType: CockpitType.STANDARD,
    heatSinkType: HeatSinkType.SINGLE,
    externalHeatSinks: 4,
    equipmentCost: 0,
  };

  it('total = sum of all components', () => {
    const total = calculateTotalCost(config);
    const bd = getCostBreakdown(config);
    expect(total).toBe(bd.total);
    expect(bd.total).toBe(
      bd.chassis +
        bd.engine +
        bd.gyro +
        bd.structure +
        bd.armor +
        bd.cockpit +
        bd.heatSinks +
        bd.equipment,
    );
  });

  it('chassis cost = 500 000 for 50-ton', () => {
    expect(getCostBreakdown(config).chassis).toBe(500_000);
  });

  it('equipment cost flows through unchanged', () => {
    const withEquip = { ...config, equipmentCost: 250_000 };
    expect(getCostBreakdown(withEquip).equipment).toBe(250_000);
  });
});
