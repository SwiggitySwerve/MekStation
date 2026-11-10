/**
 * Structure Validation Hook
 *
 * Focused hook for structure-related validation data.
 * Provides component type information for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import type { StructureValidationData } from '@/utils/validation/mechValidationProjection.types';

import { useUnitStore } from '@/stores/useUnitStore';
import {
  getMechConstructionSelections,
  projectMechStructure,
} from '@/utils/validation/mechValidationProjection';

export type { StructureValidationData } from '@/utils/validation/mechValidationProjection.types';

/**
 * Hook for structure validation data
 *
 * Dependencies: engineType, gyroType, cockpitType, internalStructureType,
 * heatSinkCount, heatSinkType (6 total)
 */
export function useStructureValidation(): StructureValidationData {
  const state = useUnitStore((s) => s);
  return useMemo(
    () => projectMechStructure(getMechConstructionSelections(state)),
    [state],
  );
}
