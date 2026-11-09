/**
 * Tech Base Validation Utilities - Public Aggregator
 *
 * High-level entry point used by stores and UI code. Re-exports the
 * shared types, the validator registry, and the helper functions, and
 * provides the orchestrating `getFullyValidatedSelections` function
 * plus the per-component getValidTypes/isValid/getDefault aliases.
 *
 * The shared interfaces and the COMPONENT_VALIDATORS registry live in
 * `techBaseValidation.types.ts`. The selection-update helpers live in
 * `techBaseValidation.helpers.ts`. The component-to-affected-selection
 * mapping lives in `techBaseValidation.mapping.ts`. None of those may
 * import from this file or a 3-way cycle returns.
 *
 * @spec openspec/specs/component-configuration/spec.md
 * @spec openspec/specs/tech-base-integration/spec.md
 */

import { ISelectionMemory } from '@/stores/unitState';
import {
  IComponentTechBases,
  TechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import { ALL_TECH_BASES, TechBase } from '@/types/enums/TechBase';

import { getValueWithMemory } from './techBaseValidation.helpers';
import {
  COMPONENT_VALIDATORS,
  type ComponentSelections,
  type ComponentValidator,
} from './techBaseValidation.types';

// Re-export shared types/registry so existing consumers keep working.
export {
  COMPONENT_VALIDATORS,
  type ComponentSelections,
  type ComponentValidator,
} from './techBaseValidation.types';

export {
  getValidatedSelectionUpdates,
  getSelectionWithMemory,
} from './techBaseValidation.helpers';

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

/** Mixed components retain their own legal family independently of chassis. */
function getMixedSelection<T>(
  validator: ComponentValidator<T>,
  current: T,
  fallbackTechBase: TechBase,
): T {
  return ALL_TECH_BASES.some((techBase) => validator.isValid(current, techBase))
    ? current
    : validator.getDefault(fallbackTechBase);
}

export function getFullyValidatedSelections(
  componentTechBases: IComponentTechBases,
  currentSelections: ComponentSelections,
  memory?: ISelectionMemory,
  memoryTechBase?: TechBase,
  mode?: TechBaseMode,
): ComponentSelections {
  const { engine, gyro, structure, cockpit, heatSink, armor } =
    COMPONENT_VALIDATORS;

  if (mode === TechBaseMode.MIXED) {
    // MegaMek 48fcb2f64 TestEntity.java:1266-1269,1320-1323,1346-1349,
    // 1373-1376,1432-1435 gates opposite-tech rejection on !isMixedTech().
    // MtfFile.java:374-382 reads a Mixed structure by its named component type.
    return {
      engineType: getMixedSelection(
        engine,
        currentSelections.engineType,
        componentTechBases.engine,
      ),
      gyroType: getMixedSelection(
        gyro,
        currentSelections.gyroType,
        componentTechBases.gyro,
      ),
      internalStructureType: getMixedSelection(
        structure,
        currentSelections.internalStructureType,
        componentTechBases.chassis,
      ),
      cockpitType: getMixedSelection(
        cockpit,
        currentSelections.cockpitType,
        componentTechBases.chassis,
      ),
      heatSinkType: getMixedSelection(
        heatSink,
        currentSelections.heatSinkType,
        componentTechBases.heatsink,
      ),
      armorType: getMixedSelection(
        armor,
        currentSelections.armorType,
        componentTechBases.armor,
      ),
    };
  }

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
