/**
 * Unified Equipment Color Coding System for V2 Customizer
 * Provides consistent color schemes across all equipment displays
 * Integrates with the new BattleTech color system
 */

import { EquipmentObject } from './criticalSlots/CriticalSlot';
import { 
  getBattleTechEquipmentColor, 
  getBattleTechEquipmentClasses, 
  getBattleTechEquipmentClassesWithGlow,
  classifyEquipment,
  BATTLETECH_EQUIPMENT_COLORS
} from './colors/battletechColors';

// Equipment type color mappings
export const EQUIPMENT_TYPE_COLORS = {
  weapon: {
    bg: 'bg-red-700',
    text: 'text-red-100',
    border: 'border-red-500',
    glow: 'ring-red-500/20'
  },
  ammo: {
    bg: 'bg-orange-700',
    text: 'text-orange-100',
    border: 'border-orange-500',
    glow: 'ring-orange-500/20'
  },
  heat_sink: {
    bg: 'bg-cyan-700',
    text: 'text-cyan-100',
    border: 'border-cyan-500',
    glow: 'ring-cyan-500/20'
  },
  equipment: {
    bg: 'bg-blue-700',
    text: 'text-blue-100',
    border: 'border-blue-500',
    glow: 'ring-blue-500/20'
  },
  unknown: {
    bg: 'bg-gray-700',
    text: 'text-gray-100',
    border: 'border-gray-500',
    glow: 'ring-gray-500/20'
  }
} as const;

// Category name to equipment type mapping
export const CATEGORY_TO_TYPE_MAP: Record<string, keyof typeof EQUIPMENT_TYPE_COLORS> = {
  'Weapons': 'weapon',
  'Energy Weapons': 'weapon',
  'Ballistic Weapons': 'weapon',
  'Missile Weapons': 'weapon',
  'Physical Weapons': 'weapon',
  'Anti-Personnel Weapons': 'weapon',
  'Capital Weapons': 'weapon',
  'Artillery Weapons': 'weapon',
  'Ammunition': 'ammo',
  'Heat Management': 'heat_sink',
  'Heat Sinks': 'heat_sink',
  'Equipment': 'equipment',
  'Electronic Warfare': 'equipment',
  'Targeting Systems': 'equipment',
  'Special Equipment': 'equipment',
  'Jump Jets': 'equipment',
  'Cockpit Systems': 'equipment',
  'Actuators': 'equipment',
  'Movement Equipment': 'equipment'
};

// Tech base color mappings
export const TECH_BASE_COLORS = {
  'Inner Sphere': {
    text: 'text-blue-400',
    bg: 'bg-blue-900/30',
    border: 'border-blue-500/30'
  },
  'Clan': {
    text: 'text-green-400',
    bg: 'bg-green-900/30',
    border: 'border-green-500/30'
  },
  'Mixed': {
    text: 'text-purple-400',
    bg: 'bg-purple-900/30',
    border: 'border-purple-500/30'
  },
  'Unknown': {
    text: 'text-gray-400',
    bg: 'bg-gray-900/30',
    border: 'border-gray-500/30'
  }
} as const;

// Color scheme type for equipment types
type EquipmentColorScheme = {
  bg: string;
  text: string;
  border: string;
  glow: string;
};

// Color scheme type for tech bases
type TechBaseColorScheme = {
  text: string;
  bg: string;
  border: string;
};

/**
 * Get equipment type color scheme
 */
export function getEquipmentTypeColors(type: EquipmentObject['type'] | string | undefined): EquipmentColorScheme {
  if (!type) return EQUIPMENT_TYPE_COLORS.unknown;
  
  // Direct type match
  if (type in EQUIPMENT_TYPE_COLORS) {
    return EQUIPMENT_TYPE_COLORS[type as keyof typeof EQUIPMENT_TYPE_COLORS];
  }
  
  // Category name mapping
  const mappedType = CATEGORY_TO_TYPE_MAP[type];
  if (mappedType) {
    return EQUIPMENT_TYPE_COLORS[mappedType];
  }
  
  // Fallback detection
  const lowerType = type.toLowerCase();
  if (lowerType.includes('weapon') || lowerType.includes('laser') || lowerType.includes('cannon') || lowerType.includes('missile')) {
    return EQUIPMENT_TYPE_COLORS.weapon;
  }
  if (lowerType.includes('ammo') || lowerType.includes('ammunition')) {
    return EQUIPMENT_TYPE_COLORS.ammo;
  }
  if (lowerType.includes('heat') && lowerType.includes('sink')) {
    return EQUIPMENT_TYPE_COLORS.heat_sink;
  }
  
  return EQUIPMENT_TYPE_COLORS.equipment;
}

/**
 * Get tech base color scheme
 */
export function getTechBaseColors(techBase: EquipmentObject['techBase'] | string | undefined): TechBaseColorScheme {
  if (!techBase) return TECH_BASE_COLORS.Unknown;
  
  if (techBase in TECH_BASE_COLORS) {
    return TECH_BASE_COLORS[techBase as keyof typeof TECH_BASE_COLORS];
  }
  
  // Handle common variations
  if (techBase === 'IS' || techBase === 'Inner Sphere') {
    return TECH_BASE_COLORS['Inner Sphere'];
  }
  if (techBase === 'Clan') {
    return TECH_BASE_COLORS.Clan;
  }
  
  return TECH_BASE_COLORS.Unknown;
}

/**
 * Get combined CSS classes for equipment type badge
 */
export function getEquipmentTypeBadgeClasses(type: EquipmentObject['type'] | string | undefined): string {
  const colors = getEquipmentTypeColors(type);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

/**
 * Get combined CSS classes for tech base display
 */
export function getTechBaseBadgeClasses(techBase: EquipmentObject['techBase'] | string | undefined): string {
  const colors = getTechBaseColors(techBase);
  return `${colors.text} ${colors.bg} ${colors.border}`;
}

/**
 * Get equipment type display name
 */
export function getEquipmentTypeDisplayName(type: EquipmentObject['type'] | string | undefined): string {
  if (!type) return 'UNKNOWN';
  
  // Convert type to display format
  const typeMap: Record<string, string> = {
    weapon: 'WEAPON',
    ammo: 'AMMO',
    heat_sink: 'HEAT SINK',
    equipment: 'EQUIPMENT'
  };
  
  if (type in typeMap) {
    return typeMap[type];
  }
  
  // For category names, use as-is but uppercase
  return type.toUpperCase();
}

/**
 * Get tech base display name
 */
export function getTechBaseDisplayName(techBase: EquipmentObject['techBase'] | string | undefined): string {
  if (!techBase) return 'Unknown';
  
  // Handle common variations
  if (techBase === 'Inner Sphere' || techBase === 'IS') {
    return 'IS';
  }
  if (techBase === 'Clan') {
    return 'Clan';
  }
  
  return techBase;
}

/**
 * Equipment priority for sorting (weapons first, then by type)
 */
export function getEquipmentSortPriority(type: EquipmentObject['type'] | string | undefined): number {
  const priorities = {
    weapon: 1,
    ammo: 2,
    heat_sink: 3,
    equipment: 4,
    unknown: 5
  };
  
  if (!type) return priorities.unknown;
  
  if (type in priorities) {
    return priorities[type as keyof typeof priorities];
  }
  
  // Category mapping
  const mappedType = CATEGORY_TO_TYPE_MAP[type];
  if (mappedType && mappedType in priorities) {
    return priorities[mappedType as keyof typeof priorities];
  }
  
  return priorities.equipment;
}

/**
 * Get equipment color classes for critical slot display
 * This function provides backward compatibility for existing components
 * Now uses the new BattleTech color system
 */
export function getEquipmentColorClasses(equipmentName: string): string {
  // Use the new BattleTech color system
  return getBattleTechEquipmentClasses(equipmentName);
}

/**
 * Get equipment color classes with glow effect
 * Extended function for enhanced visual effects
 */
export function getEquipmentColorClassesWithGlow(equipmentName: string): string {
  return getBattleTechEquipmentClassesWithGlow(equipmentName);
}

/**
 * Get the equipment category using BattleTech classification
 */
export function getEquipmentCategory(equipmentName: string): string {
  return classifyEquipment(equipmentName);
}

/**
 * Check if equipment is a specific category
 */
export function isEquipmentCategory(equipmentName: string, category: keyof typeof BATTLETECH_EQUIPMENT_COLORS): boolean {
  return classifyEquipment(equipmentName) === category;
}

// Re-export BattleTech color functions for convenience
export { getBattleTechEquipmentClasses, getBattleTechEquipmentClassesWithGlow } from './colors/battletechColors';
