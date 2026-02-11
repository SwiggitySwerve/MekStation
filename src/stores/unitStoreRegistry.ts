/**
 * Unit Store Registry
 *
 * Manages all active unit store instances.
 * Provides lookup, creation, and cleanup of unit stores.
 *
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { StoreApi } from 'zustand';

import { safeGetItem, safeRemoveItem } from '@/stores/utils/clientSafeStorage';
import { logger } from '@/utils/logger';
import { isValidUUID, generateUUID } from '@/utils/uuid';

import {
  UnitStore,
  UnitState,
  createDefaultUnitState,
  CreateUnitOptions,
} from './unitState';
import { createUnitStore, createNewUnitStore } from './useUnitStore';

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
export function createAndRegisterUnit(
  options: CreateUnitOptions,
): StoreApi<UnitStore> {
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
 * Validate and potentially repair a unit ID
 *
 * @param unitId - The unit ID to validate
 * @param context - Context string for logging
 * @returns A valid UUID (original if valid, or newly generated)
 */
function ensureValidUnitId(
  unitId: string | undefined | null,
  context: string,
): string {
  if (unitId && isValidUUID(unitId)) {
    return unitId;
  }

  const newId = generateUUID();
  logger.warn(
    `[UnitStoreRegistry] ${context}: Invalid unit ID "${unitId || '(missing)'}" replaced with "${newId}"`,
  );
  return newId;
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
  fallbackOptions: CreateUnitOptions,
): StoreApi<UnitStore> {
  // Validate the requested unit ID
  const validUnitId = ensureValidUnitId(unitId, 'hydrateOrCreateUnit');

  // Check if already in registry
  const existing = unitStores.get(validUnitId);
  if (existing) {
    return existing;
  }

  // Try to load from localStorage (SSR-safe)
  const storageKey = `megamek-unit-${validUnitId}`;
  const savedState = safeGetItem(storageKey);

  if (savedState) {
    try {
      const parsed = JSON.parse(savedState) as { state?: Partial<UnitState> };
      const state = parsed.state;

      if (state) {
        // Validate the ID from localStorage as well (the function logs a warning if invalid)
        ensureValidUnitId(state.id, 'localStorage state');

        // Create store with saved state merged with defaults
        const defaultState = createDefaultUnitState({
          ...fallbackOptions,
          id: validUnitId,
        });
        const mergedState: UnitState = {
          ...defaultState,
          ...state,
          id: validUnitId, // Always use the validated ID we were called with
        };

        const store = createUnitStore(mergedState);
        unitStores.set(validUnitId, store);
        return store;
      }
    } catch (e) {
      logger.warn(`Failed to hydrate unit ${validUnitId}, creating new:`, e);
    }
  }

  // Create new unit with fallback options
  const store = createNewUnitStore({ ...fallbackOptions, id: validUnitId });
  unitStores.set(validUnitId, store);
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
export function duplicateUnit(
  sourceUnitId: string,
  newName?: string,
): StoreApi<UnitStore> | null {
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

// =============================================================================
// Load from Full State (for unit loading feature)
// =============================================================================

/**
 * Create and register a unit store from a complete UnitState
 *
 * This is used when loading units from canonical JSON or custom units database.
 * The state should already be fully mapped/transformed before calling this.
 *
 * @param state - Complete UnitState object
 * @returns The created store
 */
export function createUnitFromFullState(state: UnitState): StoreApi<UnitStore> {
  // Validate the ID
  const validId = ensureValidUnitId(state.id, 'createUnitFromFullState');

  // Check if already exists (shouldn't happen since IDs are unique UUIDs)
  const existing = unitStores.get(validId);
  if (existing) {
    logger.warn(`Unit store ${validId} already exists, returning existing`);
    return existing;
  }

  // Create the store with the full state, ensuring valid ID
  const validatedState: UnitState = {
    ...state,
    id: validId,
  };

  const store = createUnitStore(validatedState);
  unitStores.set(validId, store);

  // Force initial state to be persisted to localStorage.
  // Zustand's persist middleware only saves on set() calls, not on initial creation.
  // We trigger a minimal state change to force the persist middleware to write.
  store.setState({ lastModifiedAt: Date.now() });

  return store;
}
