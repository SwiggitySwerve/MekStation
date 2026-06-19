/**
 * Vehicle Store Factory
 *
 * Creates isolated Zustand stores for individual vehicles.
 * Each vehicle has its own store instance with independent persistence.
 * Parallels useUnitStore.ts but for vehicles.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.1
 */

import { createContext, useContext } from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  addGeneratedMountedEquipment,
  clearMountedEquipment,
  linkMountedAmmo,
  removeMountedEquipment,
  updateMountedEquipment,
} from '@/stores/equipmentStoreActions';
import {
  createUnitStorePersistOptions,
  createUnitIdentityActions,
  modificationPatch,
  pickPersistedUnitIdentity,
} from '@/stores/unitStoreIdentityActions';
import { IEquipmentItem } from '@/types/equipment';

import {
  VehicleState,
  VehicleStore,
  CreateVehicleOptions,
  createDefaultVehicleState,
  createVehicleMountedEquipment,
} from './vehicleState';

// Re-export types for convenience
export type { VehicleStore } from './vehicleState';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';

import {
  autoAllocateArmorLogic,
  clearAllArmorLogic,
  derivePowerAmpWeightLogic,
  setCruiseMPLogic,
  setEngineRatingLogic,
  setHasSecondaryTurretLogic,
  setLocationArmorLogic,
  setMotionTypeLogic,
  setSecondaryTurretTypeLogic,
  setTonnageLogic,
  setTurretTypeLogic,
  setTurretWeightLogic,
  updateEquipmentLocationLogic,
} from './useVehicleStore.actions';

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

        ...createUnitIdentityActions<VehicleStore>(set),

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

        setHasSecondaryTurret: (enabled) =>
          set((state) => setHasSecondaryTurretLogic(state, enabled)),

        setSecondaryTurretType: (type) =>
          set((state) => setSecondaryTurretTypeLogic(state, type)),

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

        addEquipment: (item: IEquipmentItem, location?, isTurretMounted?) =>
          addGeneratedMountedEquipment(set, (instanceId) =>
            createVehicleMountedEquipment(
              item,
              instanceId,
              location,
              isTurretMounted ?? false,
            ),
          ),

        removeEquipment: (instanceId: string) =>
          set((state) =>
            removeMountedEquipment(state, instanceId, (e) => e.id),
          ),

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
          set((state) =>
            updateMountedEquipment(
              state,
              instanceId,
              (e) => e.id,
              (e) => ({
                ...e,
                isRearMounted,
              }),
            ),
          ),

        linkAmmo: (
          weaponInstanceId: string,
          ammoInstanceId: string | undefined,
        ) =>
          set((state) =>
            linkMountedAmmo(
              state,
              weaponInstanceId,
              ammoInstanceId,
              (e) => e.id,
            ),
          ),

        clearAllEquipment: () => set(clearMountedEquipment()),

        // =================================================================
        // Metadata Actions
        // =================================================================

        markModified: (modified = true) => set(modificationPatch(modified)),
      }),
      createUnitStorePersistOptions(
        `megamek-vehicle-${initialState.id}`,
        (state: VehicleStore) => ({
          ...pickPersistedUnitIdentity(state),
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
      ),
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
      'useVehicleStore must be used within a VehicleStoreProvider. ' +
        'Wrap your component tree with <VehicleStoreProvider>.',
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
      'useVehicleStoreApi must be used within a VehicleStoreProvider.',
    );
  }

  return store;
}
