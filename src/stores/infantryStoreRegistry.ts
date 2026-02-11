/**
 * Infantry Store Registry
 *
 * Manages all active infantry store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 *
 * @spec openspec/changes/add-personnel-customizer/tasks.md
 */

import { StoreApi } from 'zustand';

import { safeGetItem, safeRemoveItem } from '@/stores/utils/clientSafeStorage';
import { logger } from '@/utils/logger';
import { isValidUUID, generateUUID } from '@/utils/uuid';

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

const infantryStores = new Map<string, StoreApi<InfantryStore>>();

export function getInfantryStore(
  infantryId: string,
): StoreApi<InfantryStore> | undefined {
  return infantryStores.get(infantryId);
}

export function hasInfantryStore(infantryId: string): boolean {
  return infantryStores.has(infantryId);
}

export function getAllInfantryIds(): string[] {
  return Array.from(infantryStores.keys());
}

export function getInfantryStoreCount(): number {
  return infantryStores.size;
}

function ensureValidInfantryId(
  infantryId: string | undefined | null,
  context: string,
): string {
  if (infantryId && isValidUUID(infantryId)) {
    return infantryId;
  }

  const newId = generateUUID();
  logger.warn(
    `[InfantryStoreRegistry] ${context}: Invalid infantry ID "${infantryId || '(missing)'}" replaced with "${newId}"`,
  );
  return newId;
}

export function createAndRegisterInfantry(
  options: CreateInfantryOptions,
): StoreApi<InfantryStore> {
  const store = createNewInfantryStore(options);
  const state = store.getState();
  infantryStores.set(state.id, store);
  return store;
}

export function registerInfantryStore(store: StoreApi<InfantryStore>): void {
  const state = store.getState();
  infantryStores.set(state.id, store);
}

export function hydrateOrCreateInfantry(
  infantryId: string,
  fallbackOptions: CreateInfantryOptions,
): StoreApi<InfantryStore> {
  const validInfantryId = ensureValidInfantryId(
    infantryId,
    'hydrateOrCreateInfantry',
  );

  const existing = infantryStores.get(validInfantryId);
  if (existing) {
    return existing;
  }

  const storageKey = `megamek-infantry-${validInfantryId}`;
  const savedState = safeGetItem(storageKey);

  if (savedState) {
    try {
      const parsed = JSON.parse(savedState) as {
        state?: Partial<InfantryState>;
      };
      const state = parsed.state;

      if (state) {
        ensureValidInfantryId(state.id, 'localStorage state');

        const defaultState = createDefaultInfantryState({
          ...fallbackOptions,
          id: validInfantryId,
        });
        const mergedState: InfantryState = {
          ...defaultState,
          ...state,
          id: validInfantryId,
        };

        const store = createInfantryStore(mergedState);
        infantryStores.set(validInfantryId, store);
        return store;
      }
    } catch (e) {
      logger.warn(
        `Failed to hydrate infantry ${validInfantryId}, creating new:`,
        e,
      );
    }
  }

  const store = createNewInfantryStore({
    ...fallbackOptions,
    id: validInfantryId,
  });
  infantryStores.set(validInfantryId, store);
  return store;
}

export function unregisterInfantryStore(infantryId: string): boolean {
  return infantryStores.delete(infantryId);
}

export function deleteInfantry(infantryId: string): boolean {
  const removed = infantryStores.delete(infantryId);
  if (removed) {
    const storageKey = `megamek-infantry-${infantryId}`;
    safeRemoveItem(storageKey);
  }
  return removed;
}

export function clearAllInfantryStores(clearStorage = false): void {
  if (clearStorage) {
    Array.from(infantryStores.keys()).forEach((infantryId) => {
      const storageKey = `megamek-infantry-${infantryId}`;
      safeRemoveItem(storageKey);
    });
  }
  infantryStores.clear();
}

export function duplicateInfantry(
  sourceInfantryId: string,
  newName?: string,
): StoreApi<InfantryStore> | null {
  const sourceStore = infantryStores.get(sourceInfantryId);
  if (!sourceStore) {
    return null;
  }

  const sourceState = sourceStore.getState();
  const newState = createDefaultInfantryState({
    name: newName ?? `${sourceState.name} (Copy)`,
    techBase: sourceState.techBase,
    motionType: sourceState.motionType,
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
  };

  const store = createInfantryStore(mergedState);
  infantryStores.set(mergedState.id, store);
  return store;
}

export function createInfantryFromFullState(
  state: InfantryState,
): StoreApi<InfantryStore> {
  const validId = ensureValidInfantryId(
    state.id,
    'createInfantryFromFullState',
  );

  const existing = infantryStores.get(validId);
  if (existing) {
    logger.warn(`Infantry store ${validId} already exists, returning existing`);
    return existing;
  }

  const validatedState: InfantryState = {
    ...state,
    id: validId,
  };

  const store = createInfantryStore(validatedState);
  infantryStores.set(validId, store);

  store.setState({ lastModifiedAt: Date.now() });

  return store;
}
