/**
 * Equipment Validation Hook
 *
 * Focused hook for equipment-related validation data.
 * Provides critical slot allocation by location for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import type { EquipmentValidationData } from '@/utils/validation/mechValidationProjection.types';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { useUnitStore } from '@/stores/useUnitStore';
import { projectMechEquipment } from '@/utils/validation/mechValidationProjection';

export type { EquipmentValidationData } from '@/utils/validation/mechValidationProjection.types';

/**
 * Hook for equipment validation data
 *
 * Dependencies: equipment, configuration (2 total)
 */
export function useEquipmentValidation(): EquipmentValidationData {
  const { isReady } = useEquipmentRegistry();
  const state = useUnitStore((s) => s);
  return useMemo(
    () =>
      projectMechEquipment(state, {
        equipmentRegistryReady: isReady,
        equipmentCatalog: isReady
          ? getEquipmentLookupService().getAllEquipment()
          : [],
      }),
    [state, isReady],
  );
}
