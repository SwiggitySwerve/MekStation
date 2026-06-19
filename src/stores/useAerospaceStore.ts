/**
 * Aerospace Store Factory
 *
 * Creates isolated Zustand stores for individual aerospace fighters.
 * Each aerospace has its own store instance with independent persistence.
 * Parallels useVehicleStore.ts but for aerospace units.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 4.1
 */

import { createContext, useContext } from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { persist } from 'zustand/middleware';

import { getThresholdWeightClass } from '@/services/units/unitWeightClass';
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
  modifiedPatch,
  pickPersistedUnitIdentity,
} from '@/stores/unitStoreIdentityActions';
import { getArmorDefinition } from '@/types/construction/ArmorType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { WeightClass } from '@/types/enums/WeightClass';
import { IEquipmentItem } from '@/types/equipment';
import { calculateFuelPoints } from '@/utils/construction/aerospace/fuelCalculations';

import {
  AerospaceState,
  AerospaceActions,
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
  return getThresholdWeightClass(
    tonnage,
    [
      { maxTonnage: 19, weightClass: WeightClass.LIGHT },
      { maxTonnage: 39, weightClass: WeightClass.MEDIUM },
      { maxTonnage: 69, weightClass: WeightClass.HEAVY },
    ],
    WeightClass.ASSAULT,
  );
}

/**
 * Calculate max thrust from safe thrust
 */
function calculateMaxThrust(safeThrust: number): number {
  return Math.floor(safeThrust * 1.5);
}

function allocateAerospaceArmorPoints(totalPoints: number) {
  const noseShare = 0.35;
  const wingShare = 0.25;
  const aftShare = 0.15;

  return {
    [AerospaceLocation.NOSE]: Math.floor(totalPoints * noseShare),
    [AerospaceLocation.LEFT_WING]: Math.floor(totalPoints * wingShare),
    [AerospaceLocation.RIGHT_WING]: Math.floor(totalPoints * wingShare),
    [AerospaceLocation.AFT]: Math.floor(totalPoints * aftShare),
  };
}

function createAutoAllocatedAerospaceArmorPatch(
  state: AerospaceStore,
): Partial<AerospaceStore> {
  const armorDef = getArmorDefinition(state.armorType);
  const pointsPerTon = armorDef?.pointsPerTon ?? 16;
  const totalPoints = Math.floor(state.armorTonnage * pointsPerTon);

  return modifiedPatch({
    armorAllocation: allocateAerospaceArmorPoints(totalPoints),
  });
}

function aerospaceArmorTypePatch(type: AerospaceStore['armorType']) {
  return modifiedPatch({ armorType: type });
}

function aerospaceArmorTonnagePatch(tonnage: number) {
  return modifiedPatch({ armorTonnage: Math.max(0, tonnage) });
}

type AerospaceStoreSet = (
  partial:
    | Partial<AerospaceStore>
    | ((state: AerospaceStore) => Partial<AerospaceStore>),
) => void;
type AerospaceStoreGet = () => AerospaceStore;

function pickStoreFields<TState, const TKey extends keyof TState>(
  state: TState,
  keys: readonly TKey[],
): Pick<TState, TKey> {
  return Object.fromEntries(keys.map((key) => [key, state[key]])) as Pick<
    TState,
    TKey
  >;
}

function createAerospaceArmorActions(
  set: AerospaceStoreSet,
): Pick<
  AerospaceActions,
  | 'setArmorType'
  | 'setArmorTonnage'
  | 'setArcArmor'
  | 'autoAllocateArmor'
  | 'clearAllArmor'
> {
  return {
    setArmorType: (type) => set(aerospaceArmorTypePatch(type)),
    setArmorTonnage: (tonnage) => set(aerospaceArmorTonnagePatch(tonnage)),
    setArcArmor: (arc, points) =>
      set((state) =>
        modifiedPatch({
          armorAllocation: {
            ...state.armorAllocation,
            [arc]: Math.max(0, points),
          },
        }),
      ),
    autoAllocateArmor: () =>
      set((state) => createAutoAllocatedAerospaceArmorPatch(state)),
    clearAllArmor: () =>
      set(
        modifiedPatch({
          armorAllocation: createEmptyAerospaceArmorAllocation(),
        }),
      ),
  };
}

function createAerospaceStructureActions(
  set: AerospaceStoreSet,
): Pick<
  AerospaceActions,
  | 'setStructuralIntegrity'
  | 'setCockpitType'
  | 'setHeatSinks'
  | 'setDoubleHeatSinks'
  | 'setCrew'
> {
  return {
    setStructuralIntegrity: (si) =>
      set(modifiedPatch({ structuralIntegrity: Math.max(1, si) })),
    setCockpitType: (cockpitType) => set(modifiedPatch({ cockpitType })),
    setHeatSinks: (count) =>
      set(modifiedPatch({ heatSinks: Math.max(0, count) })),
    setDoubleHeatSinks: (doubleHeatSinks) =>
      set(modifiedPatch({ doubleHeatSinks })),
    setCrew: (crew) => set(modifiedPatch({ crew })),
  };
}

function createAerospaceSpecialFeatureActions(
  set: AerospaceStoreSet,
  get: AerospaceStoreGet,
): Pick<
  AerospaceActions,
  | 'setHasBombBay'
  | 'setBombCapacity'
  | 'setReinforcedCockpit'
  | 'setEjectionSeat'
> {
  return {
    setHasBombBay: (value) =>
      set(
        modifiedPatch({
          hasBombBay: value,
          bombCapacity: value ? get().bombCapacity : 0,
        }),
      ),
    setBombCapacity: (capacity) =>
      set(modifiedPatch({ bombCapacity: Math.max(0, capacity) })),
    setReinforcedCockpit: (hasReinforcedCockpit) =>
      set(modifiedPatch({ hasReinforcedCockpit })),
    setEjectionSeat: (hasEjectionSeat) =>
      set(modifiedPatch({ hasEjectionSeat })),
  };
}

const createAerospaceChassisActions = (
  set: AerospaceStoreSet,
): Pick<
  AerospaceActions,
  'setTonnage' | 'setIsOmni' | 'setAerospaceSubType'
> => ({
  setTonnage: (tonnage) =>
    set((state) =>
      modifiedPatch({
        tonnage,
        weightClass: getAerospaceWeightClass(tonnage),
        engineRating: Math.max(10, Math.min(400, tonnage * state.safeThrust)),
        structuralIntegrity: Math.ceil(tonnage / 10),
      }),
    ),
  setIsOmni: (isOmni) => set(modifiedPatch({ isOmni })),
  setAerospaceSubType: (aerospaceSubType) =>
    set(modifiedPatch({ aerospaceSubType })),
});

const createAerospaceEngineActions = (
  set: AerospaceStoreSet,
): Pick<
  AerospaceActions,
  'setEngineType' | 'setEngineRating' | 'setSafeThrust'
> => ({
  setEngineType: (engineType) => set(modifiedPatch({ engineType })),
  setEngineRating: (engineRating) =>
    set((state) =>
      modifiedPatch({
        engineRating,
        safeThrust: Math.floor(engineRating / state.tonnage),
        maxThrust: calculateMaxThrust(Math.floor(engineRating / state.tonnage)),
      }),
    ),
  setSafeThrust: (safeThrust) =>
    set((state) =>
      modifiedPatch({
        safeThrust,
        maxThrust: calculateMaxThrust(safeThrust),
        engineRating: state.tonnage * safeThrust,
      }),
    ),
});

const createAerospaceFuelActions = (
  set: AerospaceStoreSet,
): Pick<AerospaceActions, 'setAerospaceEngineType' | 'setFuelTons'> => ({
  setAerospaceEngineType: (aerospaceEngineType) =>
    set((state) =>
      modifiedPatch({
        aerospaceEngineType,
        fuelPoints: calculateFuelPoints(state.fuelTons, aerospaceEngineType),
      }),
    ),
  setFuelTons: (tons) =>
    set((state) =>
      modifiedPatch({
        fuelTons: Math.max(0, tons),
        fuelPoints: calculateFuelPoints(
          Math.max(0, tons),
          state.aerospaceEngineType,
        ),
      }),
    ),
});

const AEROSPACE_PERSIST_KEYS =
  'tonnage techBase unitType aerospaceSubType motionType isOmni engineType aerospaceEngineType engineRating safeThrust fuelTons structuralIntegrity cockpitType heatSinks doubleHeatSinks armorType armorTonnage armorAllocation hasBombBay bombCapacity hasReinforcedCockpit hasEjectionSeat crew equipment isModified createdAt lastModifiedAt'.split(
    ' ',
  ) as ReadonlyArray<keyof AerospaceStore>;

function pickPersistedAerospaceState(state: AerospaceStore) {
  return {
    ...pickPersistedUnitIdentity(state),
    ...pickStoreFields(state, AEROSPACE_PERSIST_KEYS),
  };
}

function aerospacePersistOptions(initialState: AerospaceState) {
  return createUnitStorePersistOptions(
    `megamek-aerospace-${initialState.id}`,
    pickPersistedAerospaceState,
  );
}

function createAerospaceStoreState(
  initialState: AerospaceState,
  set: AerospaceStoreSet,
  get: AerospaceStoreGet,
): AerospaceStore {
  return {
    ...initialState,
    ...createUnitIdentityActions<AerospaceStore>(set),
    ...createAerospaceChassisActions(set),
    ...createAerospaceEngineActions(set),
    ...createAerospaceFuelActions(set),
    ...createAerospaceStructureActions(set),
    ...createAerospaceArmorActions(set),
    ...createAerospaceSpecialFeatureActions(set, get),

    addEquipment: (item: IEquipmentItem, arc?) =>
      addGeneratedMountedEquipment(set, (instanceId) =>
        createAerospaceMountedEquipment(item, instanceId, arc),
      ),

    removeEquipment: (instanceId: string) =>
      set((state) => removeMountedEquipment(state, instanceId, (e) => e.id)),

    updateEquipmentArc: (instanceId: string, arc) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.id,
          (e) => ({
            ...e,
            location: arc,
          }),
        ),
      ),

    linkAmmo: (weaponInstanceId: string, ammoInstanceId: string | undefined) =>
      set((state) =>
        linkMountedAmmo(state, weaponInstanceId, ammoInstanceId, (e) => e.id),
      ),

    clearAllEquipment: () => set(clearMountedEquipment()),
    markModified: (modified = true) => set(modificationPatch(modified)),
  };
}

export function createAerospaceStore(
  initialState: AerospaceState,
): StoreApi<AerospaceStore> {
  return create<AerospaceStore>()(
    persist(
      (set, get) => createAerospaceStoreState(initialState, set, get),
      aerospacePersistOptions(initialState),
    ),
  );
}

/**
 * Create a new aerospace store from options
 */
export function createNewAerospaceStore(
  options: CreateAerospaceOptions,
): StoreApi<AerospaceStore> {
  const initialState = createDefaultAerospaceState(options);
  return createAerospaceStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active aerospace's store
 */
export const AerospaceStoreContext =
  createContext<StoreApi<AerospaceStore> | null>(null);

/**
 * Hook to access the aerospace store from context
 *
 * @example
 * const safeThrust = useAerospaceStore((s) => s.safeThrust);
 * const setSafeThrust = useAerospaceStore((s) => s.setSafeThrust);
 */
export function useAerospaceStore<T>(
  selector: (state: AerospaceStore) => T,
): T {
  const store = useContext(AerospaceStoreContext);

  if (!store) {
    throw new Error(
      'useAerospaceStore must be used within an AerospaceStoreProvider. ' +
        'Wrap your component tree with <AerospaceStoreProvider>.',
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
    throw new Error(
      'useAerospaceStoreApi must be used within an AerospaceStoreProvider.',
    );
  }

  return store;
}
