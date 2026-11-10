/**
 * Weight Validation Hook
 *
 * Focused hook for weight-related validation data.
 * Calculates structural weight and equipment weight for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import type { WeightValidationData } from '@/utils/validation/mechValidationProjection.types';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  getMechConstructionSelections,
  getMechValidationTonnage,
  projectMechWeight,
} from '@/utils/validation/mechValidationProjection';

export type { WeightValidationData } from '@/utils/validation/mechValidationProjection.types';

/**
 * Hook for weight validation data
 *
 * Dependencies: tonnage, engineType, engineRating, gyroType, internalStructureType,
 * cockpitType, heatSinkType, heatSinkCount, armorTonnage, equipment (9 total)
 */
export function useWeightValidation(): WeightValidationData {
  const state = useUnitStore((s) => s);
  const selections = useMemo(
    () => getMechConstructionSelections(state),
    [state],
  );
  const calculations = useUnitCalculations(
    getMechValidationTonnage(state.tonnage),
    selections,
    selections.armorTonnage,
    selections.configuration,
  );
  return useMemo(
    () => projectMechWeight(state, calculations.totalStructuralWeight),
    [state, calculations.totalStructuralWeight],
  );
}
