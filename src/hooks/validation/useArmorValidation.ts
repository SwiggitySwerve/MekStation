/**
 * Armor Validation Hook
 *
 * Focused hook for armor-related validation data.
 * Provides per-location armor allocation for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { getTotalAllocatedArmor } from '@/stores/unitState';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';
import { buildArmorByLocation } from '@/utils/validation/armorValidationUtils';
import { IArmorByLocation } from '@/types/validation/UnitValidationInterfaces';

/**
 * Armor validation data
 */
export interface ArmorValidationData {
  /** Total armor points allocated */
  totalArmorPoints: number;
  /** Maximum armor points allowed */
  maxArmorPoints: number;
  /** Per-location armor allocation */
  armorByLocation: IArmorByLocation;
}

/**
 * Hook for armor validation data
 *
 * Dependencies: tonnage, armorAllocation, configuration (3 total)
 */
export function useArmorValidation(): ArmorValidationData {
  const tonnage = useUnitStore((s) => s.tonnage);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const configuration = useUnitStore((s) => s.configuration);

  return useMemo(() => {
    const effectiveTonnage = tonnage || 20;

    // Calculate total armor points
    const totalArmorPoints = getTotalAllocatedArmor(armorAllocation, configuration);

    // Calculate max armor points
    const maxArmorPoints = getMaxTotalArmor(effectiveTonnage, configuration);

    // Build per-location armor data
    const armorByLocation = buildArmorByLocation(armorAllocation, effectiveTonnage, configuration);

    return {
      totalArmorPoints,
      maxArmorPoints,
      armorByLocation,
    };
  }, [tonnage, armorAllocation, configuration]);
}
