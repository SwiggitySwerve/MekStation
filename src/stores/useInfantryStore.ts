/**
 * Infantry Store Factory
 *
 * Creates isolated Zustand stores for individual Infantry platoons.
 * Each platoon has its own store instance with independent persistence.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2
 */

import { createContext, useContext } from 'react';
import { create, StoreApi, useStore } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createUnitStorePersistOptions,
  createUnitIdentityActions,
  pickPersistedUnitIdentity,
} from '@/stores/unitStoreIdentityActions';
import { IInfantryFieldGun } from '@/types/unit/InfantryInterfaces';
import {
  InfantryMotive,
  IPlatoonComposition,
  PLATOON_DEFAULTS,
  MOTIVE_MP,
} from '@/types/unit/InfantryInterfaces';
import {
  normalizeInfantryFieldGun,
  squadMotionTypeForMotive,
} from '@/utils/construction/infantry';

import {
  InfantryState,
  InfantryStore,
  CreateInfantryOptions,
  createDefaultInfantryState,
  getArmorKitDivisor,
  computeInfantryStateBV,
  normalizeInfantryState,
} from './infantryState';

// Re-export types for convenience
export type { InfantryStore } from './infantryState';

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single Infantry platoon
 */
export function createInfantryStore(
  initialState: InfantryState,
): StoreApi<InfantryStore> {
  // Seed the initial bvBreakdown so consumers have a value before the first
  // BV-affecting action fires. See @spec .../infantry-unit-system/spec.md —
  // "unit.bvBreakdown SHALL contain perTrooper, motiveMultiplier, ...".
  const normalizedInitialState = normalizeInfantryState(initialState);
  const seededState: InfantryState = {
    ...normalizedInitialState,
    bvBreakdown:
      normalizedInitialState.bvBreakdown ??
      computeInfantryStateBV(normalizedInitialState),
  };

  return create<InfantryStore>()(
    persist(
      (set, _get) => {
        /**
         * Apply a state patch and recompute `bvBreakdown` from the resulting
         * state. Used by every action whose output could change BV (motive,
         * composition, weapons, armor, anti-mech, field guns). Identity-only
         * setters (name, chassis, etc.) continue to call `set` directly.
         */
        const setWithBV = (
          updater:
            | Partial<InfantryStore>
            | ((state: InfantryStore) => Partial<InfantryStore>),
        ): void => {
          set((state) => {
            const patch =
              typeof updater === 'function' ? updater(state) : updater;
            const nextCore: InfantryState = {
              ...state,
              ...patch,
            };
            const bvBreakdown = computeInfantryStateBV(nextCore);
            return { ...patch, bvBreakdown } as Partial<InfantryStore>;
          });
        };

        return {
          // Spread initial state (with seeded bvBreakdown)
          ...seededState,

          // =================================================================
          // Identity Actions
          // =================================================================

          ...createUnitIdentityActions<InfantryStore>(set),

          // =================================================================
          // Classification Actions
          // =================================================================

          setTechBase: (techBase) =>
            set({
              techBase,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Platoon Actions
          // =================================================================

          setSquadSize: (squadSize) => {
            const clamped = Math.max(1, Math.min(10, squadSize));
            setWithBV((state) => ({
              squadSize: clamped,
              // Composition drives BV — mirror squadSize into composition.
              platoonComposition: {
                ...state.platoonComposition,
                troopersPerSquad: clamped,
              },
              isModified: true,
              lastModifiedAt: Date.now(),
            }));
          },

          setNumberOfSquads: (numberOfSquads) => {
            const clamped = Math.max(1, Math.min(10, numberOfSquads));
            setWithBV((state) => ({
              numberOfSquads: clamped,
              platoonComposition: {
                ...state.platoonComposition,
                squads: clamped,
              },
              isModified: true,
              lastModifiedAt: Date.now(),
            }));
          },

          setMotionType: (motionType) =>
            set({
              motionType,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setGroundMP: (groundMP) =>
            set({
              groundMP: Math.max(0, groundMP),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setJumpMP: (jumpMP) =>
            set({
              jumpMP: Math.max(0, jumpMP),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // -----------------------------------------------------------------
          // Infantry Motive / Composition Actions
          // -----------------------------------------------------------------

          setInfantryMotive: (motive: InfantryMotive) =>
            setWithBV({
              infantryMotive: motive,
              motionType: squadMotionTypeForMotive(motive),
              // Re-derive composition defaults from TechManual tables
              platoonComposition: PLATOON_DEFAULTS[motive],
              squadSize: PLATOON_DEFAULTS[motive].troopersPerSquad,
              numberOfSquads: PLATOON_DEFAULTS[motive].squads,
              // Re-derive MP from motive
              groundMP: MOTIVE_MP[motive].groundMP,
              jumpMP: MOTIVE_MP[motive].jumpMP,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setPlatoonComposition: (comp: IPlatoonComposition) =>
            setWithBV({
              platoonComposition: comp,
              squadSize: comp.troopersPerSquad,
              numberOfSquads: comp.squads,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setFieldGunAmmo: (idx: number, rounds: number) =>
            setWithBV((state) => {
              if (idx < 0 || idx >= state.fieldGuns.length) return {};
              const updated = state.fieldGuns.map((g, i) =>
                i === idx ? { ...g, ammoRounds: Math.max(0, rounds) } : g,
              );
              return {
                fieldGuns: updated,
                isModified: true,
                lastModifiedAt: Date.now(),
              };
            }),

          // =================================================================
          // Weapon Actions
          // =================================================================

          setPrimaryWeapon: (primaryWeapon, primaryWeaponId) =>
            setWithBV({
              primaryWeapon,
              primaryWeaponId,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setSecondaryWeapon: (secondaryWeapon, secondaryWeaponId) =>
            setWithBV({
              secondaryWeapon,
              secondaryWeaponId,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setSecondaryWeaponCount: (secondaryWeaponCount) =>
            setWithBV({
              secondaryWeaponCount: Math.max(0, secondaryWeaponCount),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Protection Actions
          // =================================================================

          setArmorKit: (armorKit) =>
            setWithBV({
              armorKit,
              damageDivisor: getArmorKitDivisor(armorKit),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setDamageDivisor: (damageDivisor) =>
            set({
              damageDivisor: Math.max(1, damageDivisor),
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Specialization Actions
          // =================================================================

          setSpecialization: (specialization) =>
            set({
              specialization,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setAntiMechTraining: (hasAntiMechTraining) =>
            setWithBV({
              hasAntiMechTraining,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          setAugmented: (isAugmented, augmentationType) =>
            set({
              isAugmented,
              augmentationType: isAugmented ? augmentationType : undefined,
              isModified: true,
              lastModifiedAt: Date.now(),
            }),

          // =================================================================
          // Field Gun Actions
          // =================================================================

          addFieldGun: (gun: IInfantryFieldGun) =>
            setWithBV((state) => ({
              fieldGuns: [
                ...state.fieldGuns.map(normalizeInfantryFieldGun),
                normalizeInfantryFieldGun(gun),
              ],
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          removeFieldGun: (equipmentId: string) =>
            setWithBV((state) => ({
              fieldGuns: state.fieldGuns.filter(
                (g) => g.equipmentId !== equipmentId,
              ),
              isModified: true,
              lastModifiedAt: Date.now(),
            })),

          clearFieldGuns: () =>
            setWithBV({
              fieldGuns: [],
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
        };
      },
      createUnitStorePersistOptions(
        `megamek-infantry-${initialState.id}`,
        (state: InfantryStore) => ({
          ...pickPersistedUnitIdentity(state),
          techBase: state.techBase,
          unitType: state.unitType,
          squadSize: state.squadSize,
          numberOfSquads: state.numberOfSquads,
          motionType: state.motionType,
          infantryMotive: state.infantryMotive,
          platoonComposition: state.platoonComposition,
          groundMP: state.groundMP,
          jumpMP: state.jumpMP,
          primaryWeapon: state.primaryWeapon,
          primaryWeaponId: state.primaryWeaponId,
          secondaryWeapon: state.secondaryWeapon,
          secondaryWeaponId: state.secondaryWeaponId,
          secondaryWeaponCount: state.secondaryWeaponCount,
          armorKit: state.armorKit,
          damageDivisor: state.damageDivisor,
          specialization: state.specialization,
          hasAntiMechTraining: state.hasAntiMechTraining,
          isAugmented: state.isAugmented,
          augmentationType: state.augmentationType,
          fieldGuns: state.fieldGuns,
          bvBreakdown: state.bvBreakdown,
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
        }),
      ),
    ),
  );
}

/**
 * Create a new Infantry store from options
 */
export function createNewInfantryStore(
  options: CreateInfantryOptions,
): StoreApi<InfantryStore> {
  const initialState = createDefaultInfantryState(options);
  return createInfantryStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active Infantry's store
 */
export const InfantryStoreContext =
  createContext<StoreApi<InfantryStore> | null>(null);

/**
 * Hook to access the Infantry store from context
 */
export function useInfantryStore<T>(selector: (state: InfantryStore) => T): T {
  const store = useContext(InfantryStoreContext);

  if (!store) {
    throw new Error(
      'useInfantryStore must be used within an InfantryStoreProvider. ' +
        'Wrap your component tree with <InfantryStoreContext.Provider>.',
    );
  }

  return useStore(store, selector);
}

/**
 * Hook to get the entire Infantry store API
 */
export function useInfantryStoreApi(): StoreApi<InfantryStore> {
  const store = useContext(InfantryStoreContext);

  if (!store) {
    throw new Error(
      'useInfantryStoreApi must be used within an InfantryStoreProvider.',
    );
  }

  return store;
}
