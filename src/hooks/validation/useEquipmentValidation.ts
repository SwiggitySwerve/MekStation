/**
 * Equipment Validation Hook
 *
 * Focused hook for equipment-related validation data.
 * Provides critical slot allocation by location for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import { useUnitStore } from '@/stores/useUnitStore';
import {
  ICriticalSlotIssue,
  ISlotsByLocation,
} from '@/types/validation/UnitValidationInterfaces';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { buildSlotsByLocation } from '@/utils/validation/slotValidationUtils';

/**
 * Equipment validation data
 */
export interface EquipmentValidationData {
  /** Per-location critical slot usage */
  slotsByLocation: ISlotsByLocation;
  equipmentSlotIssues: readonly ICriticalSlotIssue[];
}

/**
 * Hook for equipment validation data
 *
 * Dependencies: equipment, configuration (2 total)
 */
export function useEquipmentValidation(): EquipmentValidationData {
  const equipment = useUnitStore((s) => s.equipment);
  const engineType = useUnitStore((s) => s.engineType);
  const gyroType = useUnitStore((s) => s.gyroType);
  const configuration = useUnitStore((s) => s.configuration);
  const armActuators = useUnitStore((s) => s.armActuators);

  return useMemo(() => {
    // Build per-location slot data for critical slot validation
    const slotsByLocation = buildSlotsByLocation(equipment, configuration);

    return {
      slotsByLocation,
      equipmentSlotIssues: getEquipmentSlotIssues(
        equipment,
        configuration,
        engineType,
        gyroType,
        armActuators,
      ),
    };
  }, [equipment, configuration, engineType, gyroType, armActuators]);
}
