/**
 * Weapon Range Validation System
 * Ensures all weapons have complete and valid range data during equipment initialization
 */

import { Equipment, ALL_EQUIPMENT_VARIANTS } from '../data/equipment';

/**
 * Interface that enforces range validation for weapon equipment.
 * All weapons must have complete range data to be valid.
 */
export interface RangeValidatable {
  /**
   * Validates that this weapon has complete and valid range data.
   * @throws Error if ranges are invalid or missing
   */
  validateRanges(): void;
  
  /**
   * Checks if this weapon has valid range data without throwing.
   * @returns true if ranges are valid, false otherwise
   */
  hasValidRanges(): boolean;
}

/**
 * Enhanced equipment item with range validation for weapons
 */
export interface ValidatedWeaponItem extends Equipment, RangeValidatable {}

/**
 * Range validation error details
 */
export interface RangeValidationError {
  weaponId: string;
  weaponName: string;
  error: string;
  details: string;
}

/**
 * Parsed range data structure
 */
export interface ParsedRange {
  short: number;
  medium: number;
  long: number;
  extreme?: number;
}

/**
 * Validates all weapons in the equipment database for complete range data.
 * Called during equipment initialization - fails hard if any weapon lacks valid ranges.
 */
export class WeaponRangeValidator {
  
  /**
   * Main validation method - validates all weapons in the database
   * @throws Error if any weapon lacks valid range data
   */
  static validateAllWeaponRanges(): void {
    console.log('Starting weapon range validation...');
    
    const failures: RangeValidationError[] = [];
    let weaponsValidated = 0;
    
    // Filter to only actual weapons (exclude ammo, equipment, electronics)
    const weapons = ALL_EQUIPMENT_VARIANTS.filter(item => 
      WeaponRangeValidator.isWeaponEquipment(item)
    );
    
    weapons.forEach(weapon => {
      weaponsValidated++;
      
      try {
        WeaponRangeValidator.validateWeaponRanges(weapon);
      } catch (error) {
        failures.push({
          weaponId: weapon.id,
          weaponName: weapon.name,
          error: error instanceof Error ? error.message : String(error),
          details: `Category: ${weapon.category}`
        });
      }
    });
    
    console.log(`Validated ${weaponsValidated} weapons for range completeness`);
    
    if (failures.length > 0) {
      const errorMessage = WeaponRangeValidator.formatValidationErrors(failures);
      console.error('WEAPON RANGE VALIDATION FAILED:', errorMessage);
      throw new Error(`CRITICAL: Weapon range validation failed during startup:\n${errorMessage}`);
    }
    
    console.log('✓ All weapons have valid range data');
  }
  
  /**
   * Validates a single weapon's range data
   * @param weapon The weapon to validate
   * @throws Error if weapon has invalid or missing range data
   */
  static validateWeaponRanges(weapon: Equipment): void {
    // Check each variant for range data
    const variants = Object.entries(weapon.variants);
    if (variants.length === 0) {
      throw new Error(`No variants defined for weapon`);
    }
    
    variants.forEach(([techBase, variant]) => {
      // Check if range data is complete
      if (variant.rangeShort === undefined || variant.rangeShort === null) {
        throw new Error(`Missing rangeShort for ${techBase} variant`);
      }
      
      if (variant.rangeMedium === undefined || variant.rangeMedium === null) {
        throw new Error(`Missing rangeMedium for ${techBase} variant`);
      }
      
      if (variant.rangeLong === undefined || variant.rangeLong === null) {
        throw new Error(`Missing rangeLong for ${techBase} variant`);
      }
      
      // Check minimum range
      const minRange = variant.minRange ?? 0;
      if (minRange < 0) {
        throw new Error(`Invalid minimum range: ${minRange} - must be >= 0`);
      }
      
      // Validate range progression
      const ranges = {
        short: variant.rangeShort,
        medium: variant.rangeMedium,
        long: variant.rangeLong,
        extreme: variant.rangeExtreme ?? undefined
      };
      
      WeaponRangeValidator.validateRangeProgression(ranges, `${weapon.name} (${techBase})`);
      
      // Validate minimum range consistency
      if (minRange > ranges.short) {
        throw new Error(`Minimum range (${minRange}) cannot be greater than short range (${ranges.short}) for ${techBase} variant`);
      }
    });
  }
  
  /**
   * Determines if an equipment item is a weapon that needs range validation
   * @param item Equipment item to check
   * @returns true if item is a weapon that needs range validation
   */
  static isWeaponEquipment(item: Equipment): boolean {
    // Exclude ammo and non-weapon equipment first
    if (item.category === 'Ammunition' || item.category === 'Equipment' || item.category === 'Electronic Warfare') {
      return false;
    }
    
    // Exclude Physical weapons - they use melee mechanics, not ranged
    if (item.category === 'Physical Weapons') {
      return false; // Physical weapons have different range mechanics
    }
    
    // Include actual weapon categories that need range validation
    const weaponCategories = ['Energy Weapons', 'Ballistic Weapons', 'Missile Weapons', 'Artillery Weapons'];
    
    // Include if it's a weapon category
    if (weaponCategories.includes(item.category)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Parses a range string like "3/6/9" into structured data
   * @param rangeString The range string to parse
   * @returns Parsed range data or null if invalid
   */
  static parseRangeString(rangeString: string): ParsedRange | null {
    if (!rangeString || rangeString === '-') {
      return null;
    }
    
    // Handle various range formats
    const parts = rangeString.split('/').map(part => {
      const num = parseInt(part.trim(), 10);
      return isNaN(num) ? 0 : num;
    });
    
    if (parts.length < 3) {
      return null;
    }
    
    const range: ParsedRange = {
      short: parts[0],
      medium: parts[1],
      long: parts[2]
    };
    
    // Add extreme range if present
    if (parts.length >= 4) {
      range.extreme = parts[3];
    }
    
    return range;
  }
  
  /**
   * Validates that range progression makes logical sense
   * @param range Parsed range data
   * @param weaponName Weapon name for error reporting
   * @throws Error if range progression is invalid
   */
  static validateRangeProgression(range: ParsedRange, weaponName: string): void {
    // All ranges must be non-negative
    if (range.short < 0 || range.medium < 0 || range.long < 0) {
      throw new Error(`All ranges must be >= 0 (short: ${range.short}, medium: ${range.medium}, long: ${range.long})`);
    }
    
    // Range progression validation (short <= medium <= long)
    if (range.short > range.medium) {
      throw new Error(`Short range (${range.short}) cannot be greater than medium range (${range.medium})`);
    }
    
    if (range.medium > range.long) {
      throw new Error(`Medium range (${range.medium}) cannot be greater than long range (${range.long})`);
    }
    
    // Extreme range validation if present
    if (range.extreme !== undefined) {
      if (range.long > range.extreme) {
        throw new Error(`Long range (${range.long}) cannot be greater than extreme range (${range.extreme})`);
      }
    }
    
    // Special case: ranges should be meaningful (not all zero except for melee weapons)
    if (range.short === 0 && range.medium === 0 && range.long === 0) {
      // Only allow this for weapons that should have zero range (none in our current DB)
      throw new Error(`All ranges cannot be zero - weapon must have some range capability`);
    }
  }
  
  /**
   * Formats validation errors into a readable report
   * @param failures Array of validation errors
   * @returns Formatted error message
   */
  static formatValidationErrors(failures: RangeValidationError[]): string {
    const lines = [`Found ${failures.length} weapons with invalid or missing range data:\n`];
    
    failures.forEach((failure, index) => {
      lines.push(`${index + 1}. ${failure.weaponName} (${failure.weaponId})`);
      lines.push(`   Error: ${failure.error}`);
      lines.push(`   Details: ${failure.details}\n`);
    });
    
    lines.push('All weapons must have valid range data defined.');
    lines.push('Expected range format: "short/medium/long" (e.g., "3/6/9")');
    lines.push('All ranges must be non-negative integers with proper progression.');
    
    return lines.join('\n');
  }
  
  /**
   * Creates a range validation wrapper for weapon items
   * @param weapon The weapon to wrap
   * @returns Validated weapon with range validation methods
   */
  static createValidatedWeapon(weapon: Equipment): ValidatedWeaponItem {
    const validatedWeapon = weapon as ValidatedWeaponItem;
    
    validatedWeapon.validateRanges = function(): void {
      WeaponRangeValidator.validateWeaponRanges(this);
    };
    
    validatedWeapon.hasValidRanges = function(): boolean {
      try {
        this.validateRanges();
        return true;
      } catch {
        return false;
      }
    };
    
    return validatedWeapon;
  }
  
  /**
   * Quick validation check for a single weapon
   * @param weapon Weapon to validate
   * @returns true if weapon has valid ranges
   */
  static hasValidRanges(weapon: Equipment): boolean {
    try {
      WeaponRangeValidator.validateWeaponRanges(weapon);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get weapons that are missing range data
   * @returns Array of weapons with missing or invalid range data
   */
  static getWeaponsWithInvalidRanges(): Equipment[] {
    const weapons = ALL_EQUIPMENT_VARIANTS.filter(item => 
      WeaponRangeValidator.isWeaponEquipment(item)
    );
    
    return weapons.filter(weapon => !WeaponRangeValidator.hasValidRanges(weapon));
  }
}

/**
 * Initialize weapon range validation
 * Call this during application startup to ensure all weapons have valid range data
 * @throws Error if any weapons lack valid range data
 */
export function initializeWeaponRangeValidation(): void {
  try {
    WeaponRangeValidator.validateAllWeaponRanges();
  } catch (error) {
    // Re-throw with additional context
    throw new Error(`Weapon range validation failed during initialization: ${error instanceof Error ? error.message : String(error)}`);
  }
}
