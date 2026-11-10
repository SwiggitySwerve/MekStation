/**
 * Armor Validation Hook
 *
 * Focused hook for armor-related validation data.
 * Provides per-location armor allocation for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import type { ArmorValidationData } from '@/utils/validation/mechValidationProjection.types';

import { useUnitStore } from '@/stores/useUnitStore';
import { projectMechArmor } from '@/utils/validation/mechValidationProjection';

export type { ArmorValidationData } from '@/utils/validation/mechValidationProjection.types';

/**
 * Hook for armor validation data
 *
 * Dependencies: tonnage, armorAllocation, configuration (3 total)
 */
export function useArmorValidation(): ArmorValidationData {
  const state = useUnitStore((s) => s);
  return useMemo(() => projectMechArmor(state), [state]);
}
