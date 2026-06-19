/**
 * Infantry Store Registry
 *
 * Manages all active infantry store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 *
 * @spec openspec/changes/add-personnel-customizer/tasks.md
 */

import { StoreApi } from 'zustand';

import { logger } from '@/utils/logger';

import {
  InfantryStore,
  InfantryState,
  createDefaultInfantryState,
  CreateInfantryOptions,
} from './infantryState';
import {
  createInfantryStore,
  createNewInfantryStore,
} from './useInfantryStore';
import { createStoreRegistry } from './utils/createStoreRegistry';

const infantryRegistry = createStoreRegistry<
  InfantryStore,
  InfantryState,
  CreateInfantryOptions
>({
  storageKeyPrefix: 'megamek-infantry',
  registryName: 'InfantryStoreRegistry',
  createStore: createInfantryStore,
  createNewStore: createNewInfantryStore,
  createDefaultState: (options, id) =>
    createDefaultInfantryState({ ...options, id }),
  getIdFromState: (state) => state.id,
});

export function getInfantryStore(
  infantryId: string,
): StoreApi<InfantryStore> | undefined {
  return infantryRegistry.get(infantryId);
}

export function hasInfantryStore(infantryId: string): boolean {
  return infantryRegistry.has(infantryId);
}

export function getAllInfantryIds(): string[] {
  return infantryRegistry.getAllIds();
}

export function getInfantryStoreCount(): number {
  return infantryRegistry.getCount();
}

export function createAndRegisterInfantry(
  options: CreateInfantryOptions,
): StoreApi<InfantryStore> {
  return infantryRegistry.createAndRegister(options);
}

export function registerInfantryStore(store: StoreApi<InfantryStore>): void {
  infantryRegistry.register(store);
}

export function hydrateOrCreateInfantry(
  infantryId: string,
  fallbackOptions: CreateInfantryOptions,
): StoreApi<InfantryStore> {
  return infantryRegistry.hydrateOrCreate(infantryId, fallbackOptions);
}

export function unregisterInfantryStore(infantryId: string): boolean {
  return infantryRegistry.unregister(infantryId);
}

export function deleteInfantry(infantryId: string): boolean {
  return infantryRegistry.delete(infantryId);
}

export function clearAllInfantryStores(clearStorage = false): void {
  infantryRegistry.clearAll(clearStorage);
}

export function duplicateInfantry(
  sourceInfantryId: string,
  newName?: string,
): StoreApi<InfantryStore> | null {
  const sourceStore = infantryRegistry.get(sourceInfantryId);
  if (!sourceStore) {
    return null;
  }

  const sourceState = sourceStore.getState();
  const newState = createDefaultInfantryState({
    name: newName ?? `${sourceState.name} (Copy)`,
    techBase: sourceState.techBase,
    motionType: sourceState.motionType,
    infantryMotive: sourceState.infantryMotive,
    platoonComposition: sourceState.platoonComposition,
    squadSize: sourceState.squadSize,
    numberOfSquads: sourceState.numberOfSquads,
  });

  const mergedState: InfantryState = {
    ...newState,
    primaryWeapon: sourceState.primaryWeapon,
    primaryWeaponId: sourceState.primaryWeaponId,
    secondaryWeapon: sourceState.secondaryWeapon,
    secondaryWeaponId: sourceState.secondaryWeaponId,
    secondaryWeaponCount: sourceState.secondaryWeaponCount,
    armorKit: sourceState.armorKit,
    damageDivisor: sourceState.damageDivisor,
    specialization: sourceState.specialization,
    hasAntiMechTraining: sourceState.hasAntiMechTraining,
    isAugmented: sourceState.isAugmented,
    augmentationType: sourceState.augmentationType,
    fieldGuns: sourceState.fieldGuns,
    groundMP: sourceState.groundMP,
    jumpMP: sourceState.jumpMP,
  };

  const store = createInfantryStore(mergedState);
  infantryRegistry.register(store);
  return store;
}

export function createInfantryFromFullState(
  state: InfantryState,
): StoreApi<InfantryStore> {
  const validId = infantryRegistry.ensureValidId(
    state.id,
    'createInfantryFromFullState',
  );

  const existing = infantryRegistry.get(validId);
  if (existing) {
    logger.warn(`Infantry store ${validId} already exists, returning existing`);
    return existing;
  }

  const store = createInfantryStore({
    ...state,
    id: validId,
  });
  infantryRegistry.register(store);
  store.setState({ lastModifiedAt: Date.now() });
  return store;
}
