/**
 * Calculation Service Utilities
 *
 * Helper functions for type checking and multiplier calculations.
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

import {
  COCKPIT_COST_STANDARD,
  COCKPIT_COST_SMALL,
  COCKPIT_COST_COMMAND_CONSOLE,
  STRUCTURE_COST_MULTIPLIER_STANDARD,
  STRUCTURE_COST_MULTIPLIER_ENDO_STEEL,
  STRUCTURE_COST_MULTIPLIER_ENDO_COMPOSITE,
  ARMOR_COST_MULTIPLIER_STANDARD,
  ARMOR_COST_MULTIPLIER_FERRO_FIBROUS,
  ARMOR_COST_MULTIPLIER_STEALTH,
  ARMOR_COST_MULTIPLIER_REACTIVE,
  ARMOR_COST_MULTIPLIER_REFLECTIVE,
} from './constructionConstants';

/**
 * Check if a heat sink type is a double heat sink variant
 */
export function isDoubleHeatSink(heatSinkType: HeatSinkType | string): boolean {
  if (
    heatSinkType === HeatSinkType.DOUBLE_IS ||
    heatSinkType === HeatSinkType.DOUBLE_CLAN
  ) {
    return true;
  }
  if (typeof heatSinkType === 'string') {
    return heatSinkType.toLowerCase().includes('double');
  }
  return false;
}

/**
 * Get engine cost multiplier based on engine type
 */
export function getEngineCostMultiplier(
  engineType: EngineType | string,
): number {
  const typeStr =
    typeof engineType === 'string' ? engineType.toLowerCase() : engineType;

  // Check enum values first
  if (engineType === EngineType.XL_IS || engineType === EngineType.XL_CLAN)
    return 2.0;
  if (engineType === EngineType.LIGHT) return 1.5;
  if (engineType === EngineType.XXL) return 3.0;
  if (engineType === EngineType.COMPACT) return 1.5;

  // Check legacy string values
  if (typeof typeStr === 'string') {
    if (typeStr.includes('xxl')) return 3.0;
    if (typeStr.includes('xl')) return 2.0;
    if (typeStr.includes('light')) return 1.5;
    if (typeStr.includes('compact')) return 1.5;
  }

  return 1.0;
}

/**
 * Get gyro cost multiplier based on gyro type
 */
export function getGyroCostMultiplier(gyroType: GyroType | string): number {
  // Check enum values first
  if (gyroType === GyroType.XL) return 2.0;
  if (gyroType === GyroType.COMPACT) return 4.0;
  if (gyroType === GyroType.HEAVY_DUTY) return 0.5;

  // Check legacy string values
  if (typeof gyroType === 'string') {
    const typeStr = gyroType.toLowerCase();
    if (typeStr.includes('xl')) return 2.0;
    if (typeStr.includes('compact')) return 4.0;
    if (typeStr.includes('heavy')) return 0.5;
  }

  return 1.0;
}

/**
 * Get cockpit cost based on cockpit type
 */
export function getCockpitCost(cockpitType: CockpitType | string): number {
  if (cockpitType === CockpitType.SMALL) return COCKPIT_COST_SMALL;
  if (cockpitType === CockpitType.COMMAND_CONSOLE)
    return COCKPIT_COST_COMMAND_CONSOLE;

  if (typeof cockpitType === 'string') {
    const typeStr = cockpitType.toLowerCase();
    if (typeStr.includes('small')) return COCKPIT_COST_SMALL;
    if (typeStr.includes('command')) return COCKPIT_COST_COMMAND_CONSOLE;
  }

  return COCKPIT_COST_STANDARD;
}

/**
 * Get structure cost multiplier based on structure type
 */
export function getStructureCostMultiplier(
  structureType: InternalStructureType | string,
): number {
  if (
    structureType === InternalStructureType.ENDO_STEEL_IS ||
    structureType === InternalStructureType.ENDO_STEEL_CLAN
  )
    return STRUCTURE_COST_MULTIPLIER_ENDO_STEEL;
  if (structureType === InternalStructureType.ENDO_COMPOSITE)
    return STRUCTURE_COST_MULTIPLIER_ENDO_COMPOSITE;

  if (typeof structureType === 'string') {
    if (structureType.toLowerCase().includes('endo'))
      return STRUCTURE_COST_MULTIPLIER_ENDO_STEEL;
  }

  return STRUCTURE_COST_MULTIPLIER_STANDARD;
}

/**
 * Get armor cost multiplier based on armor type
 */
export function getArmorCostMultiplier(
  armorType: ArmorTypeEnum | string,
): number {
  if (
    armorType === ArmorTypeEnum.FERRO_FIBROUS_IS ||
    armorType === ArmorTypeEnum.FERRO_FIBROUS_CLAN ||
    armorType === ArmorTypeEnum.LIGHT_FERRO ||
    armorType === ArmorTypeEnum.HEAVY_FERRO
  )
    return ARMOR_COST_MULTIPLIER_FERRO_FIBROUS;
  if (armorType === ArmorTypeEnum.STEALTH) return ARMOR_COST_MULTIPLIER_STEALTH;
  if (armorType === ArmorTypeEnum.REACTIVE)
    return ARMOR_COST_MULTIPLIER_REACTIVE;
  if (armorType === ArmorTypeEnum.REFLECTIVE)
    return ARMOR_COST_MULTIPLIER_REFLECTIVE;

  if (typeof armorType === 'string') {
    const typeStr = armorType.toLowerCase();
    if (typeStr.includes('ferro')) return ARMOR_COST_MULTIPLIER_FERRO_FIBROUS;
    if (typeStr.includes('stealth')) return ARMOR_COST_MULTIPLIER_STEALTH;
    if (typeStr.includes('reactive')) return ARMOR_COST_MULTIPLIER_REACTIVE;
    if (typeStr.includes('reflective')) return ARMOR_COST_MULTIPLIER_REFLECTIVE;
  }

  return ARMOR_COST_MULTIPLIER_STANDARD;
}

/**
 * Normalize BV type string
 */
export function normalizeBVType(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}
