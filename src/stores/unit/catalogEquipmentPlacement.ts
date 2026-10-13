import type { UnitState } from '@/stores/unitState';
import type { IEquipmentItem } from '@/types/equipment/EquipmentItem';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';

import { MechLocation } from '@/types/construction';
import { getLocationsForConfig } from '@/types/construction/MechConfigurationSystem';
import {
  getPlacementRule,
  getSplitEquipmentRule,
} from '@/types/equipment/EquipmentPlacement';
import {
  getEquipmentPlacementOption,
  type IEquipmentPlacementOption,
} from '@/utils/construction/slotOperations/placementOptions';
import { getAvailableSlotIndices } from '@/utils/construction/slotOperations/queries';

import {
  createCalculatedEquipment,
  recalculateTargetingComputers,
} from './unitEquipmentAddition';

export type CatalogPlacementState = Pick<
  UnitState,
  | 'equipment'
  | 'tonnage'
  | 'engineType'
  | 'gyroType'
  | 'configuration'
  | 'isOmni'
  | 'armActuators'
>;

export interface ICatalogEquipmentPlacement {
  readonly equipment?: IMountedEquipmentInstance;
  readonly locations: readonly IEquipmentPlacementOption[];
  readonly weightChange: number;
  readonly error?: string;
}

export type AddEquipmentAtLocationResult =
  | { readonly success: true; readonly instanceId: string }
  | { readonly success: false; readonly error: string };

export function previewCatalogEquipmentPlacement(
  item: IEquipmentItem,
  state: CatalogPlacementState,
  readOnly = false,
): ICatalogEquipmentPlacement {
  if (readOnly)
    return { locations: [], weightChange: 0, error: 'This unit is read-only.' };
  let equipment: IMountedEquipmentInstance;
  try {
    equipment = createCalculatedEquipment(
      item,
      'catalog-placement-preview',
      state,
    );
  } catch {
    return {
      locations: [],
      weightChange: 0,
      error: 'Weight and critical slots could not be calculated for this unit.',
    };
  }
  const nextEquipment = recalculateTargetingComputers([
    ...state.equipment,
    equipment,
  ]);
  const weightChange =
    nextEquipment.reduce((sum, mounted) => sum + mounted.weight, 0) -
    state.equipment.reduce((sum, mounted) => sum + mounted.weight, 0);
  if (getSplitEquipmentRule(item.id) || getPlacementRule(item.id)?.canSplit) {
    return {
      equipment,
      locations: [],
      weightChange,
      error:
        'This equipment uses split allocation. Add it unassigned, then allocate it in Critical Slots.',
    };
  }
  const locations = getLocationsForConfig(state.configuration).map(
    (location: MechLocation) =>
      getEquipmentPlacementOption(
        equipment,
        location,
        getAvailableSlotIndices(
          location,
          state.engineType,
          state.gyroType,
          state.equipment,
          state.armActuators,
        ),
        state.isOmni,
        readOnly,
      ),
  );
  return { equipment, locations, weightChange };
}
