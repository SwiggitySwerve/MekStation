/**
 * Aerospace Store Factory
 *
 * Creates isolated Zustand stores for individual aerospace fighters.
 * Each aerospace has its own store instance with independent persistence.
 * Parallels useVehicleStore.ts but for aerospace units.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.1
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

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId } from '@/utils/uuid';
import { WeightClass } from '@/types/enums/WeightClass';
import {
  AerospaceState,
  AerospaceStore,
  CreateAerospaceOptions,
  createDefaultAerospaceState,
  createAerospaceMountedEquipment,
  createEmptyAerospaceArmorAllocation,
} from './aerospaceState';

// Re-export types for convenience
export type { AerospaceStore } from './aerospaceState';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine weight class from tonnage for aerospace
 */
function getAerospaceWeightClass(tonnage: number): WeightClass {
  if (tonnage <= 19) return WeightClass.LIGHT;
  if (tonnage <= 39) return WeightClass.MEDIUM;
  if (tonnage <= 69) return WeightClass.HEAVY;
  return WeightClass.ASSAULT;
}

/**
 * Calculate max thrust from safe thrust
 */
function calculateMaxThrust(safeThrust: number): number {
  return Math.floor(safeThrust * 1.5);
}

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single aerospace unit
 */
export function createAerospaceStore(initialState: AerospaceState): StoreApi<AerospaceStore> {
  return create<AerospaceStore>()(
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
        // Chassis Actions
        // =================================================================

        setTonnage: (tonnage) =>
          set((state) => {
            // Recalculate engine rating to maintain same thrust
            const newEngineRating = tonnage * state.safeThrust;
            const clampedRating = Math.max(10, Math.min(400, newEngineRating));

            return {
              tonnage,
              weightClass: getAerospaceWeightClass(tonnage),
              engineRating: clampedRating,
              structuralIntegrity: Math.ceil(tonnage / 10),
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),

        setIsOmni: (isOmni) =>
          set({
            isOmni,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Engine & Movement Actions
        // =================================================================

        setEngineType: (type) =>
          set({
            engineType: type,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setEngineRating: (rating) =>
          set((state) => ({
            engineRating: rating,
            safeThrust: Math.floor(rating / state.tonnage),
            maxThrust: calculateMaxThrust(Math.floor(rating / state.tonnage)),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setSafeThrust: (thrust) =>
          set((state) => ({
            safeThrust: thrust,
            maxThrust: calculateMaxThrust(thrust),
            engineRating: state.tonnage * thrust,
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setFuel: (fuel) =>
          set({
            fuel: Math.max(0, fuel),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Structure & Cockpit Actions
        // =================================================================

        setStructuralIntegrity: (si) =>
          set({
            structuralIntegrity: Math.max(1, si),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setCockpitType: (type) =>
          set({
            cockpitType: type,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setHeatSinks: (count) =>
          set({
            heatSinks: Math.max(0, count),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setDoubleHeatSinks: (value) =>
          set({
            doubleHeatSinks: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Armor Actions
        // =================================================================

        setArmorType: (type) =>
          set({
            armorType: type,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setArmorTonnage: (tonnage) =>
          set({
            armorTonnage: Math.max(0, tonnage),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setArcArmor: (arc, points) =>
          set((state) => ({
            armorAllocation: {
              ...state.armorAllocation,
              [arc]: Math.max(0, points),
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        autoAllocateArmor: () =>
          set((state) => {
            // Use actual armor type's points-per-ton
            const armorDef = getArmorDefinition(state.armorType);
            const pointsPerTon = armorDef?.pointsPerTon ?? 16;
            const totalPoints = Math.floor(state.armorTonnage * pointsPerTon);

            // Distribution percentages (nose gets most)
            const nosePercent = 0.35;
            const wingPercent = 0.25;
            const aftPercent = 0.15;

            const newAllocation = {
              [AerospaceLocation.NOSE]: Math.floor(totalPoints * nosePercent),
              [AerospaceLocation.LEFT_WING]: Math.floor(totalPoints * wingPercent),
              [AerospaceLocation.RIGHT_WING]: Math.floor(totalPoints * wingPercent),
              [AerospaceLocation.AFT]: Math.floor(totalPoints * aftPercent),
            };

            return {
              armorAllocation: newAllocation,
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),

        clearAllArmor: () =>
          set({
            armorAllocation: createEmptyAerospaceArmorAllocation(),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Special Features Actions
        // =================================================================

        setHasBombBay: (value) =>
          set({
            hasBombBay: value,
            bombCapacity: value ? get().bombCapacity : 0,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setBombCapacity: (capacity) =>
          set({
            bombCapacity: Math.max(0, capacity),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setReinforcedCockpit: (value) =>
          set({
            hasReinforcedCockpit: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setEjectionSeat: (value) =>
          set({
            hasEjectionSeat: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Equipment Actions
        // =================================================================

        addEquipment: (item: IEquipmentItem, arc?) => {
          const instanceId = generateUnitId();
          const mountedEquipment = createAerospaceMountedEquipment(item, instanceId, arc);

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

        updateEquipmentArc: (instanceId: string, arc) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, location: arc } : e
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
        name: `megamek-aerospace-${initialState.id}`,
        storage: createJSONStorage(() => clientSafeStorage),
        skipHydration: true,
        // Only persist state, not actions
        partialize: (state) => ({
          id: state.id,
          name: state.name,
          chassis: state.chassis,
          model: state.model,
          mulId: state.mulId,
          year: state.year,
          rulesLevel: state.rulesLevel,
          tonnage: state.tonnage,
          techBase: state.techBase,
          unitType: state.unitType,
          motionType: state.motionType,
          isOmni: state.isOmni,
          engineType: state.engineType,
          engineRating: state.engineRating,
          safeThrust: state.safeThrust,
          fuel: state.fuel,
          structuralIntegrity: state.structuralIntegrity,
          cockpitType: state.cockpitType,
          heatSinks: state.heatSinks,
          doubleHeatSinks: state.doubleHeatSinks,
          armorType: state.armorType,
          armorTonnage: state.armorTonnage,
          armorAllocation: state.armorAllocation,
          hasBombBay: state.hasBombBay,
          bombCapacity: state.bombCapacity,
          hasReinforcedCockpit: state.hasReinforcedCockpit,
          hasEjectionSeat: state.hasEjectionSeat,
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
 * Create a new aerospace store from options
 */
export function createNewAerospaceStore(options: CreateAerospaceOptions): StoreApi<AerospaceStore> {
  const initialState = createDefaultAerospaceState(options);
  return createAerospaceStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active aerospace's store
 */
export const AerospaceStoreContext = createContext<StoreApi<AerospaceStore> | null>(null);

/**
 * Hook to access the aerospace store from context
 *
 * @example
 * const safeThrust = useAerospaceStore((s) => s.safeThrust);
 * const setSafeThrust = useAerospaceStore((s) => s.setSafeThrust);
 */
export function useAerospaceStore<T>(selector: (state: AerospaceStore) => T): T {
  const store = useContext(AerospaceStoreContext);

  if (!store) {
    throw new Error(
      'useAerospaceStore must be used within an AerospaceStoreProvider. ' +
        'Wrap your component tree with <AerospaceStoreProvider>.'
    );
  }

  return useStore(store, selector);
}

/**
 * Hook to get the entire aerospace store API
 */
export function useAerospaceStoreApi(): StoreApi<AerospaceStore> {
  const store = useContext(AerospaceStoreContext);

  if (!store) {
    throw new Error('useAerospaceStoreApi must be used within an AerospaceStoreProvider.');
  }

  return store;
}
