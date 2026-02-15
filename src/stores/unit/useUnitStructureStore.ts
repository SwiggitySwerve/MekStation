/**
 * Unit Structure Store Slice
 *
 * Engine, gyro, internal structure, cockpit, heat sink, armor type,
 * enhancement, jump jet, tonnage, and configuration actions.
 *
 * Contains cascade/displacement logic: engine and gyro changes
 * can displace mounted equipment. This logic is centralized here.
 */

import type { ArmorTypeEnum } from '@/types/construction/ArmorType';
import type { CockpitType } from '@/types/construction/CockpitType';
import type { EngineType } from '@/types/construction/EngineType';
import type { GyroType } from '@/types/construction/GyroType';
import type { HeatSinkType } from '@/types/construction/HeatSinkType';
import type { InternalStructureType } from '@/types/construction/InternalStructureType';
import type { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import type { JumpJetType } from '@/utils/construction/movementCalculations';

import type { UnitStore } from '../unitState';

import {
  createChassisActions,
  type ChassisActions,
} from './useUnitStructureStore.chassis';
import {
  applyEngineTypeChange,
  applyEngineRatingChange,
  applyGyroTypeChange,
  applyInternalStructureTypeChange,
  applyHeatSinkTypeChange,
  applyHeatSinkCountChange,
  applyArmorTypeChange,
  applyEnhancementChange,
  applyJumpMPChange,
  applyJumpJetTypeChange,
} from './useUnitStructureStore.helpers';
import {
  createIdentityActions,
  type IdentityActions,
} from './useUnitStructureStore.identity';

// =============================================================================
// Types
// =============================================================================

export interface UnitStructureActions extends IdentityActions, ChassisActions {
  // OmniMech
  setBaseChassisHeatSinks: (count: number) => void;
  resetChassis: () => void;
  setEquipmentPodMounted: (instanceId: string, isPodMounted: boolean) => void;

  // Components (with cascade/displacement logic)
  setEngineType: (type: EngineType) => void;
  setEngineRating: (rating: number) => void;
  setGyroType: (type: GyroType) => void;
  setInternalStructureType: (type: InternalStructureType) => void;
  setCockpitType: (type: CockpitType) => void;
  setHeatSinkType: (type: HeatSinkType) => void;
  setHeatSinkCount: (count: number) => void;
  setArmorType: (type: ArmorTypeEnum) => void;
  setEnhancement: (enhancement: MovementEnhancementType | null) => void;
  setJumpMP: (jumpMP: number) => void;
  setJumpJetType: (jumpJetType: JumpJetType) => void;

  // Metadata
  markModified: (modified?: boolean) => void;
}

// =============================================================================
// Slice Factory
// =============================================================================

type SetFn = (
  partial: Partial<UnitStore> | ((state: UnitStore) => Partial<UnitStore>),
) => void;
type GetFn = () => UnitStore;

export function createStructureSlice(
  set: SetFn,
  _get: GetFn,
): UnitStructureActions {
  return {
    ...createIdentityActions(set),
    ...createChassisActions(set),

    // =================================================================
    // OmniMech Actions
    // =================================================================

    setBaseChassisHeatSinks: (count) =>
      set({
        baseChassisHeatSinks: count,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    resetChassis: () =>
      set((state) => {
        if (!state.isOmni) {
          return state;
        }
        const fixedEquipment = state.equipment.filter(
          (eq) => !eq.isOmniPodMounted,
        );
        return {
          equipment: fixedEquipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setEquipmentPodMounted: (instanceId, isPodMounted) =>
      set((state) => {
        const equipment = state.equipment.map((eq) =>
          eq.instanceId === instanceId
            ? { ...eq, isOmniPodMounted: isPodMounted }
            : eq,
        );
        return {
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    // =================================================================
    // Component Actions (with cascade/displacement logic)
    // =================================================================

    setEngineType: (type) =>
      set((state) => {
        const equipment = applyEngineTypeChange(
          state.equipment,
          state.engineType,
          type,
          state.gyroType,
          state.engineRating,
          state.heatSinkType,
          state.heatSinkCount,
          state.enhancement,
          state.tonnage,
          state.techBase,
        );

        return {
          engineType: type,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setEngineRating: (rating) =>
      set((state) => {
        const equipment = applyEngineRatingChange(
          state.equipment,
          rating,
          state.engineType,
          state.heatSinkType,
          state.heatSinkCount,
          state.enhancement,
          state.tonnage,
          state.techBase,
        );

        return {
          engineRating: rating,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setGyroType: (type) =>
      set((state) => {
        const equipment = applyGyroTypeChange(
          state.equipment,
          state.engineType,
          state.gyroType,
          type,
        );

        return {
          gyroType: type,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setInternalStructureType: (type) =>
      set((state) => {
        const equipment = applyInternalStructureTypeChange(
          state.equipment,
          type,
        );

        return {
          internalStructureType: type,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setCockpitType: (type) =>
      set({
        cockpitType: type,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setHeatSinkType: (type) =>
      set((state) => {
        const equipment = applyHeatSinkTypeChange(
          state.equipment,
          state.engineRating,
          state.engineType,
          type,
          state.heatSinkCount,
        );

        return {
          heatSinkType: type,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setHeatSinkCount: (count) =>
      set((state) => {
        const equipment = applyHeatSinkCountChange(
          state.equipment,
          state.engineRating,
          state.engineType,
          state.heatSinkType,
          count,
        );

        return {
          heatSinkCount: count,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setArmorType: (type) =>
      set((state) => {
        const { equipment, armorTonnage } = applyArmorTypeChange(
          state.equipment,
          state.tonnage,
          state.configuration,
          state.armorTonnage,
          type,
        );

        return {
          armorType: type,
          armorTonnage,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setEnhancement: (enhancement) =>
      set((state) => {
        const equipment = applyEnhancementChange(
          state.equipment,
          enhancement,
          state.tonnage,
          state.techBase,
          state.engineRating,
          state.engineType,
        );

        return {
          enhancement,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setJumpMP: (jumpMP) =>
      set((state) => {
        const { equipment, jumpMP: clampedJumpMP } = applyJumpMPChange(
          state.equipment,
          state.tonnage,
          state.engineRating,
          state.jumpJetType,
          jumpMP,
        );

        return {
          jumpMP: clampedJumpMP,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setJumpJetType: (jumpJetType) =>
      set((state) => {
        const { equipment, jumpMP: clampedJumpMP } = applyJumpJetTypeChange(
          state.equipment,
          state.tonnage,
          state.engineRating,
          state.jumpMP,
          jumpJetType,
        );

        return {
          jumpJetType,
          jumpMP: clampedJumpMP,
          equipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
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
}
