/**
 * Component configuration helpers that capture the selected tech base for
 * structural systems (engine, armor, gyro, etc.).
 */

import { TechBase } from './TechBase';

export interface ComponentConfiguration {
  readonly type: string;
  readonly techBase: TechBase | 'Inner Sphere' | 'Clan';
}

export interface ComponentTypeDefinition {
  readonly name: string;
  readonly techBase: TechBase | 'Inner Sphere' | 'Clan';
  readonly weight?: number;
  readonly slots?: number;
  readonly restrictions?: string[];
}

export const COMPONENT_CATEGORIES = {
  structure: 'Internal Structure',
  engine: 'Engine',
  gyro: 'Gyro',
  heatSink: 'Heat Sink',
  armor: 'Armor',
  enhancement: 'Enhancement',
  jumpJet: 'Jump Jet',
} as const;

export type ComponentConfigurationCategory = keyof typeof COMPONENT_CATEGORIES;

const COMPONENT_TYPE_DEFINITIONS: Record<ComponentConfigurationCategory, ComponentTypeDefinition[]> = {
  structure: [
    { name: 'Standard', techBase: 'Inner Sphere' },
    { name: 'Endo Steel', techBase: 'Inner Sphere', slots: 14 },
    { name: 'Standard', techBase: 'Clan' },
    { name: 'Endo Steel (Clan)', techBase: 'Clan', slots: 7 },
  ],
  engine: [
    { name: 'Standard', techBase: 'Inner Sphere' },
    { name: 'XL', techBase: 'Inner Sphere', weight: 0.5 },
    { name: 'Light', techBase: 'Inner Sphere', weight: 0.75 },
    { name: 'XXL', techBase: 'Inner Sphere', weight: 0.33 },
    { name: 'Compact', techBase: 'Inner Sphere', weight: 1.5 },
    { name: 'ICE', techBase: 'Inner Sphere' },
    { name: 'Fuel Cell', techBase: 'Inner Sphere' },
    { name: 'Standard', techBase: 'Clan' },
    { name: 'XL', techBase: 'Clan', weight: 0.5 },
    { name: 'XXL', techBase: 'Clan', weight: 0.33 },
  ],
  gyro: [
    { name: 'Standard', techBase: 'Inner Sphere', slots: 4 },
    { name: 'XL', techBase: 'Inner Sphere', slots: 6 },
    { name: 'Compact', techBase: 'Inner Sphere', slots: 2 },
    { name: 'Heavy-Duty', techBase: 'Inner Sphere', slots: 4 },
    { name: 'Standard', techBase: 'Clan', slots: 4 },
  ],
  heatSink: [
    { name: 'Single', techBase: 'Inner Sphere' },
    { name: 'Double', techBase: 'Inner Sphere' },
    { name: 'Compact', techBase: 'Inner Sphere' },
    { name: 'Laser', techBase: 'Inner Sphere' },
    { name: 'Single', techBase: 'Clan' },
    { name: 'Double (Clan)', techBase: 'Clan' },
    { name: 'Compact (Clan)', techBase: 'Clan' },
    { name: 'Laser (Clan)', techBase: 'Clan' },
  ],
  armor: [
    { name: 'Standard', techBase: 'Inner Sphere' },
    { name: 'Ferro-Fibrous', techBase: 'Inner Sphere', slots: 14 },
    { name: 'Light Ferro-Fibrous', techBase: 'Inner Sphere', slots: 7 },
    { name: 'Heavy Ferro-Fibrous', techBase: 'Inner Sphere', slots: 21 },
    { name: 'Stealth', techBase: 'Inner Sphere', slots: 12 },
    { name: 'Standard', techBase: 'Clan' },
    { name: 'Ferro-Fibrous (Clan)', techBase: 'Clan', slots: 7 },
  ],
  enhancement: [
    { name: 'None', techBase: 'Inner Sphere' },
    { name: 'MASC', techBase: 'Inner Sphere' },
    { name: 'Triple Strength Myomer', techBase: 'Inner Sphere' },
    { name: 'None', techBase: 'Clan' },
    { name: 'MASC', techBase: 'Clan' },
  ],
  jumpJet: [
    { name: 'Standard Jump Jet', techBase: 'Inner Sphere' },
    { name: 'Improved Jump Jet', techBase: 'Inner Sphere' },
    { name: 'Mechanical Jump Booster', techBase: 'Inner Sphere' },
    { name: 'Standard Jump Jet', techBase: 'Clan' },
    { name: 'Improved Jump Jet', techBase: 'Clan' },
  ],
};

export function getComponentTypes(
  category: ComponentConfigurationCategory,
  techBase: TechBase | 'Inner Sphere' | 'Clan',
): ComponentTypeDefinition[] {
  return COMPONENT_TYPE_DEFINITIONS[category].filter((definition) => definition.techBase === techBase);
}

export function getComponentTypeNames(
  category: ComponentConfigurationCategory,
  techBase: TechBase | 'Inner Sphere' | 'Clan',
): string[] {
  return getComponentTypes(category, techBase).map((definition) => definition.name);
}

export function getComponentDefinition(
  category: ComponentConfigurationCategory,
  name: string,
): ComponentTypeDefinition | null {
  return COMPONENT_TYPE_DEFINITIONS[category].find((definition) => definition.name === name) ?? null;
}

export function createComponentConfiguration(
  category: ComponentConfigurationCategory,
  typeName: string,
): ComponentConfiguration | null {
  const definition = getComponentDefinition(category, typeName);
  if (!definition) {
    return null;
  }
  return {
    type: definition.name,
    techBase: definition.techBase,
  };
}

export function createDefaultComponentConfiguration(
  category: ComponentConfigurationCategory,
  techBase: TechBase | 'Inner Sphere' | 'Clan',
): ComponentConfiguration {
  const availableTypes = getComponentTypes(category, techBase);
  const defaultType = availableTypes.find((definition) => definition.name === 'Standard') ?? availableTypes[0];
  return {
    type: defaultType.name,
    techBase: defaultType.techBase,
  };
}

export function migrateStringToComponentConfiguration(
  category: ComponentConfigurationCategory,
  stringValue: string,
  fallbackTechBase: TechBase | 'Inner Sphere' | 'Clan' = TechBase.INNER_SPHERE,
): ComponentConfiguration {
  const exactMatch = createComponentConfiguration(category, stringValue);
  if (exactMatch) {
    return exactMatch;
  }
  return {
    type: stringValue,
    techBase: fallbackTechBase,
  };
}

export function isValidComponentConfiguration(
  category: ComponentConfigurationCategory,
  config: ComponentConfiguration,
): boolean {
  const definition = getComponentDefinition(category, config.type);
  return Boolean(definition && definition.techBase === config.techBase);
}

export type TechBaseMemoryRecord = Record<TechBase | 'Inner Sphere' | 'Clan', string>;

export interface TechBaseMemory {
  readonly chassis: TechBaseMemoryRecord;
  readonly engine: TechBaseMemoryRecord;
  readonly gyro: TechBaseMemoryRecord;
  readonly heatsink: TechBaseMemoryRecord;
  readonly armor: TechBaseMemoryRecord;
  readonly myomer: TechBaseMemoryRecord;
  readonly targeting: TechBaseMemoryRecord;
  readonly movement: TechBaseMemoryRecord;
}

export interface ComponentMemoryState {
  readonly techBaseMemory: TechBaseMemory;
  readonly lastUpdated: number;
  readonly version: string;
}


