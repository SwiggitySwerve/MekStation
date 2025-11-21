/**
 * Enum Conversion Utilities
 * 
 * Provides type-safe conversion between string literals and enum types
 * with proper validation and error handling.
 */

import { TechBase, RulesLevel } from '../../types/core/BaseTypes';

/**
 * Converts string to TechBase enum with validation
 * 
 * @param value - String value to convert (can be undefined or null)
 * @returns TechBase enum value or null if invalid
 */
export function stringToTechBase(value: string | undefined | null): TechBase | null {
  if (!value) return null;
  
  const normalized = value.trim();
  const mapping: Record<string, TechBase> = {
    'Inner Sphere': TechBase.INNER_SPHERE,
    'Clan': TechBase.CLAN,
    'Mixed (IS Chassis)': TechBase.MIXED_IS_CHASSIS,
    'Mixed (Clan Chassis)': TechBase.MIXED_CLAN_CHASSIS,
    'Mixed': TechBase.MIXED,
    'Both': TechBase.BOTH,
  };
  
  return mapping[normalized] ?? null;
}

/**
 * Converts TechBase enum to string
 * 
 * @param techBase - TechBase enum value
 * @returns String representation of the enum
 */
export function techBaseToString(techBase: TechBase): string {
  return techBase;
}

/**
 * Maps numeric rules level to string name
 * 
 * @param level - Numeric rules level (0-3)
 * @returns String name of the rules level
 */
function getRulesLevelName(level: number): string {
  const mapping: Record<number, string> = {
    0: 'Introductory',
    1: 'Standard',
    2: 'Advanced',
    3: 'Experimental',
  };
  return mapping[level] ?? 'Standard';
}

/**
 * Converts string or number to RulesLevel enum with validation
 * 
 * @param value - String or number value to convert (can be undefined or null)
 * @returns RulesLevel enum value or null if invalid
 */
export function stringToRulesLevel(value: string | number | undefined | null): RulesLevel | null {
  if (value === undefined || value === null) return null;
  
  const normalized = typeof value === 'number' 
    ? getRulesLevelName(value)
    : String(value).trim();
    
  const mapping: Record<string, RulesLevel> = {
    'Introductory': RulesLevel.INTRODUCTORY,
    'Standard': RulesLevel.STANDARD,
    'Advanced': RulesLevel.ADVANCED,
    'Experimental': RulesLevel.EXPERIMENTAL,
  };
  
  return mapping[normalized] ?? null;
}

/**
 * Converts RulesLevel enum to string
 * 
 * @param rulesLevel - RulesLevel enum value
 * @returns String representation of the enum
 */
export function rulesLevelToString(rulesLevel: RulesLevel): string {
  return rulesLevel;
}

/**
 * Converts string or number to RulesLevel enum with default fallback
 * 
 * @param value - String or number value to convert
 * @param defaultValue - Default RulesLevel to use if conversion fails
 * @returns RulesLevel enum value (never null)
 */
export function stringToRulesLevelWithDefault(
  value: string | number | undefined | null,
  defaultValue: RulesLevel = RulesLevel.STANDARD
): RulesLevel {
  return stringToRulesLevel(value) ?? defaultValue;
}

/**
 * Converts string to TechBase enum with default fallback
 * 
 * @param value - String value to convert
 * @param defaultValue - Default TechBase to use if conversion fails
 * @returns TechBase enum value (never null)
 */
export function stringToTechBaseWithDefault(
  value: string | undefined | null,
  defaultValue: TechBase = TechBase.INNER_SPHERE
): TechBase {
  return stringToTechBase(value) ?? defaultValue;
}
