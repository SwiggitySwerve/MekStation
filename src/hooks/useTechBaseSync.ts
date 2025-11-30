/**
 * Tech Base Sync Hook
 * 
 * Provides filtered component options based on tech base settings.
 * Handles validation and automatic selection replacement when tech base changes.
 * 
 * @spec openspec/changes/add-customizer-ui-components/specs/component-configuration/spec.md
 */

import { useMemo, useCallback } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { EngineType, ENGINE_DEFINITIONS, EngineDefinition } from '@/types/construction/EngineType';
import { GyroType, GYRO_DEFINITIONS, GyroDefinition } from '@/types/construction/GyroType';
import { InternalStructureType, INTERNAL_STRUCTURE_DEFINITIONS, InternalStructureDefinition } from '@/types/construction/InternalStructureType';
import { CockpitType, COCKPIT_DEFINITIONS, CockpitDefinition } from '@/types/construction/CockpitType';
import { HeatSinkType, HEAT_SINK_DEFINITIONS, HeatSinkDefinition } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum, ARMOR_DEFINITIONS, ArmorDefinition } from '@/types/construction/ArmorType';
import { IComponentTechBases } from '@/types/construction/TechBaseConfiguration';
import { IComponentSelections } from '@/stores/useMultiUnitStore';

// =============================================================================
// Types
// =============================================================================

export interface FilteredComponentOptions {
  engines: EngineDefinition[];
  gyros: GyroDefinition[];
  structures: InternalStructureDefinition[];
  cockpits: CockpitDefinition[];
  heatSinks: HeatSinkDefinition[];
  armors: ArmorDefinition[];
}

export interface ComponentDefaults {
  engineType: EngineType;
  gyroType: GyroType;
  structureType: InternalStructureType;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  armorType: ArmorTypeEnum;
}

export interface TechBaseSyncResult {
  /** Filtered component options based on current tech base settings */
  filteredOptions: FilteredComponentOptions;
  
  /** Default values for each component type (first valid option) */
  defaults: ComponentDefaults;
  
  /** Check if a specific engine type is valid for current tech base */
  isEngineValid: (engineType: EngineType) => boolean;
  
  /** Check if a specific gyro type is valid for current tech base */
  isGyroValid: (gyroType: GyroType) => boolean;
  
  /** Check if a specific structure type is valid for current tech base */
  isStructureValid: (structureType: InternalStructureType) => boolean;
  
  /** Check if a specific cockpit type is valid for current tech base */
  isCockpitValid: (cockpitType: CockpitType) => boolean;
  
  /** Check if a specific heat sink type is valid for current tech base */
  isHeatSinkValid: (heatSinkType: HeatSinkType) => boolean;
  
  /** Check if a specific armor type is valid for current tech base */
  isArmorValid: (armorType: ArmorTypeEnum) => boolean;
  
  /** Get validated selections (replaces invalid selections with defaults) */
  getValidatedSelections: (current: IComponentSelections) => IComponentSelections;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a component is compatible with a given tech base
 * Components are compatible if they match the tech base OR are available to both
 * (Standard fusion is available to both, XL IS is IS-only, etc.)
 */
function isCompatibleWithTechBase(
  componentTechBase: TechBase,
  requiredTechBase: TechBase
): boolean {
  // Standard components (marked as IS) are available to both
  // This is a simplification - in reality, some IS components are IS-only
  if (componentTechBase === requiredTechBase) {
    return true;
  }
  
  // Standard/basic components are available to both tech bases
  // (They're marked as IS in the definitions but Clan can use them)
  return false;
}

/**
 * Filter engine options by tech base
 * Standard Fusion is available to both
 * XL (IS) is IS-only, XL (Clan) is Clan-only
 */
function filterEngines(techBase: TechBase): EngineDefinition[] {
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
  });
}

/**
 * Filter gyro options by tech base
 * All gyros are currently IS-based but available to both
 */
function filterGyros(techBase: TechBase): GyroDefinition[] {
  // All gyro types are available to both tech bases
  return [...GYRO_DEFINITIONS];
}

/**
 * Filter structure options by tech base
 * Standard is available to both
 * Endo Steel (IS) is IS-only, Endo Steel (Clan) is Clan-only
 */
function filterStructures(techBase: TechBase): InternalStructureDefinition[] {
  return INTERNAL_STRUCTURE_DEFINITIONS.filter(structure => {
    if (structure.type === InternalStructureType.STANDARD) return true;
    if (structure.type === InternalStructureType.ENDO_STEEL_IS) return techBase === TechBase.INNER_SPHERE;
    if (structure.type === InternalStructureType.ENDO_STEEL_CLAN) return techBase === TechBase.CLAN;
    // Other experimental types are IS-only
    return techBase === TechBase.INNER_SPHERE;
  });
}

/**
 * Filter cockpit options by tech base
 * All cockpits are currently IS-based but most are available to both
 */
function filterCockpits(techBase: TechBase): CockpitDefinition[] {
  // All cockpit types are available to both tech bases
  return [...COCKPIT_DEFINITIONS];
}

/**
 * Filter heat sink options by tech base
 * Single is available to both
 * Double (IS) is IS-only, Double (Clan) is Clan-only
 */
function filterHeatSinks(techBase: TechBase): HeatSinkDefinition[] {
  return HEAT_SINK_DEFINITIONS.filter(hs => {
    if (hs.type === HeatSinkType.SINGLE) return true;
    if (hs.type === HeatSinkType.DOUBLE_IS) return techBase === TechBase.INNER_SPHERE;
    if (hs.type === HeatSinkType.DOUBLE_CLAN) return techBase === TechBase.CLAN;
    if (hs.type === HeatSinkType.COMPACT) return techBase === TechBase.INNER_SPHERE;
    if (hs.type === HeatSinkType.LASER) return techBase === TechBase.CLAN;
    return false;
  });
}

/**
 * Filter armor options by tech base
 * Standard is available to both
 * Ferro-Fibrous variants are tech-base-specific
 */
function filterArmors(techBase: TechBase): ArmorDefinition[] {
  return ARMOR_DEFINITIONS.filter(armor => {
    if (armor.type === ArmorTypeEnum.STANDARD) return true;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_IS) return techBase === TechBase.INNER_SPHERE;
    if (armor.type === ArmorTypeEnum.FERRO_FIBROUS_CLAN) return techBase === TechBase.CLAN;
    // Other experimental types are typically IS-only
    return techBase === TechBase.INNER_SPHERE;
  });
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for tech base synchronization and component filtering
 * 
 * @param componentTechBases - Per-component tech base settings
 */
export function useTechBaseSync(componentTechBases: IComponentTechBases): TechBaseSyncResult {
  // Filter options based on each component's tech base
  const filteredOptions = useMemo<FilteredComponentOptions>(() => ({
    engines: filterEngines(componentTechBases.engine),
    gyros: filterGyros(componentTechBases.gyro),
    structures: filterStructures(componentTechBases.chassis),
    cockpits: filterCockpits(componentTechBases.chassis),
    heatSinks: filterHeatSinks(componentTechBases.heatsink),
    armors: filterArmors(componentTechBases.armor),
  }), [componentTechBases]);
  
  // Calculate defaults (first valid option for each category)
  const defaults = useMemo<ComponentDefaults>(() => ({
    engineType: filteredOptions.engines[0]?.type ?? EngineType.STANDARD,
    gyroType: filteredOptions.gyros[0]?.type ?? GyroType.STANDARD,
    structureType: filteredOptions.structures[0]?.type ?? InternalStructureType.STANDARD,
    cockpitType: filteredOptions.cockpits[0]?.type ?? CockpitType.STANDARD,
    heatSinkType: filteredOptions.heatSinks[0]?.type ?? HeatSinkType.SINGLE,
    armorType: filteredOptions.armors[0]?.type ?? ArmorTypeEnum.STANDARD,
  }), [filteredOptions]);
  
  // Validation functions
  const isEngineValid = useCallback((engineType: EngineType): boolean => {
    return filteredOptions.engines.some(e => e.type === engineType);
  }, [filteredOptions.engines]);
  
  const isGyroValid = useCallback((gyroType: GyroType): boolean => {
    return filteredOptions.gyros.some(g => g.type === gyroType);
  }, [filteredOptions.gyros]);
  
  const isStructureValid = useCallback((structureType: InternalStructureType): boolean => {
    return filteredOptions.structures.some(s => s.type === structureType);
  }, [filteredOptions.structures]);
  
  const isCockpitValid = useCallback((cockpitType: CockpitType): boolean => {
    return filteredOptions.cockpits.some(c => c.type === cockpitType);
  }, [filteredOptions.cockpits]);
  
  const isHeatSinkValid = useCallback((heatSinkType: HeatSinkType): boolean => {
    return filteredOptions.heatSinks.some(h => h.type === heatSinkType);
  }, [filteredOptions.heatSinks]);
  
  const isArmorValid = useCallback((armorType: ArmorTypeEnum): boolean => {
    return filteredOptions.armors.some(a => a.type === armorType);
  }, [filteredOptions.armors]);
  
  // Get validated selections
  const getValidatedSelections = useCallback((current: IComponentSelections): IComponentSelections => {
    return {
      ...current,
      engineType: isEngineValid(current.engineType) ? current.engineType : defaults.engineType,
      gyroType: isGyroValid(current.gyroType) ? current.gyroType : defaults.gyroType,
      internalStructureType: isStructureValid(current.internalStructureType) 
        ? current.internalStructureType 
        : defaults.structureType,
      cockpitType: isCockpitValid(current.cockpitType) ? current.cockpitType : defaults.cockpitType,
      heatSinkType: isHeatSinkValid(current.heatSinkType) ? current.heatSinkType : defaults.heatSinkType,
      armorType: isArmorValid(current.armorType) ? current.armorType : defaults.armorType,
    };
  }, [
    defaults,
    isEngineValid,
    isGyroValid,
    isStructureValid,
    isCockpitValid,
    isHeatSinkValid,
    isArmorValid,
  ]);
  
  return {
    filteredOptions,
    defaults,
    isEngineValid,
    isGyroValid,
    isStructureValid,
    isCockpitValid,
    isHeatSinkValid,
    isArmorValid,
    getValidatedSelections,
  };
}

