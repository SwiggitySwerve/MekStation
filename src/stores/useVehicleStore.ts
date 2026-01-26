/**
 * Vehicle Store Factory
 *
 * Creates isolated Zustand stores for individual vehicles.
 * Each vehicle has its own store instance with independent persistence.
 * Parallels useUnitStore.ts but for vehicles.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 3.1
 */

import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createContext, useContext } from 'react';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType, ITurretConfiguration } from '@/types/unit/VehicleInterfaces';
import { VehicleLocation, VTOLLocation } from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId } from '@/utils/uuid';
import { WeightClass } from '@/types/enums/WeightClass';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  VehicleState,
  VehicleStore,
  CreateVehicleOptions,
  createDefaultVehicleState,
  createVehicleMountedEquipment,
  createEmptyVehicleArmorAllocation,
  createEmptyVTOLArmorAllocation,
} from './vehicleState';

// Re-export types for convenience
export type { VehicleStore } from './vehicleState';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine weight class from tonnage for vehicles
 */
function getVehicleWeightClass(tonnage: number): WeightClass {
  if (tonnage <= 19) return WeightClass.LIGHT;
  if (tonnage <= 39) return WeightClass.MEDIUM;
  if (tonnage <= 59) return WeightClass.HEAVY;
  if (tonnage <= 100) return WeightClass.ASSAULT;
  return WeightClass.SUPERHEAVY;
}

/**
 * Calculate flank MP from cruise MP
 */
function calculateFlankMP(cruiseMP: number): number {
  return Math.floor(cruiseMP * 1.5);
}

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single vehicle
 */
export function createVehicleStore(initialState: VehicleState): StoreApi<VehicleStore> {
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
            // Recalculate engine rating to maintain same Cruise MP
            const newEngineRating = tonnage * state.cruiseMP;
            const clampedRating = Math.max(10, Math.min(400, newEngineRating));

            return {
              tonnage,
              weightClass: getVehicleWeightClass(tonnage),
              engineRating: clampedRating,
              isSuperheavy: tonnage > 100,
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),

        setMotionType: (motionType) =>
          set((state) => {
            // If switching to/from VTOL, update armor allocation type
            const isVTOL = motionType === GroundMotionType.VTOL;
            const wasVTOL = state.motionType === GroundMotionType.VTOL;

            let armorAllocation = state.armorAllocation;
            let unitType: UnitType.VEHICLE | UnitType.VTOL | UnitType.SUPPORT_VEHICLE = state.unitType;

            if (isVTOL && !wasVTOL) {
              // Switching to VTOL - add rotor armor
              armorAllocation = createEmptyVTOLArmorAllocation();
              unitType = UnitType.VTOL;
            } else if (!isVTOL && wasVTOL) {
              // Switching from VTOL - remove rotor armor
              armorAllocation = createEmptyVehicleArmorAllocation();
              unitType = UnitType.VEHICLE;
            }

            return {
              motionType,
              unitType,
              armorAllocation,
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
            cruiseMP: Math.floor(rating / state.tonnage),
            flankMP: calculateFlankMP(Math.floor(rating / state.tonnage)),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setCruiseMP: (cruiseMP) =>
          set((state) => ({
            cruiseMP,
            flankMP: calculateFlankMP(cruiseMP),
            engineRating: state.tonnage * cruiseMP,
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        // =================================================================
        // Turret Actions
        // =================================================================

        setTurretType: (type) =>
          set((state) => {
            if (type === TurretType.NONE) {
              // Remove turret
              return {
                turret: null,
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }

            // Create or update turret
            const turret: ITurretConfiguration = state.turret
              ? { ...state.turret, type }
              : {
                  type,
                  maxWeight: state.tonnage * 0.1, // Default: 10% of tonnage
                  currentWeight: 0,
                  rotationArc: 360,
                };

            return {
              turret,
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),

        setTurretWeight: (weight) =>
          set((state) => {
            if (!state.turret) return state;

            return {
              turret: {
                ...state.turret,
                currentWeight: weight,
              },
              isModified: true,
              lastModifiedAt: Date.now(),
            };
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

        setLocationArmor: (location, points) =>
          set((state) => ({
            armorAllocation: {
              ...state.armorAllocation,
              [location]: Math.max(0, points),
            },
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        autoAllocateArmor: () =>
          set((state) => {
            // Simple auto-allocation: distribute evenly with more on front
            const pointsPerTon = 16; // Standard armor
            const totalPoints = Math.floor(state.armorTonnage * pointsPerTon);
            const hasTurret = state.turret !== null;
            const isVTOL = state.motionType === GroundMotionType.VTOL;

            // Distribution percentages (approximate TechManual guidelines)
            const frontPercent = 0.35;
            const sidePercent = 0.20;
            const rearPercent = 0.15;
            const turretPercent = hasTurret ? 0.10 : 0;
            const rotorPercent = isVTOL ? 0.02 : 0;

            const normalizer =
              frontPercent + sidePercent * 2 + rearPercent + turretPercent + rotorPercent;

            const newAllocation = {
              [VehicleLocation.FRONT]: Math.floor((totalPoints * frontPercent) / normalizer),
              [VehicleLocation.LEFT]: Math.floor((totalPoints * sidePercent) / normalizer),
              [VehicleLocation.RIGHT]: Math.floor((totalPoints * sidePercent) / normalizer),
              [VehicleLocation.REAR]: Math.floor((totalPoints * rearPercent) / normalizer),
              [VehicleLocation.TURRET]: hasTurret
                ? Math.floor((totalPoints * turretPercent) / normalizer)
                : 0,
              [VehicleLocation.BODY]: 0,
              ...(isVTOL && {
                [VTOLLocation.ROTOR]: Math.floor((totalPoints * rotorPercent) / normalizer),
              }),
            };

            return {
              armorAllocation: newAllocation,
              isModified: true,
              lastModifiedAt: Date.now(),
            };
          }),

        clearAllArmor: () =>
          set((state) => ({
            armorAllocation:
              state.motionType === GroundMotionType.VTOL
                ? createEmptyVTOLArmorAllocation()
                : createEmptyVehicleArmorAllocation(),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

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
            isTurretMounted ?? false
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

        updateEquipmentLocation: (instanceId: string, location, isTurretMounted?) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId
                ? {
                    ...e,
                    location,
                    isTurretMounted: isTurretMounted ?? e.isTurretMounted,
                  }
                : e
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setEquipmentRearMounted: (instanceId: string, isRearMounted: boolean) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, isRearMounted } : e
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
 * Create a new vehicle store from options
 */
export function createNewVehicleStore(options: CreateVehicleOptions): StoreApi<VehicleStore> {
  const initialState = createDefaultVehicleState(options);
  return createVehicleStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active vehicle's store
 */
export const VehicleStoreContext = createContext<StoreApi<VehicleStore> | null>(null);

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
        'Wrap your component tree with <VehicleStoreProvider>.'
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
    throw new Error('useVehicleStoreApi must be used within a VehicleStoreProvider.');
  }

  return store;
}
