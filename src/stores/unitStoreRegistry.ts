/**
 * Unit Store Registry
 * 
 * Manages all active unit store instances.
 * Provides lookup, creation, and cleanup of unit stores.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/unit-store-architecture/spec.md
 */

import { StoreApi } from 'zustand';
import { UnitStore, UnitState, createDefaultUnitState, CreateUnitOptions } from './unitState';
import { createUnitStore, createNewUnitStore } from './useUnitStore';

// =============================================================================
// SSR-Safe Storage Helper
// =============================================================================

/**
 * Safely get item from localStorage (returns null during SSR)
 */
function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

/**
 * Safely remove item from localStorage (no-op during SSR)
 */
function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

// =============================================================================
// Registry
// =============================================================================

/**
 * Map of unit ID -> store instance
 */
const unitStores = new Map<string, StoreApi<UnitStore>>();

/**
 * Get a unit store by ID
 * Returns undefined if the store doesn't exist
 */
export function getUnitStore(unitId: string): StoreApi<UnitStore> | undefined {
  return unitStores.get(unitId);
}

/**
 * Check if a unit store exists
 */
export function hasUnitStore(unitId: string): boolean {
  return unitStores.has(unitId);
}

/**
 * Get all unit store IDs
 */
export function getAllUnitIds(): string[] {
  return Array.from(unitStores.keys());
}

/**
 * Get the count of registered stores
 */
export function getStoreCount(): number {
  return unitStores.size;
}

// =============================================================================
// Store Creation
// =============================================================================

/**
 * Create and register a new unit store
 * 
 * @param options - Options for creating the unit
 * @returns The created store
 */
export function createAndRegisterUnit(options: CreateUnitOptions): StoreApi<UnitStore> {
  const store = createNewUnitStore(options);
  const state = store.getState();
  unitStores.set(state.id, store);
  return store;
}

/**
 * Register an existing store
 * Useful when hydrating from localStorage
 */
export function registerStore(store: StoreApi<UnitStore>): void {
  const state = store.getState();
  unitStores.set(state.id, store);
}

/**
 * Hydrate a unit store from localStorage
 * If the unit was previously saved, this restores it
 * 
 * @param unitId - The unit ID to hydrate
 * @param fallbackOptions - Options to use if no saved state exists
 * @returns The hydrated or new store
 */
export function hydrateOrCreateUnit(
  unitId: string,
  fallbackOptions: CreateUnitOptions
): StoreApi<UnitStore> {
  // Check if already in registry
  const existing = unitStores.get(unitId);
  if (existing) {
    return existing;
  }
  
  // Try to load from localStorage (SSR-safe)
  const storageKey = `megamek-unit-${unitId}`;
  const savedState = safeGetItem(storageKey);
  
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      const state = parsed.state as Partial<UnitState>;
      
      // Create store with saved state merged with defaults
      const defaultState = createDefaultUnitState({ ...fallbackOptions, id: unitId });
      const mergedState: UnitState = {
        ...defaultState,
        ...state,
        id: unitId, // Ensure ID matches
      };
      
      const store = createUnitStore(mergedState);
      unitStores.set(unitId, store);
      return store;
    } catch (e) {
      console.warn(`Failed to hydrate unit ${unitId}, creating new:`, e);
    }
  }
  
  // Create new unit with fallback options
  const store = createNewUnitStore({ ...fallbackOptions, id: unitId });
  unitStores.set(unitId, store);
  return store;
}

// =============================================================================
// Store Cleanup
// =============================================================================

/**
 * Remove a store from the registry
 * Does NOT delete the localStorage entry
 */
export function unregisterStore(unitId: string): boolean {
  return unitStores.delete(unitId);
}

/**
 * Remove a store and delete its localStorage entry
 */
export function deleteUnit(unitId: string): boolean {
  const removed = unitStores.delete(unitId);
  if (removed) {
    const storageKey = `megamek-unit-${unitId}`;
    safeRemoveItem(storageKey);
  }
  return removed;
}

/**
 * Clear all stores from the registry
 * Optionally also clear localStorage
 */
export function clearAllStores(clearStorage = false): void {
  if (clearStorage) {
    Array.from(unitStores.keys()).forEach((unitId) => {
      const storageKey = `megamek-unit-${unitId}`;
      safeRemoveItem(storageKey);
    });
  }
  unitStores.clear();
}

// =============================================================================
// Duplicate Support
// =============================================================================

/**
 * Duplicate a unit store with a new ID
 */
export function duplicateUnit(sourceUnitId: string, newName?: string): StoreApi<UnitStore> | null {
  const sourceStore = unitStores.get(sourceUnitId);
  if (!sourceStore) {
    return null;
  }
  
  const sourceState = sourceStore.getState();
  const newState = createDefaultUnitState({
    name: newName ?? `${sourceState.name} (Copy)`,
    tonnage: sourceState.tonnage,
    techBase: sourceState.techBase,
    walkMP: Math.floor(sourceState.engineRating / sourceState.tonnage),
  });
  
  // Copy configuration from source
  const mergedState: UnitState = {
    ...newState,
    techBaseMode: sourceState.techBaseMode,
    componentTechBases: { ...sourceState.componentTechBases },
    engineType: sourceState.engineType,
    engineRating: sourceState.engineRating,
    gyroType: sourceState.gyroType,
    internalStructureType: sourceState.internalStructureType,
    cockpitType: sourceState.cockpitType,
    heatSinkType: sourceState.heatSinkType,
    heatSinkCount: sourceState.heatSinkCount,
    armorType: sourceState.armorType,
  };
  
  const store = createUnitStore(mergedState);
  unitStores.set(mergedState.id, store);
  return store;
}
