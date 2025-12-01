/**
 * Unit Store Factory
 * 
 * Creates isolated Zustand stores for individual units.
 * Each unit has its own store instance with independent persistence.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/unit-store-architecture/spec.md
 */

import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { createContext, useContext } from 'react';

// =============================================================================
// Client-Safe Storage
// =============================================================================

/**
 * Storage wrapper that safely handles SSR (no localStorage on server)
 */
const clientSafeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(name);
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
  },
};
import { TechBase } from '@/types/enums/TechBase';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import {
  UnitState,
  UnitActions,
  UnitStore,
  CreateUnitOptions,
  createDefaultUnitState,
  ISelectionMemory,
  ITechBaseMemory,
  createEmptySelectionMemory,
} from './unitState';
import {
  getValidatedSelectionUpdates,
  getFullyValidatedSelections,
  getSelectionWithMemory,
  ComponentSelections,
} from '@/utils/techBaseValidation';

// Re-export UnitStore type for convenience
export type { UnitStore } from './unitState';

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single unit
 * 
 * Each unit gets its own store instance that:
 * - Contains only that unit's state
 * - Persists independently to localStorage
 * - Has a clean API without tabId parameters
 */
export function createUnitStore(initialState: UnitState): StoreApi<UnitStore> {
  return create<UnitStore>()(
    persist(
      (set) => ({
        // Spread initial state
        ...initialState,
        
        // =================================================================
        // Name Actions
        // =================================================================
        
        setName: (name) => set({
          name,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Tech Base Actions
        // =================================================================
        
        setTechBaseMode: (mode) => set((state) => {
          // When switching to non-mixed mode, reset all components to match
          const newTechBase = mode === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
          const newComponentTechBases = mode === 'mixed'
            ? state.componentTechBases
            : createDefaultComponentTechBases(newTechBase);
          
          // Determine old tech base key for saving to memory
          const oldTechBaseKey = state.techBaseMode === 'clan' ? 'CLAN' : 'IS';
          const newTechBaseKey = mode === 'clan' ? 'CLAN' : (mode === 'inner_sphere' ? 'IS' : null);
          
          const currentSelections: ComponentSelections = {
            engineType: state.engineType,
            gyroType: state.gyroType,
            internalStructureType: state.internalStructureType,
            cockpitType: state.cockpitType,
            heatSinkType: state.heatSinkType,
            armorType: state.armorType,
          };
          
          // Save current selections to memory for the OLD tech base (if not mixed)
          let updatedMemory = { ...state.selectionMemory };
          if (state.techBaseMode !== 'mixed') {
            updatedMemory = {
              engine: { ...updatedMemory.engine, [oldTechBaseKey]: state.engineType },
              gyro: { ...updatedMemory.gyro, [oldTechBaseKey]: state.gyroType },
              structure: { ...updatedMemory.structure, [oldTechBaseKey]: state.internalStructureType },
              cockpit: { ...updatedMemory.cockpit, [oldTechBaseKey]: state.cockpitType },
              heatSink: { ...updatedMemory.heatSink, [oldTechBaseKey]: state.heatSinkType },
              armor: { ...updatedMemory.armor, [oldTechBaseKey]: state.armorType },
            };
          }
          
          // Validate and update all component selections for the new tech bases
          // Try to restore from memory if switching to a non-mixed mode
          const validatedSelections = getFullyValidatedSelections(
            newComponentTechBases,
            currentSelections,
            newTechBaseKey ? updatedMemory : undefined,
            newTechBaseKey ?? undefined
          );
          
          return {
            techBaseMode: mode,
            componentTechBases: newComponentTechBases,
            selectionMemory: updatedMemory,
            ...validatedSelections,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setComponentTechBase: (component, techBase) => set((state) => {
          const oldTechBase = state.componentTechBases[component];
          const techBaseKey = oldTechBase === TechBase.CLAN ? 'CLAN' : 'IS';
          const newTechBaseKey = techBase === TechBase.CLAN ? 'CLAN' : 'IS';
          
          const currentSelections: ComponentSelections = {
            engineType: state.engineType,
            gyroType: state.gyroType,
            internalStructureType: state.internalStructureType,
            cockpitType: state.cockpitType,
            heatSinkType: state.heatSinkType,
            armorType: state.armorType,
          };
          
          // Save current selections to memory for the OLD tech base
          const updatedMemory: ISelectionMemory = {
            ...state.selectionMemory,
          };
          
          // Map component to memory key and save current value
          if (component === 'engine') {
            updatedMemory.engine = { ...updatedMemory.engine, [techBaseKey]: state.engineType };
          } else if (component === 'gyro') {
            updatedMemory.gyro = { ...updatedMemory.gyro, [techBaseKey]: state.gyroType };
          } else if (component === 'chassis') {
            updatedMemory.structure = { ...updatedMemory.structure, [techBaseKey]: state.internalStructureType };
            updatedMemory.cockpit = { ...updatedMemory.cockpit, [techBaseKey]: state.cockpitType };
          } else if (component === 'heatsink') {
            updatedMemory.heatSink = { ...updatedMemory.heatSink, [techBaseKey]: state.heatSinkType };
          } else if (component === 'armor') {
            updatedMemory.armor = { ...updatedMemory.armor, [techBaseKey]: state.armorType };
          }
          
          // Get validated selection updates, using memory if available
          const selectionUpdates = getSelectionWithMemory(
            component as TechBaseComponent,
            techBase,
            currentSelections,
            updatedMemory,
            newTechBaseKey
          );
          
          return {
            componentTechBases: {
              ...state.componentTechBases,
              [component]: techBase,
            },
            selectionMemory: updatedMemory,
            ...selectionUpdates,
            isModified: true,
            lastModifiedAt: Date.now(),
          };
        }),
        
        setAllComponentTechBases: (techBases) => set({
          componentTechBases: techBases,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Component Actions
        // =================================================================
        
        setEngineType: (type) => set({
          engineType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setEngineRating: (rating) => set({
          engineRating: rating,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setGyroType: (type) => set({
          gyroType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setInternalStructureType: (type) => set({
          internalStructureType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setCockpitType: (type) => set({
          cockpitType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setHeatSinkType: (type) => set({
          heatSinkType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setHeatSinkCount: (count) => set({
          heatSinkCount: count,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        setArmorType: (type) => set({
          armorType: type,
          isModified: true,
          lastModifiedAt: Date.now(),
        }),
        
        // =================================================================
        // Metadata Actions
        // =================================================================
        
        markModified: (modified = true) => set({
          isModified: modified,
          lastModifiedAt: Date.now(),
        }),
      }),
      {
        name: `megamek-unit-${initialState.id}`,
        storage: createJSONStorage(() => clientSafeStorage),
        skipHydration: true, // We manually hydrate after client mount
        // Only persist state, not actions
        partialize: (state) => ({
          id: state.id,
          name: state.name,
          tonnage: state.tonnage,
          techBase: state.techBase,
          unitType: state.unitType,
          configuration: state.configuration,
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
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
        }),
      }
    )
  );
}

/**
 * Create a new unit store from options
 */
export function createNewUnitStore(options: CreateUnitOptions): StoreApi<UnitStore> {
  const initialState = createDefaultUnitState(options);
  return createUnitStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active unit's store
 */
export const UnitStoreContext = createContext<StoreApi<UnitStore> | null>(null);

/**
 * Hook to access the unit store from context
 * 
 * This is the primary way components access unit state.
 * No tabId is needed - the context provides the active unit's store.
 * 
 * @example
 * const engineType = useUnitStore((s) => s.engineType);
 * const setEngineType = useUnitStore((s) => s.setEngineType);
 */
export function useUnitStore<T>(selector: (state: UnitStore) => T): T {
  const store = useContext(UnitStoreContext);
  
  if (!store) {
    throw new Error(
      'useUnitStore must be used within a UnitStoreProvider. ' +
      'Wrap your component tree with <UnitStoreProvider>.'
    );
  }
  
  return useStore(store, selector);
}

/**
 * Hook to get the entire unit store API
 * Useful when you need direct access to the store
 */
export function useUnitStoreApi(): StoreApi<UnitStore> {
  const store = useContext(UnitStoreContext);
  
  if (!store) {
    throw new Error(
      'useUnitStoreApi must be used within a UnitStoreProvider.'
    );
  }
  
  return store;
}

