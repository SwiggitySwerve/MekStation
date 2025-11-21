/**
 * Heat Sink Calculations Utility
 * Centralized calculations for all heat sink types and engine integration
 * 
 * Official BattleTech Rules:
 * - Fusion engines 250+ rating provide 10 free heat sinks
 * - Smaller engines provide partial heat sinks (engine rating / 25)
 * - Maximum of 10 internal heat sinks from engine
 * - Double heat sinks provide 2 points of dissipation each
 * - Single heat sinks provide 1 point of dissipation each
 */

import { HeatSinkType, EngineType } from '../types/systemComponents';

export interface HeatSinkSpecification {
  type: HeatSinkType;
  pointsPerSink: number;
  weightPerSink: number;
  criticalSlotsPerSink: number;
  techBase: 'Inner Sphere' | 'Clan' | 'Both';
  costMultiplier: number;
}

// Heat sink specifications for all types
export const HEAT_SINK_SPECIFICATIONS: Record<HeatSinkType, HeatSinkSpecification> = {
  'Single': {
    type: 'Single',
    pointsPerSink: 1,
    weightPerSink: 1.0,
    criticalSlotsPerSink: 1,
    techBase: 'Both',
    costMultiplier: 1.0
  },
  'Double (IS)': {
    type: 'Double (IS)',
    pointsPerSink: 2,
    weightPerSink: 1.0,
    criticalSlotsPerSink: 3,
    techBase: 'Inner Sphere',
    costMultiplier: 1.5
  },
  'Double (Clan)': {
    type: 'Double (Clan)',
    pointsPerSink: 2,
    weightPerSink: 1.0,
    criticalSlotsPerSink: 2,
    techBase: 'Clan',
    costMultiplier: 1.3
  },
  'Compact': {
    type: 'Compact',
    pointsPerSink: 1,
    weightPerSink: 1.5,
    criticalSlotsPerSink: 1,
    techBase: 'Inner Sphere',
    costMultiplier: 2.0
  },
  'Laser': {
    type: 'Laser',
    pointsPerSink: 1,
    weightPerSink: 1.0,
    criticalSlotsPerSink: 1,
    techBase: 'Inner Sphere',
    costMultiplier: 1.2
  }
};

/**
 * Calculate internal heat sinks provided by engine
 * @param engineRating Engine rating
 * @returns Number of internal heat sinks (no artificial minimum)
 */
export function calculateInternalHeatSinks(engineRating: number): number {
  if (engineRating <= 0) return 0;
  
  // Official BattleTech rule: Engine Rating ÷ 25 (rounded down), NO MINIMUM
  return Math.floor(engineRating / 25);
}

/**
 * Calculate internal heat sinks based on engine rating and type
 * This consolidates all the wrapper functions that were duplicated across the codebase
 * @param engineRating Engine rating
 * @param engineType Engine type (optional, defaults to fusion behavior)
 * @returns Number of internal heat sinks
 */
export function calculateInternalHeatSinksForEngine(engineRating: number, engineType?: EngineType | string): number {
  // Non-fusion engines don't provide heat sinks
  if (engineType === 'ICE' || engineType === 'Fuel Cell') {
    return 0;
  }
  
  // Compact engines cannot integrate heat sinks
  if (engineType === 'Compact') {
    return 0;
  }
  
  // All fusion engines follow the same basic rule - only engine rating matters
  // Official BattleTech rule: Engine Rating ÷ 25 (rounded down), NO MINIMUM
  return Math.floor(engineRating / 25);
}

/**
 * Calculate external heat sinks needed
 * @param totalHeatSinks Total heat sinks required
 * @param internalHeatSinks Internal heat sinks from engine
 * @returns Number of external heat sinks needed
 */
export function calculateExternalHeatSinks(totalHeatSinks: number, internalHeatSinks: number): number {
  return Math.max(0, totalHeatSinks - internalHeatSinks);
}

/**
 * Calculate total heat dissipation
 * @param heatSinkCount Total number of heat sinks
 * @param heatSinkType Type of heat sink
 * @returns Total heat dissipation points
 */
export function calculateHeatDissipation(heatSinkCount: number, heatSinkType: HeatSinkType): number {
  const spec = HEAT_SINK_SPECIFICATIONS[heatSinkType];
  return heatSinkCount * spec.pointsPerSink;
}

/**
 * Calculate heat sink weight
 * @param externalHeatSinks Number of external heat sinks
 * @param heatSinkType Type of heat sink
 * @returns Total weight in tons
 */
export function calculateHeatSinkWeight(externalHeatSinks: number, heatSinkType: HeatSinkType): number {
  const spec = HEAT_SINK_SPECIFICATIONS[heatSinkType];
  return externalHeatSinks * spec.weightPerSink;
}

/**
 * Calculate critical slots used by heat sinks
 * @param externalHeatSinks Number of external heat sinks
 * @param heatSinkType Type of heat sink
 * @returns Total critical slots used
 */
export function calculateHeatSinkCriticalSlots(externalHeatSinks: number, heatSinkType: HeatSinkType): number {
  const spec = HEAT_SINK_SPECIFICATIONS[heatSinkType];
  return externalHeatSinks * spec.criticalSlotsPerSink;
}

/**
 * Get heat sink specification
 * @param heatSinkType Type of heat sink
 * @returns Heat sink specification
 */
export function getHeatSinkSpecification(heatSinkType: HeatSinkType): HeatSinkSpecification {
  return HEAT_SINK_SPECIFICATIONS[heatSinkType];
}

/**
 * Calculate minimum heat sinks required for a unit
 * @param engineRating Engine rating
 * @param heatGeneration Total heat generation
 * @returns Minimum heat sinks needed
 */
export function calculateMinimumHeatSinks(engineRating: number, heatGeneration: number): number {
  const internalHeatSinks = calculateInternalHeatSinks(engineRating);
  const minimumTotal = Math.max(10, heatGeneration); // At least 10 TOTAL heat sinks for the mech
  return Math.max(minimumTotal, internalHeatSinks);
}

/**
 * Validate heat sink configuration
 * @param totalHeatSinks Total heat sinks
 * @param internalHeatSinks Internal heat sinks
 * @param heatGeneration Heat generation
 * @returns Validation result
 */
export function validateHeatSinkConfiguration(
  totalHeatSinks: number, 
  internalHeatSinks: number, 
  heatGeneration: number
): {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check minimum heat sinks
  if (totalHeatSinks < 10) {
    issues.push('Unit must have at least 10 heat sinks');
  }
  
  // Check heat dissipation
  if (totalHeatSinks < heatGeneration) {
    issues.push(`Heat sinks (${totalHeatSinks}) insufficient for heat generation (${heatGeneration})`);
    recommendations.push(`Add ${heatGeneration - totalHeatSinks} more heat sinks`);
  }
  
  // Check internal vs external consistency
  const expectedInternal = calculateInternalHeatSinks(internalHeatSinks * 25); // Rough estimate
  if (Math.abs(internalHeatSinks - expectedInternal) > 1) {
    recommendations.push(`Internal heat sinks should be approximately ${expectedInternal} for this engine`);
  }
  
  const externalHeatSinks = calculateExternalHeatSinks(totalHeatSinks, internalHeatSinks);
  if (externalHeatSinks < 0) {
    issues.push('External heat sinks cannot be negative');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Calculate heat efficiency percentage
 * @param heatDissipation Total heat dissipation
 * @param heatGeneration Total heat generation
 * @returns Efficiency percentage (0-100)
 */
export function calculateHeatEfficiency(heatDissipation: number, heatGeneration: number): number {
  if (heatGeneration === 0) return 100;
  return Math.min(100, (heatDissipation / heatGeneration) * 100);
}

/**
 * Get heat sink recommendations
 * @param heatGeneration Heat generation
 * @param currentHeatSinks Current heat sinks
 * @param heatSinkType Current heat sink type
 * @returns Array of recommendations
 */
export function getHeatSinkRecommendations(
  heatGeneration: number, 
  currentHeatSinks: number, 
  heatSinkType: HeatSinkType
): string[] {
  const recommendations: string[] = [];
  
  if (currentHeatSinks < heatGeneration) {
    recommendations.push(`Add ${heatGeneration - currentHeatSinks} more heat sinks to avoid overheating`);
  }
  
  if (heatGeneration > 20 && heatSinkType === 'Single') {
    recommendations.push('Consider upgrading to Double Heat Sinks for better efficiency');
  }
  
  if (currentHeatSinks > heatGeneration * 1.5) {
    recommendations.push('Heat sink capacity significantly exceeds needs - consider removing excess');
  }
  
  return recommendations;
}
