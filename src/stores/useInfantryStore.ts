/**
 * Infantry Store Factory
 *
 * Creates isolated Zustand stores for individual Infantry platoons.
 * Each platoon has its own store instance with independent persistence.
 *
 * @spec openspec/changes/add-multi-unit-type-support/tasks.md Phase 5.2
 */

import { create, StoreApi, useStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createContext, useContext } from 'react';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { IInfantryFieldGun } from '@/types/unit/PersonnelInterfaces';
import {
  InfantryState,
  InfantryStore,
  CreateInfantryOptions,
  createDefaultInfantryState,
  getArmorKitDivisor,
} from './infantryState';

// Re-export types for convenience
export type { InfantryStore } from './infantryState';

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single Infantry platoon
 */
export function createInfantryStore(initialState: InfantryState): StoreApi<InfantryStore> {
  return create<InfantryStore>()(
    persist(
      (set) => ({
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

        setTechBase: (techBase) =>
          set({
            techBase,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Platoon Actions
        // =================================================================

        setSquadSize: (squadSize) =>
          set({
            squadSize: Math.max(1, Math.min(10, squadSize)),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setNumberOfSquads: (numberOfSquads) =>
          set({
            numberOfSquads: Math.max(1, Math.min(10, numberOfSquads)),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

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

        // =================================================================
        // Weapon Actions
        // =================================================================

        setPrimaryWeapon: (primaryWeapon, primaryWeaponId) =>
          set({
            primaryWeapon,
            primaryWeaponId,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setSecondaryWeapon: (secondaryWeapon, secondaryWeaponId) =>
          set({
            secondaryWeapon,
            secondaryWeaponId,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setSecondaryWeaponCount: (secondaryWeaponCount) =>
          set({
            secondaryWeaponCount: Math.max(0, secondaryWeaponCount),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Protection Actions
        // =================================================================

        setArmorKit: (armorKit) =>
          set({
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
          set({
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
          set((state) => ({
            fieldGuns: [...state.fieldGuns, gun],
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        removeFieldGun: (equipmentId: string) =>
          set((state) => ({
            fieldGuns: state.fieldGuns.filter((g) => g.equipmentId !== equipmentId),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        clearFieldGuns: () =>
          set({
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
      }),
      {
        name: `megamek-infantry-${initialState.id}`,
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
          squadSize: state.squadSize,
          numberOfSquads: state.numberOfSquads,
          motionType: state.motionType,
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
          isModified: state.isModified,
          createdAt: state.createdAt,
          lastModifiedAt: state.lastModifiedAt,
        }),
      }
    )
  );
}

/**
 * Create a new Infantry store from options
 */
export function createNewInfantryStore(options: CreateInfantryOptions): StoreApi<InfantryStore> {
  const initialState = createDefaultInfantryState(options);
  return createInfantryStore(initialState);
}

// =============================================================================
// React Context
// =============================================================================

/**
 * Context for providing the active Infantry's store
 */
export const InfantryStoreContext = createContext<StoreApi<InfantryStore> | null>(null);

/**
 * Hook to access the Infantry store from context
 */
export function useInfantryStore<T>(selector: (state: InfantryStore) => T): T {
  const store = useContext(InfantryStoreContext);

  if (!store) {
    throw new Error(
      'useInfantryStore must be used within an InfantryStoreProvider. ' +
        'Wrap your component tree with <InfantryStoreContext.Provider>.'
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
    throw new Error('useInfantryStoreApi must be used within an InfantryStoreProvider.');
  }

  return store;
}
