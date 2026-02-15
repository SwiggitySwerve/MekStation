import type { TabInfo } from '@/stores/useTabManagerStore';

import { getAerospaceStore } from '@/stores/aerospaceStoreRegistry';
import { getBattleArmorStore } from '@/stores/battleArmorStoreRegistry';
import { getInfantryStore } from '@/stores/infantryStoreRegistry';
import { getProtoMechStore } from '@/stores/protoMechStoreRegistry';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { getVehicleStore } from '@/stores/vehicleStoreRegistry';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

interface UnitStoreStateLike {
  name?: string;
  isModified?: boolean;
}

function getUnitStoreState(
  tabId: string,
  unitType?: UnitType,
): UnitStoreStateLike | undefined {
  if (unitType === UnitType.VEHICLE || unitType === UnitType.VTOL) {
    return getVehicleStore(tabId)?.getState();
  }

  if (
    unitType === UnitType.AEROSPACE ||
    unitType === UnitType.CONVENTIONAL_FIGHTER
  ) {
    return getAerospaceStore(tabId)?.getState();
  }

  if (unitType === UnitType.BATTLE_ARMOR) {
    return getBattleArmorStore(tabId)?.getState();
  }

  if (unitType === UnitType.INFANTRY) {
    return getInfantryStore(tabId)?.getState();
  }

  if (unitType === UnitType.PROTOMECH) {
    return getProtoMechStore(tabId)?.getState();
  }

  return getUnitStore(tabId)?.getState();
}

export function isTabModified(tabId: string, unitType?: UnitType): boolean {
  return getUnitStoreState(tabId, unitType)?.isModified ?? false;
}

export function getTabDisplayState(tab: TabInfo): {
  id: string;
  name: string;
  isModified: boolean;
} {
  const runtimeState = getUnitStoreState(tab.id, tab.unitType);
  return {
    id: tab.id,
    name: runtimeState?.name ?? tab.name,
    isModified: runtimeState?.isModified ?? false,
  };
}
