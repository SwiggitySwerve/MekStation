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
import { IArmorByLocation } from '@/types/validation/UnitValidationInterfaces';
import { projectMechArmor } from '@/utils/validation/mechValidationProjection';

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
  const state = useUnitStore((s) => s);
  return useMemo(() => projectMechArmor(state), [state]);
}
