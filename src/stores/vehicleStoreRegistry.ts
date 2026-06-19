/**
 * Vehicle Store Registry
 *
 * Manages all active vehicle store instances.
 * Parallels unitStoreRegistry.ts for BattleMechs.
 */

import { StoreApi } from 'zustand';

import { logger } from '@/utils/logger';

import { createVehicleStore, createNewVehicleStore } from './useVehicleStore';
import { createStoreRegistry } from './utils/createStoreRegistry';
import {
  VehicleStore,
  VehicleState,
  createDefaultVehicleState,
  CreateVehicleOptions,
} from './vehicleState';

const vehicleRegistry = createStoreRegistry<
  VehicleStore,
  VehicleState,
  CreateVehicleOptions
>({
  storageKeyPrefix: 'megamek-vehicle',
  registryName: 'VehicleStoreRegistry',
  createStore: createVehicleStore,
  createNewStore: createNewVehicleStore,
  createDefaultState: (options, id) =>
    createDefaultVehicleState({ ...options, id }),
  getIdFromState: (state) => state.id,
});

export function getVehicleStore(
  vehicleId: string,
): StoreApi<VehicleStore> | undefined {
  return vehicleRegistry.get(vehicleId);
}

export function hasVehicleStore(vehicleId: string): boolean {
  return vehicleRegistry.has(vehicleId);
}

export function getAllVehicleIds(): string[] {
  return vehicleRegistry.getAllIds();
}

export function getVehicleStoreCount(): number {
  return vehicleRegistry.getCount();
}

export function createAndRegisterVehicle(
  options: CreateVehicleOptions,
): StoreApi<VehicleStore> {
  return vehicleRegistry.createAndRegister(options);
}

export function registerVehicleStore(store: StoreApi<VehicleStore>): void {
  vehicleRegistry.register(store);
}

export function hydrateOrCreateVehicle(
  vehicleId: string,
  fallbackOptions: CreateVehicleOptions,
): StoreApi<VehicleStore> {
  return vehicleRegistry.hydrateOrCreate(vehicleId, fallbackOptions);
}

export function unregisterVehicleStore(vehicleId: string): boolean {
  return vehicleRegistry.unregister(vehicleId);
}

export function deleteVehicle(vehicleId: string): boolean {
  return vehicleRegistry.delete(vehicleId);
}

export function clearAllVehicleStores(clearStorage = false): void {
  vehicleRegistry.clearAll(clearStorage);
}

export function duplicateVehicle(
  sourceVehicleId: string,
  newName?: string,
): StoreApi<VehicleStore> | null {
  const sourceStore = vehicleRegistry.get(sourceVehicleId);
  if (!sourceStore) {
    return null;
  }

  const sourceState = sourceStore.getState();
  const newState = createDefaultVehicleState({
    name: newName ?? `${sourceState.name} (Copy)`,
    tonnage: sourceState.tonnage,
    techBase: sourceState.techBase,
    motionType: sourceState.motionType,
    unitType: sourceState.unitType,
  });

  const mergedState: VehicleState = {
    ...newState,
    engineType: sourceState.engineType,
    engineRating: sourceState.engineRating,
    cruiseMP: sourceState.cruiseMP,
    armorType: sourceState.armorType,
    armorTonnage: sourceState.armorTonnage,
    armorAllocation: { ...sourceState.armorAllocation },
    turret: sourceState.turret ? { ...sourceState.turret } : null,
    hasEnvironmentalSealing: sourceState.hasEnvironmentalSealing,
    hasFlotationHull: sourceState.hasFlotationHull,
    isAmphibious: sourceState.isAmphibious,
    hasTrailerHitch: sourceState.hasTrailerHitch,
    isTrailer: sourceState.isTrailer,
  };

  const store = createVehicleStore(mergedState);
  vehicleRegistry.register(store);
  return store;
}

export function createVehicleFromFullState(
  state: VehicleState,
): StoreApi<VehicleStore> {
  const validId = vehicleRegistry.ensureValidId(
    state.id,
    'createVehicleFromFullState',
  );

  const existing = vehicleRegistry.get(validId);
  if (existing) {
    logger.warn(`Vehicle store ${validId} already exists, returning existing`);
    return existing;
  }

  const store = createVehicleStore({
    ...state,
    id: validId,
  });
  vehicleRegistry.register(store);
  store.setState({ lastModifiedAt: Date.now() });
  return store;
}
