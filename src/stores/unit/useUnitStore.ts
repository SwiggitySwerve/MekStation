/**
 * Unit Store Factory (Composition Shell)
 *
 * Creates isolated Zustand stores for individual units by composing
 * domain-specific action slices: armor, equipment, structure, tech base.
 *
 * Each unit gets its own store instance with independent persistence.
 *
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { createContext, useContext } from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { pickPersistedUnitIdentityWithClanName } from '@/stores/unitStoreIdentityActions';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';

import {
  UnitState,
  UnitStore,
  CreateUnitOptions,
  createDefaultUnitState,
} from '../unitState';
import { wrapUnitEditActions } from './unitEditHistory';
import { createArmorSlice } from './useUnitArmorStore';
import { createEquipmentSlice } from './useUnitEquipmentStore';
import { createFluffSlice } from './useUnitFluffStore';
import { createStructureSlice } from './useUnitStructureStore';
import { createTechBaseSlice } from './useUnitTechBaseStore';

export type { UnitStore } from '../unitState';

function pickPersistedUnitState(state: UnitStore) {
  return {
    ...pickPersistedUnitIdentityWithClanName(state),
    sourceDefinition: state.sourceDefinition,
    librarySave: state.librarySave,
    role: state.role,
    fluff: state.fluff,
    tonnage: state.tonnage,
    techBase: state.techBase,
    unitType: state.unitType,
    configuration: state.configuration,
    lamMode: state.lamMode,
    quadVeeMode: state.quadVeeMode,
    isOmni: state.isOmni,
    baseChassisHeatSinks: state.baseChassisHeatSinks,
    techBaseMode: state.techBaseMode,
    componentTechBases: state.componentTechBases,
    selectionMemory: state.selectionMemory,
    engineType: state.engineType,
    engineRating: state.engineRating,
    gyroType: state.gyroType,
    internalStructureType: state.internalStructureType,
    cockpitType: state.cockpitType,
    heatSinkType: state.heatSinkType,
    heatSinkCount: state.heatSinkCount,
    armorType: state.armorType,
    armorTonnage: state.armorTonnage,
    armorAllocation: state.armorAllocation,
    armActuators: state.armActuators,
    enhancement: state.enhancement,
    jumpMP: state.jumpMP,
    jumpJetType: state.jumpJetType,
    equipment: state.equipment,
    isModified: state.isModified,
    createdAt: state.createdAt,
    lastModifiedAt: state.lastModifiedAt,
  };
}

function unitStorePersistOptions(initialState: UnitState) {
  return {
    name: `megamek-unit-${initialState.id}`,
    storage: createJSONStorage(() => clientSafeStorage),
    skipHydration: true,
    partialize: pickPersistedUnitState,
  };
}

/**
 * Create an isolated Zustand store for a single unit.
 *
 * Composes action slices from sub-stores:
 * - Armor: allocation, auto-allocate, maximize, clear
 * - Equipment: add/remove/mount, targeting computer sync
 * - Structure: engine, gyro, heat sinks, jump jets (with cascade/displacement)
 * - Tech Base: mode switching, component tech bases, selection memory
 */
export function createUnitStore(initialState: UnitState): StoreApi<UnitStore> {
  const store: StoreApi<UnitStore> = create<UnitStore>()(
    persist(
      (set, get) => ({
        // Spread initial state
        ...initialState,

        // Compose action slices
        ...wrapUnitEditActions(
          {
            ...createArmorSlice(set, get),
            ...createEquipmentSlice(set, get),
            ...createFluffSlice(set),
            ...createStructureSlice(set, get),
            ...createTechBaseSlice(set, get),
          },
          () => store,
        ),
      }),
      unitStorePersistOptions(initialState),
    ),
  );
  return store;
}

export function createNewUnitStore(
  options: CreateUnitOptions,
): StoreApi<UnitStore> {
  const initialState = createDefaultUnitState(options);
  return createUnitStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

export const UnitStoreContext = createContext<StoreApi<UnitStore> | null>(null);

export function useUnitStore<T>(selector: (state: UnitStore) => T): T {
  const store = useContext(UnitStoreContext);

  if (!store) {
    throw new Error(
      'useUnitStore must be used within a UnitStoreProvider. ' +
        'Wrap your component tree with <UnitStoreProvider>.',
    );
  }

  return useStore(store, selector);
}

export function useUnitStoreApi(): StoreApi<UnitStore> {
  const store = useContext(UnitStoreContext);

  if (!store) {
    throw new Error('useUnitStoreApi must be used within a UnitStoreProvider.');
  }

  return store;
}
