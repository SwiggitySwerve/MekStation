/**
 * Tech Base Configuration Types
 * 
 * Defines interfaces for global and per-component tech base settings.
 * Supports Inner Sphere, Clan, and Mixed Tech configurations.
 * 
 * @spec Based on BattleTech TechManual mixed tech rules
 */

import { TechBase } from '@/types/enums/TechBase';

/**
 * Component categories that can have individual tech base settings
 */
export enum TechBaseComponent {
  CHASSIS = 'chassis',
  GYRO = 'gyro',
  ENGINE = 'engine',
  HEATSINK = 'heatsink',
  TARGETING = 'targeting',
  MYOMER = 'myomer',
  MOVEMENT = 'movement',
  ARMOR = 'armor',
}

/**
 * Human-readable labels for each component
 */
export const TECH_BASE_COMPONENT_LABELS: Record<TechBaseComponent, string> = {
  [TechBaseComponent.CHASSIS]: 'Chassis',
  [TechBaseComponent.GYRO]: 'Gyro',
  [TechBaseComponent.ENGINE]: 'Engine',
  [TechBaseComponent.HEATSINK]: 'Heatsink',
  [TechBaseComponent.TARGETING]: 'Targeting',
  [TechBaseComponent.MYOMER]: 'Myomer',
  [TechBaseComponent.MOVEMENT]: 'Movement',
  [TechBaseComponent.ARMOR]: 'Armor',
};

/**
 * Descriptions for each component category
 */
export const TECH_BASE_COMPONENT_DESCRIPTIONS: Record<TechBaseComponent, string> = {
  [TechBaseComponent.CHASSIS]: 'Internal structure type',
  [TechBaseComponent.GYRO]: 'Gyro technology',
  [TechBaseComponent.ENGINE]: 'Engine technology',
  [TechBaseComponent.HEATSINK]: 'Heat sink type',
  [TechBaseComponent.TARGETING]: 'Targeting computer',
  [TechBaseComponent.MYOMER]: 'Myomer type (Standard/TSM/etc.)',
  [TechBaseComponent.MOVEMENT]: 'Jump jets, MASC, Supercharger, etc.',
  [TechBaseComponent.ARMOR]: 'Armor technology',
};

/**
 * Per-component tech base settings
 * Uses TechBaseComponent enum values as keys for type safety
 */
export type IComponentTechBases = {
  [key in TechBaseComponent]: TechBase;
};

/**
 * Global tech base mode for a unit
 */
export enum TechBaseMode {
  INNER_SPHERE = 'inner_sphere',
  CLAN = 'clan',
  MIXED = 'mixed',
}

/**
 * Human-readable labels for tech base modes
 */
export const TECH_BASE_MODE_LABELS: Record<TechBaseMode, string> = {
  [TechBaseMode.INNER_SPHERE]: 'Inner Sphere',
  [TechBaseMode.CLAN]: 'Clan',
  [TechBaseMode.MIXED]: 'Mixed Tech',
};

/**
 * Complete tech base configuration for a unit
 */
export interface ITechBaseConfiguration {
  /** Global tech base mode */
  mode: TechBaseMode;
  /** Per-component tech base settings (only used when mode is 'mixed') */
  components: IComponentTechBases;
}

/**
 * Creates default component tech bases for a given tech base
 */
export function createDefaultComponentTechBases(techBase: TechBase): IComponentTechBases {
  return {
    [TechBaseComponent.CHASSIS]: techBase,
    [TechBaseComponent.GYRO]: techBase,
    [TechBaseComponent.ENGINE]: techBase,
    [TechBaseComponent.HEATSINK]: techBase,
    [TechBaseComponent.TARGETING]: techBase,
    [TechBaseComponent.MYOMER]: techBase,
    [TechBaseComponent.MOVEMENT]: techBase,
    [TechBaseComponent.ARMOR]: techBase,
  };
}

/**
 * Creates a default tech base configuration
 */
export function createDefaultTechBaseConfiguration(
  mode: TechBaseMode = TechBaseMode.INNER_SPHERE
): ITechBaseConfiguration {
  const baseTechBase = mode === TechBaseMode.CLAN ? TechBase.CLAN : TechBase.INNER_SPHERE;
  return {
    mode,
    components: createDefaultComponentTechBases(baseTechBase),
  };
}

/**
 * Determines if a configuration is effectively mixed tech
 * (i.e., has components with different tech bases)
 */
export function isEffectivelyMixed(components: IComponentTechBases): boolean {
  const values = Object.values(components);
  const firstValue = values[0];
  return values.some(v => v !== firstValue);
}

