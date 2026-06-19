/**
 * Aerospace Store Registry
 *
 * Manages all active aerospace store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 *
 * @spec openspec/changes/add-aerospace-customizer/tasks.md
 */

import { StoreApi } from 'zustand';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';

import {
  AerospaceStore,
  AerospaceState,
  createDefaultAerospaceState,
  CreateAerospaceOptions,
} from './aerospaceState';
import {
  createAerospaceStore,
  createNewAerospaceStore,
} from './useAerospaceStore';
import { createStoreRegistry } from './utils/createStoreRegistry';

const aerospaceRegistry = createStoreRegistry<
  AerospaceStore,
  AerospaceState,
  CreateAerospaceOptions
>({
  storageKeyPrefix: 'megamek-aerospace',
  registryName: 'AerospaceStoreRegistry',
  createStore: createAerospaceStore,
  createNewStore: createNewAerospaceStore,
  createDefaultState: (options, id) =>
    createDefaultAerospaceState({ ...options, id }),
  getIdFromState: (state) => state.id,
});

export function getAerospaceStore(
  aerospaceId: string,
): StoreApi<AerospaceStore> | undefined {
  return aerospaceRegistry.get(aerospaceId);
}

export function hasAerospaceStore(aerospaceId: string): boolean {
  return aerospaceRegistry.has(aerospaceId);
}

export function getAllAerospaceIds(): string[] {
  return aerospaceRegistry.getAllIds();
}

export function getAerospaceStoreCount(): number {
  return aerospaceRegistry.getCount();
}

export function createAndRegisterAerospace(
  options: CreateAerospaceOptions,
): StoreApi<AerospaceStore> {
  return aerospaceRegistry.createAndRegister(options);
}

export function registerAerospaceStore(store: StoreApi<AerospaceStore>): void {
  aerospaceRegistry.register(store);
}

export function hydrateOrCreateAerospace(
  aerospaceId: string,
  fallbackOptions: CreateAerospaceOptions,
): StoreApi<AerospaceStore> {
  return aerospaceRegistry.hydrateOrCreate(aerospaceId, fallbackOptions);
}

export function unregisterAerospaceStore(aerospaceId: string): boolean {
  return aerospaceRegistry.unregister(aerospaceId);
}

export function deleteAerospace(aerospaceId: string): boolean {
  return aerospaceRegistry.delete(aerospaceId);
}

export function clearAllAerospaceStores(clearStorage = false): void {
  aerospaceRegistry.clearAll(clearStorage);
}

export function duplicateAerospace(
  sourceAerospaceId: string,
  newName?: string,
): StoreApi<AerospaceStore> | null {
  const sourceStore = aerospaceRegistry.get(sourceAerospaceId);
  if (!sourceStore) {
    return null;
  }

  const sourceState = sourceStore.getState();
  const newState = createDefaultAerospaceState({
    name: newName ?? `${sourceState.name} (Copy)`,
    tonnage: sourceState.tonnage,
    techBase: sourceState.techBase,
    isConventional: sourceState.unitType === UnitType.CONVENTIONAL_FIGHTER,
  });

  const mergedState: AerospaceState = {
    ...newState,
    engineType: sourceState.engineType,
    engineRating: sourceState.engineRating,
    safeThrust: sourceState.safeThrust,
    armorType: sourceState.armorType,
    armorTonnage: sourceState.armorTonnage,
    armorAllocation: { ...sourceState.armorAllocation },
    heatSinks: sourceState.heatSinks,
    doubleHeatSinks: sourceState.doubleHeatSinks,
    hasBombBay: sourceState.hasBombBay,
    bombCapacity: sourceState.bombCapacity,
    hasReinforcedCockpit: sourceState.hasReinforcedCockpit,
    hasEjectionSeat: sourceState.hasEjectionSeat,
  };

  const store = createAerospaceStore(mergedState);
  aerospaceRegistry.register(store);
  return store;
}

export function createAerospaceFromFullState(
  state: AerospaceState,
): StoreApi<AerospaceStore> {
  const validId = aerospaceRegistry.ensureValidId(
    state.id,
    'createAerospaceFromFullState',
  );

  const existing = aerospaceRegistry.get(validId);
  if (existing) {
    logger.warn(
      `Aerospace store ${validId} already exists, returning existing`,
    );
    return existing;
  }

  const store = createAerospaceStore({
    ...state,
    id: validId,
  });
  aerospaceRegistry.register(store);
  store.setState({ lastModifiedAt: Date.now() });
  return store;
}
