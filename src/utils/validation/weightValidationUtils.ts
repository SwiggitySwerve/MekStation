/**
 * Weight Validation Utilities
 *
 * Pure functions for calculating structural weight for validation.
 * Extracts weight calculation logic from useUnitValidation hook.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { calculateEngineWeight } from '@/utils/construction/engineCalculations';
import { calculateGyroWeight } from '@/utils/construction/gyroCalculations';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';

/**
 * Parameters for structural weight calculation
 */
export interface StructuralWeightParams {
  /** Unit tonnage */
  tonnage: number;
  /** Engine type string */
  engineType: string;
  /** Engine rating */
  engineRating: number;
  /** Gyro type string */
  gyroType: string;
  /** Internal structure type string */
  internalStructureType: string;
  /** Cockpit type string */
  cockpitType: string;
  /** Heat sink type string */
  heatSinkType: string;
  /** Number of heat sinks */
  heatSinkCount: number;
  /** Armor tonnage */
  armorTonnage: number;
}

/**
 * Calculate total structural weight for the unit
 *
 * This includes:
 * - Engine weight
 * - Gyro weight
 * - Internal structure weight
 * - Cockpit weight
 * - Heat sink weight (first 10 are free)
 * - Armor weight
 *
 * @param params - Structural weight calculation parameters
 * @returns Total structural weight in tons
 */
export function calculateStructuralWeight(params: StructuralWeightParams): number {
  const {
    tonnage,
    engineType,
    engineRating,
    gyroType,
    internalStructureType,
    cockpitType,
    heatSinkType,
    heatSinkCount,
    armorTonnage,
  } = params;

  // Engine weight
  const engineWeight = calculateEngineWeight(engineRating, engineType as EngineType);

  // Gyro weight
  const gyroWeight = calculateGyroWeight(engineRating, gyroType as GyroType);

  // Structure weight
  const structureDef = getInternalStructureDefinition(internalStructureType as InternalStructureType);
  const structureWeight = structureDef ? ceilToHalfTon(tonnage * structureDef.weightMultiplier) : ceilToHalfTon(tonnage * 0.1);

  // Cockpit weight
  const cockpitDef = getCockpitDefinition(cockpitType as CockpitType);
  const cockpitWeight = cockpitDef?.weight ?? 3;

  // Heat sink weight (first 10 are free)
  const heatSinkDef = getHeatSinkDefinition(heatSinkType as HeatSinkType);
  const heatSinksRequiringWeight = Math.max(0, heatSinkCount - 10);
  const weightPerHeatSink = heatSinkDef?.weight ?? 1.0;
  const heatSinkWeight = heatSinksRequiringWeight * weightPerHeatSink;

  // Armor weight
  const armorWeight = armorTonnage;

  return engineWeight + gyroWeight + structureWeight + cockpitWeight + heatSinkWeight + armorWeight;
}

/**
 * Calculate engine weight
 *
 * @param engineRating - Engine rating
 * @param engineType - Engine type string
 * @returns Engine weight in tons
 */
export function getEngineWeight(engineRating: number, engineType: string): number {
  return calculateEngineWeight(engineRating, engineType as EngineType);
}

/**
 * Calculate gyro weight
 *
 * @param engineRating - Engine rating
 * @param gyroType - Gyro type string
 * @returns Gyro weight in tons
 */
export function getGyroWeight(engineRating: number, gyroType: string): number {
  return calculateGyroWeight(engineRating, gyroType as GyroType);
}

/**
 * Calculate internal structure weight
 *
 * @param tonnage - Unit tonnage
 * @param internalStructureType - Internal structure type string
 * @returns Structure weight in tons
 */
export function getStructureWeight(tonnage: number, internalStructureType: string): number {
  const structureDef = getInternalStructureDefinition(internalStructureType as InternalStructureType);
  return structureDef ? ceilToHalfTon(tonnage * structureDef.weightMultiplier) : ceilToHalfTon(tonnage * 0.1);
}

/**
 * Calculate cockpit weight
 *
 * @param cockpitType - Cockpit type string
 * @returns Cockpit weight in tons
 */
export function getCockpitWeight(cockpitType: string): number {
  const cockpitDef = getCockpitDefinition(cockpitType as CockpitType);
  return cockpitDef?.weight ?? 3;
}

/**
 * Calculate heat sink weight (excluding the 10 free heat sinks)
 *
 * @param heatSinkCount - Total number of heat sinks
 * @param heatSinkType - Heat sink type string
 * @returns Heat sink weight in tons
 */
export function getHeatSinkWeight(heatSinkCount: number, heatSinkType: string): number {
  const heatSinkDef = getHeatSinkDefinition(heatSinkType as HeatSinkType);
  const heatSinksRequiringWeight = Math.max(0, heatSinkCount - 10);
  const weightPerHeatSink = heatSinkDef?.weight ?? 1.0;
  return heatSinksRequiringWeight * weightPerHeatSink;
}

/**
 * Calculate remaining weight capacity
 *
 * @param maxWeight - Maximum unit weight (tonnage)
 * @param allocatedWeight - Currently allocated weight
 * @returns Remaining weight available (can be negative if over capacity)
 */
export function getRemainingWeight(maxWeight: number, allocatedWeight: number): number {
  return maxWeight - allocatedWeight;
}

/**
 * Check if weight allocation is within limits
 *
 * @param maxWeight - Maximum unit weight (tonnage)
 * @param allocatedWeight - Currently allocated weight
 * @returns True if within limits, false if over capacity
 */
export function isWithinWeightLimit(maxWeight: number, allocatedWeight: number): boolean {
  return allocatedWeight <= maxWeight;
}

/**
 * Calculate weight overflow amount
 *
 * @param maxWeight - Maximum unit weight (tonnage)
 * @param allocatedWeight - Currently allocated weight
 * @returns Amount over capacity (0 if within limits)
 */
export function getWeightOverflow(maxWeight: number, allocatedWeight: number): number {
  return Math.max(0, allocatedWeight - maxWeight);
}
