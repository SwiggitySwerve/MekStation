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

import type { UnitSliceGetFn, UnitSliceSetFn } from './unitSliceTypes';

import { modificationPatch, modifiedPatch } from '../unitStoreIdentityActions';
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

export function createStructureSlice(
  set: UnitSliceSetFn,
  _get: UnitSliceGetFn,
): UnitStructureActions {
  return {
    ...createIdentityActions(set),
    ...createChassisActions(set),

    // =================================================================
    // OmniMech Actions
    // =================================================================

    setBaseChassisHeatSinks: (count) =>
      set(
        modifiedPatch({
          baseChassisHeatSinks: count,
        }),
      ),

    resetChassis: () =>
      set((state) => {
        if (!state.isOmni) {
          return state;
        }
        const fixedEquipment = state.equipment.filter(
          (eq) => !eq.isOmniPodMounted,
        );
        return modifiedPatch({
          equipment: fixedEquipment,
        });
      }),

    setEquipmentPodMounted: (instanceId, isPodMounted) =>
      set((state) => {
        const equipment = state.equipment.map((eq) =>
          eq.instanceId === instanceId
            ? { ...eq, isOmniPodMounted: isPodMounted }
            : eq,
        );
        return modifiedPatch({
          equipment,
        });
      }),

    // =================================================================
    // Component Actions (with cascade/displacement logic)
    // =================================================================

    setEngineType: (type) =>
      set((state) => {
        const equipment = applyEngineTypeChange({
          equipment: state.equipment,
          oldEngineType: state.engineType,
          newEngineType: type,
          gyroType: state.gyroType,
          engineRating: state.engineRating,
          heatSinkType: state.heatSinkType,
          heatSinkCount: state.heatSinkCount,
          enhancement: state.enhancement,
          tonnage: state.tonnage,
          techBase: state.techBase,
        });

        return modifiedPatch({
          engineType: type,
          equipment,
        });
      }),

    setEngineRating: (rating) =>
      set((state) => {
        const equipment = applyEngineRatingChange({
          equipment: state.equipment,
          engineRating: rating,
          engineType: state.engineType,
          heatSinkType: state.heatSinkType,
          heatSinkCount: state.heatSinkCount,
          enhancement: state.enhancement,
          tonnage: state.tonnage,
          techBase: state.techBase,
        });

        return modifiedPatch({
          engineRating: rating,
          equipment,
        });
      }),

    setGyroType: (type) =>
      set((state) => {
        const equipment = applyGyroTypeChange(
          state.equipment,
          state.engineType,
          state.gyroType,
          type,
        );

        return modifiedPatch({
          gyroType: type,
          equipment,
        });
      }),

    setInternalStructureType: (type) =>
      set((state) => {
        const equipment = applyInternalStructureTypeChange(
          state.equipment,
          type,
        );

        return modifiedPatch({
          internalStructureType: type,
          equipment,
        });
      }),

    setCockpitType: (type) =>
      set(
        modifiedPatch({
          cockpitType: type,
        }),
      ),

    setHeatSinkType: (type) =>
      set((state) => {
        const equipment = applyHeatSinkTypeChange(
          state.equipment,
          state.engineRating,
          state.engineType,
          type,
          state.heatSinkCount,
        );

        return modifiedPatch({
          heatSinkType: type,
          equipment,
        });
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

        return modifiedPatch({
          heatSinkCount: count,
          equipment,
        });
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

        return modifiedPatch({
          armorType: type,
          armorTonnage,
          equipment,
        });
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

        return modifiedPatch({
          enhancement,
          equipment,
        });
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

        return modifiedPatch({
          jumpMP: clampedJumpMP,
          equipment,
        });
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

        return modifiedPatch({
          jumpJetType,
          jumpMP: clampedJumpMP,
          equipment,
        });
      }),

    // =================================================================
    // Metadata Actions
    // =================================================================

    markModified: (modified = true) => set(modificationPatch(modified)),
  };
}
