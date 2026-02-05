/**
 * Data Integrity Types
 *
 * Defines validation and integrity checking for unit data.
 *
 * @spec openspec/specs/data-integrity-validation/spec.md
 */

import type { ResultType } from '@/services/core/types/BaseTypes';

/**
 * Integrity check severity
 */
export enum IntegritySeverity {
  ERROR = 'Error',
  WARNING = 'Warning',
  INFO = 'Info',
}

/**
 * Integrity issue
 */
export interface IIntegrityIssue {
  readonly severity: IntegritySeverity;
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  readonly expected?: string;
  readonly actual?: string;
  readonly canAutoRepair: boolean;
}

/**
 * Integrity check result
 */
export interface IIntegrityCheckResult {
  readonly isValid: boolean;
  readonly issues: readonly IIntegrityIssue[];
  readonly errorCount: number;
  readonly warningCount: number;
  readonly checkedAt: string;
}

/**
 * Referential integrity check
 */
export interface IReferentialIntegrityCheck {
  checkEquipmentReferences(unitData: unknown): IIntegrityIssue[];
  checkAmmoReferences(unitData: unknown): IIntegrityIssue[];
  checkCriticalSlotReferences(unitData: unknown): IIntegrityIssue[];
}

/**
 * Data consistency check
 */
export interface IDataConsistencyCheck {
  checkWeightConsistency(unitData: unknown): IIntegrityIssue[];
  checkSlotConsistency(unitData: unknown): IIntegrityIssue[];
  checkArmorConsistency(unitData: unknown): IIntegrityIssue[];
  checkMovementConsistency(unitData: unknown): IIntegrityIssue[];
}

/**
 * Version compatibility check
 */
export interface IVersionCompatibilityCheck {
  isCompatible(formatVersion: string): boolean;
  getRequiredMigrations(fromVersion: string): string[];
  getBreakingChanges(fromVersion: string): string[];
}

/**
 * Data repair operation
 */
export interface IDataRepairOperation {
  readonly issueCode: string;
  readonly description: string;
  repair(data: unknown): unknown;
}

/**
 * Data repair result data (present on both success and failure)
 */
export interface IDataRepairData {
  readonly repairedData?: unknown;
  readonly appliedRepairs: readonly string[];
  readonly failedRepairs: readonly string[];
  readonly remainingIssues: readonly IIntegrityIssue[];
}

/**
 * Data repair result
 *
 * Uses ResultType discriminated union. Success means all errors were resolved;
 * failure means some issues remain. Both paths carry full repair data.
 */
export type IDataRepairResult = ResultType<IDataRepairData, IDataRepairData>;

export interface IDataIntegrityValidator {
  validate(data: unknown): IIntegrityCheckResult;
  repair(data: unknown, options?: IRepairOptions): IDataRepairResult;
  getAvailableRepairs(): IDataRepairOperation[];
}

/**
 * Repair options
 */
export interface IRepairOptions {
  readonly autoRepairAll?: boolean;
  readonly repairCodes?: string[];
  readonly dryRun?: boolean;
}

/**
 * Standard integrity issue codes
 */
export const IntegrityIssueCodes = {
  // Referential integrity
  EQUIPMENT_NOT_FOUND: 'REF001',
  AMMO_NOT_FOUND: 'REF002',
  INVALID_LOCATION: 'REF003',
  INVALID_SLOT_INDEX: 'REF004',

  // Data consistency
  WEIGHT_MISMATCH: 'CON001',
  SLOT_OVERFLOW: 'CON002',
  ARMOR_EXCEEDS_MAX: 'CON003',
  MOVEMENT_MISMATCH: 'CON004',
  HEAT_SINK_MISMATCH: 'CON005',

  // Format issues
  MISSING_REQUIRED_FIELD: 'FMT001',
  INVALID_FIELD_TYPE: 'FMT002',
  UNKNOWN_ENUM_VALUE: 'FMT003',
  DEPRECATED_FORMAT: 'FMT004',

  // Version compatibility
  UNSUPPORTED_VERSION: 'VER001',
  MIGRATION_REQUIRED: 'VER002',
  BREAKING_CHANGE: 'VER003',
} as const;
