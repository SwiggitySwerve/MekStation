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
import { ISlotsByLocation } from '@/types/validation/UnitValidationInterfaces';
import { buildSlotsByLocation } from '@/utils/validation/slotValidationUtils';

/**
 * Equipment validation data
 */
export interface EquipmentValidationData {
  /** Per-location critical slot usage */
  slotsByLocation: ISlotsByLocation;
}

/**
 * Hook for equipment validation data
 *
 * Dependencies: equipment, configuration (2 total)
 */
export function useEquipmentValidation(): EquipmentValidationData {
  const equipment = useUnitStore((s) => s.equipment);
  const configuration = useUnitStore((s) => s.configuration);

  return useMemo(() => {
    // Build per-location slot data for critical slot validation
    const slotsByLocation = buildSlotsByLocation(equipment, configuration);

    return {
      slotsByLocation,
    };
  }, [equipment, configuration]);
}
