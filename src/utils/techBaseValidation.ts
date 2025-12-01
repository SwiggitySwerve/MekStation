/**
 * Tech Base Validation Utilities
 * 
 * Pure functions for validating and correcting component selections
 * based on tech base compatibility. Used by the store to ensure
 * component selections stay valid when tech base changes.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/component-configuration/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { TechBaseComponent, IComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import { EngineType, ENGINE_DEFINITIONS, EngineDefinition } from '@/types/construction/EngineType';
import { GyroType, GYRO_DEFINITIONS } from '@/types/construction/GyroType';
import { InternalStructureType, INTERNAL_STRUCTURE_DEFINITIONS } from '@/types/construction/InternalStructureType';
import { CockpitType, COCKPIT_DEFINITIONS } from '@/types/construction/CockpitType';
import { HeatSinkType, HEAT_SINK_DEFINITIONS } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum, ARMOR_DEFINITIONS } from '@/types/construction/ArmorType';

// =============================================================================
// Filter Functions - Get valid options for a given tech base
// =============================================================================

/**
 * Filter engine options by tech base
 */
export function getValidEngineTypes(techBase: TechBase): EngineType[] {
  return ENGINE_DEFINITIONS.filter(engine => {
    // Standard fusion is available to both
    if (engine.type === EngineType.STANDARD) return true;
    if (engine.type === EngineType.COMPACT) return true;
    
    // Tech-base-specific engines
    if (engine.type === EngineType.XL_IS) return techBase === TechBase.INNER_SPHERE;
    if (engine.type === EngineType.XL_CLAN) return techBase === TechBase.CLAN;
    if (engine.type === EngineType.LIGHT) return techBase === TechBase.INNER_SPHERE;
    if (engine.type === EngineType.XXL) return true; // Available to both
    
    // Non-fusion engines (available to IS only typically)
    return techBase === TechBase.INNER_SPHERE;
  }).map(e => e.type);
}

/**
 * Filter gyro options by tech base
 */
export function getValidGyroTypes(techBase: TechBase): GyroType[] {
  // All gyro types are available to both tech bases
  return GYRO_DEFINITIONS.map(g => g.type);
}

/**
 * Filter structure options by tech base
 */
export function getValidStructureTypes(techBase: TechBase): InternalStructureType[] {
  return INTERNAL_STRUCTURE_DEFINITIONS.filter(structure => {
    if (structure.type === InternalStructureType.STANDARD) return true;
    if (structure.type === InternalStructureType.ENDO_STEEL_IS) return techBase === TechBase.INNER_SPHERE;
    if (structure.type === InternalStructureType.ENDO_STEEL_CLAN) return techBase === TechBase.CLAN;
    // Other experimental types are IS-only
    return techBase === TechBase.INNER_SPHERE;
  }).map(s => s.type);
}

/**
 * Filter cockpit options by tech base
 */
export function getValidCockpitTypes(techBase: TechBase): CockpitType[] {
  // All cockpit types are available to both tech bases
  return COCKPIT_DEFINITIONS.map(c => c.type);
}

/**
 * Filter heat sink options by tech base
 */
export function getValidHeatSinkTypes(techBase: TechBase): HeatSinkType[] {
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
 * Filter armor options by tech base
 */
export function getValidArmorTypes(techBase: TechBase): ArmorTypeEnum[] {
  return ARMOR_DEFINITIONS.filter(armor => {
    if (armor.type === ArmorTypeEnum.STANDARD) return true;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_IS) return techBase === TechBase.INNER_SPHERE;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_CLAN) return techBase === TechBase.CLAN;
    // Other experimental types are typically IS-only
    return techBase === TechBase.INNER_SPHERE;
  }).map(a => a.type);
}

// =============================================================================
// Validation Functions - Check if a selection is valid
// =============================================================================

export function isEngineTypeValid(engineType: EngineType, techBase: TechBase): boolean {
  return getValidEngineTypes(techBase).includes(engineType);
}

export function isGyroTypeValid(gyroType: GyroType, techBase: TechBase): boolean {
  return getValidGyroTypes(techBase).includes(gyroType);
}

export function isStructureTypeValid(structureType: InternalStructureType, techBase: TechBase): boolean {
  return getValidStructureTypes(techBase).includes(structureType);
}

export function isCockpitTypeValid(cockpitType: CockpitType, techBase: TechBase): boolean {
  return getValidCockpitTypes(techBase).includes(cockpitType);
}

export function isHeatSinkTypeValid(heatSinkType: HeatSinkType, techBase: TechBase): boolean {
  return getValidHeatSinkTypes(techBase).includes(heatSinkType);
}

export function isArmorTypeValid(armorType: ArmorTypeEnum, techBase: TechBase): boolean {
  return getValidArmorTypes(techBase).includes(armorType);
}

// =============================================================================
// Default Value Functions - Get first valid option
// =============================================================================

export function getDefaultEngineType(techBase: TechBase): EngineType {
  const validTypes = getValidEngineTypes(techBase);
  return validTypes[0] ?? EngineType.STANDARD;
}

export function getDefaultGyroType(techBase: TechBase): GyroType {
  const validTypes = getValidGyroTypes(techBase);
  return validTypes[0] ?? GyroType.STANDARD;
}

export function getDefaultStructureType(techBase: TechBase): InternalStructureType {
  const validTypes = getValidStructureTypes(techBase);
  return validTypes[0] ?? InternalStructureType.STANDARD;
}

export function getDefaultCockpitType(techBase: TechBase): CockpitType {
  const validTypes = getValidCockpitTypes(techBase);
  return validTypes[0] ?? CockpitType.STANDARD;
}

export function getDefaultHeatSinkType(techBase: TechBase): HeatSinkType {
  const validTypes = getValidHeatSinkTypes(techBase);
  return validTypes[0] ?? HeatSinkType.SINGLE;
}

export function getDefaultArmorType(techBase: TechBase): ArmorTypeEnum {
  const validTypes = getValidArmorTypes(techBase);
  return validTypes[0] ?? ArmorTypeEnum.STANDARD;
}

// =============================================================================
// Component Selection Validation
// =============================================================================

export interface ComponentSelections {
  engineType: EngineType;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  armorType: ArmorTypeEnum;
}

/**
 * Validate a single component selection and return corrected value if invalid
 */
export function validateComponentSelection<T>(
  component: TechBaseComponent,
  currentValue: T,
  techBase: TechBase,
  validators: {
    engine: (v: EngineType) => EngineType;
    gyro: (v: GyroType) => GyroType;
    chassis: (v: InternalStructureType) => InternalStructureType;
    heatsink: (v: HeatSinkType) => HeatSinkType;
    armor: (v: ArmorTypeEnum) => ArmorTypeEnum;
  }
): Partial<ComponentSelections> {
  const updates: Partial<ComponentSelections> = {};

  if (component === 'engine') {
    const validated = validators.engine(currentValue as EngineType);
    if (validated !== currentValue) {
      updates.engineType = validated;
    }
  } else if (component === 'gyro') {
    const validated = validators.gyro(currentValue as GyroType);
    if (validated !== currentValue) {
      updates.gyroType = validated;
    }
  } else if (component === 'chassis') {
    const validated = validators.chassis(currentValue as InternalStructureType);
    if (validated !== currentValue) {
      updates.internalStructureType = validated;
    }
  } else if (component === 'heatsink') {
    const validated = validators.heatsink(currentValue as HeatSinkType);
    if (validated !== currentValue) {
      updates.heatSinkType = validated;
    }
  } else if (component === 'armor') {
    const validated = validators.armor(currentValue as ArmorTypeEnum);
    if (validated !== currentValue) {
      updates.armorType = validated;
    }
  }

  return updates;
}

/**
 * Get the corrected component selections when a tech base changes.
 * Returns the updates needed (empty object if all selections are still valid).
 */
export function getValidatedSelectionUpdates(
  component: TechBaseComponent,
  newTechBase: TechBase,
  currentSelections: ComponentSelections
): Partial<ComponentSelections> {
  const updates: Partial<ComponentSelections> = {};

  if (component === 'engine') {
    if (!isEngineTypeValid(currentSelections.engineType, newTechBase)) {
      updates.engineType = getDefaultEngineType(newTechBase);
    }
  } else if (component === 'gyro') {
    if (!isGyroTypeValid(currentSelections.gyroType, newTechBase)) {
      updates.gyroType = getDefaultGyroType(newTechBase);
    }
  } else if (component === 'chassis') {
    // Chassis affects both structure and cockpit
    if (!isStructureTypeValid(currentSelections.internalStructureType, newTechBase)) {
      updates.internalStructureType = getDefaultStructureType(newTechBase);
    }
    if (!isCockpitTypeValid(currentSelections.cockpitType, newTechBase)) {
      updates.cockpitType = getDefaultCockpitType(newTechBase);
    }
  } else if (component === 'heatsink') {
    if (!isHeatSinkTypeValid(currentSelections.heatSinkType, newTechBase)) {
      updates.heatSinkType = getDefaultHeatSinkType(newTechBase);
    }
  } else if (component === 'armor') {
    if (!isArmorTypeValid(currentSelections.armorType, newTechBase)) {
      updates.armorType = getDefaultArmorType(newTechBase);
    }
  }

  return updates;
}

/**
 * Get all validated selections for a complete tech base configuration change.
 * Used when switching between IS/Clan modes.
 */
export function getFullyValidatedSelections(
  componentTechBases: IComponentTechBases,
  currentSelections: ComponentSelections
): ComponentSelections {
  return {
    engineType: isEngineTypeValid(currentSelections.engineType, componentTechBases.engine)
      ? currentSelections.engineType
      : getDefaultEngineType(componentTechBases.engine),
    gyroType: isGyroTypeValid(currentSelections.gyroType, componentTechBases.gyro)
      ? currentSelections.gyroType
      : getDefaultGyroType(componentTechBases.gyro),
    internalStructureType: isStructureTypeValid(currentSelections.internalStructureType, componentTechBases.chassis)
      ? currentSelections.internalStructureType
      : getDefaultStructureType(componentTechBases.chassis),
    cockpitType: isCockpitTypeValid(currentSelections.cockpitType, componentTechBases.chassis)
      ? currentSelections.cockpitType
      : getDefaultCockpitType(componentTechBases.chassis),
    heatSinkType: isHeatSinkTypeValid(currentSelections.heatSinkType, componentTechBases.heatsink)
      ? currentSelections.heatSinkType
      : getDefaultHeatSinkType(componentTechBases.heatsink),
    armorType: isArmorTypeValid(currentSelections.armorType, componentTechBases.armor)
      ? currentSelections.armorType
      : getDefaultArmorType(componentTechBases.armor),
  };
}

