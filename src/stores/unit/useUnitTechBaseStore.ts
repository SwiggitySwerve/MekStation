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
import type { UnitSliceGetFn, UnitSliceSetFn } from './unitSliceTypes';

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

const techBaseByMode: Partial<Record<TechBaseMode, TechBase>> = {
  [TechBaseMode.CLAN]: TechBase.CLAN,
  [TechBaseMode.INNER_SPHERE]: TechBase.INNER_SPHERE,
};

function getModeTechBase(
  mode: TechBaseMode,
  currentTechBase: TechBase,
): TechBase {
  return techBaseByMode[mode] ?? currentTechBase;
}

function getFixedModeTechBase(mode: TechBaseMode): TechBase {
  return techBaseByMode[mode] ?? TechBase.INNER_SPHERE;
}

function getCurrentSelections(state: UnitStore): ComponentSelections {
  return {
    engineType: state.engineType,
    gyroType: state.gyroType,
    internalStructureType: state.internalStructureType,
    cockpitType: state.cockpitType,
    heatSinkType: state.heatSinkType,
    armorType: state.armorType,
  };
}

function rememberFixedModeSelections(state: UnitStore): ISelectionMemory {
  const oldTechBase = getFixedModeTechBase(state.techBaseMode);
  if (state.techBaseMode === TechBaseMode.MIXED) {
    return { ...state.selectionMemory };
  }

  return {
    engine: {
      ...state.selectionMemory.engine,
      [oldTechBase]: state.engineType,
    },
    gyro: { ...state.selectionMemory.gyro, [oldTechBase]: state.gyroType },
    structure: {
      ...state.selectionMemory.structure,
      [oldTechBase]: state.internalStructureType,
    },
    cockpit: {
      ...state.selectionMemory.cockpit,
      [oldTechBase]: state.cockpitType,
    },
    heatSink: {
      ...state.selectionMemory.heatSink,
      [oldTechBase]: state.heatSinkType,
    },
    armor: {
      ...state.selectionMemory.armor,
      [oldTechBase]: state.armorType,
    },
  };
}

type MemoryUpdateFn = (
  state: UnitStore,
  memory: ISelectionMemory,
  oldTechBase: TechBase,
) => ISelectionMemory;

const componentMemoryUpdates: Partial<
  Record<TechBaseComponent, MemoryUpdateFn>
> = {
  [TechBaseComponent.ENGINE]: (state, memory, oldTechBase) => ({
    ...memory,
    engine: { ...memory.engine, [oldTechBase]: state.engineType },
  }),
  [TechBaseComponent.GYRO]: (state, memory, oldTechBase) => ({
    ...memory,
    gyro: { ...memory.gyro, [oldTechBase]: state.gyroType },
  }),
  [TechBaseComponent.CHASSIS]: (state, memory, oldTechBase) => ({
    ...memory,
    structure: {
      ...memory.structure,
      [oldTechBase]: state.internalStructureType,
    },
    cockpit: { ...memory.cockpit, [oldTechBase]: state.cockpitType },
  }),
  [TechBaseComponent.HEATSINK]: (state, memory, oldTechBase) => ({
    ...memory,
    heatSink: { ...memory.heatSink, [oldTechBase]: state.heatSinkType },
  }),
  [TechBaseComponent.ARMOR]: (state, memory, oldTechBase) => ({
    ...memory,
    armor: { ...memory.armor, [oldTechBase]: state.armorType },
  }),
};

function rememberComponentSelection(
  state: UnitStore,
  component: TechBaseComponent,
): ISelectionMemory {
  const oldTechBase = state.componentTechBases[component];
  const updateMemory = componentMemoryUpdates[component];
  const memory = { ...state.selectionMemory };
  return updateMemory ? updateMemory(state, memory, oldTechBase) : memory;
}

function syncHeatSinkEquipment(
  state: UnitStore,
  equipment: readonly UnitStore['equipment'][number][],
  selectionUpdates: Partial<ComponentSelections>,
): readonly UnitStore['equipment'][number][] {
  if (
    !selectionUpdates.heatSinkType ||
    selectionUpdates.heatSinkType === state.heatSinkType
  ) {
    return equipment;
  }

  const integralHeatSinks = calculateIntegralHeatSinks(
    state.engineRating,
    state.engineType,
  );
  const externalHeatSinks = Math.max(
    0,
    state.heatSinkCount - integralHeatSinks,
  );
  const nonHeatSinkEquipment = filterOutHeatSinks(equipment);
  const heatSinkEquipment = createHeatSinkEquipmentList(
    selectionUpdates.heatSinkType,
    externalHeatSinks,
  );
  return [...nonHeatSinkEquipment, ...heatSinkEquipment];
}

function syncEnhancementEquipment(
  state: UnitStore,
  equipment: readonly UnitStore['equipment'][number][],
  component: TechBaseComponent,
  oldTechBase: TechBase,
  techBase: TechBase,
): readonly UnitStore['equipment'][number][] {
  const shouldResyncEnhancement =
    (component === TechBaseComponent.MYOMER ||
      component === TechBaseComponent.MOVEMENT) &&
    state.enhancement &&
    oldTechBase !== techBase;

  if (!shouldResyncEnhancement) {
    return equipment;
  }

  const engineWeight = calculateEngineWeight(
    state.engineRating,
    state.engineType,
  );
  const nonEnhancementEquipment = filterOutEnhancementEquipment(equipment);
  const enhancementEquipment = createEnhancementEquipmentList(
    state.enhancement,
    state.tonnage,
    techBase,
    engineWeight,
  );
  return [...nonEnhancementEquipment, ...enhancementEquipment];
}

export function createTechBaseSlice(
  set: UnitSliceSetFn,
  _get: UnitSliceGetFn,
): UnitTechBaseActions {
  return {
    setTechBaseMode: (mode) =>
      set((state) => {
        const newTechBase = getModeTechBase(mode, state.techBase);
        const newComponentTechBases =
          mode === TechBaseMode.MIXED
            ? state.componentTechBases
            : createDefaultComponentTechBases(newTechBase);

        const memoryTechBase =
          mode === TechBaseMode.MIXED ? undefined : newTechBase;

        // Save current selections to memory for the OLD tech base (if not mixed)
        const updatedMemory = rememberFixedModeSelections(state);

        const validatedSelections = getFullyValidatedSelections(
          newComponentTechBases,
          getCurrentSelections(state),
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

        // Save current selection to memory for the OLD tech base
        const updatedMemory = rememberComponentSelection(
          state,
          component as TechBaseComponent,
        );

        const selectionUpdates = getSelectionWithMemory(
          component as TechBaseComponent,
          techBase,
          getCurrentSelections(state),
          updatedMemory,
        );

        const heatSyncedEquipment = syncHeatSinkEquipment(
          state,
          state.equipment,
          selectionUpdates,
        );
        const updatedEquipment = syncEnhancementEquipment(
          state,
          heatSyncedEquipment,
          component as TechBaseComponent,
          oldTechBase,
          techBase,
        );

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
