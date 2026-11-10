/**
 * Weight Validation Hook
 *
 * Focused hook for weight-related validation data.
 * Calculates structural weight and equipment weight for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  getMechConstructionSelections,
  projectMechWeight,
} from '@/utils/validation/mechValidationProjection';

/**
 * Weight validation data
 */
export interface WeightValidationData {
  /** Total weight allocated by all components and equipment */
  allocatedWeight: number;
  /** Maximum weight allowed (tonnage) */
  maxWeight: number;
  /** Structural weight (engine, gyro, structure, cockpit, heat sinks, armor) */
  structuralWeight: number;
  /** Equipment weight */
  equipmentWeight: number;
  /** Remaining weight capacity */
  remainingWeight: number;
  /** Whether weight is within limits */
  isValid: boolean;
}

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
    state.tonnage || 20,
    { ...selections, lamType: undefined },
    selections.armorTonnage,
    selections.configuration,
  );
  return useMemo(
    () => projectMechWeight(state, calculations.totalStructuralWeight),
    [state, calculations.totalStructuralWeight],
  );
}
