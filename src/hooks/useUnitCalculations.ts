/**
 * Unit Calculations Hook
 * 
 * Computes weights, critical slots, and other derived values
 * based on component selections.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/component-configuration/spec.md
 */

import { useMemo } from 'react';
import { IComponentSelections } from '@/stores/useMultiUnitStore';
import { calculateEngineWeight, calculateIntegralHeatSinks } from '@/utils/construction/engineCalculations';
import { calculateGyroWeight, getGyroCriticalSlots } from '@/utils/construction/gyroCalculations';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { getHeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { getEngineDefinition } from '@/types/construction/EngineType';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

// =============================================================================
// Types
// =============================================================================

export interface UnitCalculations {
  // Weights
  engineWeight: number;
  gyroWeight: number;
  structureWeight: number;
  cockpitWeight: number;
  heatSinkWeight: number;
  totalStructuralWeight: number;
  
  // Critical Slots
  engineSlots: number;
  gyroSlots: number;
  structureSlots: number;
  cockpitSlots: number;
  heatSinkSlots: number;
  totalSystemSlots: number;
  
  // Heat
  integralHeatSinks: number;
  externalHeatSinks: number;
  totalHeatDissipation: number;
  
  // Movement
  walkMP: number;
  runMP: number;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for calculating unit weights and critical slots
 * 
 * @param tonnage - Unit tonnage
 * @param selections - Current component selections
 */
export function useUnitCalculations(
  tonnage: number,
  selections: IComponentSelections
): UnitCalculations {
  return useMemo(() => {
    // Get component definitions
    const engineDef = getEngineDefinition(selections.engineType);
    const structureDef = getInternalStructureDefinition(selections.internalStructureType);
    const cockpitDef = getCockpitDefinition(selections.cockpitType);
    const heatSinkDef = getHeatSinkDefinition(selections.heatSinkType);
    
    // =========================================================================
    // Weight Calculations
    // =========================================================================
    
    // Engine weight
    const engineWeight = calculateEngineWeight(selections.engineRating, selections.engineType);
    
    // Gyro weight (depends on engine rating)
    const gyroWeight = calculateGyroWeight(selections.engineRating, selections.gyroType);
    
    // Structure weight
    const structureWeight = structureDef 
      ? ceilToHalfTon(tonnage * structureDef.weightMultiplier)
      : ceilToHalfTon(tonnage * 0.10);
    
    // Cockpit weight
    const cockpitWeight = cockpitDef?.weight ?? 3;
    
    // Heat sink calculations
    const integralHeatSinks = calculateIntegralHeatSinks(selections.engineRating, selections.engineType);
    const externalHeatSinks = Math.max(0, selections.heatSinkCount - integralHeatSinks);
    const heatSinkWeight = heatSinkDef 
      ? externalHeatSinks * heatSinkDef.weight
      : externalHeatSinks * 1.0;
    
    // Total structural weight
    const totalStructuralWeight = engineWeight + gyroWeight + structureWeight + cockpitWeight + heatSinkWeight;
    
    // =========================================================================
    // Critical Slot Calculations
    // =========================================================================
    
    // Engine slots (CT + side torsos)
    const ctSlots = engineDef?.ctSlots ?? 6;
    const sideSlots = (engineDef?.sideTorsoSlots ?? 0) * 2;
    const engineSlots = ctSlots + sideSlots;
    
    // Gyro slots
    const gyroSlots = getGyroCriticalSlots(selections.gyroType);
    
    // Structure slots (Endo Steel requires slots)
    const structureSlots = structureDef?.criticalSlots ?? 0;
    
    // Cockpit slots
    const cockpitSlots = cockpitDef 
      ? cockpitDef.headSlots + cockpitDef.otherSlots
      : 5;
    
    // Heat sink slots (only external heat sinks need slots)
    const heatSinkSlots = heatSinkDef 
      ? externalHeatSinks * heatSinkDef.criticalSlots
      : externalHeatSinks;
    
    // Total system slots (not including actuators, which are fixed at ~16)
    const actuatorSlots = 16; // 4 per arm, 4 per leg (hip, upper, lower, foot/hand)
    const totalSystemSlots = engineSlots + gyroSlots + structureSlots + cockpitSlots + heatSinkSlots + actuatorSlots;
    
    // =========================================================================
    // Heat Calculations
    // =========================================================================
    
    const dissipationPerSink = heatSinkDef?.dissipation ?? 1;
    const totalHeatDissipation = selections.heatSinkCount * dissipationPerSink;
    
    // =========================================================================
    // Movement Calculations
    // =========================================================================
    
    const walkMP = Math.floor(selections.engineRating / tonnage);
    const runMP = Math.ceil(walkMP * 1.5);
    
    return {
      // Weights
      engineWeight,
      gyroWeight,
      structureWeight,
      cockpitWeight,
      heatSinkWeight,
      totalStructuralWeight,
      
      // Critical Slots
      engineSlots,
      gyroSlots,
      structureSlots,
      cockpitSlots,
      heatSinkSlots,
      totalSystemSlots,
      
      // Heat
      integralHeatSinks,
      externalHeatSinks,
      totalHeatDissipation,
      
      // Movement
      walkMP,
      runMP,
    };
  }, [tonnage, selections]);
}

