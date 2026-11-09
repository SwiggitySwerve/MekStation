/**
 * Abstract Unit Type Handler
 *
 * Base class for unit type handlers that provides common logic for
 * parsing, validation, and conversion. Concrete handlers extend this
 * class to implement unit-type-specific behavior.
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md Phase 1.3.4
 */

import { IBlkDocument, BLK_UNIT_TYPE_MAP } from '@/types/formats/BlkFormat';
import { IBaseUnit } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import {
  IUnitParseResult,
  IUnitSerializeResult,
  IUnitValidateResult,
  UnitCategory,
  getUnitCategory,
} from '@/types/unit/UnitTypeHandler';
import { validateAerospaceSource } from '@/utils/construction/aerospace/sourceValidation';

import {
  UnitValidationMessages,
  createParseMessages,
  createValidationMessages,
  decodeBlkTechnologyHeader,
  type IBlkHeaderTechnology,
  UnsupportedBlkTechnologyError,
} from './unitHandlerShared';
// ============================================================================
// Abstract Base Handler
// ============================================================================

/**
 * Abstract base class for unit type handlers
 *
 * Provides common logic and template methods that concrete handlers
 * can override to implement unit-type-specific behavior.
 *
 * @template T The specific unit interface this handler works with
 */
export abstract class AbstractUnitTypeHandler<T extends IBaseUnit = IBaseUnit> {
  /** Unit type this handler supports */
  abstract readonly unitType: UnitType;

  /** Display name for this unit type */
  abstract readonly displayName: string;

  /** Alternate unit types this handler can handle (for subtypes) */
  protected readonly alternateUnitTypes: readonly UnitType[] = [];

  /**
   * Get the category for this unit type
   */
  get category(): UnitCategory {
    return getUnitCategory(this.unitType);
  }

  // ============================================================================
  // Template Methods (Override in Subclasses)
  // ============================================================================

  /**
   * Parse unit-type-specific fields from BLK document
   * @param document The BLK document
   * @returns Partial unit object with parsed fields
   */
  protected abstract parseTypeSpecificFields(
    document: IBlkDocument,
  ): Partial<T> & { errors: string[]; warnings: string[] };

  /**
   * Serialize unit-type-specific fields to serialization format
   * @param unit The unit to serialize
   * @returns Partial serialized object
   */
  protected abstract serializeTypeSpecificFields(
    unit: T,
  ): Partial<ISerializedUnit>;

  /**
   * Validate unit-type-specific rules
   * @param unit The unit to validate
   * @returns Validation errors and warnings
   */
  protected abstract validateTypeSpecificRules(unit: T): UnitValidationMessages;

  /**
   * Calculate unit-type-specific weight components
   * @param unit The unit
   * @returns Weight breakdown
   */
  protected abstract calculateTypeSpecificWeight(unit: T): number;

  /**
   * Calculate unit-type-specific BV components
   * @param unit The unit
   * @returns BV components
   */
  protected abstract calculateTypeSpecificBV(unit: T): number;

  /**
   * Calculate unit-type-specific cost components
   * @param unit The unit
   * @returns Cost in C-Bills
   */
  protected abstract calculateTypeSpecificCost(unit: T): number;

  // ============================================================================
  // Common Parsing Logic
  // ============================================================================

  /**
   * Parse a BLK document into the unit type's interface
   */
  readonly parse = (document: IBlkDocument): IUnitParseResult<T> => {
    const { errors, warnings } = createParseMessages();

    // Verify this handler can handle this document
    if (!this.canHandle(document)) {
      return {
        success: false,
        error: {
          errors: [
            `Handler ${this.displayName} cannot handle unit type ${document.unitType}`,
          ],
          warnings: [],
        },
      };
    }

    // Parse common fields
    let commonFields: ReturnType<typeof this.parseCommonFields>;
    try {
      commonFields = this.parseCommonFields(document);
    } catch (error) {
      if (!(error instanceof UnsupportedBlkTechnologyError)) throw error;
      return { success: false, error: { errors: [error.message], warnings } };
    }
    errors.push(...commonFields.errors);
    warnings.push(...commonFields.warnings);

    // Parse type-specific fields
    const typeSpecificFields = this.parseTypeSpecificFields(document);
    errors.push(...typeSpecificFields.errors);
    warnings.push(...typeSpecificFields.warnings);

    // If there are critical errors, return failure
    if (errors.length > 0) {
      return {
        success: false,
        error: { errors, warnings },
      };
    }

    // Combine into unit
    const constructionSource =
      this.category === UnitCategory.AEROSPACE &&
      Object.keys(document.rawTags).some((k) => k.toLowerCase() === 'tonnage')
        ? document
        : undefined;
    const unit = this.combineFields(commonFields, typeSpecificFields);
    if (constructionSource) {
      Object.assign(unit, { nativeAerospaceConstruction: constructionSource });
      const validity = this.validate(unit);
      Object.assign(unit, {
        isValid: validity.isValid,
        validationErrors: validity.errors,
      });
    }

    return {
      success: true,
      data: { unit, warnings },
    };
  };

  /**
   * Whether the BLK source carries a unit Tonnage tag that must be positive.
   * Types whose source has none override this to false.
   */
  protected readonly requiresUnitTonnage: boolean = true;

  /**
   * Parse common fields present in all unit types
   */
  protected parseCommonFields(document: IBlkDocument): {
    chassis: string;
    model: string;
    tonnage: number;
    techBase: string;
    technology: IBlkHeaderTechnology;
    era: string;
    year: number;
    source?: string;
    role?: string;
    errors: string[];
    warnings: string[];
  } {
    const { errors, warnings } = createParseMessages();

    // Required fields - IBlkDocument already has structured fields
    const chassis = document.name;
    if (!chassis) {
      errors.push('Missing required field: name/chassis');
    }

    const model = document.model || '';

    const tonnage = document.tonnage;
    if (this.requiresUnitTonnage && (!tonnage || tonnage <= 0)) {
      errors.push(`Invalid tonnage: ${tonnage}`);
    }

    // Tech base from type field (e.g., "IS Level 2", "Clan Level 3")
    const techBase = document.type || 'Inner Sphere';
    const technology = decodeBlkTechnologyHeader(techBase, this.unitType);

    // Year as era indicator
    const year = document.year || 3025;
    const era = this.yearToEra(year);

    // Optional fields
    const source = document.source;
    const role = document.role;

    return {
      chassis: chassis || '',
      model,
      tonnage,
      techBase,
      technology,
      era,
      year,
      source,
      role,
      errors,
      warnings,
    };
  }

  /**
   * Convert year to era string
   */
  protected yearToEra(year: number): string {
    if (year < 2781) return 'Age of War';
    if (year < 2901) return 'Star League';
    if (year < 3050) return 'Succession Wars';
    if (year < 3062) return 'Clan Invasion';
    if (year < 3068) return 'Civil War';
    if (year < 3081) return 'Jihad';
    if (year < 3151) return 'Dark Age';
    return 'ilClan';
  }

  /**
   * Combine common and type-specific fields into a unit object
   * Subclasses must implement this to create the correct unit type
   */
  protected abstract combineFields(
    commonFields: ReturnType<typeof this.parseCommonFields>,
    typeSpecificFields: Partial<T>,
  ): T;

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Serialize a unit to the standard serialization format
   */
  readonly serialize = (unit: T): IUnitSerializeResult => {
    try {
      const commonFields = this.serializeCommonFields(unit);
      const typeSpecificFields = this.serializeTypeSpecificFields(unit);

      const serialized: ISerializedUnit = {
        ...commonFields,
        ...typeSpecificFields,
      } as ISerializedUnit;

      return {
        success: true,
        data: { serialized },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          errors: [
            `Serialization failed: ${error instanceof Error ? error.message : String(error)}`,
          ],
        },
      };
    }
  };

  /**
   * Serialize common fields
   */
  protected serializeCommonFields(unit: T): Partial<ISerializedUnit> {
    return {
      id: unit.id,
      chassis: unit.metadata?.chassis || '',
      model: unit.metadata?.model || '',
      unitType: this.unitType,
      tonnage: unit.tonnage,
      techBase: String(unit.techBase),
      era: String(unit.era),
      year: unit.metadata?.year || 3025,
    };
  }

  /**
   * Deserialize from standard format to unit interface
   */
  abstract deserialize(serialized: ISerializedUnit): IUnitParseResult<T>;

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate a unit according to type-specific rules
   */
  readonly validate = (unit: T): IUnitValidateResult => {
    const { errors, warnings, infos } = createValidationMessages();

    // Common validation
    const commonResult = this.validateCommonRules(unit);
    errors.push(...commonResult.errors);
    warnings.push(...commonResult.warnings);
    infos.push(...commonResult.infos);

    // Type-specific validation
    const typeSpecificResult = this.validateTypeSpecificRules(unit);
    errors.push(...typeSpecificResult.errors);
    warnings.push(...typeSpecificResult.warnings);
    infos.push(...typeSpecificResult.infos);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      infos,
    };
  };

  /**
   * Common validation rules for all unit types
   */
  protected validateCommonRules(unit: T): UnitValidationMessages {
    const { errors, warnings, infos } = createValidationMessages();

    // Tonnage validation
    if (unit.nativeAerospaceConstruction)
      errors.push(...validateAerospaceSource(unit.nativeAerospaceConstruction));
    if (this.requiresUnitTonnage && unit.tonnage <= 0) {
      errors.push('Tonnage must be greater than 0');
    }

    // Check total weight doesn't exceed tonnage
    if (this.requiresUnitTonnage && unit.totalWeight > unit.tonnage) {
      errors.push(
        `Total weight (${unit.totalWeight.toFixed(2)}t) exceeds tonnage (${unit.tonnage}t)`,
      );
    }

    // Metadata validation
    if (!unit.metadata?.chassis) {
      errors.push('Chassis name is required');
    }

    return { errors, warnings, infos };
  }

  // ============================================================================
  // Calculations
  // ============================================================================

  /**
   * Calculate total weight for the unit
   */
  readonly calculateWeight = (unit: T): number => {
    return this.calculateTypeSpecificWeight(unit);
  };

  /**
   * Calculate Battle Value for the unit
   */
  readonly calculateBV = (unit: T): number => {
    return this.calculateTypeSpecificBV(unit);
  };

  /**
   * Calculate C-Bill cost for the unit
   */
  readonly calculateCost = (unit: T): number => {
    return this.calculateTypeSpecificCost(unit);
  };

  // ============================================================================
  // Location Support
  // ============================================================================

  /**
   * Get the locations available for this unit type
   * Subclasses must implement this
   */
  abstract getLocations(): readonly string[];

  // ============================================================================
  // Handler Identification
  // ============================================================================

  /**
   * Check if this handler can handle a given BLK document
   */
  readonly canHandle = (document: IBlkDocument): boolean => {
    // Check primary unit type
    if (document.mappedUnitType === this.unitType) {
      return true;
    }

    // Check alternate unit types
    if (this.alternateUnitTypes.includes(document.mappedUnitType)) {
      return true;
    }

    // Check raw unit type string against BLK type map
    const rawType = document.unitType?.toLowerCase();
    if (rawType) {
      const mappedType = BLK_UNIT_TYPE_MAP[rawType];
      if (
        mappedType === this.unitType ||
        this.alternateUnitTypes.includes(mappedType)
      ) {
        return true;
      }
    }

    return false;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a successful parse result
 */
export function createSuccessResult<T extends IBaseUnit>(
  unit: T,
  warnings: string[] = [],
): IUnitParseResult<T> {
  return {
    success: true,
    data: { unit, warnings },
  };
}

export function createFailureResult<T extends IBaseUnit>(
  errors: string[],
  warnings: string[] = [],
): IUnitParseResult<T> {
  return {
    success: false,
    error: { errors, warnings },
  };
}

/**
 * Parse a numeric field from BLK tags with default
 */
export function parseNumericField(
  tags: Record<string, string[]>,
  field: string,
  defaultValue: number = 0,
): number {
  const value = tags[field]?.[0];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse an integer field from BLK tags with default
 */
export function parseIntField(
  tags: Record<string, string[]>,
  field: string,
  defaultValue: number = 0,
): number {
  const value = tags[field]?.[0];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse a boolean field from BLK tags
 */
export function parseBooleanField(
  tags: Record<string, string[]>,
  field: string,
  defaultValue: boolean = false,
): boolean {
  const value = tags[field]?.[0];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Parse an array field from BLK tags
 */
export function parseArrayField(
  tags: Record<string, string[]>,
  field: string,
): readonly string[] {
  return tags[field] || [];
}
