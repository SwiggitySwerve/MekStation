/**
 * ProtoMech Store Factory
 *
 * Creates isolated Zustand stores for individual ProtoMech units.
 * Each ProtoMech has its own store instance with independent persistence.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.3
 */

import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import { createContext, useContext } from 'react';

// =============================================================================
// Client-Safe Storage
// =============================================================================

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

import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId } from '@/utils/uuid';
import { RulesLevel } from '@/types/enums/RulesLevel';
import {
  ProtoMechState,
  ProtoMechStore,
  CreateProtoMechOptions,
  createDefaultProtoMechState,
  createProtoMechMountedEquipment,
  createEmptyProtoMechArmorAllocation,
} from './protoMechState';

// Re-export types for convenience
export type { ProtoMechStore } from './protoMechState';

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single ProtoMech unit
 */
export function createProtoMechStore(initialState: ProtoMechState): StoreApi<ProtoMechStore> {
  return create<ProtoMechStore>()(
    persist(
      (set, get) => ({
        // Spread initial state
        ...initialState,

        // =================================================================
        // Identity Actions
        // =================================================================

        setName: (name) =>
          set({
            name,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setChassis: (chassis) =>
          set((state) => ({
            chassis,
            name: `${chassis}${state.model ? ' ' + state.model : ''}`,
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setModel: (model) =>
          set((state) => ({
            model,
            name: `${state.chassis}${model ? ' ' + model : ''}`,
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setMulId: (mulId) =>
          set({
            mulId,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setYear: (year) =>
          set({
            year,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setRulesLevel: (rulesLevel) =>
          set({
            rulesLevel,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Classification Actions
        // =================================================================

        setTonnage: (tonnage) =>
          set((state) => {
            const clampedTonnage = Math.max(2, Math.min(9, tonnage));
            const newCruiseMP = Math.max(1, 10 - clampedTonnage);
            return {
              tonnage: clampedTonnage,
              cruiseMP: newCruiseMP,
              flankMP: Math.floor(newCruiseMP * 1.5),
              engineRating: clampedTonnage * newCruiseMP,
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),

        setPointSize: (pointSize) =>
          set({
            pointSize: Math.max(1, Math.min(5, pointSize)),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setQuad: (isQuad) =>
          set({
            isQuad,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setGlider: (isGlider) =>
          set({
            isGlider,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Movement Actions
        // =================================================================

        setEngineRating: (engineRating) =>
          set((state) => ({
            engineRating,
            cruiseMP: Math.floor(engineRating / state.tonnage),
            flankMP: Math.floor((engineRating / state.tonnage) * 1.5),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setCruiseMP: (cruiseMP) =>
          set((state) => ({
            cruiseMP: Math.max(1, cruiseMP),
            flankMP: Math.floor(cruiseMP * 1.5),
            engineRating: state.tonnage * cruiseMP,
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setJumpMP: (jumpMP) =>
          set({
            jumpMP: Math.max(0, jumpMP),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Structure & Armor Actions
        // =================================================================

        setArmorType: (armorType) =>
          set({
            armorType,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setLocationArmor: (location, points) =>
          set((state) => ({
            armorByLocation: {
              ...state.armorByLocation,
              [location]: Math.max(0, points),
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setLocationStructure: (location, points) =>
          set((state) => ({
            structureByLocation: {
              ...state.structureByLocation,
              [location]: Math.max(0, points),
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        autoAllocateArmor: () =>
          set((state) => {
            // ProtoMechs get armor based on tonnage
            const maxArmor = state.tonnage * 6; // Simplified calculation
            const torsoPercent = 0.35;
            const legsPercent = 0.25;
            const armPercent = 0.10;
            const headPercent = 0.10;

            return {
              armorByLocation: {
                [ProtoMechLocation.HEAD]: Math.floor(maxArmor * headPercent),
                [ProtoMechLocation.TORSO]: Math.floor(maxArmor * torsoPercent),
                [ProtoMechLocation.LEFT_ARM]: Math.floor(maxArmor * armPercent),
                [ProtoMechLocation.RIGHT_ARM]: Math.floor(maxArmor * armPercent),
                [ProtoMechLocation.LEGS]: Math.floor(maxArmor * legsPercent),
                [ProtoMechLocation.MAIN_GUN]: state.hasMainGun ? 2 : 0,
              },
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),

        clearAllArmor: () =>
          set({
            armorByLocation: createEmptyProtoMechArmorAllocation(),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Main Gun Actions
        // =================================================================

        setMainGun: (hasMainGun) =>
          set({
            hasMainGun,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Special System Actions
        // =================================================================

        setMyomerBooster: (hasMyomerBooster) =>
          set({
            hasMyomerBooster,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setMagneticClamps: (hasMagneticClamps) =>
          set({
            hasMagneticClamps,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setExtendedTorsoTwist: (hasExtendedTorsoTwist) =>
          set({
            hasExtendedTorsoTwist,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Equipment Actions
        // =================================================================

        addEquipment: (item: IEquipmentItem, location?) => {
          const instanceId = generateUnitId();
          const mountedEquipment = createProtoMechMountedEquipment(item, instanceId, location);

          set((state) => ({
            equipment: [...state.equipment, mountedEquipment],
            isModified: true,
            lastModifiedAt: Date.now(),
          }));

          return instanceId;
        },

        removeEquipment: (instanceId: string) =>
          set((state) => ({
            equipment: state.equipment.filter((e) => e.id !== instanceId),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        updateEquipmentLocation: (instanceId: string, location) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, location } : e
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === weaponInstanceId ? { ...e, linkedAmmoId: ammoInstanceId } : e
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        clearAllEquipment: () =>
          set({
            equipment: [],
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Metadata Actions
        // =================================================================

        markModified: (modified = true) =>
          set({
            isModified: modified,
            lastModifiedAt: Date.now(),
          }),
      }),
      {
        name: `megamek-protomech-${initialState.id}`,
        storage: createJSONStorage(() => clientSafeStorage),
        skipHydration: true,
        partialize: (state) => ({
          id: state.id,
          name: state.name,
          chassis: state.chassis,
          model: state.model,
          mulId: state.mulId,
          year: state.year,
          rulesLevel: state.rulesLevel,
          techBase: state.techBase,
          unitType: state.unitType,
          tonnage: state.tonnage,
          pointSize: state.pointSize,
          isQuad: state.isQuad,
          isGlider: state.isGlider,
          engineRating: state.engineRating,
          cruiseMP: state.cruiseMP,
          flankMP: state.flankMP,
          jumpMP: state.jumpMP,
          structureByLocation: state.structureByLocation,
          armorByLocation: state.armorByLocation,
          armorType: state.armorType,
          hasMainGun: state.hasMainGun,
          hasMyomerBooster: state.hasMyomerBooster,
          hasMagneticClamps: state.hasMagneticClamps,
          hasExtendedTorsoTwist: state.hasExtendedTorsoTwist,
          equipment: state.equipment,
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
        }),
      }
    )
  );
}

/**
 * Create a new ProtoMech store from options
 */
export function createNewProtoMechStore(options: CreateProtoMechOptions): StoreApi<ProtoMechStore> {
  const initialState = createDefaultProtoMechState(options);
  return createProtoMechStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active ProtoMech's store
 */
export const ProtoMechStoreContext = createContext<StoreApi<ProtoMechStore> | null>(null);

/**
 * Hook to access the ProtoMech store from context
 */
export function useProtoMechStore<T>(selector: (state: ProtoMechStore) => T): T {
  const store = useContext(ProtoMechStoreContext);

  if (!store) {
    throw new Error(
      'useProtoMechStore must be used within a ProtoMechStoreProvider. ' +
        'Wrap your component tree with <ProtoMechStoreContext.Provider>.'
    );
  }

  return useStore(store, selector);
}

/**
 * Hook to get the entire ProtoMech store API
 */
export function useProtoMechStoreApi(): StoreApi<ProtoMechStore> {
  const store = useContext(ProtoMechStoreContext);

  if (!store) {
    throw new Error('useProtoMechStoreApi must be used within a ProtoMechStoreProvider.');
  }

  return store;
}
