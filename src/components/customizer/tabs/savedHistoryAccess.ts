import type { TabInfo } from '@/stores/useTabManagerStore';

import { getUnitStore } from '@/stores/unitStoreRegistry';
import { isEditableAerospace } from '@/types/unit/AerospaceSerialization';
import { isEditableSmallUnit } from '@/types/unit/SmallUnitSerialization';
import { isVehicleUnitShape } from '@/types/unit/VehicleInterfaces';

import { isLibrarySaveSupported } from './MultiUnitTabsUnitState';

export function getSavedHistoryDisabledReason(
  tab: Pick<TabInfo, 'id' | 'unitType'> | null | undefined,
): string | null {
  if (!tab) return 'Select a unit before viewing saved history.';
  if (
    !isLibrarySaveSupported(tab.unitType) ||
    (tab.unitType !== undefined &&
      (isVehicleUnitShape({ unitType: tab.unitType }) ||
        isEditableAerospace({ unitType: tab.unitType }) ||
        isEditableSmallUnit({ unitType: tab.unitType })))
  ) {
    return `Saved history is not available for ${tab.unitType} units yet.`;
  }
  const librarySave = getUnitStore(tab.id)?.getState().librarySave;
  if (
    !librarySave ||
    librarySave.id.length === 0 ||
    typeof librarySave.version !== 'number'
  ) {
    return 'Save this unit to the library before viewing history.';
  }
  return null;
}
