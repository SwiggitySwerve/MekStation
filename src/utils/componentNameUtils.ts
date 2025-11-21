/**
 * Component Name Mapping Utility
 * 
 * This utility provides functions to map between internal IDs and display names
 * for components and equipment.
 */

// Component definitions with internal IDs and display names
export const COMPONENT_DEFINITIONS = {
  'endo_steel': 'Endo Steel',
  'endo_steel': 'Endo Steel Structure',
  'endo_steel_clan': 'Endo Steel (Clan)',
  'endo_steel_clan': 'Endo Steel (Clan) Structure',
  'composite': 'Composite',
  'composite': 'Composite Structure',
  'reinforced': 'Reinforced',
  'reinforced': 'Reinforced Structure',
  'industrial': 'Industrial',
  'industrial': 'Industrial Structure',
  'ferro_fibrous': 'Ferro-Fibrous',
  'ferro_fibrous': 'Ferro-Fibrous Armor',
  'ferro_fibrous_clan': 'Ferro-Fibrous (Clan)',
  'ferro_fibrous_clan': 'Ferro-Fibrous (Clan) Armor',
  'light_ferro_fibrous': 'Light Ferro-Fibrous',
  'light_ferro_fibrous': 'Light Ferro-Fibrous Armor',
  'heavy_ferro_fibrous': 'Heavy Ferro-Fibrous',
  'heavy_ferro_fibrous': 'Heavy Ferro-Fibrous Armor',
  'stealth_armor': 'Stealth',
  'stealth_armor': 'Stealth Armor',
  'reactive_armor': 'Reactive',
  'reactive_armor': 'Reactive Armor',
  'reflective_armor': 'Reflective',
  'reflective_armor': 'Reflective Armor',
  'hardened_armor': 'Hardened',
  'hardened_armor': 'Hardened Armor',
  'single_heat_sink': 'Single Heat Sink',
  'double_heat_sink': 'Double Heat Sink',
  'double_heat_sink_clan': 'Double Heat Sink (Clan)',
  'compact_heat_sink': 'Compact Heat Sink',
  'laser_heat_sink': 'Laser Heat Sink',
  'standard_jump_jet': 'Standard Jump Jet',
  'improved_jump_jet': 'Improved Jump Jet',
  'partial_wing': 'Partial Wing',
  'standard_engine': 'Standard Engine',
  'xl_engine': 'XL Engine',
  'light_engine': 'Light Engine',
  'xxl_engine': 'XXL Engine',
  'compact_engine': 'Compact Engine',
  'standard_gyro': 'Standard Gyro',
  'xl_gyro': 'XL Gyro',
  'compact_gyro': 'Compact Gyro'
};

/**
 * Get display name for a component ID
 */
export function getComponentDisplayName(id: string): string {
  return COMPONENT_DEFINITIONS[id] || id;
}

/**
 * Get component ID from display name
 */
export function getComponentIdByName(name: string): string | undefined {
  for (const [componentId, displayName] of Object.entries(COMPONENT_DEFINITIONS)) {
    if (displayName === name) {
      return componentId;
    }
  }
  return undefined;
}

/**
 * Check if a component ID is a special component
 */
export function isSpecialComponent(id: string): boolean {
  const specialComponentIds = [
    'endo_steel', 'endo_steel_clan', 'composite', 'reinforced', 'industrial',
    'ferro_fibrous', 'ferro_fibrous_clan', 'light_ferro_fibrous', 'heavy_ferro_fibrous',
    'stealth_armor', 'reactive_armor', 'reflective_armor', 'hardened_armor'
  ];
  return specialComponentIds.includes(id);
}

/**
 * Check if a component ID is a structure component
 */
export function isStructureComponent(id: string): boolean {
  const structureComponentIds = [
    'endo_steel', 'endo_steel_clan', 'composite', 'reinforced', 'industrial'
  ];
  return structureComponentIds.includes(id);
}

/**
 * Check if a component ID is an armor component
 */
export function isArmorComponent(id: string): boolean {
  const armorComponentIds = [
    'ferro_fibrous', 'ferro_fibrous_clan', 'light_ferro_fibrous', 'heavy_ferro_fibrous',
    'stealth_armor', 'reactive_armor', 'reflective_armor', 'hardened_armor'
  ];
  return armorComponentIds.includes(id);
}

/**
 * Migrate old display names to new IDs (for legacy data)
 */
export function migrateOldNameToId(name: string): string {
  const mappings = {
    'Endo Steel Structure': 'endo_steel',
    'Endo Steel (Clan) Structure': 'endo_steel_clan',
    'Composite Structure': 'composite',
    'Reinforced Structure': 'reinforced',
    'Industrial Structure': 'industrial',
    'Ferro-Fibrous Armor': 'ferro_fibrous',
    'Ferro-Fibrous (Clan) Armor': 'ferro_fibrous_clan',
    'Light Ferro-Fibrous Armor': 'light_ferro_fibrous',
    'Heavy Ferro-Fibrous Armor': 'heavy_ferro_fibrous',
    'Stealth Armor': 'stealth_armor',
    'Reactive Armor': 'reactive_armor',
    'Reflective Armor': 'reflective_armor',
    'Hardened Armor': 'hardened_armor'
  };
  
  return mappings[name] || name;
}
