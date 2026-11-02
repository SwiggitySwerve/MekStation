import type { AerospaceStore } from '@/stores/aerospaceState';
import type { BattleArmorStore } from '@/stores/battleArmorState';
import type { InfantryStore } from '@/stores/infantryState';
import type { ProtoMechStore } from '@/stores/protoMechState';
import type { UnitStore } from '@/stores/unitState';
import type { TabInfo } from '@/stores/useTabManagerStore';
import type { VehicleStore } from '@/stores/vehicleState';

import { getAerospaceStore } from '@/stores/aerospaceStoreRegistry';
import { getBattleArmorStore } from '@/stores/battleArmorStoreRegistry';
import { getInfantryStore } from '@/stores/infantryStoreRegistry';
import { getProtoMechStore } from '@/stores/protoMechStoreRegistry';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { getVehicleStore } from '@/stores/vehicleStoreRegistry';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { isEditableAerospace } from '@/types/unit/AerospaceSerialization';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { isEditableSmallUnit } from '@/types/unit/SmallUnitSerialization';
import { isVehicleUnitShape } from '@/types/unit/VehicleInterfaces';

import type { TabDisplayInfo } from './tabTypes';

interface UnitStoreStateLike {
  name?: string;
  isModified?: boolean;
  techBaseMode?: TechBaseMode;
  techBase?: TechBase;
  librarySave?: { id: string; version: number };
}

export function isLibrarySaveSupported(unitType?: UnitType): boolean {
  return (
    unitType === undefined ||
    unitType === UnitType.BATTLEMECH ||
    unitType === UnitType.OMNIMECH ||
    unitType === UnitType.INDUSTRIALMECH ||
    isVehicleUnitShape({ unitType }) ||
    isEditableAerospace({ unitType }) ||
    isEditableSmallUnit({ unitType })
  );
}

export function getLibrarySaveDisabledReason(
  tab: Pick<TabInfo, 'unitType'> | null | undefined,
): string | null {
  if (!tab) return 'Select a unit before saving it to the library.';
  if (isLibrarySaveSupported(tab.unitType)) return null;

  return `Library save is not available for ${tab.unitType} units yet. Your browser draft remains open.`;
}

function isAerospaceType(unitType: UnitType): boolean {
  return (
    unitType === UnitType.AEROSPACE ||
    unitType === UnitType.CONVENTIONAL_FIGHTER ||
    unitType === UnitType.SMALL_CRAFT ||
    unitType === UnitType.DROPSHIP ||
    unitType === UnitType.JUMPSHIP ||
    unitType === UnitType.WARSHIP ||
    unitType === UnitType.SPACE_STATION
  );
}

interface LibrarySaveStore {
  getState():
    | UnitStore
    | VehicleStore
    | AerospaceStore
    | ProtoMechStore
    | BattleArmorStore
    | InfantryStore;
  setState(
    partial: Partial<
      Pick<
        UnitStore,
        'chassis' | 'model' | 'name' | 'lastModifiedAt' | 'isModified'
      >
    >,
  ): void;
}

export function getLibrarySaveStore(
  tabId: string,
  unitType?: UnitType,
): LibrarySaveStore | undefined {
  if (unitType === UnitType.PROTOMECH) return getProtoMechStore(tabId);
  if (unitType === UnitType.BATTLE_ARMOR) return getBattleArmorStore(tabId);
  if (unitType === UnitType.INFANTRY) return getInfantryStore(tabId);
  if (unitType && isEditableAerospace({ unitType }))
    return getAerospaceStore(tabId);
  return unitType && isVehicleUnitShape({ unitType })
    ? getVehicleStore(tabId)
    : getUnitStore(tabId);
}

function getTabStore(tabId: string, unitType?: UnitType) {
  if (unitType && isVehicleUnitShape({ unitType })) {
    return getVehicleStore(tabId);
  }

  if (unitType && isAerospaceType(unitType)) {
    return getAerospaceStore(tabId);
  }

  if (unitType === UnitType.BATTLE_ARMOR) {
    return getBattleArmorStore(tabId);
  }

  if (unitType === UnitType.INFANTRY) {
    return getInfantryStore(tabId);
  }

  if (unitType === UnitType.PROTOMECH) {
    return getProtoMechStore(tabId);
  }

  return getUnitStore(tabId);
}

function getUnitStoreState(
  tabId: string,
  unitType?: UnitType,
): UnitStoreStateLike | undefined {
  return getTabStore(tabId, unitType)?.getState();
}

export function subscribeToTabDisplayState(
  tab: TabInfo,
  onChange: () => void,
): () => void {
  const store = getTabStore(tab.id, tab.unitType);
  if (!store) return () => undefined;
  let previous = getTabDisplayState(tab);
  let previousLibrarySave = getUnitStoreState(
    tab.id,
    tab.unitType,
  )?.librarySave;
  return store.subscribe(() => {
    const next = getTabDisplayState(tab);
    const nextLibrarySave = getUnitStoreState(
      tab.id,
      tab.unitType,
    )?.librarySave;
    if (
      previous.name !== next.name ||
      previous.isModified !== next.isModified ||
      previous.techBaseMode !== next.techBaseMode ||
      previousLibrarySave?.id !== nextLibrarySave?.id ||
      previousLibrarySave?.version !== nextLibrarySave?.version
    ) {
      previous = next;
      previousLibrarySave = nextLibrarySave;
      onChange();
    }
  });
}

export function isTabModified(tabId: string, unitType?: UnitType): boolean {
  return getUnitStoreState(tabId, unitType)?.isModified ?? false;
}

export function getTabDisplayState(
  tab: TabInfo,
): TabDisplayInfo & { isModified: boolean } {
  const runtimeState = getUnitStoreState(tab.id, tab.unitType);
  return {
    id: tab.id,
    name: runtimeState?.name ?? tab.name,
    isModified: runtimeState?.isModified ?? false,
    techBaseMode:
      runtimeState?.techBaseMode ??
      ((runtimeState?.techBase ?? tab.techBase) === TechBase.CLAN
        ? TechBaseMode.CLAN
        : TechBaseMode.INNER_SPHERE),
  };
}
