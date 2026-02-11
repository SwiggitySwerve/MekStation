/**
 * Unit Name Validator Service
 *
 * Validates unit names (Chassis + Variant) against canonical and custom units
 * to ensure uniqueness and prevent overwriting official units.
 *
 * CRITICAL: Canonical units are NEVER overwritable. If a name matches a canonical
 * unit, the save is BLOCKED and the user must choose a different name.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import { logger } from '@/utils/logger';

import { IUnitIndexEntry } from '../common/types';
import { canonicalUnitService } from './CanonicalUnitService';
import { customUnitService } from './CustomUnitService';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of name validation
 */
export interface INameValidationResult {
  /** Whether the name is valid and can be saved */
  isValid: boolean;
  /** Conflicts with a read-only canonical unit - BLOCKED */
  isCanonicalConflict: boolean;
  /** Conflicts with an existing custom unit - can prompt to overwrite */
  isCustomConflict: boolean;
  /** ID of the conflicting custom unit (for overwrite) */
  conflictingUnitId?: string;
  /** Auto-suggested unique name if there's a conflict */
  suggestedName?: string;
  /** Human-readable error message */
  errorMessage?: string;
}

/**
 * Name components for a unit
 */
export interface IUnitNameComponents {
  chassis: string;
  variant: string;
}

// =============================================================================
// Service Interface
// =============================================================================

export interface IUnitNameValidator {
  /**
   * Validate a unit name against all existing units
   * @param chassis - The chassis name (e.g., "Atlas")
   * @param variant - The variant designation (e.g., "AS7-D")
   * @param excludeUnitId - Optional unit ID to exclude from conflict check (for updates)
   */
  validateUnitName(
    chassis: string,
    variant: string,
    excludeUnitId?: string,
  ): Promise<INameValidationResult>;

  /**
   * Generate a unique name by appending a suffix
   * @param chassis - Base chassis name
   * @param variant - Base variant
   * @returns A unique variant name
   */
  generateUniqueName(
    chassis: string,
    variant: string,
  ): Promise<IUnitNameComponents>;

  /**
   * Normalize a name for case-insensitive comparison
   */
  normalizeForComparison(name: string): string;

  /**
   * Build the full display name from components
   */
  buildFullName(chassis: string, variant: string): string;
}

// =============================================================================
// Implementation
// =============================================================================

class UnitNameValidatorService implements IUnitNameValidator {
  /**
   * Normalize a name for comparison
   * - Trim whitespace
   * - Convert to lowercase
   * - Normalize multiple spaces to single space
   */
  normalizeForComparison(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Build full unit name from chassis and variant
   */
  buildFullName(chassis: string, variant: string): string {
    const trimmedChassis = chassis.trim();
    const trimmedVariant = variant.trim();

    if (!trimmedVariant) {
      return trimmedChassis;
    }

    return `${trimmedChassis} ${trimmedVariant}`;
  }

  /**
   * Validate unit name against canonical and custom units
   *
   * CRITICAL: Canonical conflicts are ALWAYS blocked.
   */
  async validateUnitName(
    chassis: string,
    variant: string,
    excludeUnitId?: string,
  ): Promise<INameValidationResult> {
    const trimmedChassis = chassis.trim();
    const trimmedVariant = variant.trim();

    // Basic validation
    if (!trimmedChassis) {
      return {
        isValid: false,
        isCanonicalConflict: false,
        isCustomConflict: false,
        errorMessage: 'Chassis name is required',
      };
    }

    if (!trimmedVariant) {
      return {
        isValid: false,
        isCanonicalConflict: false,
        isCustomConflict: false,
        errorMessage: 'Variant designation is required',
      };
    }

    const fullName = this.buildFullName(trimmedChassis, trimmedVariant);
    const normalizedName = this.normalizeForComparison(fullName);

    // Check canonical units first - these are BLOCKED
    const canonicalConflict = await this.checkCanonicalConflict(
      trimmedChassis,
      trimmedVariant,
      normalizedName,
    );

    if (canonicalConflict) {
      const suggested = await this.generateUniqueName(
        trimmedChassis,
        trimmedVariant,
      );
      return {
        isValid: false,
        isCanonicalConflict: true,
        isCustomConflict: false,
        suggestedName: this.buildFullName(suggested.chassis, suggested.variant),
        errorMessage: `"${fullName}" is an official BattleTech unit and cannot be overwritten. Please choose a different name.`,
      };
    }

    // Check custom units - these can be overwritten with user confirmation
    const customConflict = await this.checkCustomConflict(
      trimmedChassis,
      trimmedVariant,
      normalizedName,
      excludeUnitId,
    );

    if (customConflict) {
      return {
        isValid: true, // Valid but needs confirmation
        isCanonicalConflict: false,
        isCustomConflict: true,
        conflictingUnitId: customConflict.id,
        errorMessage: `A custom unit named "${fullName}" already exists. You can overwrite it or choose a different name.`,
      };
    }

    // Name is unique and valid
    return {
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    };
  }

  /**
   * Check for conflict with canonical units
   * Returns true if there's a conflict (name is BLOCKED)
   */
  private async checkCanonicalConflict(
    chassis: string,
    variant: string,
    normalizedFullName: string,
  ): Promise<boolean> {
    try {
      const canonicalIndex = await canonicalUnitService.getIndex();

      // Check for exact name match (case-insensitive)
      const conflict = canonicalIndex.find((entry) => {
        const entryFullName = this.buildFullName(entry.chassis, entry.variant);
        const normalizedEntry = this.normalizeForComparison(entryFullName);
        return normalizedEntry === normalizedFullName;
      });

      return !!conflict;
    } catch (error) {
      logger.warn('Failed to check canonical units:', error);
      // If we can't check, assume no conflict to not block saves
      return false;
    }
  }

  /**
   * Check for conflict with custom units
   * Returns the conflicting unit entry if found
   */
  private async checkCustomConflict(
    chassis: string,
    variant: string,
    normalizedFullName: string,
    excludeUnitId?: string,
  ): Promise<IUnitIndexEntry | null> {
    try {
      const customUnits = await customUnitService.list();

      const conflict = customUnits.find((entry) => {
        // Skip the unit we're updating
        if (excludeUnitId && entry.id === excludeUnitId) {
          return false;
        }

        const entryFullName = this.buildFullName(entry.chassis, entry.variant);
        const normalizedEntry = this.normalizeForComparison(entryFullName);
        return normalizedEntry === normalizedFullName;
      });

      return conflict || null;
    } catch (error) {
      logger.warn('Failed to check custom units:', error);
      return null;
    }
  }

  /**
   * Generate a unique name by appending a suffix
   * Tries (2), (3), etc. until a unique name is found
   */
  async generateUniqueName(
    chassis: string,
    variant: string,
  ): Promise<IUnitNameComponents> {
    let suffix = 2;
    let newVariant = `${variant} (${suffix})`;

    // Keep incrementing until we find a unique name
    while (suffix < 100) {
      // Safety limit
      const result = await this.validateUnitName(chassis, newVariant);

      if (
        result.isValid &&
        !result.isCanonicalConflict &&
        !result.isCustomConflict
      ) {
        return { chassis, variant: newVariant };
      }

      suffix++;
      newVariant = `${variant} (${suffix})`;
    }

    // Fallback: use timestamp
    const timestamp = Date.now().toString(36);
    return { chassis, variant: `${variant}-${timestamp}` };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const unitNameValidator = new UnitNameValidatorService();
