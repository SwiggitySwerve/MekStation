/**
 * Battle Armor Store Factory
 *
 * Creates isolated Zustand stores for individual Battle Armor units.
 * Each BA has its own store instance with independent persistence.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.1
 */

import { createContext, useContext } from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  addGeneratedMountedEquipment,
  clearMountedEquipment,
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
import { IEquipmentItem } from '@/types/equipment';
import { calculateBattleArmorBVFromState } from '@/utils/construction/battlearmor/battleArmorBVAdapter';

import {
  BattleArmorState,
  BattleArmorStore,
  CreateBattleArmorOptions,
  createDefaultBattleArmorState,
  createBattleArmorMountedEquipment,
} from './battleArmorState';

// Re-export types for convenience
export type { BattleArmorStore } from './battleArmorState';

type BattleArmorStoreSet = (
  partial:
    | Partial<BattleArmorStore>
    | ((state: BattleArmorStore) => Partial<BattleArmorStore>),
) => void;

function createBattleArmorProtectionActions(
  set: BattleArmorStoreSet,
): Pick<BattleArmorStore, 'setBaArmorType' | 'setArmorPerTrooper'> {
  return {
    setBaArmorType: (baArmorType) => set(modifiedPatch({ baArmorType })),
    setArmorPerTrooper: (armorPerTrooper) =>
      set(modifiedPatch({ armorPerTrooper: Math.max(0, armorPerTrooper) })),
  };
}

function createBattleArmorMountActions(
  set: BattleArmorStoreSet,
): Pick<BattleArmorStore, 'setAPMount' | 'setModularMount' | 'setTurretMount'> {
  return {
    setAPMount: (hasAPMount) => set(modifiedPatch({ hasAPMount })),
    setModularMount: (hasModularMount) =>
      set(modifiedPatch({ hasModularMount })),
    setTurretMount: (hasTurretMount) => set(modifiedPatch({ hasTurretMount })),
  };
}

function createBattleArmorSpecialActions(
  set: BattleArmorStoreSet,
): Pick<
  BattleArmorStore,
  'setStealthSystem' | 'setMimeticArmor' | 'setFireResistantArmor'
> {
  return {
    setStealthSystem: (hasStealthSystem, stealthType) =>
      set(
        modifiedPatch({
          hasStealthSystem,
          stealthType: hasStealthSystem ? stealthType : undefined,
        }),
      ),
    setMimeticArmor: (hasMimeticArmor) =>
      set(modifiedPatch({ hasMimeticArmor })),
    setFireResistantArmor: (hasFireResistantArmor) =>
      set(modifiedPatch({ hasFireResistantArmor })),
  };
}

function createBattleArmorMovementActions(
  set: BattleArmorStoreSet,
): Pick<
  BattleArmorStore,
  'setGroundMP' | 'setJumpMP' | 'setMechanicalJumpBoosters' | 'setUmuMP'
> {
  return {
    setGroundMP: (groundMP) =>
      set(modifiedPatch({ groundMP: Math.max(0, groundMP) })),
    setJumpMP: (jumpMP) => set(modifiedPatch({ jumpMP: Math.max(0, jumpMP) })),
    setMechanicalJumpBoosters: (hasMechanicalJumpBoosters) =>
      set(modifiedPatch({ hasMechanicalJumpBoosters })),
    setUmuMP: (umuMP) => set(modifiedPatch({ umuMP: Math.max(0, umuMP) })),
  };
}

function createBattleArmorSquadActions(
  set: BattleArmorStoreSet,
): Pick<BattleArmorStore, 'setSquadSize' | 'setMotionType'> {
  return {
    setSquadSize: (squadSize) =>
      set(modifiedPatch({ squadSize: Math.max(1, Math.min(6, squadSize)) })),
    setMotionType: (motionType) => set(modifiedPatch({ motionType })),
  };
}

function createBattleArmorClassificationActions(
  set: BattleArmorStoreSet,
): Pick<
  BattleArmorStore,
  'setTechBase' | 'setChassisType' | 'setWeightClass' | 'setWeightPerTrooper'
> {
  return {
    setTechBase: (techBase) => set(modifiedPatch({ techBase })),
    setChassisType: (chassisType) => set(modifiedPatch({ chassisType })),
    setWeightClass: (weightClass) => set(modifiedPatch({ weightClass })),
    setWeightPerTrooper: (weightPerTrooper) =>
      set(modifiedPatch({ weightPerTrooper: Math.max(0, weightPerTrooper) })),
  };
}

function createBattleArmorManipulatorActions(
  set: BattleArmorStoreSet,
): Pick<BattleArmorStore, 'setLeftManipulator' | 'setRightManipulator'> {
  return {
    setLeftManipulator: (leftManipulator) =>
      set(modifiedPatch({ leftManipulator })),
    setRightManipulator: (rightManipulator) =>
      set(modifiedPatch({ rightManipulator })),
  };
}

function createBattleArmorArmorActions(
  set: BattleArmorStoreSet,
): Pick<BattleArmorStore, 'setArmorType'> {
  return {
    setArmorType: (armorType) => set(modifiedPatch({ armorType })),
  };
}

function createBattleArmorCoreActions(set: BattleArmorStoreSet) {
  return {
    ...createBattleArmorClassificationActions(set),
    ...createBattleArmorSquadActions(set),
    ...createBattleArmorMovementActions(set),
    ...createBattleArmorManipulatorActions(set),
    ...createBattleArmorArmorActions(set),
    ...createBattleArmorProtectionActions(set),
    ...createBattleArmorMountActions(set),
    ...createBattleArmorSpecialActions(set),
  };
}

function createBattleArmorEquipmentActions(
  set: BattleArmorStoreSet,
): Pick<
  BattleArmorStore,
  | 'addEquipment'
  | 'removeEquipment'
  | 'updateEquipmentLocation'
  | 'setEquipmentAPMount'
  | 'setEquipmentTurretMount'
  | 'setEquipmentModular'
  | 'clearAllEquipment'
> {
  return {
    addEquipment: (item: IEquipmentItem, location?) =>
      addGeneratedMountedEquipment(set, (instanceId) =>
        createBattleArmorMountedEquipment(item, instanceId, location),
      ),
    removeEquipment: (instanceId: string) =>
      set((state) => removeMountedEquipment(state, instanceId, (e) => e.id)),
    updateEquipmentLocation: (instanceId: string, location) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.id,
          (e) => ({
            ...e,
            location,
          }),
        ),
      ),
    setEquipmentAPMount: (instanceId: string, isAPMount) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.id,
          (e) => ({
            ...e,
            isAPMount,
          }),
        ),
      ),
    setEquipmentTurretMount: (instanceId: string, isTurretMounted) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.id,
          (e) => ({
            ...e,
            isTurretMounted,
          }),
        ),
      ),
    setEquipmentModular: (instanceId: string, isModular) =>
      set((state) =>
        updateMountedEquipment(
          state,
          instanceId,
          (e) => e.id,
          (e) => ({
            ...e,
            isModular,
          }),
        ),
      ),
    clearAllEquipment: () => set(clearMountedEquipment()),
  };
}

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single Battle Armor unit
 */
export function createBattleArmorStore(
  initialState: BattleArmorState,
): StoreApi<BattleArmorStore> {
  // Seed the initial BV breakdown from the initial inputs so the store is
  // born consistent — tests and UI code can read `state.bvBreakdown`
  // immediately after construction.
  const seededInitial: BattleArmorState = {
    ...initialState,
    bvBreakdown: calculateBattleArmorBVFromState(initialState),
  };

  return create<BattleArmorStore>()(
    persist(
      (rawSet, _get) => {
        // Every mutation re-derives `bvBreakdown` from the resulting state
        // so consumers never see stale BV after editing any input (armor,
        // weapons, manipulators, squad size, etc.). Actions that don't
        // touch BV inputs still pay a cheap pure recomputation — acceptable
        // given how small the BA calculator is.
        const set: typeof rawSet = (partial, replace) => {
          const applyAndDerive = (
            state: BattleArmorStore,
          ): BattleArmorStore => {
            const patch =
              typeof partial === 'function'
                ? (
                    partial as (
                      s: BattleArmorStore,
                    ) => BattleArmorStore | Partial<BattleArmorStore>
                  )(state)
                : partial;
            const merged = { ...state, ...patch } as BattleArmorStore;
            return {
              ...merged,
              bvBreakdown: calculateBattleArmorBVFromState(merged),
            };
          };
          // `replace: true` is unused by our actions (they all pass partials)
          // but we preserve the signature for safety.
          if (replace === true) {
            rawSet(partial as BattleArmorStore, true);
            return;
          }
          rawSet((state) => applyAndDerive(state));
        };

        return {
          // Spread initial state
          ...seededInitial,

          ...createUnitIdentityActions<BattleArmorStore>(set),
          ...createBattleArmorCoreActions(set),
          ...createBattleArmorEquipmentActions(set),

          // =================================================================
          // Metadata Actions
          // =================================================================

          markModified: (modified = true) => set(modificationPatch(modified)),
        };
      },
      createUnitStorePersistOptions(
        `megamek-battlearmor-${initialState.id}`,
        (state: BattleArmorStore) => ({
          ...pickPersistedUnitIdentity(state),
          techBase: state.techBase,
          unitType: state.unitType,
          chassisType: state.chassisType,
          weightClass: state.weightClass,
          weightPerTrooper: state.weightPerTrooper,
          squadSize: state.squadSize,
          motionType: state.motionType,
          groundMP: state.groundMP,
          jumpMP: state.jumpMP,
          hasMechanicalJumpBoosters: state.hasMechanicalJumpBoosters,
          umuMP: state.umuMP,
          leftManipulator: state.leftManipulator,
          rightManipulator: state.rightManipulator,
          armorType: state.armorType,
          baArmorType: state.baArmorType,
          armorPerTrooper: state.armorPerTrooper,
          hasAPMount: state.hasAPMount,
          hasModularMount: state.hasModularMount,
          hasTurretMount: state.hasTurretMount,
          hasStealthSystem: state.hasStealthSystem,
          stealthType: state.stealthType,
          hasMimeticArmor: state.hasMimeticArmor,
          hasFireResistantArmor: state.hasFireResistantArmor,
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
 * Create a new Battle Armor store from options
 */
export function createNewBattleArmorStore(
  options: CreateBattleArmorOptions,
): StoreApi<BattleArmorStore> {
  const initialState = createDefaultBattleArmorState(options);
  return createBattleArmorStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active Battle Armor's store
 */
export const BattleArmorStoreContext =
  createContext<StoreApi<BattleArmorStore> | null>(null);

/**
 * Hook to access the Battle Armor store from context
 */
export function useBattleArmorStore<T>(
  selector: (state: BattleArmorStore) => T,
): T {
  const store = useContext(BattleArmorStoreContext);

  if (!store) {
    throw new Error(
      'useBattleArmorStore must be used within a BattleArmorStoreProvider. ' +
        'Wrap your component tree with <BattleArmorStoreContext.Provider>.',
    );
  }

  return useStore(store, selector);
}

/**
 * Hook to get the entire Battle Armor store API
 */
export function useBattleArmorStoreApi(): StoreApi<BattleArmorStore> {
  const store = useContext(BattleArmorStoreContext);

  if (!store) {
    throw new Error(
      'useBattleArmorStoreApi must be used within a BattleArmorStoreProvider.',
    );
  }

  return store;
}
