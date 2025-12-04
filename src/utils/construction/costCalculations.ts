/**
 * C-Bill Cost Calculation Utilities
 * 
 * Implements TechManual cost formulas for BattleMech construction.
 * 
 * @spec openspec/specs/construction-services/spec.md
 */

import { EngineType } from '../../types/construction/EngineType';
import { GyroType } from '../../types/construction/GyroType';
import { InternalStructureType } from '../../types/construction/InternalStructureType';
import { CockpitType } from '../../types/construction/CockpitType';
import { HeatSinkType } from '../../types/construction/HeatSinkType';
import { calculateArmorCost } from './armorCalculations';
import { ArmorTypeEnum } from '../../types/construction/ArmorType';

// ============================================================================
// COST MULTIPLIERS (from TechManual)
// ============================================================================

/**
 * Engine cost multipliers by type
 * Base formula: (rating^2) × 5000 × multiplier
 */
export const ENGINE_COST_MULTIPLIERS: Record<EngineType, number> = {
  [EngineType.STANDARD]: 1.0,
  [EngineType.XL_IS]: 2.0,
  [EngineType.XL_CLAN]: 2.0,
  [EngineType.LIGHT]: 1.5,
  [EngineType.XXL]: 3.0,
  [EngineType.COMPACT]: 1.5,
  [EngineType.ICE]: 0.3,
  [EngineType.FUEL_CELL]: 0.35,
  [EngineType.FISSION]: 0.75,
};

/**
 * Gyro cost multipliers by type
 * Base formula: ceil(engineRating / 100) × 300000 × multiplier
 */
export const GYRO_COST_MULTIPLIERS: Record<GyroType, number> = {
  [GyroType.STANDARD]: 1.0,
  [GyroType.XL]: 0.5,
  [GyroType.COMPACT]: 1.5,
  [GyroType.HEAVY_DUTY]: 2.0,
};

/**
 * Internal structure cost per ton by type
 */
export const STRUCTURE_COST_PER_TON: Record<InternalStructureType, number> = {
  [InternalStructureType.STANDARD]: 400,
  [InternalStructureType.ENDO_STEEL_IS]: 1600,
  [InternalStructureType.ENDO_STEEL_CLAN]: 1600,
  [InternalStructureType.ENDO_COMPOSITE]: 1600,
  [InternalStructureType.REINFORCED]: 6400,
  [InternalStructureType.COMPOSITE]: 1600,
  [InternalStructureType.INDUSTRIAL]: 300,
};

// Armor cost is calculated via calculateArmorCost from armorCalculations.ts

/**
 * Cockpit costs by type
 */
export const COCKPIT_COSTS: Record<CockpitType, number> = {
  [CockpitType.STANDARD]: 200000,
  [CockpitType.SMALL]: 175000,
  [CockpitType.COMMAND_CONSOLE]: 500000,
  [CockpitType.TORSO_MOUNTED]: 750000,
  [CockpitType.INDUSTRIAL]: 100000,
  [CockpitType.PRIMITIVE]: 100000,
  [CockpitType.SUPER_HEAVY]: 300000,
};

/**
 * Heat sink costs by type
 */
export const HEAT_SINK_COSTS: Record<HeatSinkType, number> = {
  [HeatSinkType.SINGLE]: 2000,
  [HeatSinkType.DOUBLE_IS]: 6000,
  [HeatSinkType.DOUBLE_CLAN]: 6000,
  [HeatSinkType.COMPACT]: 3000,
  [HeatSinkType.LASER]: 6000,
};

// ============================================================================
// COST CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate engine cost
 * Formula: (rating^2) × 5000 × type_multiplier
 */
export function calculateEngineCost(rating: number, type: EngineType): number {
  const multiplier = ENGINE_COST_MULTIPLIERS[type] ?? 1.0;
  return Math.round(rating * rating * 5000 * multiplier);
}

/**
 * Calculate gyro cost
 * Formula: ceil(engineRating / 100) × 300000 × type_multiplier
 */
export function calculateGyroCost(engineRating: number, type: GyroType): number {
  const multiplier = GYRO_COST_MULTIPLIERS[type] ?? 1.0;
  const gyroTonnage = Math.ceil(engineRating / 100);
  return Math.round(gyroTonnage * 300000 * multiplier);
}

/**
 * Calculate internal structure cost
 * Formula: tonnage × cost_per_ton
 */
export function calculateStructureCost(tonnage: number, type: InternalStructureType): number {
  const costPerTon = STRUCTURE_COST_PER_TON[type] ?? 400;
  return Math.round(tonnage * costPerTon);
}

// Note: calculateArmorCost is already defined in armorCalculations.ts
// Use: import { calculateArmorCost } from './armorCalculations';

/**
 * Calculate cockpit cost
 */
export function calculateCockpitCost(type: CockpitType): number {
  return COCKPIT_COSTS[type] ?? 200000;
}

/**
 * Calculate heat sink cost (external heat sinks only)
 * Integral heat sinks in the engine are free
 */
export function calculateHeatSinkCost(externalCount: number, type: HeatSinkType): number {
  const costEach = HEAT_SINK_COSTS[type] ?? 2000;
  return externalCount * costEach;
}

/**
 * Calculate base chassis cost
 * Formula: tonnage × 10000
 */
export function calculateChassisCost(tonnage: number): number {
  return tonnage * 10000;
}

/**
 * Unit cost calculation config
 */
export interface UnitCostConfig {
  tonnage: number;
  engineRating: number;
  engineType: EngineType;
  gyroType: GyroType;
  structureType: InternalStructureType;
  armorType: ArmorTypeEnum;
  totalArmorPoints: number;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  externalHeatSinks: number;
  equipmentCost: number;
}

/**
 * Calculate total unit cost
 */
export function calculateTotalCost(config: UnitCostConfig): number {
  const chassis = calculateChassisCost(config.tonnage);
  const engine = calculateEngineCost(config.engineRating, config.engineType);
  const gyro = calculateGyroCost(config.engineRating, config.gyroType);
  const structure = calculateStructureCost(config.tonnage, config.structureType);
  const armor = calculateArmorCost(config.totalArmorPoints, config.armorType);
  const cockpit = calculateCockpitCost(config.cockpitType);
  const heatSinks = calculateHeatSinkCost(config.externalHeatSinks, config.heatSinkType);
  
  return chassis + engine + gyro + structure + armor + cockpit + heatSinks + config.equipmentCost;
}

/**
 * Cost breakdown for display
 */
export interface CostBreakdown {
  chassis: number;
  engine: number;
  gyro: number;
  structure: number;
  armor: number;
  cockpit: number;
  heatSinks: number;
  equipment: number;
  total: number;
}

/**
 * Get detailed cost breakdown
 */
export function getCostBreakdown(config: UnitCostConfig): CostBreakdown {
  const chassis = calculateChassisCost(config.tonnage);
  const engine = calculateEngineCost(config.engineRating, config.engineType);
  const gyro = calculateGyroCost(config.engineRating, config.gyroType);
  const structure = calculateStructureCost(config.tonnage, config.structureType);
  const armor = calculateArmorCost(config.totalArmorPoints, config.armorType);
  const cockpit = calculateCockpitCost(config.cockpitType);
  const heatSinks = calculateHeatSinkCost(config.externalHeatSinks, config.heatSinkType);
  
  return {
    chassis,
    engine,
    gyro,
    structure,
    armor,
    cockpit,
    heatSinks,
    equipment: config.equipmentCost,
    total: chassis + engine + gyro + structure + armor + cockpit + heatSinks + config.equipmentCost,
  };
}

