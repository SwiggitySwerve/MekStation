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
// RESULT TYPES (re-exported from core)
// ============================================================================

export type { ResultType } from '../core/types/BaseTypes';
export { Result } from '../core/types/BaseTypes';

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

import { UnitType } from '@/types/unit/BattleMechInterfaces';
// Re-export canonical UnitType from BattleMechInterfaces
export { UnitType };

// Re-export unit index and query types from canonical location
export type { IUnitIndexEntry, IUnitQueryCriteria, ISearchOptions } from '@/types/unit/UnitIndex';

// ============================================================================
// EQUIPMENT TYPES
// ============================================================================

// Re-export equipment query and calculation types from canonical location
export type { IEquipmentQueryCriteria, IVariableEquipmentContext, ICalculatedEquipmentProperties } from '@/types/equipment/EquipmentQuery';

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

