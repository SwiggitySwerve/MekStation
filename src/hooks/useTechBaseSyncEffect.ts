/**
 * Tech Base Sync Effect Hook
 * 
 * Automatically updates component selections when their tech base changes.
 * This ensures that selections remain valid when switching between
 * Inner Sphere and Clan tech bases.
 * 
 * @spec openspec/specs/component-configuration/spec.md
 */

import { useEffect, useRef } from 'react';
import { TechBase } from '@/types/enums/TechBase';
import { IComponentTechBases, TechBaseComponent } from '@/types/construction/TechBaseConfiguration';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { useTechBaseSync } from './useTechBaseSync';

// =============================================================================
// Types
// =============================================================================

export interface ComponentSelections {
  engineType: EngineType;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  armorType: ArmorTypeEnum;
}

export interface ComponentSetters {
  setEngineType: (type: EngineType) => void;
  setGyroType: (type: GyroType) => void;
  setInternalStructureType: (type: InternalStructureType) => void;
  setCockpitType: (type: CockpitType) => void;
  setHeatSinkType: (type: HeatSinkType) => void;
  setArmorType: (type: ArmorTypeEnum) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that automatically syncs component selections when tech base changes.
 * 
 * When a component's tech base changes (e.g., engine from IS to Clan),
 * this hook validates the current selection and updates it to a valid
 * default if necessary.
 * 
 * @param componentTechBases - Current tech base settings for each component
 * @param selections - Current component selections
 * @param setters - Functions to update component selections
 * 
 * @example
 * ```tsx
 * useTechBaseSyncEffect(
 *   componentTechBases,
 *   { engineType, gyroType, ... },
 *   { setEngineType, setGyroType, ... }
 * );
 * ```
 */
export function useTechBaseSyncEffect(
  componentTechBases: IComponentTechBases,
  selections: ComponentSelections,
  setters: ComponentSetters
): void {
  // Get validation functions and defaults from useTechBaseSync
  const {
    defaults,
    isEngineValid,
    isGyroValid,
    isStructureValid,
    isCockpitValid,
    isHeatSinkValid,
    isArmorValid,
  } = useTechBaseSync(componentTechBases);

  // Track previous tech bases to detect changes
  const prevTechBasesRef = useRef<IComponentTechBases>(componentTechBases);

  // Effect to sync selections when tech base changes
  useEffect(() => {
    const prevTechBases = prevTechBasesRef.current;
    let hasChanges = false;

    // Check each component's tech base for changes
    const techBaseKeys = Object.keys(componentTechBases) as TechBaseComponent[];
    for (const key of techBaseKeys) {
      if (prevTechBases[key] !== componentTechBases[key]) {
        hasChanges = true;
        break;
      }
    }

    // If no tech base changed, skip validation
    if (!hasChanges) {
      return;
    }

    // Validate and update each component if needed
    // Engine
    if (prevTechBases.engine !== componentTechBases.engine) {
      if (!isEngineValid(selections.engineType)) {
        setters.setEngineType(defaults.engineType);
      }
    }

    // Gyro
    if (prevTechBases.gyro !== componentTechBases.gyro) {
      if (!isGyroValid(selections.gyroType)) {
        setters.setGyroType(defaults.gyroType);
      }
    }

    // Structure (chassis affects both structure and cockpit)
    if (prevTechBases.chassis !== componentTechBases.chassis) {
      if (!isStructureValid(selections.internalStructureType)) {
        setters.setInternalStructureType(defaults.structureType);
      }
      if (!isCockpitValid(selections.cockpitType)) {
        setters.setCockpitType(defaults.cockpitType);
      }
    }

    // Heat sinks
    if (prevTechBases.heatsink !== componentTechBases.heatsink) {
      if (!isHeatSinkValid(selections.heatSinkType)) {
        setters.setHeatSinkType(defaults.heatSinkType);
      }
    }

    // Armor
    if (prevTechBases.armor !== componentTechBases.armor) {
      if (!isArmorValid(selections.armorType)) {
        setters.setArmorType(defaults.armorType);
      }
    }

    // Update ref for next comparison
    prevTechBasesRef.current = componentTechBases;
  }, [
    componentTechBases,
    selections,
    setters,
    defaults,
    isEngineValid,
    isGyroValid,
    isStructureValid,
    isCockpitValid,
    isHeatSinkValid,
    isArmorValid,
  ]);
}

/**
 * Simplified hook for syncing a single component type
 * 
 * Use this when you only need to sync one specific component type.
 * 
 * @param techBase - Current tech base for the component
 * @param currentValue - Current selection value
 * @param isValid - Validation function
 * @param defaultValue - Default value to use if current is invalid
 * @param setValue - Setter function
 */
export function useSingleComponentSync<T>(
  techBase: TechBase,
  currentValue: T,
  isValid: (value: T) => boolean,
  defaultValue: T,
  setValue: (value: T) => void
): void {
  const prevTechBaseRef = useRef<TechBase>(techBase);

  useEffect(() => {
    // Only act when tech base changes
    if (prevTechBaseRef.current !== techBase) {
      prevTechBaseRef.current = techBase;
      
      // Validate and update if needed
      if (!isValid(currentValue)) {
        setValue(defaultValue);
      }
    }
  }, [techBase, currentValue, isValid, defaultValue, setValue]);
}

