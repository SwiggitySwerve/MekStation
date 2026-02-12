/**
 * Vehicle Store Registry
 *
 * Manages all active vehicle store instances.
 * Parallels unitStoreRegistry.ts for BattleMechs.
 */

import { StoreApi } from 'zustand';

import { safeGetItem, safeRemoveItem } from '@/stores/utils/clientSafeStorage';
import { logger } from '@/utils/logger';
import { isValidUUID, generateUUID } from '@/utils/uuid';

import { createVehicleStore, createNewVehicleStore } from './useVehicleStore';
import {
  VehicleStore,
  VehicleState,
  createDefaultVehicleState,
  CreateVehicleOptions,
} from './vehicleState';

const vehicleStores = new Map<string, StoreApi<VehicleStore>>();

export function getVehicleStore(
  vehicleId: string,
): StoreApi<VehicleStore> | undefined {
  return vehicleStores.get(vehicleId);
}

export function hasVehicleStore(vehicleId: string): boolean {
  return vehicleStores.has(vehicleId);
}

export function getAllVehicleIds(): string[] {
  return Array.from(vehicleStores.keys());
}

export function getVehicleStoreCount(): number {
  return vehicleStores.size;
}

function ensureValidVehicleId(
  vehicleId: string | undefined | null,
  context: string,
): string {
  if (vehicleId && isValidUUID(vehicleId)) {
    return vehicleId;
  }

  const newId = generateUUID();
  logger.warn(
    `[VehicleStoreRegistry] ${context}: Invalid vehicle ID "${vehicleId || '(missing)'}" replaced with "${newId}"`,
  );
  return newId;
}

export function createAndRegisterVehicle(
  options: CreateVehicleOptions,
): StoreApi<VehicleStore> {
  const store = createNewVehicleStore(options);
  const state = store.getState();
  vehicleStores.set(state.id, store);
  return store;
}

export function registerVehicleStore(store: StoreApi<VehicleStore>): void {
  const state = store.getState();
  vehicleStores.set(state.id, store);
}

export function hydrateOrCreateVehicle(
  vehicleId: string,
  fallbackOptions: CreateVehicleOptions,
): StoreApi<VehicleStore> {
  const validVehicleId = ensureValidVehicleId(
    vehicleId,
    'hydrateOrCreateVehicle',
  );

  const existing = vehicleStores.get(validVehicleId);
  if (existing) {
    return existing;
  }

  const storageKey = `megamek-vehicle-${validVehicleId}`;
  const savedState = safeGetItem(storageKey);

  if (savedState) {
    try {
      const parsed = JSON.parse(savedState) as {
        state?: Partial<VehicleState>;
      };
      const state = parsed.state;

      if (state) {
        ensureValidVehicleId(state.id, 'localStorage state');

        const defaultState = createDefaultVehicleState({
          ...fallbackOptions,
          id: validVehicleId,
        });
        const mergedState: VehicleState = {
          ...defaultState,
          ...state,
          id: validVehicleId,
        };

        const store = createVehicleStore(mergedState);
        vehicleStores.set(validVehicleId, store);
        return store;
      }
    } catch (e) {
      logger.warn(
        `Failed to hydrate vehicle ${validVehicleId}, creating new:`,
        e,
      );
    }
  }

  const store = createNewVehicleStore({
    ...fallbackOptions,
    id: validVehicleId,
  });
  vehicleStores.set(validVehicleId, store);
  return store;
}

export function unregisterVehicleStore(vehicleId: string): boolean {
  return vehicleStores.delete(vehicleId);
}

export function deleteVehicle(vehicleId: string): boolean {
  const removed = vehicleStores.delete(vehicleId);
  if (removed) {
    const storageKey = `megamek-vehicle-${vehicleId}`;
    safeRemoveItem(storageKey);
  }
  return removed;
}

export function clearAllVehicleStores(clearStorage = false): void {
  if (clearStorage) {
    Array.from(vehicleStores.keys()).forEach((vehicleId) => {
      const storageKey = `megamek-vehicle-${vehicleId}`;
      safeRemoveItem(storageKey);
    });
  }
  vehicleStores.clear();
}

export function duplicateVehicle(
  sourceVehicleId: string,
  newName?: string,
): StoreApi<VehicleStore> | null {
  const sourceStore = vehicleStores.get(sourceVehicleId);
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
  vehicleStores.set(mergedState.id, store);
  return store;
}

export function createVehicleFromFullState(
  state: VehicleState,
): StoreApi<VehicleStore> {
  const validId = ensureValidVehicleId(state.id, 'createVehicleFromFullState');

  const existing = vehicleStores.get(validId);
  if (existing) {
    logger.warn(`Vehicle store ${validId} already exists, returning existing`);
    return existing;
  }

  const validatedState: VehicleState = {
    ...state,
    id: validId,
  };

  const store = createVehicleStore(validatedState);
  vehicleStores.set(validId, store);

  store.setState({ lastModifiedAt: Date.now() });

  return store;
}
