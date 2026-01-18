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
  const engineType = useUnitStore((s) => s.engineType);
  const gyroType = useUnitStore((s) => s.gyroType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);

  return useMemo(
    () => ({
      engineType,
      gyroType,
      cockpitType,
      internalStructureType,
      heatSinkCount,
      heatSinkType,
    }),
    [engineType, gyroType, cockpitType, internalStructureType, heatSinkCount, heatSinkType]
  );
}
