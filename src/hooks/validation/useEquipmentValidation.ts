/**
 * Equipment Validation Hook
 *
 * Focused hook for equipment-related validation data.
 * Provides critical slot allocation by location for validation.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo } from 'react';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { useUnitStore } from '@/stores/useUnitStore';
import {
  ICriticalSlotIssue,
  ISlotsByLocation,
  IValidatableUnit,
} from '@/types/validation/UnitValidationInterfaces';
import { projectMechEquipment } from '@/utils/validation/mechValidationProjection';

/**
 * Equipment validation data
 */
export interface EquipmentValidationData {
  /** Per-location critical slot usage */
  slotsByLocation: ISlotsByLocation;
  equipmentSlotIssues: readonly ICriticalSlotIssue[];
  mountedEquipment: IValidatableUnit['mountedEquipment'];
  equipmentCatalog: IValidatableUnit['equipmentCatalog'];
}

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
