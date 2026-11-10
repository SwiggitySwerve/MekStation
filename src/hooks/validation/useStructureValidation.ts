/**
 * Structure Validation Hook
 *
 * Focused hook for structure-related validation data.
 * Provides component type information for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import { useUnitStore } from '@/stores/useUnitStore';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import {
  getMechConstructionSelections,
  projectMechStructure,
} from '@/utils/validation/mechValidationProjection';

/**
 * Structure validation data
 */
export interface StructureValidationData {
  /** Engine type */
  engineType: string;
  /** Gyro type */
  gyroType: string;
  /** Cockpit type */
  cockpitType: string;
  /** Internal structure type */
  internalStructureType: string;
  armorType?: string;
  techBaseMode?: TechBaseMode;
  /** Heat sink count */
  heatSinkCount: number;
  /** Heat sink type */
  heatSinkType: string;
}

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
