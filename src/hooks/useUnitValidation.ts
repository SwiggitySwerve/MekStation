/**
 * Unit Validation Hook
 *
 * Provides real-time validation results for the current unit in the customizer.
 * Connects the UnitValidationOrchestrator to the React UI layer.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo, useEffect, useRef, useState } from 'react';

import {
  initializeUnitValidationRules,
  areRulesInitialized,
} from '@/services/validation/initializeUnitValidation';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import {
  IValidatableUnit,
  IUnitValidationResult,
  UnitValidationSeverity,
  IUnitValidationOptions,
} from '@/types/validation/UnitValidationInterfaces';
import { ValidationStatus } from '@/utils/colors/statusColors';

import { useDebounce } from './useDebounce';
import { useArmorValidation } from './validation/useArmorValidation';
import { useEquipmentValidation } from './validation/useEquipmentValidation';
import { useStructureValidation } from './validation/useStructureValidation';
import { useUnitMetadata } from './validation/useUnitMetadata';
import { useWeightValidation } from './validation/useWeightValidation';

/**
 * Validation results formatted for UI consumption
 */
export interface UnitValidationState {
  /** Overall validation status for badge display */
  status: ValidationStatus;
  /** Number of critical and regular errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Number of info messages */
  infoCount: number;
  /** Whether the unit is fully valid (no errors) */
  isValid: boolean;
  /** Whether validation has critical errors (prevents save/export) */
  hasCriticalErrors: boolean;
  /** Full validation result for detailed display */
  result: IUnitValidationResult | null;
  /** Whether validation is still initializing */
  isLoading: boolean;
  /** Whether validation is pending (during debounce period) */
  isValidating: boolean;
}

/**
 * Default state when validation hasn't run yet
 */
const DEFAULT_STATE: UnitValidationState = {
  status: 'valid',
  errorCount: 0,
  warningCount: 0,
  infoCount: 0,
  isValid: true,
  hasCriticalErrors: false,
  result: null,
  isLoading: true,
  isValidating: false,
};

/**
 * Map IUnitValidationResult to ValidationStatus
 */
function mapToValidationStatus(
  result: IUnitValidationResult,
): ValidationStatus {
  if (result.hasCriticalErrors || result.errorCount > 0) {
    return 'error';
  }
  if (result.warningCount > 0) {
    return 'warning';
  }
  if (result.infoCount > 0) {
    return 'info';
  }
  return 'valid';
}

/**
 * Hook options
 */
export interface UseUnitValidationOptions extends IUnitValidationOptions {
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Disable validation (returns default state) */
  disabled?: boolean;
}

/**
 * Hook that provides real-time validation results for the current unit
 *
 * @param options - Validation options
 * @returns Validation state for UI display
 *
 * @example
 * ```tsx
 * const { status, errorCount, warningCount } = useUnitValidation();
 *
 * return (
 *   <ValidationBadge
 *     status={status}
 *     label={isValid ? 'Valid' : `${errorCount} errors, ${warningCount} warnings`}
 *   />
 * );
 * ```
 */
export function useUnitValidation(
  options?: UseUnitValidationOptions,
): UnitValidationState {
  const hasInitialized = useRef(false);
  const debounceMs = options?.debounceMs ?? 300;

  // Use focused sub-hooks for validation data
  const metadata = useUnitMetadata();
  const weightData = useWeightValidation();
  const armorData = useArmorValidation();
  const equipmentData = useEquipmentValidation();
  const structureData = useStructureValidation();

  // Initialize validation rules on first mount
  useEffect(() => {
    if (!hasInitialized.current && !areRulesInitialized()) {
      initializeUnitValidationRules();
      hasInitialized.current = true;
    }
  }, []);

  // Create a snapshot of all validation dependencies
  const validationSnapshot = useMemo(
    () => ({
      metadata,
      weightData,
      armorData,
      equipmentData,
      structureData,
      // Include validation options
      disabled: options?.disabled,
      campaignYear: options?.campaignYear,
      rulesLevelFilter: options?.rulesLevelFilter,
      skipRules: options?.skipRules,
      maxErrors: options?.maxErrors,
      categories: options?.categories,
      unitCategories: options?.unitCategories,
      strictMode: options?.strictMode,
      includeWarnings: options?.includeWarnings,
      includeInfos: options?.includeInfos,
    }),
    [
      metadata,
      weightData,
      armorData,
      equipmentData,
      structureData,
      options?.disabled,
      options?.campaignYear,
      options?.rulesLevelFilter,
      options?.skipRules,
      options?.maxErrors,
      options?.categories,
      options?.unitCategories,
      options?.strictMode,
      options?.includeWarnings,
      options?.includeInfos,
    ],
  );

  // Debounce the validation snapshot
  const debouncedSnapshot = useDebounce(validationSnapshot, debounceMs);

  // Track if validation is pending (during debounce period)
  const [isValidating, setIsValidating] = useState(false);

  // Detect when snapshot changes (user is making changes)
  useEffect(() => {
    setIsValidating(true);
  }, [validationSnapshot]);

  // Clear validating state when debounced snapshot updates
  useEffect(() => {
    setIsValidating(false);
  }, [debouncedSnapshot]);

  // Build validatable unit object and run validation (using debounced snapshot)
  const validationState = useMemo<UnitValidationState>(() => {
    // Return default state if disabled
    if (debouncedSnapshot.disabled) {
      return { ...DEFAULT_STATE, isValidating: false };
    }

    // Ensure rules are initialized
    if (!areRulesInitialized()) {
      initializeUnitValidationRules();
    }

    // Extract data from debounced snapshot
    const { metadata, weightData, armorData, equipmentData, structureData } =
      debouncedSnapshot;

    // Build validatable unit from sub-hook data
    const validatableUnit: IValidatableUnit = {
      id: metadata.id,
      name: metadata.name,
      unitType: metadata.unitType,
      techBase: metadata.techBase,
      rulesLevel: metadata.rulesLevel,
      era: metadata.era,
      introductionYear: metadata.year,
      extinctionYear: metadata.extinctionYear,
      weight: weightData.maxWeight,
      cost: metadata.cost,
      battleValue: metadata.battleValue,
      engineType: structureData.engineType,
      gyroType: structureData.gyroType,
      cockpitType: structureData.cockpitType,
      internalStructureType: structureData.internalStructureType,
      heatSinkCount: structureData.heatSinkCount,
      heatSinkType: structureData.heatSinkType,
      totalArmorPoints: armorData.totalArmorPoints,
      maxArmorPoints: armorData.maxArmorPoints,
      armorByLocation: armorData.armorByLocation,
      // Weight validation fields
      allocatedWeight: weightData.allocatedWeight,
      maxWeight: weightData.maxWeight,
      // Slot validation fields
      slotsByLocation: equipmentData.slotsByLocation,
    };

    try {
      // Run validation
      const result = validateUnit(validatableUnit, {
        campaignYear: debouncedSnapshot.campaignYear,
        rulesLevelFilter: debouncedSnapshot.rulesLevelFilter,
        skipRules: debouncedSnapshot.skipRules,
        maxErrors: debouncedSnapshot.maxErrors,
        categories: debouncedSnapshot.categories,
        unitCategories: debouncedSnapshot.unitCategories,
        strictMode: debouncedSnapshot.strictMode ?? true,
        includeWarnings: debouncedSnapshot.includeWarnings ?? true,
        includeInfos: debouncedSnapshot.includeInfos ?? true,
      });

      // Count critical errors separately
      let criticalCount = 0;
      let errorCount = 0;

      for (const ruleResult of result.results) {
        for (const error of ruleResult.errors) {
          if (error.severity === UnitValidationSeverity.CRITICAL_ERROR) {
            criticalCount++;
          } else {
            errorCount++;
          }
        }
      }

      return {
        status: mapToValidationStatus(result),
        errorCount: criticalCount + errorCount,
        warningCount: result.warningCount,
        infoCount: result.infoCount,
        isValid: result.isValid,
        hasCriticalErrors: result.hasCriticalErrors,
        result,
        isLoading: false,
        isValidating: false,
      };
    } catch (error) {
      console.warn('Validation failed:', error);
      return {
        status: 'error',
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        isValid: false,
        hasCriticalErrors: true,
        result: null,
        isLoading: false,
        isValidating: false,
      };
    }
  }, [debouncedSnapshot]);

  // Return validation state with current isValidating flag
  return {
    ...validationState,
    isValidating,
  };
}

/**
 * Get a simple validation summary string
 */
export function getValidationSummary(state: UnitValidationState): string {
  if (state.isLoading) {
    return 'Validating...';
  }
  if (state.isValidating) {
    return 'Validating...';
  }
  if (state.isValid) {
    return 'Valid';
  }
  const parts: string[] = [];
  if (state.errorCount > 0) {
    parts.push(`${state.errorCount} error${state.errorCount !== 1 ? 's' : ''}`);
  }
  if (state.warningCount > 0) {
    parts.push(
      `${state.warningCount} warning${state.warningCount !== 1 ? 's' : ''}`,
    );
  }
  return parts.join(', ') || 'Invalid';
}

// =============================================================================
// Backwards Compatibility Layer
// =============================================================================

/**
 * Severity levels for validation issues (backwards compatible)
 * @deprecated Use UnitValidationSeverity from UnitValidationInterfaces instead
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * A single validation issue (backwards compatible)
 */
export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  message: string;
  details?: string;
  fix?: string;
}

/**
 * Validation result with issues array (backwards compatible)
 */
export interface ValidationResult {
  isValid: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

/**
 * Map UnitValidationSeverity to ValidationSeverity
 */
function mapSeverity(severity: UnitValidationSeverity): ValidationSeverity {
  switch (severity) {
    case UnitValidationSeverity.CRITICAL_ERROR:
    case UnitValidationSeverity.ERROR:
      return ValidationSeverity.ERROR;
    case UnitValidationSeverity.WARNING:
      return ValidationSeverity.WARNING;
    case UnitValidationSeverity.INFO:
    default:
      return ValidationSeverity.INFO;
  }
}

/**
 * Convert UnitValidationState to backwards-compatible ValidationResult
 */
function toValidationResult(state: UnitValidationState): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (state.result) {
    for (const ruleResult of state.result.results) {
      for (const error of ruleResult.errors) {
        issues.push({
          id: error.ruleId,
          severity: mapSeverity(error.severity),
          message: error.message,
          details: error.details ? JSON.stringify(error.details) : undefined,
        });
      }
      for (const warning of ruleResult.warnings) {
        issues.push({
          id: warning.ruleId,
          severity: ValidationSeverity.WARNING,
          message: warning.message,
          details: warning.details
            ? JSON.stringify(warning.details)
            : undefined,
        });
      }
      for (const info of ruleResult.infos) {
        issues.push({
          id: info.ruleId,
          severity: ValidationSeverity.INFO,
          message: info.message,
          details: info.details ? JSON.stringify(info.details) : undefined,
        });
      }
    }
  }

  return {
    isValid: state.isValid,
    hasWarnings: state.warningCount > 0,
    errorCount: state.errorCount,
    warningCount: state.warningCount,
    infoCount: state.infoCount,
    issues,
  };
}

/**
 * Get validation issues for preview rendering context
 * @deprecated Use useUnitValidation() instead
 */
export function usePreviewValidation(): ValidationResult {
  const state = useUnitValidation();
  return useMemo(() => toValidationResult(state), [state]);
}

/**
 * Get validation issues for export context
 * @deprecated Use useUnitValidation() instead
 */
export function useExportValidation(): ValidationResult {
  const state = useUnitValidation();
  return useMemo(() => toValidationResult(state), [state]);
}

/**
 * Get validation issues for gameplay context
 * @deprecated Use useUnitValidation() instead
 */
export function useGameplayValidation(): ValidationResult {
  const state = useUnitValidation();
  return useMemo(() => toValidationResult(state), [state]);
}
