/**
 * Common Service Types
 * 
 * Shared types used across all service domains.
 * 
 * @spec openspec/specs/persistence-services/spec.md
 * @spec openspec/specs/unit-services/spec.md
 */

import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/enums/Era';
import { WeightClass } from '@/types/enums/WeightClass';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentCategory } from '@/types/equipment';

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a successful result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create a failed result
 */
export function failure<T, E = Error>(error: E): Result<T, E> {
  return { success: false, error };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Validation error/warning
 */
export interface IValidationError {
  readonly code: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
  readonly field?: string;
  readonly details?: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface IValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly IValidationError[];
  readonly warnings: readonly IValidationError[];
  readonly info: readonly IValidationError[];
}

/**
 * Create a valid result
 */
export function validResult(): IValidationResult {
  return { isValid: true, errors: [], warnings: [], info: [] };
}

/**
 * Create an invalid result with errors
 */
export function invalidResult(errors: IValidationError[]): IValidationResult {
  return {
    isValid: false,
    errors: errors.filter(e => e.severity === ValidationSeverity.ERROR),
    warnings: errors.filter(e => e.severity === ValidationSeverity.WARNING),
    info: errors.filter(e => e.severity === ValidationSeverity.INFO),
  };
}

// ============================================================================
// UNIT TYPES
// ============================================================================

/**
 * Unit type classification
 */
export type UnitType = 
  | 'BattleMech' 
  | 'Vehicle' 
  | 'Infantry' 
  | 'ProtoMech' 
  | 'BattleArmor' 
  | 'Aerospace'
  | 'ConvFighter'
  | 'Dropship'
  | 'Jumpship'
  | 'Warship'
  | 'SpaceStation'
  | 'SmallCraft';

/**
 * Lightweight unit metadata for search and browsing
 */
export interface IUnitIndexEntry {
  readonly id: string;
  readonly name: string;
  readonly chassis: string;
  readonly variant: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly era: Era;
  readonly weightClass: WeightClass;
  readonly unitType: UnitType;
  readonly filePath: string;
}

/**
 * Query criteria for filtering units
 */
export interface IUnitQueryCriteria {
  readonly techBase?: TechBase;
  readonly era?: Era;
  readonly weightClass?: WeightClass;
  readonly unitType?: UnitType;
  readonly minTonnage?: number;
  readonly maxTonnage?: number;
}

/**
 * Search options
 */
export interface ISearchOptions {
  readonly fuzzy?: boolean;
  readonly limit?: number;
  readonly fields?: readonly string[];
}

// ============================================================================
// EQUIPMENT TYPES
// ============================================================================

/**
 * Equipment filter criteria for combined queries
 */
export interface IEquipmentQueryCriteria {
  readonly category?: EquipmentCategory;
  readonly techBase?: TechBase;
  readonly year?: number;
  readonly nameQuery?: string;
  readonly rulesLevel?: RulesLevel;
  readonly maxWeight?: number;
  readonly maxSlots?: number;
}

/**
 * Context for variable equipment calculations
 */
export interface IVariableEquipmentContext {
  readonly tonnage?: number;
  readonly engineRating?: number;
  readonly engineWeight?: number;
  readonly directFireWeaponTonnage?: number;
  readonly techBase?: TechBase;
}

/**
 * Calculated equipment properties
 */
export interface ICalculatedEquipmentProperties {
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  /** Damage for physical weapons (optional) */
  readonly damage?: number;
}

// ============================================================================
// IMPORT/EXPORT TYPES
// ============================================================================

/**
 * Import result for a single file
 */
export interface IImportResult {
  readonly success: boolean;
  readonly filename: string;
  readonly unit?: unknown; // IFullUnit when successful
  readonly errors?: readonly string[];
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

/**
 * Paginated result wrapper
 */
export interface IPaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

