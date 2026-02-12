/**
 * ProtoMech Store Registry
 *
 * Manages all active ProtoMech store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 *
 * @spec openspec/changes/add-personnel-customizer/tasks.md
 */

import { StoreApi } from 'zustand';

import { safeGetItem, safeRemoveItem } from '@/stores/utils/clientSafeStorage';
import { logger } from '@/utils/logger';
import { isValidUUID, generateUUID } from '@/utils/uuid';

import {
  ProtoMechStore,
  ProtoMechState,
  createDefaultProtoMechState,
  CreateProtoMechOptions,
} from './protoMechState';
import {
  createProtoMechStore,
  createNewProtoMechStore,
} from './useProtoMechStore';

const protoMechStores = new Map<string, StoreApi<ProtoMechStore>>();

export function getProtoMechStore(
  protoMechId: string,
): StoreApi<ProtoMechStore> | undefined {
  return protoMechStores.get(protoMechId);
}

export function hasProtoMechStore(protoMechId: string): boolean {
  return protoMechStores.has(protoMechId);
}

export function getAllProtoMechIds(): string[] {
  return Array.from(protoMechStores.keys());
}

export function getProtoMechStoreCount(): number {
  return protoMechStores.size;
}

function ensureValidProtoMechId(
  protoMechId: string | undefined | null,
  context: string,
): string {
  if (protoMechId && isValidUUID(protoMechId)) {
    return protoMechId;
  }

  const newId = generateUUID();
  logger.warn(
    `[ProtoMechStoreRegistry] ${context}: Invalid protomech ID "${protoMechId || '(missing)'}" replaced with "${newId}"`,
  );
  return newId;
}

export function createAndRegisterProtoMech(
  options: CreateProtoMechOptions,
): StoreApi<ProtoMechStore> {
  const store = createNewProtoMechStore(options);
  const state = store.getState();
  protoMechStores.set(state.id, store);
  return store;
}

export function registerProtoMechStore(store: StoreApi<ProtoMechStore>): void {
  const state = store.getState();
  protoMechStores.set(state.id, store);
}

export function hydrateOrCreateProtoMech(
  protoMechId: string,
  fallbackOptions: CreateProtoMechOptions,
): StoreApi<ProtoMechStore> {
  const validProtoMechId = ensureValidProtoMechId(
    protoMechId,
    'hydrateOrCreateProtoMech',
  );

  const existing = protoMechStores.get(validProtoMechId);
  if (existing) {
    return existing;
  }

  const storageKey = `megamek-protomech-${validProtoMechId}`;
  const savedState = safeGetItem(storageKey);

  if (savedState) {
    try {
      const parsed = JSON.parse(savedState) as {
        state?: Partial<ProtoMechState>;
      };
      const state = parsed.state;

      if (state) {
        ensureValidProtoMechId(state.id, 'localStorage state');

        const defaultState = createDefaultProtoMechState({
          ...fallbackOptions,
          id: validProtoMechId,
        });
        const mergedState: ProtoMechState = {
          ...defaultState,
          ...state,
          id: validProtoMechId,
        };

        const store = createProtoMechStore(mergedState);
        protoMechStores.set(validProtoMechId, store);
        return store;
      }
    } catch (e) {
      logger.warn(
        `Failed to hydrate protomech ${validProtoMechId}, creating new:`,
        e,
      );
    }
  }

  const store = createNewProtoMechStore({
    ...fallbackOptions,
    id: validProtoMechId,
  });
  protoMechStores.set(validProtoMechId, store);
  return store;
}

export function unregisterProtoMechStore(protoMechId: string): boolean {
  return protoMechStores.delete(protoMechId);
}

export function deleteProtoMech(protoMechId: string): boolean {
  const removed = protoMechStores.delete(protoMechId);
  if (removed) {
    const storageKey = `megamek-protomech-${protoMechId}`;
    safeRemoveItem(storageKey);
  }
  return removed;
}

export function clearAllProtoMechStores(clearStorage = false): void {
  if (clearStorage) {
    Array.from(protoMechStores.keys()).forEach((protoMechId) => {
      const storageKey = `megamek-protomech-${protoMechId}`;
      safeRemoveItem(storageKey);
    });
  }
  protoMechStores.clear();
}

export function duplicateProtoMech(
  sourceProtoMechId: string,
  newName?: string,
): StoreApi<ProtoMechStore> | null {
  const sourceStore = protoMechStores.get(sourceProtoMechId);
  if (!sourceStore) {
    return null;
  }

  const sourceState = sourceStore.getState();
  const newState = createDefaultProtoMechState({
    name: newName ?? `${sourceState.name} (Copy)`,
    tonnage: sourceState.tonnage,
    isQuad: sourceState.isQuad,
  });

  const mergedState: ProtoMechState = {
    ...newState,
    engineRating: sourceState.engineRating,
    cruiseMP: sourceState.cruiseMP,
    jumpMP: sourceState.jumpMP,
    armorByLocation: { ...sourceState.armorByLocation },
    hasMainGun: sourceState.hasMainGun,
    hasMyomerBooster: sourceState.hasMyomerBooster,
    hasMagneticClamps: sourceState.hasMagneticClamps,
    hasExtendedTorsoTwist: sourceState.hasExtendedTorsoTwist,
  };

  const store = createProtoMechStore(mergedState);
  protoMechStores.set(mergedState.id, store);
  return store;
}

export function createProtoMechFromFullState(
  state: ProtoMechState,
): StoreApi<ProtoMechStore> {
  const validId = ensureValidProtoMechId(
    state.id,
    'createProtoMechFromFullState',
  );

  const existing = protoMechStores.get(validId);
  if (existing) {
    logger.warn(
      `ProtoMech store ${validId} already exists, returning existing`,
    );
    return existing;
  }

  const validatedState: ProtoMechState = {
    ...state,
    id: validId,
  };

  const store = createProtoMechStore(validatedState);
  protoMechStores.set(validId, store);

  store.setState({ lastModifiedAt: Date.now() });

  return store;
}
