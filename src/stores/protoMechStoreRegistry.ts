/**
 * ProtoMech Store Registry
 *
 * Manages all active ProtoMech store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 *
 * @spec openspec/changes/add-personnel-customizer/tasks.md
 */

import { StoreApi } from 'zustand';

import { logger } from '@/utils/logger';

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
import { createStoreRegistry } from './utils/createStoreRegistry';

const protoMechRegistry = createStoreRegistry<
  ProtoMechStore,
  ProtoMechState,
  CreateProtoMechOptions
>({
  storageKeyPrefix: 'megamek-protomech',
  registryName: 'ProtoMechStoreRegistry',
  createStore: createProtoMechStore,
  createNewStore: createNewProtoMechStore,
  createDefaultState: (options, id) =>
    createDefaultProtoMechState({ ...options, id }),
  getIdFromState: (state) => state.id,
});

export function getProtoMechStore(
  protoMechId: string,
): StoreApi<ProtoMechStore> | undefined {
  return protoMechRegistry.get(protoMechId);
}

export function hasProtoMechStore(protoMechId: string): boolean {
  return protoMechRegistry.has(protoMechId);
}

export function getAllProtoMechIds(): string[] {
  return protoMechRegistry.getAllIds();
}

export function getProtoMechStoreCount(): number {
  return protoMechRegistry.getCount();
}

export function createAndRegisterProtoMech(
  options: CreateProtoMechOptions,
): StoreApi<ProtoMechStore> {
  return protoMechRegistry.createAndRegister(options);
}

export function registerProtoMechStore(store: StoreApi<ProtoMechStore>): void {
  protoMechRegistry.register(store);
}

export function hydrateOrCreateProtoMech(
  protoMechId: string,
  fallbackOptions: CreateProtoMechOptions,
): StoreApi<ProtoMechStore> {
  return protoMechRegistry.hydrateOrCreate(protoMechId, fallbackOptions);
}

export function unregisterProtoMechStore(protoMechId: string): boolean {
  return protoMechRegistry.unregister(protoMechId);
}

export function deleteProtoMech(protoMechId: string): boolean {
  return protoMechRegistry.delete(protoMechId);
}

export function clearAllProtoMechStores(clearStorage = false): void {
  protoMechRegistry.clearAll(clearStorage);
}

export function duplicateProtoMech(
  sourceProtoMechId: string,
  newName?: string,
): StoreApi<ProtoMechStore> | null {
  const sourceStore = protoMechRegistry.get(sourceProtoMechId);
  if (!sourceStore) {
    return null;
  }

  const sourceState = sourceStore.getState();
  const newState = createDefaultProtoMechState({
    name: newName ?? `${sourceState.name} (Copy)`,
    tonnage: sourceState.tonnage,
    chassisType: sourceState.chassisType,
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
  protoMechRegistry.register(store);
  return store;
}

export function createProtoMechFromFullState(
  state: ProtoMechState,
): StoreApi<ProtoMechStore> {
  const validId = protoMechRegistry.ensureValidId(
    state.id,
    'createProtoMechFromFullState',
  );

  const existing = protoMechRegistry.get(validId);
  if (existing) {
    logger.warn(
      `ProtoMech store ${validId} already exists, returning existing`,
    );
    return existing;
  }

  const store = createProtoMechStore({
    ...state,
    id: validId,
  });
  protoMechRegistry.register(store);
  store.setState({ lastModifiedAt: Date.now() });
  return store;
}
