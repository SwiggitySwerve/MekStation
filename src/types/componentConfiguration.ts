/**
 * Component Configuration Types - Unified Tech Base System
 * Provides structured component configuration with explicit tech base tracking
 */

export type TechBase = 'Inner Sphere' | 'Clan';

/**
 * Structured component configuration with explicit tech base
 */
export interface ComponentConfiguration {
  type: string;           // Component type: "Standard", "Endo Steel", "XL", etc.
  techBase: TechBase;     // Tech base: determines available options and capabilities
}

/**
 * Component type definitions for different categories
 */
export interface ComponentTypeDefinition {
  name: string;           // Display name: "Endo Steel"
  techBase: TechBase;     // Required tech base
  weight?: number;        // Weight multiplier or fixed weight
  slots?: number;         // Critical slots required
  restrictions?: string[]; // Special restrictions or requirements
}

/**
 * Component category definitions
 */
export const COMPONENT_CATEGORIES = {
  structure: 'Internal Structure',
  engine: 'Engine',
  gyro: 'Gyro',
  heatSink: 'Heat Sink',
  armor: 'Armor',
  enhancement: 'Enhancement',
  jumpJet: 'Jump Jet'
} as const;

export type ComponentCategory = keyof typeof COMPONENT_CATEGORIES;

/**
 * Available component types by category and tech base
 */
export const COMPONENT_TYPE_DEFINITIONS: Record<ComponentCategory, ComponentTypeDefinition[]> = {
  structure: [
    { name: 'Standard', techBase: 'Inner Sphere' },
    { name: 'Endo Steel', techBase: 'Inner Sphere', slots: 14 },
    { name: 'Standard', techBase: 'Clan' },
    { name: 'Endo Steel (Clan)', techBase: 'Clan', slots: 7 }
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
    { name: 'XXL', techBase: 'Clan', weight: 0.33 }
  ],
  gyro: [
    { name: 'Standard', techBase: 'Inner Sphere', slots: 4 },
    { name: 'XL', techBase: 'Inner Sphere', slots: 6 },
    { name: 'Compact', techBase: 'Inner Sphere', slots: 2 },
    { name: 'Heavy-Duty', techBase: 'Inner Sphere', slots: 4 },
    { name: 'Standard', techBase: 'Clan', slots: 4 }
  ],
  heatSink: [
    { name: 'Single', techBase: 'Inner Sphere' },
    { name: 'Double', techBase: 'Inner Sphere' },
    { name: 'Compact', techBase: 'Inner Sphere' },
    { name: 'Laser', techBase: 'Inner Sphere' },
    { name: 'Single', techBase: 'Clan' },
    { name: 'Double (Clan)', techBase: 'Clan' },
    { name: 'Compact (Clan)', techBase: 'Clan' },
    { name: 'Laser (Clan)', techBase: 'Clan' }
  ],
  armor: [
    { name: 'Standard', techBase: 'Inner Sphere' },
    { name: 'Ferro-Fibrous', techBase: 'Inner Sphere', slots: 14 },
    { name: 'Light Ferro-Fibrous', techBase: 'Inner Sphere', slots: 7 },
    { name: 'Heavy Ferro-Fibrous', techBase: 'Inner Sphere', slots: 21 },
    { name: 'Stealth', techBase: 'Inner Sphere', slots: 12 },
    { name: 'Standard', techBase: 'Clan' },
    { name: 'Ferro-Fibrous (Clan)', techBase: 'Clan', slots: 7 },
    { name: 'Stealth (Clan)', techBase: 'Clan', slots: 12 }
  ],
  enhancement: [
    { name: 'None', techBase: 'Inner Sphere' },
    { name: 'MASC', techBase: 'Inner Sphere' },
    { name: 'Triple Strength Myomer', techBase: 'Inner Sphere' },
    { name: 'None', techBase: 'Clan' },
    { name: 'MASC', techBase: 'Clan' }
  ],
  jumpJet: [
    { name: 'Standard Jump Jet', techBase: 'Inner Sphere' },
    { name: 'Improved Jump Jet', techBase: 'Inner Sphere' },
    { name: 'Mechanical Jump Booster', techBase: 'Inner Sphere' },
    { name: 'Standard Jump Jet', techBase: 'Clan' },
    { name: 'Improved Jump Jet', techBase: 'Clan' }
  ]
};

/**
 * Get available component types for a specific category and tech base
 */
export function getComponentTypes(category: ComponentCategory, techBase: TechBase): ComponentTypeDefinition[] {
  return COMPONENT_TYPE_DEFINITIONS[category].filter(def => def.techBase === techBase);
}

/**
 * Get available component type names for a specific category and tech base
 */
export function getComponentTypeNames(category: ComponentCategory, techBase: TechBase): string[] {
  return getComponentTypes(category, techBase).map(def => def.name);
}

/**
 * Find component definition by category and name
 */
export function getComponentDefinition(category: ComponentCategory, name: string): ComponentTypeDefinition | null {
  return COMPONENT_TYPE_DEFINITIONS[category].find(def => def.name === name) || null;
}

/**
 * Create a ComponentConfiguration from a type name (auto-detects tech base)
 */
export function createComponentConfiguration(category: ComponentCategory, typeName: string): ComponentConfiguration | null {
  const definition = getComponentDefinition(category, typeName);
  if (!definition) {
    return null;
  }
  
  return {
    type: definition.name,
    techBase: definition.techBase
  };
}

/**
 * Create default ComponentConfiguration for a category and tech base
 */
export function createDefaultComponentConfiguration(category: ComponentCategory, techBase: TechBase): ComponentConfiguration {
  const availableTypes = getComponentTypes(category, techBase);
  const defaultType = availableTypes.find(def => def.name === 'Standard') || availableTypes[0];
  
  return {
    type: defaultType.name,
    techBase: defaultType.techBase
  };
}

/**
 * Migration helper: Convert string-based component to ComponentConfiguration
 */
export function migrateStringToComponentConfiguration(
  category: ComponentCategory, 
  stringValue: string, 
  fallbackTechBase: TechBase = 'Inner Sphere'
): ComponentConfiguration {
  // Try to find exact match first
  const exactMatch = createComponentConfiguration(category, stringValue);
  if (exactMatch) {
    return exactMatch;
  }
  
  // Fallback: create with fallback tech base
  return {
    type: stringValue,
    techBase: fallbackTechBase
  };
}

/**
 * Validation: Check if a component configuration is valid
 */
export function isValidComponentConfiguration(category: ComponentCategory, config: ComponentConfiguration): boolean {
  const definition = getComponentDefinition(category, config.type);
  return definition !== null && definition.techBase === config.techBase;
}
