/**
 * Dynamic Data Types
 * 
 * Provides proper types and type guards for data that was previously
 * accessed via Record<string, unknown> or Record<string, any>.
 * 
 * This eliminates unsafe property access and improves type safety.
 */

import { TechBase, RulesLevel } from './BaseTypes';

/**
 * Unit configuration data structure
 * Used for accessing unit configuration properties safely
 */
export interface IUnitConfigurationData {
  tonnage?: number;
  engineType?: string;
  gyroType?: string;
  structureType?: string;
  armorType?: string;
  techBase?: TechBase | string;
  rulesLevel?: RulesLevel | string;
  era?: string;
  mass?: number;
  [key: string]: unknown; // Allow additional properties for extensibility
}

/**
 * Type guard for unit configuration data
 */
export function isUnitConfigurationData(obj: unknown): obj is IUnitConfigurationData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  // Basic structure validation
  const config = obj as Record<string, unknown>;
  
  // Validate known properties if present
  if ('techBase' in config) {
    const techBase = config.techBase;
    if (typeof techBase !== 'string' && typeof techBase !== 'object') {
      return false;
    }
  }
  
  if ('rulesLevel' in config) {
    const rulesLevel = config.rulesLevel;
    if (typeof rulesLevel !== 'string' && typeof rulesLevel !== 'object' && typeof rulesLevel !== 'number') {
      return false;
    }
  }
  
  return true;
}

/**
 * Equipment item data structure
 * Used for accessing equipment/weapon item properties safely
 */
export interface IEquipmentItemData {
  item_name?: string;
  item_type?: string;
  location?: string;
  category?: string;
  type?: string;
  tech_base?: string;
  damage?: number | string;
  heat?: number;
  slots?: number;
  space?: number;
  weight?: number;
  tonnage?: number;
  range?: IRangeData;
  ammo_per_shot?: number;
  rear_facing?: boolean;
  turret_mounted?: boolean;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Range data structure
 */
export interface IRangeData {
  short?: number;
  medium?: number;
  long?: number;
  extreme?: number;
  minimum?: number;
  [key: string]: unknown;
}

/**
 * Type guard for equipment item data
 */
export function isEquipmentItemData(obj: unknown): obj is IEquipmentItemData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  return true; // Accept any object structure for equipment items
}

/**
 * Type guard for range data
 */
export function isRangeData(obj: unknown): obj is IRangeData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const range = obj as Record<string, unknown>;
  
  // Validate that numeric properties are actually numbers if present
  const numericProps = ['short', 'medium', 'long', 'extreme', 'minimum'];
  for (const prop of numericProps) {
    if (prop in range && typeof range[prop] !== 'number' && range[prop] !== undefined) {
      return false;
    }
  }
  
  return true;
}

/**
 * Equipment data structure (nested data property)
 * Used for accessing equipment.data properties safely
 */
export interface IEquipmentData {
  heat?: number;
  damage?: number | string;
  slots?: number;
  space?: number;
  weight?: number;
  tonnage?: number;
  range?: IRangeData;
  tech_base?: string;
  item_name?: string;
  item_type?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Type guard for equipment data
 */
export function isEquipmentData(obj: unknown): obj is IEquipmentData {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  return true; // Accept any object structure for equipment data
}

/**
 * Critical slot sections data structure
 * Used for managing critical slot allocations by location
 */
export interface ICriticalSlotSections {
  [location: string]: {
    slots: Array<{
      slot: unknown;
      location: string;
      index: number;
    }>;
    [key: string]: unknown;
  };
}

/**
 * Type guard for critical slot sections
 */
export function isCriticalSlotSections(obj: unknown): obj is ICriticalSlotSections {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  const sections = obj as Record<string, unknown>;
  
  // Validate that values are objects with slots array
  for (const value of Object.values(sections)) {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const section = value as Record<string, unknown>;
    if (!Array.isArray(section.slots)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Safe property accessor for configuration data
 */
export function getConfigurationProperty<T>(
  config: IUnitConfigurationData,
  property: string,
  defaultValue?: T
): T | undefined {
  const value = config[property];
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

/**
 * Safe property accessor for equipment item data
 */
export function getEquipmentItemProperty<T>(
  item: IEquipmentItemData,
  property: string,
  defaultValue?: T
): T | undefined {
  const value = item[property];
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}

/**
 * Safe property accessor for equipment data
 */
export function getEquipmentDataProperty<T>(
  data: IEquipmentData,
  property: string,
  defaultValue?: T
): T | undefined {
  const value = data[property];
  return value !== undefined && value !== null ? (value as T) : defaultValue;
}
