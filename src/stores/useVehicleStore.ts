/**
 * Vehicle Store Factory
 *
 * Creates isolated Zustand stores for individual vehicles.
 * Each vehicle has its own store instance with independent persistence.
 * Parallels useUnitStore.ts but for vehicles.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.1
 */

import { createContext, useContext } from "react";
import { create, StoreApi, useStore } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { clientSafeStorage } from "@/stores/utils/clientSafeStorage";
import { IEquipmentItem } from "@/types/equipment";
import { generateUnitId } from "@/utils/uuid";

import {
  VehicleState,
  VehicleStore,
  CreateVehicleOptions,
  createDefaultVehicleState,
  createVehicleMountedEquipment,
} from "./vehicleState";

// Re-export types for convenience
export type { VehicleStore } from "./vehicleState";
import {
  autoAllocateArmorLogic,
  clearAllArmorLogic,
  derivePowerAmpWeightLogic,
  setCruiseMPLogic,
  setEngineRatingLogic,
  setLocationArmorLogic,
  setMotionTypeLogic,
  setTonnageLogic,
  setTurretTypeLogic,
  setTurretWeightLogic,
  updateEquipmentLocationLogic,
} from "./useVehicleStore.actions";
import { VehicleStructureType } from "@/utils/construction/vehicle/structure";

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single vehicle
 */
export function createVehicleStore(
  initialState: VehicleState,
): StoreApi<VehicleStore> {
  return create<VehicleStore>()(
    persist(
      (set, _get) => ({
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
            name: `${chassis}${state.model ? " " + state.model : ""}`,
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setModel: (model) =>
          set((state) => ({
            model,
            name: `${state.chassis}${model ? " " + model : ""}`,
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
          set((state) => setTonnageLogic(state, tonnage)),

        setMotionType: (motionType) =>
          set((state) => setMotionTypeLogic(state, motionType)),

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
          set((state) => setEngineRatingLogic(state, rating)),

        setCruiseMP: (cruiseMP) =>
          set((state) => setCruiseMPLogic(state, cruiseMP)),

        // =================================================================
        // Turret Actions
        // =================================================================

        setTurretType: (type) =>
          set((state) => setTurretTypeLogic(state, type)),

        setTurretWeight: (weight) =>
          set((state) => setTurretWeightLogic(state, weight)),

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

        setLocationArmor: (location, points) =>
          set((state) => setLocationArmorLogic(state, location, points)),

        autoAllocateArmor: () => set((state) => autoAllocateArmorLogic(state)),

        clearAllArmor: () => set((state) => clearAllArmorLogic(state)),

        // =================================================================
        // Construction Field Actions
        // =================================================================

        setStructureType: (structureType: VehicleStructureType) =>
          set({
            structureType,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setCrewSize: (crewSize: number) =>
          set({
            crewSize: Math.max(0, crewSize),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setPassengerSlots: (passengerSlots: number) =>
          set({
            passengerSlots: Math.max(0, passengerSlots),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setBarRating: (barRating: number | null) =>
          set({
            barRating,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        derivePowerAmpWeight: (resolvedItems?: IEquipmentItem[]) =>
          set((state) => derivePowerAmpWeightLogic(state, resolvedItems)),

        // =================================================================
        // Special Features Actions
        // =================================================================

        setEnvironmentalSealing: (value) =>
          set({
            hasEnvironmentalSealing: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setFlotationHull: (value) =>
          set({
            hasFlotationHull: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setAmphibious: (value) =>
          set({
            isAmphibious: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setTrailerHitch: (value) =>
          set({
            hasTrailerHitch: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setIsTrailer: (value) =>
          set({
            isTrailer: value,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Equipment Actions
        // =================================================================

        addEquipment: (item: IEquipmentItem, location?, isTurretMounted?) => {
          const instanceId = generateUnitId();
          const mountedEquipment = createVehicleMountedEquipment(
            item,
            instanceId,
            location,
            isTurretMounted ?? false,
          );

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

        updateEquipmentLocation: (instanceId, location, isTurretMounted?) =>
          set((state) =>
            updateEquipmentLocationLogic(
              state,
              instanceId,
              location,
              isTurretMounted,
            ),
          ),

        setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, isRearMounted } : e,
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        linkAmmo: (
          weaponInstanceId: string,
          ammoInstanceId: string | undefined,
        ) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === weaponInstanceId
                ? { ...e, linkedAmmoId: ammoInstanceId }
                : e,
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
        name: `megamek-vehicle-${initialState.id}`,
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
          cruiseMP: state.cruiseMP,
          turret: state.turret,
          secondaryTurret: state.secondaryTurret,
          armorType: state.armorType,
          armorTonnage: state.armorTonnage,
          armorAllocation: state.armorAllocation,
          isSuperheavy: state.isSuperheavy,
          hasEnvironmentalSealing: state.hasEnvironmentalSealing,
          hasFlotationHull: state.hasFlotationHull,
          isAmphibious: state.isAmphibious,
          hasTrailerHitch: state.hasTrailerHitch,
          isTrailer: state.isTrailer,
          structureType: state.structureType,
          crewSize: state.crewSize,
          passengerSlots: state.passengerSlots,
          barRating: state.barRating,
          powerAmpWeight: state.powerAmpWeight,
          equipment: state.equipment,
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
        }),
      },
    ),
  );
}

/**
 * Create a new vehicle store from options
 */
export function createNewVehicleStore(
  options: CreateVehicleOptions,
): StoreApi<VehicleStore> {
  const initialState = createDefaultVehicleState(options);
  return createVehicleStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active vehicle's store
 */
export const VehicleStoreContext = createContext<StoreApi<VehicleStore> | null>(
  null,
);

/**
 * Hook to access the vehicle store from context
 *
 * @example
 * const motionType = useVehicleStore((s) => s.motionType);
 * const setMotionType = useVehicleStore((s) => s.setMotionType);
 */
export function useVehicleStore<T>(selector: (state: VehicleStore) => T): T {
  const store = useContext(VehicleStoreContext);

  if (!store) {
    throw new Error(
      "useVehicleStore must be used within a VehicleStoreProvider. " +
        "Wrap your component tree with <VehicleStoreProvider>.",
    );
  }

  return useStore(store, selector);
}

/**
 * Hook to get the entire vehicle store API
 */
export function useVehicleStoreApi(): StoreApi<VehicleStore> {
  const store = useContext(VehicleStoreContext);

  if (!store) {
    throw new Error(
      "useVehicleStoreApi must be used within a VehicleStoreProvider.",
    );
  }

  return store;
}
