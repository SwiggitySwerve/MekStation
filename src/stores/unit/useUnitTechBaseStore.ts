/**
 * Unit Tech Base Store Slice
 *
 * Tech base switching actions: mode changes, per-component tech base,
 * selection memory, and equipment re-sync on tech base transitions.
 */

import {
  TechBaseMode,
  TechBaseComponent,
  createDefaultComponentTechBases,
  IComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import {
  calculateIntegralHeatSinks,
  calculateEngineWeight,
} from '@/utils/construction/engineCalculations';
import {
  filterOutHeatSinks,
  createHeatSinkEquipmentList,
  filterOutEnhancementEquipment,
  createEnhancementEquipmentList,
} from '@/utils/equipment/equipmentListUtils';
import {
  getFullyValidatedSelections,
  getSelectionWithMemory,
  ComponentSelections,
} from '@/utils/techBaseValidation';

import type { UnitStore, ISelectionMemory } from '../unitState';

// =============================================================================
// Types
// =============================================================================

export interface UnitTechBaseActions {
  setTechBaseMode: (mode: TechBaseMode) => void;
  setComponentTechBase: (
    component: keyof IComponentTechBases,
    techBase: TechBase,
  ) => void;
  setAllComponentTechBases: (techBases: IComponentTechBases) => void;
}

// =============================================================================
// Slice Factory
// =============================================================================

type SetFn = (
  partial: Partial<UnitStore> | ((state: UnitStore) => Partial<UnitStore>),
) => void;
type GetFn = () => UnitStore;

export function createTechBaseSlice(
  set: SetFn,
  _get: GetFn,
): UnitTechBaseActions {
  return {
    setTechBaseMode: (mode) =>
      set((state) => {
        const newTechBase =
          mode === TechBaseMode.MIXED
            ? state.techBase
            : mode === TechBaseMode.CLAN
              ? TechBase.CLAN
              : TechBase.INNER_SPHERE;
        const newComponentTechBases =
          mode === TechBaseMode.MIXED
            ? state.componentTechBases
            : createDefaultComponentTechBases(newTechBase);

        const oldTechBase =
          state.techBaseMode === TechBaseMode.CLAN
            ? TechBase.CLAN
            : TechBase.INNER_SPHERE;
        const memoryTechBase =
          mode === TechBaseMode.MIXED ? undefined : newTechBase;

        const currentSelections: ComponentSelections = {
          engineType: state.engineType,
          gyroType: state.gyroType,
          internalStructureType: state.internalStructureType,
          cockpitType: state.cockpitType,
          heatSinkType: state.heatSinkType,
          armorType: state.armorType,
        };

        // Save current selections to memory for the OLD tech base (if not mixed)
        let updatedMemory = { ...state.selectionMemory };
        if (state.techBaseMode !== TechBaseMode.MIXED) {
          updatedMemory = {
            engine: {
              ...updatedMemory.engine,
              [oldTechBase]: state.engineType,
            },
            gyro: { ...updatedMemory.gyro, [oldTechBase]: state.gyroType },
            structure: {
              ...updatedMemory.structure,
              [oldTechBase]: state.internalStructureType,
            },
            cockpit: {
              ...updatedMemory.cockpit,
              [oldTechBase]: state.cockpitType,
            },
            heatSink: {
              ...updatedMemory.heatSink,
              [oldTechBase]: state.heatSinkType,
            },
            armor: {
              ...updatedMemory.armor,
              [oldTechBase]: state.armorType,
            },
          };
        }

        const validatedSelections = getFullyValidatedSelections(
          newComponentTechBases,
          currentSelections,
          memoryTechBase ? updatedMemory : undefined,
          memoryTechBase,
        );

        // Re-sync enhancement equipment since MASC calculation differs by tech base
        const engineWeight = calculateEngineWeight(
          state.engineRating,
          validatedSelections.engineType ?? state.engineType,
        );
        const nonEnhancementEquipment = filterOutEnhancementEquipment(
          state.equipment,
        );
        const enhancementEquipment = createEnhancementEquipmentList(
          state.enhancement,
          state.tonnage,
          newTechBase,
          engineWeight,
        );

        return {
          techBaseMode: mode,
          techBase: newTechBase,
          componentTechBases: newComponentTechBases,
          selectionMemory: updatedMemory,
          ...validatedSelections,
          equipment: [...nonEnhancementEquipment, ...enhancementEquipment],
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setComponentTechBase: (component, techBase) =>
      set((state) => {
        const oldTechBase = state.componentTechBases[component];

        const currentSelections: ComponentSelections = {
          engineType: state.engineType,
          gyroType: state.gyroType,
          internalStructureType: state.internalStructureType,
          cockpitType: state.cockpitType,
          heatSinkType: state.heatSinkType,
          armorType: state.armorType,
        };

        const updatedMemory: ISelectionMemory = {
          ...state.selectionMemory,
        };

        // Save current selection to memory for the OLD tech base
        if (component === TechBaseComponent.ENGINE) {
          updatedMemory.engine = {
            ...updatedMemory.engine,
            [oldTechBase]: state.engineType,
          };
        } else if (component === TechBaseComponent.GYRO) {
          updatedMemory.gyro = {
            ...updatedMemory.gyro,
            [oldTechBase]: state.gyroType,
          };
        } else if (component === TechBaseComponent.CHASSIS) {
          updatedMemory.structure = {
            ...updatedMemory.structure,
            [oldTechBase]: state.internalStructureType,
          };
          updatedMemory.cockpit = {
            ...updatedMemory.cockpit,
            [oldTechBase]: state.cockpitType,
          };
        } else if (component === TechBaseComponent.HEATSINK) {
          updatedMemory.heatSink = {
            ...updatedMemory.heatSink,
            [oldTechBase]: state.heatSinkType,
          };
        } else if (component === TechBaseComponent.ARMOR) {
          updatedMemory.armor = {
            ...updatedMemory.armor,
            [oldTechBase]: state.armorType,
          };
        }

        const selectionUpdates = getSelectionWithMemory(
          component as TechBaseComponent,
          techBase,
          currentSelections,
          updatedMemory,
        );

        // Sync equipment if heat sink type changed
        let updatedEquipment = state.equipment;
        if (
          selectionUpdates.heatSinkType &&
          selectionUpdates.heatSinkType !== state.heatSinkType
        ) {
          const integralHeatSinks = calculateIntegralHeatSinks(
            state.engineRating,
            state.engineType,
          );
          const externalHeatSinks = Math.max(
            0,
            state.heatSinkCount - integralHeatSinks,
          );
          const nonHeatSinkEquipment = filterOutHeatSinks(updatedEquipment);
          const heatSinkEquipment = createHeatSinkEquipmentList(
            selectionUpdates.heatSinkType,
            externalHeatSinks,
          );
          updatedEquipment = [...nonHeatSinkEquipment, ...heatSinkEquipment];
        }

        // Sync enhancement equipment if MYOMER or MOVEMENT tech base changed
        if (
          (component === TechBaseComponent.MYOMER ||
            component === TechBaseComponent.MOVEMENT) &&
          state.enhancement &&
          oldTechBase !== techBase
        ) {
          const engineWeight = calculateEngineWeight(
            state.engineRating,
            state.engineType,
          );
          const nonEnhancementEquipment =
            filterOutEnhancementEquipment(updatedEquipment);
          const enhancementEquipment = createEnhancementEquipmentList(
            state.enhancement,
            state.tonnage,
            techBase,
            engineWeight,
          );
          updatedEquipment = [
            ...nonEnhancementEquipment,
            ...enhancementEquipment,
          ];
        }

        return {
          componentTechBases: {
            ...state.componentTechBases,
            [component]: techBase,
          },
          selectionMemory: updatedMemory,
          ...selectionUpdates,
          equipment: updatedEquipment,
          isModified: true,
          lastModifiedAt: Date.now(),
        };
      }),

    setAllComponentTechBases: (techBases) =>
      set({
        componentTechBases: techBases,
        isModified: true,
        lastModifiedAt: Date.now(),
      }),
  };
}
