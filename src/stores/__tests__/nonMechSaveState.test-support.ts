import { TechBase } from '@/types/enums/TechBase';

import {
  clearAllAerospaceStores,
  hydrateOrCreateAerospace,
} from '../aerospaceStoreRegistry';
import {
  clearAllBattleArmorStores,
  hydrateOrCreateBattleArmor,
} from '../battleArmorStoreRegistry';
import {
  clearAllInfantryStores,
  hydrateOrCreateInfantry,
} from '../infantryStoreRegistry';
import {
  clearAllProtoMechStores,
  hydrateOrCreateProtoMech,
} from '../protoMechStoreRegistry';
import { createNewAerospaceStore } from '../useAerospaceStore';
import { createNewBattleArmorStore } from '../useBattleArmorStore';
import { createNewInfantryStore } from '../useInfantryStore';
import { createNewProtoMechStore } from '../useProtoMechStore';
import { createNewVehicleStore } from '../useVehicleStore';
import {
  clearAllVehicleStores,
  hydrateOrCreateVehicle,
} from '../vehicleStoreRegistry';

const options = (index: number) => ({
  id: `70000000-0000-4000-8000-00000000000${index}`,
  name: 'Legacy draft',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
});
export const nonMechSaveCases = [
  {
    family: 'vehicle',
    clear: clearAllVehicleStores,
    create: () => createNewVehicleStore(options(1)),
    hydrate: () => hydrateOrCreateVehicle(options(1).id, options(1)),
  },
  {
    family: 'aerospace',
    clear: clearAllAerospaceStores,
    create: () => createNewAerospaceStore(options(2)),
    hydrate: () => hydrateOrCreateAerospace(options(2).id, options(2)),
  },
  {
    family: 'infantry',
    clear: clearAllInfantryStores,
    create: () => createNewInfantryStore(options(3)),
    hydrate: () => hydrateOrCreateInfantry(options(3).id, options(3)),
  },
  {
    family: 'battlearmor',
    clear: clearAllBattleArmorStores,
    create: () => createNewBattleArmorStore(options(4)),
    hydrate: () => hydrateOrCreateBattleArmor(options(4).id, options(4)),
  },
  {
    family: 'protomech',
    clear: clearAllProtoMechStores,
    create: () => createNewProtoMechStore({ ...options(5), tonnage: 5 }),
    hydrate: () =>
      hydrateOrCreateProtoMech(options(5).id, { ...options(5), tonnage: 5 }),
  },
] as const;

export function clearNonMechSaveCases() {
  nonMechSaveCases.forEach(({ clear }) => clear());
  localStorage.clear();
}
