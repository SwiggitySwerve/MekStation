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
import type {
  LAMMode,
  QuadVeeMode,
} from '@/types/construction/MechConfigurationSystem';
import type { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import type { RulesLevel } from '@/types/enums/RulesLevel';
import type { JumpJetType } from '@/utils/construction/movementCalculations';

import { getArmorDefinition } from '@/types/construction/ArmorType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';
import {
  getEquipmentDisplacedByEngineChange,
  getEquipmentDisplacedByGyroChange,
  applyDisplacement,
} from '@/utils/construction/displacementUtils';
import {
  calculateIntegralHeatSinks,
  calculateEngineWeight,
} from '@/utils/construction/engineCalculations';
import { getMaxJumpMP } from '@/utils/construction/movementCalculations';
import {
  createJumpJetEquipmentList,
  filterOutJumpJets,
  createInternalStructureEquipmentList,
  filterOutInternalStructure,
  createArmorEquipmentList,
  filterOutArmorSlots,
  createHeatSinkEquipmentList,
  filterOutHeatSinks,
  createEnhancementEquipmentList,
  filterOutEnhancementEquipment,
} from '@/utils/equipment/equipmentListUtils';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import type { UnitStore } from '../unitState';

// =============================================================================
// Types
// =============================================================================

export interface UnitStructureActions {
  // Identity
  setName: (name: string) => void;
  setChassis: (chassis: string) => void;
  setClanName: (clanName: string) => void;
  setModel: (model: string) => void;
  setMulId: (mulId: string) => void;
  setYear: (year: number) => void;
  setRulesLevel: (rulesLevel: RulesLevel) => void;

  // Chassis
  setTonnage: (tonnage: number) => void;
  setConfiguration: (configuration: MechConfiguration) => void;
  setIsOmni: (isOmni: boolean) => void;

  // Mode switching
  setLAMMode: (mode: LAMMode) => void;
  setQuadVeeMode: (mode: QuadVeeMode) => void;

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

    setClanName: (clanName) =>
      set({
        clanName,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

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
        const walkMP = Math.floor(state.engineRating / state.tonnage);
        const newEngineRating = tonnage * walkMP;
        const clampedRating = Math.max(10, Math.min(400, newEngineRating));

        // Re-sync enhancement equipment since MASC depends on tonnage
        const engineWeight = calculateEngineWeight(
          clampedRating,
          state.engineType,
        );

        let updatedEquipment = filterOutEnhancementEquipment(state.equipment);
        updatedEquipment = filterOutJumpJets(updatedEquipment);

        const enhancementEquipment = createEnhancementEquipmentList(
          state.enhancement,
          tonnage,
          state.techBase,
          engineWeight,
        );

        // Recreate jump jet equipment (weight varies by tonnage class)
        const jumpJetEquipment = createJumpJetEquipmentList(
          tonnage,
          state.jumpMP,
          state.jumpJetType,
        );

        return {
          tonnage,
          engineRating: clampedRating,
          equipment: [
            ...updatedEquipment,
            ...enhancementEquipment,
            ...jumpJetEquipment,
          ],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setConfiguration: (configuration) =>
      set({
        configuration,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    setIsOmni: (isOmni) =>
      set({
        isOmni,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),

    // =================================================================
    // Mode Switching Actions
    // =================================================================

    setLAMMode: (lamMode) =>
      set((state) => {
        if (state.configuration !== MechConfiguration.LAM) {
          return state;
        }
        return {
          lamMode,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setQuadVeeMode: (quadVeeMode) =>
      set((state) => {
        if (state.configuration !== MechConfiguration.QUADVEE) {
          return state;
        }
        return {
          quadVeeMode,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

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
        // Equipment displacement from engine slot changes
        const displaced = getEquipmentDisplacedByEngineChange(
          state.equipment,
          state.engineType,
          type,
          state.gyroType,
        );
        let updatedEquipment = applyDisplacement(
          state.equipment,
          displaced.displacedEquipmentIds,
        );

        // Re-sync heat sinks (integral capacity may change)
        const integralHeatSinks = calculateIntegralHeatSinks(
          state.engineRating,
          type,
        );
        const externalHeatSinks = Math.max(
          0,
          state.heatSinkCount - integralHeatSinks,
        );
        const nonHeatSinkEquipment = filterOutHeatSinks(updatedEquipment);
        const heatSinkEquipment = createHeatSinkEquipmentList(
          state.heatSinkType,
          externalHeatSinks,
        );
        updatedEquipment = [...nonHeatSinkEquipment, ...heatSinkEquipment];

        // Re-sync enhancement equipment (Supercharger depends on engine weight)
        const engineWeight = calculateEngineWeight(state.engineRating, type);
        const nonEnhancementEquipment =
          filterOutEnhancementEquipment(updatedEquipment);
        const enhancementEquipment = createEnhancementEquipmentList(
          state.enhancement,
          state.tonnage,
          state.techBase,
          engineWeight,
        );
        updatedEquipment = [
          ...nonEnhancementEquipment,
          ...enhancementEquipment,
        ];

        return {
          engineType: type,
          equipment: updatedEquipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setEngineRating: (rating) =>
      set((state) => {
        // Re-sync heat sinks
        const integralHeatSinks = calculateIntegralHeatSinks(
          rating,
          state.engineType,
        );
        const externalHeatSinks = Math.max(
          0,
          state.heatSinkCount - integralHeatSinks,
        );
        const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
        const heatSinkEquipment = createHeatSinkEquipmentList(
          state.heatSinkType,
          externalHeatSinks,
        );

        // Re-sync enhancement equipment
        const engineWeight = calculateEngineWeight(rating, state.engineType);
        const nonEnhancementEquipment = filterOutEnhancementEquipment([
          ...nonHeatSinkEquipment,
          ...heatSinkEquipment,
        ]);
        const enhancementEquipment = createEnhancementEquipmentList(
          state.enhancement,
          state.tonnage,
          state.techBase,
          engineWeight,
        );

        return {
          engineRating: rating,
          equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setGyroType: (type) =>
      set((state) => {
        // Equipment displacement from gyro slot changes
        const displaced = getEquipmentDisplacedByGyroChange(
          state.equipment,
          state.engineType,
          state.gyroType,
          type,
        );
        const updatedEquipment = applyDisplacement(
          state.equipment,
          displaced.displacedEquipmentIds,
        );

        return {
          gyroType: type,
          equipment: updatedEquipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setInternalStructureType: (type) =>
      set((state) => {
        const nonStructureEquipment = filterOutInternalStructure(
          state.equipment,
        );
        const structureEquipment = createInternalStructureEquipmentList(type);

        return {
          internalStructureType: type,
          equipment: [...nonStructureEquipment, ...structureEquipment],
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
        const integralHeatSinks = calculateIntegralHeatSinks(
          state.engineRating,
          state.engineType,
        );
        const externalHeatSinks = Math.max(
          0,
          state.heatSinkCount - integralHeatSinks,
        );

        const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
        const heatSinkEquipment = createHeatSinkEquipmentList(
          type,
          externalHeatSinks,
        );

        return {
          heatSinkType: type,
          equipment: [...nonHeatSinkEquipment, ...heatSinkEquipment],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setHeatSinkCount: (count) =>
      set((state) => {
        const integralHeatSinks = calculateIntegralHeatSinks(
          state.engineRating,
          state.engineType,
        );
        const externalHeatSinks = Math.max(0, count - integralHeatSinks);

        const nonHeatSinkEquipment = filterOutHeatSinks(state.equipment);
        const heatSinkEquipment = createHeatSinkEquipmentList(
          state.heatSinkType,
          externalHeatSinks,
        );

        return {
          heatSinkCount: count,
          equipment: [...nonHeatSinkEquipment, ...heatSinkEquipment],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setArmorType: (type) =>
      set((state) => {
        const nonArmorEquipment = filterOutArmorSlots(state.equipment);
        const armorEquipment = createArmorEquipmentList(type);

        const maxTotalArmor = getMaxTotalArmor(
          state.tonnage,
          state.configuration,
        );
        const newPointsPerTon = getArmorDefinition(type)?.pointsPerTon ?? 16;
        const maxUsefulTonnage = ceilToHalfTon(maxTotalArmor / newPointsPerTon);
        const cappedTonnage = Math.min(state.armorTonnage, maxUsefulTonnage);

        return {
          armorType: type,
          armorTonnage: cappedTonnage,
          equipment: [...nonArmorEquipment, ...armorEquipment],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setEnhancement: (enhancement) =>
      set((state) => {
        const nonEnhancementEquipment = filterOutEnhancementEquipment(
          state.equipment,
        );
        const engineWeight = calculateEngineWeight(
          state.engineRating,
          state.engineType,
        );
        const enhancementEquipment = createEnhancementEquipmentList(
          enhancement,
          state.tonnage,
          state.techBase,
          engineWeight,
        );

        return {
          enhancement,
          equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setJumpMP: (jumpMP) =>
      set((state) => {
        const walkMP = Math.floor(state.engineRating / state.tonnage);
        const maxJump = getMaxJumpMP(walkMP, state.jumpJetType);
        const clampedJumpMP = Math.max(0, Math.min(jumpMP, maxJump));

        const nonJumpEquipment = filterOutJumpJets(state.equipment);
        const jumpJetEquipment = createJumpJetEquipmentList(
          state.tonnage,
          clampedJumpMP,
          state.jumpJetType,
        );

        return {
          jumpMP: clampedJumpMP,
          equipment: [...nonJumpEquipment, ...jumpJetEquipment],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setJumpJetType: (jumpJetType) =>
      set((state) => {
        const walkMP = Math.floor(state.engineRating / state.tonnage);
        const maxJump = getMaxJumpMP(walkMP, jumpJetType);
        const clampedJumpMP = Math.min(state.jumpMP, maxJump);

        const nonJumpEquipment = filterOutJumpJets(state.equipment);
        const jumpJetEquipment = createJumpJetEquipmentList(
          state.tonnage,
          clampedJumpMP,
          jumpJetType,
        );

        return {
          jumpJetType,
          jumpMP: clampedJumpMP,
          equipment: [...nonJumpEquipment, ...jumpJetEquipment],
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
