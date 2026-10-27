import { useMemo } from 'react';

import { IComponentSelections } from '@/stores/useMultiUnitStore';
/**
 * Unit Calculations Hook
 *
 * Computes weights, critical slots, and other derived values
 * based on component selections.
 *
 * @spec openspec/specs/component-configuration/spec.md
 */
import { MechLocation } from '@/types/construction';
import { getCockpitDefinition } from '@/types/construction/CockpitType';
import { getEngineDefinition } from '@/types/construction/EngineType';
import { getInternalStructureDefinition } from '@/types/construction/InternalStructureType';
import {
  MechConfiguration,
  getLocationsForConfig,
  isLegLocation,
} from '@/types/construction/MechConfigurationSystem';
import { getArmorCriticalSlots } from '@/utils/construction/armorCalculations';
import { calculateEngineWeight } from '@/utils/construction/engineCalculations';
import {
  calculateGyroWeight,
  getGyroCriticalSlots,
} from '@/utils/construction/gyroCalculations';
import { getHeatSinkSummary } from '@/utils/construction/heatSinkCalculations';
import {
  JumpJetType,
  calculateJumpJetWeight,
  calculateJumpJetSlots,
} from '@/utils/construction/movementCalculations';
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
  armorWeight: number;
  jumpJetWeight: number;
  totalStructuralWeight: number;

  // Critical Slots
  engineSlots: number;
  gyroSlots: number;
  structureSlots: number;
  cockpitSlots: number;
  heatSinkSlots: number;
  armorSlots: number;
  jumpJetSlots: number;
  totalSystemSlots: number;

  // Heat
  integralHeatSinks: number;
  externalHeatSinks: number;
  freeHeatSinks: number;
  heatSinksRequiringWeight: number;
  totalHeatDissipation: number;

  // Movement
  walkMP: number;
  runMP: number;
  jumpMP: number;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for calculating unit weights and critical slots
 *
 * @param tonnage - Unit tonnage
 * @param selections - Current component selections
 * @param armorTonnage - Armor tonnage set by user (weight is based on this, not allocated points)
 */
export function useUnitCalculations(
  tonnage: number,
  selections: IComponentSelections,
  armorTonnage: number = 0,
  configuration: MechConfiguration = MechConfiguration.BIPED,
): UnitCalculations {
  return useMemo(() => {
    // Get component definitions
    const engineDef = getEngineDefinition(selections.engineType);
    const structureDef = getInternalStructureDefinition(
      selections.internalStructureType,
    );
    const cockpitDef = getCockpitDefinition(selections.cockpitType);

    // =========================================================================
    // Weight Calculations
    // =========================================================================

    // Engine weight
    const engineWeight = calculateEngineWeight(
      selections.engineRating,
      selections.engineType,
    );

    // Gyro weight (depends on engine rating)
    const gyroWeight = calculateGyroWeight(
      selections.engineRating,
      selections.gyroType,
    );

    // Structure weight
    const structureWeight = structureDef
      ? ceilToHalfTon(tonnage * structureDef.weightMultiplier)
      : ceilToHalfTon(tonnage * 0.1);

    // Cockpit weight
    const cockpitWeight = cockpitDef?.weight ?? 3;

    // Heat sink calculations
    // Engine-integrated heat sinks don't require critical slots
    const heatSinkSummary = getHeatSinkSummary(
      selections.heatSinkCount,
      selections.heatSinkType,
      selections.engineRating,
      selections.engineType,
    );
    const integralHeatSinks = heatSinkSummary.integrated;
    const externalHeatSinks = heatSinkSummary.external;
    const freeHeatSinks = heatSinkSummary.weightFree;

    // First 10 heat sinks are WEIGHT-FREE per BattleTech rules
    // Weight only applies to heat sinks beyond the free 10
    const heatSinksRequiringWeight = selections.heatSinkCount - freeHeatSinks;
    const heatSinkWeight = heatSinkSummary.weight;

    // Armor weight - use armorTonnage directly (not calculated from allocated points)
    // The user sets armor tonnage in the Armor tab, and weight should reflect that setting
    const armorWeight = armorTonnage;

    // Jump jet calculations
    const jumpMP = selections.jumpMP ?? 0;
    const jumpJetType = selections.jumpJetType ?? JumpJetType.STANDARD;
    const jumpJetWeight = calculateJumpJetWeight(tonnage, jumpMP, jumpJetType);
    const jumpJetSlots = calculateJumpJetSlots(jumpMP, jumpJetType);

    // Total structural weight (includes armor and jump jets)
    const totalStructuralWeight =
      engineWeight +
      gyroWeight +
      structureWeight +
      cockpitWeight +
      heatSinkWeight +
      armorWeight +
      jumpJetWeight;

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
    // Note: heatSinkSlots is tracked for reference but NOT included in totalSystemSlots
    // because heat sinks are now in the equipment array (like Jump Jets, Endo Steel, Ferro-Fibrous)
    const heatSinkSlots = heatSinkSummary.slots;

    // Armor slots (Ferro-Fibrous requires slots)
    const armorSlots = getArmorCriticalSlots(selections.armorType);

    // Total system slots
    // Note: structureSlots, armorSlots, jumpJetSlots, and heatSinkSlots are NOT included here
    // because they are tracked in the equipment array and counted in equipmentCalcs.totalSlots.
    // Only include fixed system components not in equipment array:
    // - Engine (CT + side torso)
    // - Gyro
    // - Cockpit (life support, sensors, cockpit itself)
    // Four actuator slots per actual limb, including a tripod center leg.
    const actuatorSlots =
      getLocationsForConfig(configuration).filter(
        (location) =>
          isLegLocation(location) ||
          location === MechLocation.LEFT_ARM ||
          location === MechLocation.RIGHT_ARM,
      ).length * 4;
    const totalSystemSlots =
      engineSlots + gyroSlots + cockpitSlots + actuatorSlots;

    // =========================================================================
    // Heat Calculations
    // =========================================================================

    const totalHeatDissipation = heatSinkSummary.dissipation;

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
      armorWeight,
      jumpJetWeight,
      totalStructuralWeight,

      // Critical Slots
      engineSlots,
      gyroSlots,
      structureSlots,
      cockpitSlots,
      heatSinkSlots,
      armorSlots,
      jumpJetSlots,
      totalSystemSlots,

      // Heat
      integralHeatSinks,
      externalHeatSinks,
      freeHeatSinks,
      heatSinksRequiringWeight,
      totalHeatDissipation,

      // Movement
      walkMP,
      runMP,
      jumpMP,
    };
  }, [tonnage, selections, armorTonnage, configuration]);
}
