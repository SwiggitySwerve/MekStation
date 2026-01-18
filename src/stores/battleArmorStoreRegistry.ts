/**
 * Battle Armor Store Registry
 * 
 * Manages all active battle armor store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 * 
 * @spec openspec/changes/add-personnel-customizer/tasks.md
 */

import { StoreApi } from 'zustand';
import { BattleArmorStore, BattleArmorState, createDefaultBattleArmorState, CreateBattleArmorOptions } from './battleArmorState';
import { createBattleArmorStore, createNewBattleArmorStore } from './useBattleArmorStore';
import { isValidUUID, generateUUID } from '@/utils/uuid';

function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

const battleArmorStores = new Map<string, StoreApi<BattleArmorStore>>();

export function getBattleArmorStore(battleArmorId: string): StoreApi<BattleArmorStore> | undefined {
  return battleArmorStores.get(battleArmorId);
}

export function hasBattleArmorStore(battleArmorId: string): boolean {
  return battleArmorStores.has(battleArmorId);
}

export function getAllBattleArmorIds(): string[] {
  return Array.from(battleArmorStores.keys());
}

export function getBattleArmorStoreCount(): number {
  return battleArmorStores.size;
}

function ensureValidBattleArmorId(battleArmorId: string | undefined | null, context: string): string {
  if (battleArmorId && isValidUUID(battleArmorId)) {
    return battleArmorId;
  }
  
  const newId = generateUUID();
  console.warn(
    `[BattleArmorStoreRegistry] ${context}: Invalid battle armor ID "${battleArmorId || '(missing)'}" replaced with "${newId}"`
  );
  return newId;
}

export function createAndRegisterBattleArmor(options: CreateBattleArmorOptions): StoreApi<BattleArmorStore> {
  const store = createNewBattleArmorStore(options);
  const state = store.getState();
  battleArmorStores.set(state.id, store);
  return store;
}

export function registerBattleArmorStore(store: StoreApi<BattleArmorStore>): void {
  const state = store.getState();
  battleArmorStores.set(state.id, store);
}

export function hydrateOrCreateBattleArmor(
  battleArmorId: string,
  fallbackOptions: CreateBattleArmorOptions
): StoreApi<BattleArmorStore> {
  const validBattleArmorId = ensureValidBattleArmorId(battleArmorId, 'hydrateOrCreateBattleArmor');
  
  const existing = battleArmorStores.get(validBattleArmorId);
  if (existing) {
    return existing;
  }
  
  const storageKey = `megamek-battlearmor-${validBattleArmorId}`;
  const savedState = safeGetItem(storageKey);
  
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState) as { state?: Partial<BattleArmorState> };
      const state = parsed.state;
      
      if (state) {
        ensureValidBattleArmorId(state.id, 'localStorage state');
        
        const defaultState = createDefaultBattleArmorState({ ...fallbackOptions, id: validBattleArmorId });
        const mergedState: BattleArmorState = {
          ...defaultState,
          ...state,
          id: validBattleArmorId,
        };
      
        const store = createBattleArmorStore(mergedState);
        battleArmorStores.set(validBattleArmorId, store);
        return store;
      }
    } catch (e) {
      console.warn(`Failed to hydrate battle armor ${validBattleArmorId}, creating new:`, e);
    }
  }
  
  const store = createNewBattleArmorStore({ ...fallbackOptions, id: validBattleArmorId });
  battleArmorStores.set(validBattleArmorId, store);
  return store;
}

export function unregisterBattleArmorStore(battleArmorId: string): boolean {
  return battleArmorStores.delete(battleArmorId);
}

export function deleteBattleArmor(battleArmorId: string): boolean {
  const removed = battleArmorStores.delete(battleArmorId);
  if (removed) {
    const storageKey = `megamek-battlearmor-${battleArmorId}`;
    safeRemoveItem(storageKey);
  }
  return removed;
}

export function clearAllBattleArmorStores(clearStorage = false): void {
  if (clearStorage) {
    Array.from(battleArmorStores.keys()).forEach((battleArmorId) => {
      const storageKey = `megamek-battlearmor-${battleArmorId}`;
      safeRemoveItem(storageKey);
    });
  }
  battleArmorStores.clear();
}

export function duplicateBattleArmor(sourceBattleArmorId: string, newName?: string): StoreApi<BattleArmorStore> | null {
  const sourceStore = battleArmorStores.get(sourceBattleArmorId);
  if (!sourceStore) {
    return null;
  }
  
  const sourceState = sourceStore.getState();
  const newState = createDefaultBattleArmorState({
    name: newName ?? `${sourceState.name} (Copy)`,
    techBase: sourceState.techBase,
    chassisType: sourceState.chassisType,
    weightClass: sourceState.weightClass,
    squadSize: sourceState.squadSize,
  });
  
  const mergedState: BattleArmorState = {
    ...newState,
    motionType: sourceState.motionType,
    groundMP: sourceState.groundMP,
    jumpMP: sourceState.jumpMP,
    armorPerTrooper: sourceState.armorPerTrooper,
    leftManipulator: sourceState.leftManipulator,
    rightManipulator: sourceState.rightManipulator,
    hasAPMount: sourceState.hasAPMount,
    hasModularMount: sourceState.hasModularMount,
    hasTurretMount: sourceState.hasTurretMount,
    hasStealthSystem: sourceState.hasStealthSystem,
    stealthType: sourceState.stealthType,
  };
  
  const store = createBattleArmorStore(mergedState);
  battleArmorStores.set(mergedState.id, store);
  return store;
}

export function createBattleArmorFromFullState(state: BattleArmorState): StoreApi<BattleArmorStore> {
  const validId = ensureValidBattleArmorId(state.id, 'createBattleArmorFromFullState');
  
  const existing = battleArmorStores.get(validId);
  if (existing) {
    console.warn(`Battle armor store ${validId} already exists, returning existing`);
    return existing;
  }
  
  const validatedState: BattleArmorState = {
    ...state,
    id: validId,
  };
  
  const store = createBattleArmorStore(validatedState);
  battleArmorStores.set(validId, store);
  
  store.setState({ lastModifiedAt: Date.now() });
  
  return store;
}
