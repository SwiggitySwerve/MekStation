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
import { persist, createJSONStorage } from 'zustand/middleware';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { IEquipmentItem } from '@/types/equipment';
import { generateUnitId } from '@/utils/uuid';

import {
  BattleArmorState,
  BattleArmorStore,
  CreateBattleArmorOptions,
  createDefaultBattleArmorState,
  createBattleArmorMountedEquipment,
} from './battleArmorState';

// Re-export types for convenience
export type { BattleArmorStore } from './battleArmorState';

// =============================================================================
// Store Factory
// =============================================================================

/**
 * Create an isolated Zustand store for a single Battle Armor unit
 */
export function createBattleArmorStore(
  initialState: BattleArmorState,
): StoreApi<BattleArmorStore> {
  return create<BattleArmorStore>()(
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
        // Classification Actions
        // =================================================================

        setTechBase: (techBase) =>
          set({
            techBase,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setChassisType: (chassisType) =>
          set({
            chassisType,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setWeightClass: (weightClass) =>
          set({
            weightClass,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setWeightPerTrooper: (weightPerTrooper) =>
          set({
            weightPerTrooper: Math.max(0, weightPerTrooper),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Squad Actions
        // =================================================================

        setSquadSize: (squadSize) =>
          set({
            squadSize: Math.max(1, Math.min(6, squadSize)),
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

        setMechanicalJumpBoosters: (hasMechanicalJumpBoosters) =>
          set({
            hasMechanicalJumpBoosters,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setUmuMP: (umuMP) =>
          set({
            umuMP: Math.max(0, umuMP),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Manipulator Actions
        // =================================================================

        setLeftManipulator: (leftManipulator) =>
          set({
            leftManipulator,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setRightManipulator: (rightManipulator) =>
          set({
            rightManipulator,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Armor Actions
        // =================================================================

        setArmorType: (armorType) =>
          set({
            armorType,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setArmorPerTrooper: (armorPerTrooper) =>
          set({
            armorPerTrooper: Math.max(0, armorPerTrooper),
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Mount Actions
        // =================================================================

        setAPMount: (hasAPMount) =>
          set({
            hasAPMount,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setModularMount: (hasModularMount) =>
          set({
            hasModularMount,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setTurretMount: (hasTurretMount) =>
          set({
            hasTurretMount,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Special System Actions
        // =================================================================

        setStealthSystem: (hasStealthSystem, stealthType) =>
          set({
            hasStealthSystem,
            stealthType: hasStealthSystem ? stealthType : undefined,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setMimeticArmor: (hasMimeticArmor) =>
          set({
            hasMimeticArmor,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        setFireResistantArmor: (hasFireResistantArmor) =>
          set({
            hasFireResistantArmor,
            isModified: true,
            lastModifiedAt: Date.now(),
          }),

        // =================================================================
        // Equipment Actions
        // =================================================================

        addEquipment: (item: IEquipmentItem, location?) => {
          const instanceId = generateUnitId();
          const mountedEquipment = createBattleArmorMountedEquipment(
            item,
            instanceId,
            location,
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

        updateEquipmentLocation: (instanceId: string, location) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, location } : e,
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setEquipmentAPMount: (instanceId: string, isAPMount) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, isAPMount } : e,
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setEquipmentTurretMount: (instanceId: string, isTurretMounted) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, isTurretMounted } : e,
            ),
            isModified: true,
            lastModifiedAt: Date.now(),
          })),

        setEquipmentModular: (instanceId: string, isModular) =>
          set((state) => ({
            equipment: state.equipment.map((e) =>
              e.id === instanceId ? { ...e, isModular } : e,
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
        name: `megamek-battlearmor-${initialState.id}`,
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
      },
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
