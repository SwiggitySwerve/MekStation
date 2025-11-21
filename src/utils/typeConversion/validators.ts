/**
 * Validation Utilities
 * 
 * Provides validation functions for unit data structures
 * with proper error reporting.
 */

import { FullUnit } from '../../types';
import { TechBase, RulesLevel } from '../../types/core/BaseTypes';
import { stringToTechBase, stringToRulesLevel } from './enumConverters';

/**
 * Validation result with errors and warnings
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a FullUnit structure
 * 
 * @param unit - FullUnit to validate
 * @returns ValidationResult with any errors or warnings
 */
export function validateFullUnit(unit: FullUnit): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate required fields
  if (!unit.id) {
    errors.push('Missing unit id');
  }
  
  if (!unit.chassis || unit.chassis.trim() === '') {
    errors.push('Missing or empty chassis');
  }
  
  if (!unit.model || unit.model.trim() === '') {
    errors.push('Missing or empty model');
  }
  
  if (!unit.mass || unit.mass <= 0) {
    errors.push(`Invalid mass: ${unit.mass}. Mass must be greater than 0`);
  }
  
  // Validate tech base
  if (unit.tech_base) {
    const techBase = stringToTechBase(unit.tech_base);
    if (!techBase) {
      warnings.push(`Unknown tech base: "${unit.tech_base}". Using default.`);
    }
  } else {
    warnings.push('Missing tech_base. Using default: Inner Sphere');
  }
  
  // Validate rules level
  if (unit.rules_level !== undefined && unit.rules_level !== null) {
    const rulesLevel = stringToRulesLevel(unit.rules_level);
    if (!rulesLevel) {
      warnings.push(`Unknown rules level: "${unit.rules_level}". Using default.`);
    }
  } else {
    warnings.push('Missing rules_level. Using default: Standard');
  }
  
  // Validate era
  if (!unit.era || unit.era.trim() === '') {
    warnings.push('Missing or empty era');
  }
  
  // Validate data structure if present
  if (unit.data) {
    const dataValidation = validateUnitData(unit.data);
    errors.push(...dataValidation.errors);
    warnings.push(...dataValidation.warnings);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates UnitData structure
 * 
 * @param data - UnitData to validate
 * @returns ValidationResult with any errors or warnings
 */
export function validateUnitData(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Unit data is missing or invalid');
    return { isValid: false, errors, warnings };
  }
  
  // Validate armor structure if present
  if (data.armor) {
    if (!Array.isArray(data.armor.locations)) {
      errors.push('Armor locations must be an array');
    } else {
      data.armor.locations.forEach((loc: any, index: number) => {
        if (!loc.location) {
          errors.push(`Armor location ${index} is missing location name`);
        }
        if (typeof loc.armor_points !== 'number' || loc.armor_points < 0) {
          errors.push(`Armor location ${index} has invalid armor_points`);
        }
      });
    }
  }
  
  // Validate weapons and equipment if present
  if (data.weapons_and_equipment) {
    if (!Array.isArray(data.weapons_and_equipment)) {
      errors.push('weapons_and_equipment must be an array');
    } else {
      data.weapons_and_equipment.forEach((item: any, index: number) => {
        if (!item.item_name) {
          warnings.push(`Equipment item ${index} is missing item_name`);
        }
        if (!item.item_type) {
          warnings.push(`Equipment item ${index} is missing item_type`);
        }
      });
    }
  }
  
  // Validate movement if present
  if (data.movement) {
    if (typeof data.movement.walk_mp !== 'number' || data.movement.walk_mp < 0) {
      warnings.push('Invalid or missing walk_mp in movement data');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates a tech base string
 * 
 * @param techBase - String to validate
 * @returns True if the string is a valid tech base
 */
export function isValidTechBaseString(techBase: string | undefined | null): boolean {
  if (!techBase) return false;
  return stringToTechBase(techBase) !== null;
}

/**
 * Validates a rules level string or number
 * 
 * @param rulesLevel - String or number to validate
 * @returns True if the value is a valid rules level
 */
export function isValidRulesLevelValue(rulesLevel: string | number | undefined | null): boolean {
  if (rulesLevel === undefined || rulesLevel === null) return false;
  return stringToRulesLevel(rulesLevel) !== null;
}
