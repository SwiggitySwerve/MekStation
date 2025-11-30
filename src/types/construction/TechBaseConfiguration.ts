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
export type TechBaseComponent = 
  | 'chassis'
  | 'gyro'
  | 'engine'
  | 'heatsink'
  | 'targeting'
  | 'myomer'
  | 'movement'
  | 'armor';

/**
 * Human-readable labels for each component
 */
export const TECH_BASE_COMPONENT_LABELS: Record<TechBaseComponent, string> = {
  chassis: 'Chassis',
  gyro: 'Gyro',
  engine: 'Engine',
  heatsink: 'Heatsink',
  targeting: 'Targeting',
  myomer: 'Myomer',
  movement: 'Movement',
  armor: 'Armor',
};

/**
 * Descriptions for each component category
 */
export const TECH_BASE_COMPONENT_DESCRIPTIONS: Record<TechBaseComponent, string> = {
  chassis: 'Internal structure type',
  gyro: 'Gyro technology',
  engine: 'Engine technology',
  heatsink: 'Heat sink type',
  targeting: 'Targeting computer',
  myomer: 'Myomer type (Standard/TSM/etc.)',
  movement: 'Jump jets, MASC, Supercharger, etc.',
  armor: 'Armor technology',
};

/**
 * Per-component tech base settings
 */
export interface IComponentTechBases {
  chassis: TechBase;
  gyro: TechBase;
  engine: TechBase;
  heatsink: TechBase;
  targeting: TechBase;
  myomer: TechBase;
  movement: TechBase;
  armor: TechBase;
}

/**
 * Global tech base mode
 */
export type TechBaseMode = 'inner_sphere' | 'clan' | 'mixed';

/**
 * Human-readable labels for tech base modes
 */
export const TECH_BASE_MODE_LABELS: Record<TechBaseMode, string> = {
  inner_sphere: 'Inner Sphere',
  clan: 'Clan',
  mixed: 'Mixed Tech',
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
    chassis: techBase,
    gyro: techBase,
    engine: techBase,
    heatsink: techBase,
    targeting: techBase,
    myomer: techBase,
    movement: techBase,
    armor: techBase,
  };
}

/**
 * Creates a default tech base configuration
 */
export function createDefaultTechBaseConfiguration(
  mode: TechBaseMode = 'inner_sphere'
): ITechBaseConfiguration {
  const baseTechBase = mode === 'clan' ? TechBase.CLAN : TechBase.INNER_SPHERE;
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

