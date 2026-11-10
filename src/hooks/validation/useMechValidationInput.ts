/** Thin store adapter over the React-free validation projection. */
import { useMemo } from 'react';

import type { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';

import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { useUnitStore } from '@/stores/useUnitStore';
import { projectMechValidation } from '@/utils/validation/mechValidationProjection';

import { useWeightValidation } from './useWeightValidation';

export function useMechValidationInput(): IValidatableUnit {
  const state = useUnitStore((s) => s);
  const { isReady } = useEquipmentRegistry();
  const { structuralWeight } = useWeightValidation();
  return useMemo(
    () =>
      projectMechValidation(state, {
        totalStructuralWeight: structuralWeight,
        equipmentRegistryReady: isReady,
        equipmentCatalog: isReady
          ? getEquipmentLookupService().getAllEquipment()
          : [],
      }),
    [state, structuralWeight, isReady],
  );
}
