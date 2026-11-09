import type { UnitSaveEditor } from '@/stores/unitSaveStateAdapters';

import {
  clearAllAerospaceStores,
  registerAerospaceStore,
} from '@/stores/aerospaceStoreRegistry';
import {
  clearAllBattleArmorStores,
  registerBattleArmorStore,
} from '@/stores/battleArmorStoreRegistry';
import {
  clearAllInfantryStores,
  registerInfantryStore,
} from '@/stores/infantryStoreRegistry';
import {
  clearAllProtoMechStores,
  registerProtoMechStore,
} from '@/stores/protoMechStoreRegistry';
import { clearAllStores, registerStore } from '@/stores/unitStoreRegistry';
import { createNewAerospaceStore } from '@/stores/useAerospaceStore';
import { createNewBattleArmorStore } from '@/stores/useBattleArmorStore';
import { createNewInfantryStore } from '@/stores/useInfantryStore';
import { createNewProtoMechStore } from '@/stores/useProtoMechStore';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { createNewVehicleStore } from '@/stores/useVehicleStore';
import { safeRemoveItem } from '@/stores/utils/clientSafeStorage';
import {
  clearAllVehicleStores,
  registerVehicleStore,
} from '@/stores/vehicleStoreRegistry';
import {
  AerospaceLocation,
  BattleArmorLocation,
  ProtoMechLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import type { getLibrarySaveStore } from '../MultiUnitTabsUnitState';

export const SAVE_TEST_ID = '88888888-8888-4888-8888-888888888888';
const options = {
  id: SAVE_TEST_ID,
  name: 'Before',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
type SaveTestState = ReturnType<
  NonNullable<ReturnType<typeof getLibrarySaveStore>>['getState']
>;
export interface SaveTestSession {
  store: {
    getState(): SaveTestState;
    setState(
      patch: Partial<
        Pick<
          SaveTestState,
          | 'isModified'
          | 'lastModifiedAt'
          | 'librarySave'
          | 'chassis'
          | 'model'
          | 'name'
        >
      >,
    ): void;
  };
  editor(): UnitSaveEditor;
  editNested(): void;
}

function mech(): SaveTestSession {
  const store = createNewUnitStore(options);
  registerStore(store);
  return {
    store,
    editor: () => ({ store: 'battlemech', state: store.getState() }),
    editNested: () =>
      store.setState({
        fluff: { ...store.getState().fluff, overview: 'Later nested edit' },
      }),
  };
}
function vehicle(): SaveTestSession {
  const store = createNewVehicleStore(options);
  registerVehicleStore(store);
  return {
    store,
    editor: () => ({ store: 'vehicle', state: store.getState() }),
    editNested: () =>
      store.setState({
        armorAllocation: {
          ...store.getState().armorAllocation,
          [VehicleLocation.FRONT]: 1,
        },
      }),
  };
}
function aerospace(): SaveTestSession {
  const store = createNewAerospaceStore(options);
  registerAerospaceStore(store);
  return {
    store,
    editor: () => ({ store: 'aerospace', state: store.getState() }),
    editNested: () =>
      store.setState({
        armorAllocation: {
          ...store.getState().armorAllocation,
          [AerospaceLocation.NOSE]: 1,
        },
      }),
  };
}
function infantry(): SaveTestSession {
  const store = createNewInfantryStore(options);
  registerInfantryStore(store);
  return {
    store,
    editor: () => ({ store: 'infantry', state: store.getState() }),
    editNested: () =>
      store.setState({
        platoonComposition: {
          ...store.getState().platoonComposition,
          squads: 2,
        },
      }),
  };
}
function battlearmor(): SaveTestSession {
  const store = createNewBattleArmorStore(options);
  registerBattleArmorStore(store);
  return {
    store,
    editor: () => ({ store: 'battlearmor', state: store.getState() }),
    editNested: () =>
      store.setState({
        equipment: [
          {
            id: 'ba-mount',
            equipmentId: 'ba-small-laser',
            name: 'Nested BA laser',
            location: BattleArmorLocation.BODY,
            isAPMount: false,
            isTurretMounted: false,
            isModular: false,
          },
        ],
      }),
  };
}
function protomech(): SaveTestSession {
  const store = createNewProtoMechStore({ ...options, tonnage: 5 });
  registerProtoMechStore(store);
  return {
    store,
    editor: () => ({ store: 'protomech', state: store.getState() }),
    editNested: () =>
      store.setState({
        armorByLocation: {
          ...store.getState().armorByLocation,
          [ProtoMechLocation.TORSO]: 1,
        },
      }),
  };
}

export const saveFamilies = [
  { family: 'mech', unitType: UnitType.BATTLEMECH, setup: mech },
  { family: 'vehicle', unitType: UnitType.VEHICLE, setup: vehicle },
  { family: 'aerospace', unitType: UnitType.AEROSPACE, setup: aerospace },
  { family: 'infantry', unitType: UnitType.INFANTRY, setup: infantry },
  {
    family: 'battlearmor',
    unitType: UnitType.BATTLE_ARMOR,
    setup: battlearmor,
  },
  { family: 'protomech', unitType: UnitType.PROTOMECH, setup: protomech },
] as const;

export function clearSaveFamilies(): void {
  clearAllStores();
  clearAllVehicleStores();
  clearAllAerospaceStores();
  clearAllInfantryStores();
  clearAllBattleArmorStores();
  clearAllProtoMechStores();
  for (const prefix of [
    'unit',
    'vehicle',
    'aerospace',
    'infantry',
    'battlearmor',
    'protomech',
  ])
    safeRemoveItem(`megamek-${prefix}-${SAVE_TEST_ID}`);
}
