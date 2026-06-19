/**
 * Battle Armor Store Registry
 *
 * Manages all active battle armor store instances.
 * Parallels vehicleStoreRegistry.ts for Combat Vehicles.
 *
 * @spec openspec/changes/add-personnel-customizer/tasks.md
 */

import { StoreApi } from 'zustand';

import { logger } from '@/utils/logger';

import {
  BattleArmorStore,
  BattleArmorState,
  createDefaultBattleArmorState,
  CreateBattleArmorOptions,
} from './battleArmorState';
import {
  createBattleArmorStore,
  createNewBattleArmorStore,
} from './useBattleArmorStore';
import { createStoreRegistry } from './utils/createStoreRegistry';

const battleArmorRegistry = createStoreRegistry<
  BattleArmorStore,
  BattleArmorState,
  CreateBattleArmorOptions
>({
  storageKeyPrefix: 'megamek-battlearmor',
  registryName: 'BattleArmorStoreRegistry',
  createStore: createBattleArmorStore,
  createNewStore: createNewBattleArmorStore,
  createDefaultState: (options, id) =>
    createDefaultBattleArmorState({ ...options, id }),
  getIdFromState: (state) => state.id,
});

export function getBattleArmorStore(
  battleArmorId: string,
): StoreApi<BattleArmorStore> | undefined {
  return battleArmorRegistry.get(battleArmorId);
}

export function hasBattleArmorStore(battleArmorId: string): boolean {
  return battleArmorRegistry.has(battleArmorId);
}

export function getAllBattleArmorIds(): string[] {
  return battleArmorRegistry.getAllIds();
}

export function getBattleArmorStoreCount(): number {
  return battleArmorRegistry.getCount();
}

export function createAndRegisterBattleArmor(
  options: CreateBattleArmorOptions,
): StoreApi<BattleArmorStore> {
  return battleArmorRegistry.createAndRegister(options);
}

export function registerBattleArmorStore(
  store: StoreApi<BattleArmorStore>,
): void {
  battleArmorRegistry.register(store);
}

export function hydrateOrCreateBattleArmor(
  battleArmorId: string,
  fallbackOptions: CreateBattleArmorOptions,
): StoreApi<BattleArmorStore> {
  return battleArmorRegistry.hydrateOrCreate(battleArmorId, fallbackOptions);
}

export function unregisterBattleArmorStore(battleArmorId: string): boolean {
  return battleArmorRegistry.unregister(battleArmorId);
}

export function deleteBattleArmor(battleArmorId: string): boolean {
  return battleArmorRegistry.delete(battleArmorId);
}

export function clearAllBattleArmorStores(clearStorage = false): void {
  battleArmorRegistry.clearAll(clearStorage);
}

export function duplicateBattleArmor(
  sourceBattleArmorId: string,
  newName?: string,
): StoreApi<BattleArmorStore> | null {
  const sourceStore = battleArmorRegistry.get(sourceBattleArmorId);
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
  battleArmorRegistry.register(store);
  return store;
}

export function createBattleArmorFromFullState(
  state: BattleArmorState,
): StoreApi<BattleArmorStore> {
  const validId = battleArmorRegistry.ensureValidId(
    state.id,
    'createBattleArmorFromFullState',
  );

  const existing = battleArmorRegistry.get(validId);
  if (existing) {
    logger.warn(
      `Battle armor store ${validId} already exists, returning existing`,
    );
    return existing;
  }

  const store = createBattleArmorStore({
    ...state,
    id: validId,
  });
  battleArmorRegistry.register(store);
  store.setState({ lastModifiedAt: Date.now() });
  return store;
}
