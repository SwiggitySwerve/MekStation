/**
 * Tech Base Validation Utilities
 * 
 * Abstracted validation system for component selections based on tech base.
 * Uses a registry pattern to make it easy to add new component types.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/component-configuration/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { TechBaseComponent, IComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import { EngineType, ENGINE_DEFINITIONS } from '@/types/construction/EngineType';
import { GyroType, GYRO_DEFINITIONS } from '@/types/construction/GyroType';
import { InternalStructureType, INTERNAL_STRUCTURE_DEFINITIONS } from '@/types/construction/InternalStructureType';
import { CockpitType, COCKPIT_DEFINITIONS } from '@/types/construction/CockpitType';
import { HeatSinkType, HEAT_SINK_DEFINITIONS } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum, ARMOR_DEFINITIONS } from '@/types/construction/ArmorType';
import { ISelectionMemory } from '@/stores/unitState';

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

/**
 * Generic interface for component validation
 * Each component type implements this to define its tech base filtering rules
 */
interface ComponentValidator<T> {
  /** Get all valid options for a given tech base */
  getValidTypes: (techBase: TechBase) => T[];
  /** Check if a specific value is valid for a tech base */
  isValid: (value: T, techBase: TechBase) => boolean;
  /** Get the default value for a tech base */
  getDefault: (techBase: TechBase) => T;
  /** The fallback default if no valid options exist */
  fallbackDefault: T;
}

/**
 * Create a validator for a component type
 */
function createValidator<T>(
  filterFn: (techBase: TechBase) => T[],
  fallbackDefault: T
): ComponentValidator<T> {
  return {
    getValidTypes: filterFn,
    isValid: (value: T, techBase: TechBase) => filterFn(techBase).includes(value),
    getDefault: (techBase: TechBase) => filterFn(techBase)[0] ?? fallbackDefault,
    fallbackDefault,
  };
}

// =============================================================================
// Tech Base Filtering Functions
// =============================================================================

/**
 * Engine tech base filter
 * - Standard, Compact, XXL: Available to both
 * - XL (IS), Light, non-fusion: IS only
 * - XL (Clan): Clan only
 */
function filterEngineTypes(techBase: TechBase): EngineType[] {
  return ENGINE_DEFINITIONS.filter(engine => {
    // Available to both tech bases
    if (engine.type === EngineType.STANDARD) return true;
    if (engine.type === EngineType.COMPACT) return true;
    if (engine.type === EngineType.XXL) return true;
    
    // Tech-base-specific
    if (engine.type === EngineType.XL_IS) return techBase === TechBase.INNER_SPHERE;
    if (engine.type === EngineType.XL_CLAN) return techBase === TechBase.CLAN;
    if (engine.type === EngineType.LIGHT) return techBase === TechBase.INNER_SPHERE;
    
    // Non-fusion engines (IS only)
    return techBase === TechBase.INNER_SPHERE;
  }).map(e => e.type);
}

/**
 * Gyro tech base filter
 * - All gyro types available to both tech bases
 */
function filterGyroTypes(_techBase: TechBase): GyroType[] {
  return GYRO_DEFINITIONS.map(g => g.type);
}

/**
 * Internal Structure tech base filter
 * - Standard: Available to both
 * - Endo Steel (IS), other experimental: IS only
 * - Endo Steel (Clan): Clan only
 */
function filterStructureTypes(techBase: TechBase): InternalStructureType[] {
  return INTERNAL_STRUCTURE_DEFINITIONS.filter(structure => {
    if (structure.type === InternalStructureType.STANDARD) return true;
    if (structure.type === InternalStructureType.ENDO_STEEL_IS) return techBase === TechBase.INNER_SPHERE;
    if (structure.type === InternalStructureType.ENDO_STEEL_CLAN) return techBase === TechBase.CLAN;
    // Other experimental types are IS-only
    return techBase === TechBase.INNER_SPHERE;
  }).map(s => s.type);
}

/**
 * Cockpit tech base filter
 * - All cockpit types available to both tech bases
 */
function filterCockpitTypes(_techBase: TechBase): CockpitType[] {
  return COCKPIT_DEFINITIONS.map(c => c.type);
}

/**
 * Heat Sink tech base filter
 * - Single: Available to both
 * - Double (IS), Compact: IS only
 * - Double (Clan), Laser: Clan only
 */
function filterHeatSinkTypes(techBase: TechBase): HeatSinkType[] {
  return HEAT_SINK_DEFINITIONS.filter(hs => {
    if (hs.type === HeatSinkType.SINGLE) return true;
    if (hs.type === HeatSinkType.DOUBLE_IS) return techBase === TechBase.INNER_SPHERE;
    if (hs.type === HeatSinkType.DOUBLE_CLAN) return techBase === TechBase.CLAN;
    if (hs.type === HeatSinkType.COMPACT) return techBase === TechBase.INNER_SPHERE;
    if (hs.type === HeatSinkType.LASER) return techBase === TechBase.CLAN;
    return false;
  }).map(h => h.type);
}

/**
 * Armor tech base filter
 * - Standard: Available to both
 * - Ferro-Fibrous (IS), other experimental: IS only
 * - Ferro-Fibrous (Clan): Clan only
 */
function filterArmorTypes(techBase: TechBase): ArmorTypeEnum[] {
  return ARMOR_DEFINITIONS.filter(armor => {
    if (armor.type === ArmorTypeEnum.STANDARD) return true;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_IS) return techBase === TechBase.INNER_SPHERE;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_CLAN) return techBase === TechBase.CLAN;
    // Other experimental types are typically IS-only
    return techBase === TechBase.INNER_SPHERE;
  }).map(a => a.type);
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
  structure: createValidator(filterStructureTypes, InternalStructureType.STANDARD),
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
export const getValidStructureTypes = COMPONENT_VALIDATORS.structure.getValidTypes;
/** Check if structure type is valid for a tech base */
export const isStructureTypeValid = COMPONENT_VALIDATORS.structure.isValid;
/** Get default structure type for a tech base */
export const getDefaultStructureType = COMPONENT_VALIDATORS.structure.getDefault;

/** Get valid cockpit types for a tech base */
export const getValidCockpitTypes = COMPONENT_VALIDATORS.cockpit.getValidTypes;
/** Check if cockpit type is valid for a tech base */
export const isCockpitTypeValid = COMPONENT_VALIDATORS.cockpit.isValid;
/** Get default cockpit type for a tech base */
export const getDefaultCockpitType = COMPONENT_VALIDATORS.cockpit.getDefault;

/** Get valid heat sink types for a tech base */
export const getValidHeatSinkTypes = COMPONENT_VALIDATORS.heatSink.getValidTypes;
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

// =============================================================================
// Component Tech Base Mapping
// =============================================================================

/**
 * Maps TechBaseComponent to the component selections it affects
 * This defines the relationship between tech base toggles and actual selections
 */
const COMPONENT_AFFECTED_SELECTIONS: Record<TechBaseComponent, Array<keyof ComponentSelections>> = {
  engine: ['engineType'],
  gyro: ['gyroType'],
  chassis: ['internalStructureType', 'cockpitType'], // Chassis affects both structure and cockpit
  heatsink: ['heatSinkType'],
  targeting: [], // Not yet implemented
  myomer: [], // Not yet implemented
  movement: [], // Not yet implemented
  armor: ['armorType'],
};

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Get the corrected component selections when a single tech base changes.
 * Returns the updates needed (empty object if all selections are still valid).
 */
export function getValidatedSelectionUpdates(
  component: TechBaseComponent,
  newTechBase: TechBase,
  currentSelections: ComponentSelections
): Partial<ComponentSelections> {
  const updates: Partial<ComponentSelections> = {};
  const affectedSelections = COMPONENT_AFFECTED_SELECTIONS[component];
  
  // Skip if component doesn't affect any selections
  if (!affectedSelections || affectedSelections.length === 0) {
    return updates;
  }
  
  // Validate each affected selection
  for (const selectionKey of affectedSelections) {
    switch (selectionKey) {
      case 'engineType':
        if (!COMPONENT_VALIDATORS.engine.isValid(currentSelections.engineType, newTechBase)) {
          updates.engineType = COMPONENT_VALIDATORS.engine.getDefault(newTechBase);
        }
        break;
      case 'gyroType':
        if (!COMPONENT_VALIDATORS.gyro.isValid(currentSelections.gyroType, newTechBase)) {
          updates.gyroType = COMPONENT_VALIDATORS.gyro.getDefault(newTechBase);
        }
        break;
      case 'internalStructureType':
        if (!COMPONENT_VALIDATORS.structure.isValid(currentSelections.internalStructureType, newTechBase)) {
          updates.internalStructureType = COMPONENT_VALIDATORS.structure.getDefault(newTechBase);
        }
        break;
      case 'cockpitType':
        if (!COMPONENT_VALIDATORS.cockpit.isValid(currentSelections.cockpitType, newTechBase)) {
          updates.cockpitType = COMPONENT_VALIDATORS.cockpit.getDefault(newTechBase);
        }
        break;
      case 'heatSinkType':
        if (!COMPONENT_VALIDATORS.heatSink.isValid(currentSelections.heatSinkType, newTechBase)) {
          updates.heatSinkType = COMPONENT_VALIDATORS.heatSink.getDefault(newTechBase);
        }
        break;
      case 'armorType':
        if (!COMPONENT_VALIDATORS.armor.isValid(currentSelections.armorType, newTechBase)) {
          updates.armorType = COMPONENT_VALIDATORS.armor.getDefault(newTechBase);
        }
        break;
    }
  }
  
  return updates;
}

/**
 * Tech base key type for memory lookup
 */
export type TechBaseKey = 'IS' | 'CLAN';

/**
 * Get a selection value, trying memory first then falling back to default.
 * 
 * @param validator - The component validator
 * @param currentValue - Current selection value
 * @param techBase - Target tech base to validate against
 * @param memoryValue - Optional remembered value from memory
 * @returns The validated selection (memory if valid, else current if valid, else default)
 */
function getValueWithMemory<T>(
  validator: ComponentValidator<T>,
  currentValue: T,
  techBase: TechBase,
  memoryValue?: T
): T {
  // First, try to restore from memory if available and valid
  if (memoryValue !== undefined && validator.isValid(memoryValue, techBase)) {
    return memoryValue;
  }
  
  // Otherwise, keep current if valid
  if (validator.isValid(currentValue, techBase)) {
    return currentValue;
  }
  
  // Fall back to default
  return validator.getDefault(techBase);
}

/**
 * Get selection updates for a component tech base change, using memory for restoration.
 * 
 * @param component - The component whose tech base is changing
 * @param newTechBase - The new tech base
 * @param currentSelections - Current component selections
 * @param memory - Selection memory for restoration
 * @param techBaseKey - The memory key to look up ('IS' or 'CLAN')
 */
export function getSelectionWithMemory(
  component: TechBaseComponent,
  newTechBase: TechBase,
  currentSelections: ComponentSelections,
  memory: ISelectionMemory,
  techBaseKey: TechBaseKey
): Partial<ComponentSelections> {
  const updates: Partial<ComponentSelections> = {};
  const affectedSelections = COMPONENT_AFFECTED_SELECTIONS[component];
  
  if (!affectedSelections || affectedSelections.length === 0) {
    return updates;
  }
  
  for (const selectionKey of affectedSelections) {
    switch (selectionKey) {
      case 'engineType': {
        const memoryValue = memory.engine[techBaseKey];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.engine,
          currentSelections.engineType,
          newTechBase,
          memoryValue
        );
        if (newValue !== currentSelections.engineType) {
          updates.engineType = newValue;
        }
        break;
      }
      case 'gyroType': {
        const memoryValue = memory.gyro[techBaseKey];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.gyro,
          currentSelections.gyroType,
          newTechBase,
          memoryValue
        );
        if (newValue !== currentSelections.gyroType) {
          updates.gyroType = newValue;
        }
        break;
      }
      case 'internalStructureType': {
        const memoryValue = memory.structure[techBaseKey];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.structure,
          currentSelections.internalStructureType,
          newTechBase,
          memoryValue
        );
        if (newValue !== currentSelections.internalStructureType) {
          updates.internalStructureType = newValue;
        }
        break;
      }
      case 'cockpitType': {
        const memoryValue = memory.cockpit[techBaseKey];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.cockpit,
          currentSelections.cockpitType,
          newTechBase,
          memoryValue
        );
        if (newValue !== currentSelections.cockpitType) {
          updates.cockpitType = newValue;
        }
        break;
      }
      case 'heatSinkType': {
        const memoryValue = memory.heatSink[techBaseKey];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.heatSink,
          currentSelections.heatSinkType,
          newTechBase,
          memoryValue
        );
        if (newValue !== currentSelections.heatSinkType) {
          updates.heatSinkType = newValue;
        }
        break;
      }
      case 'armorType': {
        const memoryValue = memory.armor[techBaseKey];
        const newValue = getValueWithMemory(
          COMPONENT_VALIDATORS.armor,
          currentSelections.armorType,
          newTechBase,
          memoryValue
        );
        if (newValue !== currentSelections.armorType) {
          updates.armorType = newValue;
        }
        break;
      }
    }
  }
  
  return updates;
}

/**
 * Get all validated selections for a complete tech base configuration change.
 * Used when switching between IS/Clan modes.
 * 
 * @param componentTechBases - The new tech base configuration
 * @param currentSelections - Current component selections
 * @param memory - Optional selection memory for restoration
 * @param techBaseKey - Optional memory key to look up ('IS' or 'CLAN')
 */
export function getFullyValidatedSelections(
  componentTechBases: IComponentTechBases,
  currentSelections: ComponentSelections,
  memory?: ISelectionMemory,
  techBaseKey?: TechBaseKey
): ComponentSelections {
  const { engine, gyro, structure, cockpit, heatSink, armor } = COMPONENT_VALIDATORS;
  
  // If memory is provided, try to restore from it
  if (memory && techBaseKey) {
    return {
      engineType: getValueWithMemory(
        engine,
        currentSelections.engineType,
        componentTechBases.engine,
        memory.engine[techBaseKey]
      ),
      gyroType: getValueWithMemory(
        gyro,
        currentSelections.gyroType,
        componentTechBases.gyro,
        memory.gyro[techBaseKey]
      ),
      internalStructureType: getValueWithMemory(
        structure,
        currentSelections.internalStructureType,
        componentTechBases.chassis,
        memory.structure[techBaseKey]
      ),
      cockpitType: getValueWithMemory(
        cockpit,
        currentSelections.cockpitType,
        componentTechBases.chassis,
        memory.cockpit[techBaseKey]
      ),
      heatSinkType: getValueWithMemory(
        heatSink,
        currentSelections.heatSinkType,
        componentTechBases.heatsink,
        memory.heatSink[techBaseKey]
      ),
      armorType: getValueWithMemory(
        armor,
        currentSelections.armorType,
        componentTechBases.armor,
        memory.armor[techBaseKey]
      ),
    };
  }
  
  // No memory - just validate current selections
  return {
    engineType: engine.isValid(currentSelections.engineType, componentTechBases.engine)
      ? currentSelections.engineType
      : engine.getDefault(componentTechBases.engine),
    gyroType: gyro.isValid(currentSelections.gyroType, componentTechBases.gyro)
      ? currentSelections.gyroType
      : gyro.getDefault(componentTechBases.gyro),
    internalStructureType: structure.isValid(currentSelections.internalStructureType, componentTechBases.chassis)
      ? currentSelections.internalStructureType
      : structure.getDefault(componentTechBases.chassis),
    cockpitType: cockpit.isValid(currentSelections.cockpitType, componentTechBases.chassis)
      ? currentSelections.cockpitType
      : cockpit.getDefault(componentTechBases.chassis),
    heatSinkType: heatSink.isValid(currentSelections.heatSinkType, componentTechBases.heatsink)
      ? currentSelections.heatSinkType
      : heatSink.getDefault(componentTechBases.heatsink),
    armorType: armor.isValid(currentSelections.armorType, componentTechBases.armor)
      ? currentSelections.armorType
      : armor.getDefault(componentTechBases.armor),
  };
}
