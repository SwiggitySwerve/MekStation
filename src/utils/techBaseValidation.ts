/**
 * Tech Base Validation Utilities
 *
 * Abstracted validation system for component selections based on tech base.
 * Uses a registry pattern to make it easy to add new component types.
 *
 * @spec openspec/specs/component-configuration/spec.md
 * @spec openspec/specs/tech-base-integration/spec.md
 */

import { ISelectionMemory } from '@/stores/unitState';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { IComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';

import {
  filterEngineTypes,
  filterGyroTypes,
  filterStructureTypes,
  filterCockpitTypes,
  filterHeatSinkTypes,
  filterArmorTypes,
} from './techBaseValidation.filters';
import { getValueWithMemory } from './techBaseValidation.helpers';

export {
  getValidatedSelectionUpdates,
  getSelectionWithMemory,
} from './techBaseValidation.helpers';

// =============================================================================
// Component Selections Interface
// =============================================================================

export interface ComponentSelections {
  engineType: EngineType;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  armorType: ArmorTypeEnum;
}

// =============================================================================
// Component Validator Interface
// =============================================================================

export interface ComponentValidator<T> {
  getValidTypes: (techBase: TechBase) => T[];
  isValid: (value: T, techBase: TechBase) => boolean;
  getDefault: (techBase: TechBase) => T;
  fallbackDefault: T;
}

/**
 * Create a validator for a component type
 */
function createValidator<T>(
  filterFn: (techBase: TechBase) => T[],
  fallbackDefault: T,
): ComponentValidator<T> {
  return {
    getValidTypes: filterFn,
    isValid: (value: T, techBase: TechBase) =>
      filterFn(techBase).includes(value),
    getDefault: (techBase: TechBase) =>
      filterFn(techBase)[0] ?? fallbackDefault,
    fallbackDefault,
  };
}

// =============================================================================
// Component Validators Registry
// =============================================================================

/**
 * Registry of all component validators
 * Add new component types here to integrate them into the validation system
 */
export const COMPONENT_VALIDATORS = {
  engine: createValidator(filterEngineTypes, EngineType.STANDARD),
  gyro: createValidator(filterGyroTypes, GyroType.STANDARD),
  structure: createValidator(
    filterStructureTypes,
    InternalStructureType.STANDARD,
  ),
  cockpit: createValidator(filterCockpitTypes, CockpitType.STANDARD),
  heatSink: createValidator(filterHeatSinkTypes, HeatSinkType.SINGLE),
  armor: createValidator(filterArmorTypes, ArmorTypeEnum.STANDARD),
} as const;

// =============================================================================
// Public API - Generic Functions
// =============================================================================

/** Get valid engine types for a tech base */
export const getValidEngineTypes = COMPONENT_VALIDATORS.engine.getValidTypes;
/** Check if engine type is valid for a tech base */
export const isEngineTypeValid = COMPONENT_VALIDATORS.engine.isValid;
/** Get default engine type for a tech base */
export const getDefaultEngineType = COMPONENT_VALIDATORS.engine.getDefault;

/** Get valid gyro types for a tech base */
export const getValidGyroTypes = COMPONENT_VALIDATORS.gyro.getValidTypes;
/** Check if gyro type is valid for a tech base */
export const isGyroTypeValid = COMPONENT_VALIDATORS.gyro.isValid;
/** Get default gyro type for a tech base */
export const getDefaultGyroType = COMPONENT_VALIDATORS.gyro.getDefault;

/** Get valid structure types for a tech base */
export const getValidStructureTypes =
  COMPONENT_VALIDATORS.structure.getValidTypes;
/** Check if structure type is valid for a tech base */
export const isStructureTypeValid = COMPONENT_VALIDATORS.structure.isValid;
/** Get default structure type for a tech base */
export const getDefaultStructureType =
  COMPONENT_VALIDATORS.structure.getDefault;

/** Get valid cockpit types for a tech base */
export const getValidCockpitTypes = COMPONENT_VALIDATORS.cockpit.getValidTypes;
/** Check if cockpit type is valid for a tech base */
export const isCockpitTypeValid = COMPONENT_VALIDATORS.cockpit.isValid;
/** Get default cockpit type for a tech base */
export const getDefaultCockpitType = COMPONENT_VALIDATORS.cockpit.getDefault;

/** Get valid heat sink types for a tech base */
export const getValidHeatSinkTypes =
  COMPONENT_VALIDATORS.heatSink.getValidTypes;
/** Check if heat sink type is valid for a tech base */
export const isHeatSinkTypeValid = COMPONENT_VALIDATORS.heatSink.isValid;
/** Get default heat sink type for a tech base */
export const getDefaultHeatSinkType = COMPONENT_VALIDATORS.heatSink.getDefault;

/** Get valid armor types for a tech base */
export const getValidArmorTypes = COMPONENT_VALIDATORS.armor.getValidTypes;
/** Check if armor type is valid for a tech base */
export const isArmorTypeValid = COMPONENT_VALIDATORS.armor.isValid;
/** Get default armor type for a tech base */
export const getDefaultArmorType = COMPONENT_VALIDATORS.armor.getDefault;

export function getFullyValidatedSelections(
  componentTechBases: IComponentTechBases,
  currentSelections: ComponentSelections,
  memory?: ISelectionMemory,
  memoryTechBase?: TechBase,
): ComponentSelections {
  const { engine, gyro, structure, cockpit, heatSink, armor } =
    COMPONENT_VALIDATORS;

  if (memory && memoryTechBase) {
    return {
      engineType: getValueWithMemory(
        engine,
        currentSelections.engineType,
        componentTechBases.engine,
        memory.engine[memoryTechBase],
      ),
      gyroType: getValueWithMemory(
        gyro,
        currentSelections.gyroType,
        componentTechBases.gyro,
        memory.gyro[memoryTechBase],
      ),
      internalStructureType: getValueWithMemory(
        structure,
        currentSelections.internalStructureType,
        componentTechBases.chassis,
        memory.structure[memoryTechBase],
      ),
      cockpitType: getValueWithMemory(
        cockpit,
        currentSelections.cockpitType,
        componentTechBases.chassis,
        memory.cockpit[memoryTechBase],
      ),
      heatSinkType: getValueWithMemory(
        heatSink,
        currentSelections.heatSinkType,
        componentTechBases.heatsink,
        memory.heatSink[memoryTechBase],
      ),
      armorType: getValueWithMemory(
        armor,
        currentSelections.armorType,
        componentTechBases.armor,
        memory.armor[memoryTechBase],
      ),
    };
  }

  return {
    engineType: engine.isValid(
      currentSelections.engineType,
      componentTechBases.engine,
    )
      ? currentSelections.engineType
      : engine.getDefault(componentTechBases.engine),
    gyroType: gyro.isValid(currentSelections.gyroType, componentTechBases.gyro)
      ? currentSelections.gyroType
      : gyro.getDefault(componentTechBases.gyro),
    internalStructureType: structure.isValid(
      currentSelections.internalStructureType,
      componentTechBases.chassis,
    )
      ? currentSelections.internalStructureType
      : structure.getDefault(componentTechBases.chassis),
    cockpitType: cockpit.isValid(
      currentSelections.cockpitType,
      componentTechBases.chassis,
    )
      ? currentSelections.cockpitType
      : cockpit.getDefault(componentTechBases.chassis),
    heatSinkType: heatSink.isValid(
      currentSelections.heatSinkType,
      componentTechBases.heatsink,
    )
      ? currentSelections.heatSinkType
      : heatSink.getDefault(componentTechBases.heatsink),
    armorType: armor.isValid(
      currentSelections.armorType,
      componentTechBases.armor,
    )
      ? currentSelections.armorType
      : armor.getDefault(componentTechBases.armor),
  };
}
