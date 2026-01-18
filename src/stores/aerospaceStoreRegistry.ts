/**
 * Aerospace Store Registry
 * 
 * Manages all active aerospace store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 * 
 * @spec openspec/changes/add-aerospace-customizer/tasks.md
 */

import { StoreApi } from 'zustand';
import { AerospaceStore, AerospaceState, createDefaultAerospaceState, CreateAerospaceOptions } from './aerospaceState';
import { createAerospaceStore, createNewAerospaceStore } from './useAerospaceStore';
import { isValidUUID, generateUUID } from '@/utils/uuid';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

const aerospaceStores = new Map<string, StoreApi<AerospaceStore>>();

export function getAerospaceStore(aerospaceId: string): StoreApi<AerospaceStore> | undefined {
  return aerospaceStores.get(aerospaceId);
}

export function hasAerospaceStore(aerospaceId: string): boolean {
  return aerospaceStores.has(aerospaceId);
}

export function getAllAerospaceIds(): string[] {
  return Array.from(aerospaceStores.keys());
}

export function getAerospaceStoreCount(): number {
  return aerospaceStores.size;
}

function ensureValidAerospaceId(aerospaceId: string | undefined | null, context: string): string {
  if (aerospaceId && isValidUUID(aerospaceId)) {
    return aerospaceId;
  }
  
  const newId = generateUUID();
  console.warn(
    `[AerospaceStoreRegistry] ${context}: Invalid aerospace ID "${aerospaceId || '(missing)'}" replaced with "${newId}"`
  );
  return newId;
}

export function createAndRegisterAerospace(options: CreateAerospaceOptions): StoreApi<AerospaceStore> {
  const store = createNewAerospaceStore(options);
  const state = store.getState();
  aerospaceStores.set(state.id, store);
  return store;
}

export function registerAerospaceStore(store: StoreApi<AerospaceStore>): void {
  const state = store.getState();
  aerospaceStores.set(state.id, store);
}

export function hydrateOrCreateAerospace(
  aerospaceId: string,
  fallbackOptions: CreateAerospaceOptions
): StoreApi<AerospaceStore> {
  const validAerospaceId = ensureValidAerospaceId(aerospaceId, 'hydrateOrCreateAerospace');
  
  const existing = aerospaceStores.get(validAerospaceId);
  if (existing) {
    return existing;
  }
  
  const storageKey = `megamek-aerospace-${validAerospaceId}`;
  const savedState = safeGetItem(storageKey);
  
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState) as { state?: Partial<AerospaceState> };
      const state = parsed.state;
      
      if (state) {
        ensureValidAerospaceId(state.id, 'localStorage state');
        
        const defaultState = createDefaultAerospaceState({ ...fallbackOptions, id: validAerospaceId });
        const mergedState: AerospaceState = {
          ...defaultState,
          ...state,
          id: validAerospaceId,
        };
      
        const store = createAerospaceStore(mergedState);
        aerospaceStores.set(validAerospaceId, store);
        return store;
      }
    } catch (e) {
      console.warn(`Failed to hydrate aerospace ${validAerospaceId}, creating new:`, e);
    }
  }
  
  const store = createNewAerospaceStore({ ...fallbackOptions, id: validAerospaceId });
  aerospaceStores.set(validAerospaceId, store);
  return store;
}

export function unregisterAerospaceStore(aerospaceId: string): boolean {
  return aerospaceStores.delete(aerospaceId);
}

export function deleteAerospace(aerospaceId: string): boolean {
  const removed = aerospaceStores.delete(aerospaceId);
  if (removed) {
    const storageKey = `megamek-aerospace-${aerospaceId}`;
    safeRemoveItem(storageKey);
  }
  return removed;
}

export function clearAllAerospaceStores(clearStorage = false): void {
  if (clearStorage) {
    Array.from(aerospaceStores.keys()).forEach((aerospaceId) => {
      const storageKey = `megamek-aerospace-${aerospaceId}`;
      safeRemoveItem(storageKey);
    });
  }
  aerospaceStores.clear();
}

export function duplicateAerospace(sourceAerospaceId: string, newName?: string): StoreApi<AerospaceStore> | null {
  const sourceStore = aerospaceStores.get(sourceAerospaceId);
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
    fuel: sourceState.fuel,
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
  aerospaceStores.set(mergedState.id, store);
  return store;
}

export function createAerospaceFromFullState(state: AerospaceState): StoreApi<AerospaceStore> {
  const validId = ensureValidAerospaceId(state.id, 'createAerospaceFromFullState');
  
  const existing = aerospaceStores.get(validId);
  if (existing) {
    console.warn(`Aerospace store ${validId} already exists, returning existing`);
    return existing;
  }
  
  const validatedState: AerospaceState = {
    ...state,
    id: validId,
  };
  
  const store = createAerospaceStore(validatedState);
  aerospaceStores.set(validId, store);
  
  store.setState({ lastModifiedAt: Date.now() });
  
  return store;
}
