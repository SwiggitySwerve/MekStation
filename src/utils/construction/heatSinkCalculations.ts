/**
 * Heat Sink Calculations
 * 
 * Functions for calculating heat sink requirements and placement.
 * 
 * @spec openspec/specs/heat-sink-system/spec.md
 */

import { HeatSinkType, getHeatSinkDefinition } from '../../types/construction/HeatSinkType';
import { calculateIntegralHeatSinks } from './engineCalculations';
import { EngineType } from '../../types/construction/EngineType';

/**
 * Minimum heat sinks required for a mech
 */
export const MINIMUM_HEAT_SINKS = 10;

/**
 * Calculate total heat dissipation capacity
 * 
 * @param heatSinkType - Type of heat sinks
 * @param totalCount - Total number of heat sinks
 * @returns Total heat dissipation
 */
export function calculateHeatDissipation(heatSinkType: HeatSinkType, totalCount: number): number {
  const definition = getHeatSinkDefinition(heatSinkType);
  if (!definition) {
    return totalCount;
  }
  return totalCount * definition.dissipation;
}

/**
 * Calculate number of external (non-integrated) heat sinks needed
 * 
 * @param totalNeeded - Total heat sinks desired
 * @param engineRating - Engine rating
 * @param engineType - Engine type
 * @returns Number of external heat sinks
 */
export function calculateExternalHeatSinks(
  totalNeeded: number,
  engineRating: number,
  engineType: EngineType
): number {
  const integrated = calculateIntegralHeatSinks(engineRating, engineType);
  return Math.max(0, totalNeeded - integrated);
}

/**
 * Calculate weight of heat sinks requiring weight
 * 
 * Per BattleTech rules, the first 10 heat sinks are WEIGHT-FREE.
 * Only heat sinks beyond the first 10 add weight.
 * 
 * NOTE: This is different from "external" heat sinks (which refers to slots).
 * - External = heat sinks not integrated in engine (require slots)
 * - Weight-requiring = heat sinks beyond first 10 (add weight)
 * 
 * @param totalHeatSinks - Total number of heat sinks on the mech
 * @param heatSinkType - Type of heat sinks
 * @returns Weight in tons
 */
export function calculateHeatSinkWeight(totalHeatSinks: number, heatSinkType: HeatSinkType): number {
  const definition = getHeatSinkDefinition(heatSinkType);
  const weightPerSink = definition?.weight ?? 1.0;
  // First 10 heat sinks are weight-free
  const heatSinksRequiringWeight = Math.max(0, totalHeatSinks - 10);
  return heatSinksRequiringWeight * weightPerSink;
}

/**
 * @deprecated Use calculateHeatSinkWeight instead. This function incorrectly
 * calculates weight based on external count instead of total - 10.
 * 
 * Calculate weight of external heat sinks (LEGACY - INCORRECT)
 */
export function calculateExternalHeatSinkWeight(externalCount: number, heatSinkType: HeatSinkType): number {
  const definition = getHeatSinkDefinition(heatSinkType);
  if (!definition) {
    return externalCount;
  }
  return externalCount * definition.weight;
}

/**
 * Calculate critical slots needed for external heat sinks
 * 
 * @param externalCount - Number of external heat sinks
 * @param heatSinkType - Type of heat sinks
 * @returns Total critical slots needed
 */
export function calculateExternalHeatSinkSlots(externalCount: number, heatSinkType: HeatSinkType): number {
  const definition = getHeatSinkDefinition(heatSinkType);
  if (!definition) {
    return externalCount;
  }
  return externalCount * definition.criticalSlots;
}

/**
 * Validate heat sink configuration
 * 
 * @param totalHeatSinks - Total number of heat sinks
 * @param heatSinkType - Type of heat sinks
 * @param engineRating - Engine rating
 * @param engineType - Engine type
 * @returns Validation result
 */
export function validateHeatSinks(
  totalHeatSinks: number,
  heatSinkType: HeatSinkType,
  engineRating: number,
  engineType: EngineType
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Minimum heat sink requirement
  if (totalHeatSinks < MINIMUM_HEAT_SINKS) {
    errors.push(`Minimum ${MINIMUM_HEAT_SINKS} heat sinks required (have ${totalHeatSinks})`);
  }

  // Check heat sink type definition exists
  const definition = getHeatSinkDefinition(heatSinkType);
  if (!definition) {
    errors.push(`Unknown heat sink type: ${heatSinkType}`);
  }

  // Check integral capacity
  const integrated = calculateIntegralHeatSinks(engineRating, engineType);
  if (totalHeatSinks > integrated) {
    const external = totalHeatSinks - integrated;
    if (external > 20) {
      warnings.push(`Large number of external heat sinks (${external}) may be inefficient`);
    }
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Get heat sink configuration summary
 * 
 * @param totalHeatSinks - Total number of heat sinks
 * @param heatSinkType - Type of heat sinks
 * @param engineRating - Engine rating
 * @param engineType - Engine type
 * @returns Configuration summary
 */
export function getHeatSinkSummary(
  totalHeatSinks: number,
  heatSinkType: HeatSinkType,
  engineRating: number,
  engineType: EngineType
): {
  integrated: number;
  external: number;
  weight: number;
  slots: number;
  dissipation: number;
  weightFree: number;
} {
  const integrated = calculateIntegralHeatSinks(engineRating, engineType);
  const external = calculateExternalHeatSinks(totalHeatSinks, engineRating, engineType);
  // Use correct weight formula: first 10 heat sinks are weight-free
  const weight = calculateHeatSinkWeight(totalHeatSinks, heatSinkType);
  const slots = calculateExternalHeatSinkSlots(external, heatSinkType);
  const dissipation = calculateHeatDissipation(heatSinkType, totalHeatSinks);
  // First 10 heat sinks are weight-free
  const weightFree = Math.min(totalHeatSinks, 10);

  return { integrated, external, weight, slots, dissipation, weightFree };
}

