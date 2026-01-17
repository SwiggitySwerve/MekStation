/**
 * Unit Validation Hook
 *
 * Provides real-time validation results for the current unit in the customizer.
 * Connects the UnitValidationOrchestrator to the React UI layer.
 *
 * @spec openspec/specs/unit-validation-framework/spec.md
 */

import { useMemo, useEffect, useRef } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { getTotalAllocatedArmor, getTotalEquipmentWeight } from '@/stores/unitState';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { initializeUnitValidationRules, areRulesInitialized } from '@/services/validation/initializeUnitValidation';
import { getMaxTotalArmor } from '@/utils/construction/armorCalculations';
import {
  IValidatableUnit,
  IUnitValidationResult,
  UnitValidationSeverity,
  IUnitValidationOptions,
} from '@/types/validation/UnitValidationInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel, Era, getEraForYear } from '@/types/enums';
import { ValidationStatus } from '@/utils/colors/statusColors';
import { buildArmorByLocation } from '@/utils/validation/armorValidationUtils';
import { buildSlotsByLocation } from '@/utils/validation/slotValidationUtils';
import { calculateStructuralWeight } from '@/utils/validation/weightValidationUtils';

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
};

/**
 * Map IUnitValidationResult to ValidationStatus
 */
function mapToValidationStatus(result: IUnitValidationResult): ValidationStatus {
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
  /** Debounce delay in ms (default: 100) */
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
export function useUnitValidation(options?: UseUnitValidationOptions): UnitValidationState {
  const hasInitialized = useRef(false);

  // Get unit state from store
  const id = useUnitStore((s) => s.id);
  const name = useUnitStore((s) => s.name);
  const tonnage = useUnitStore((s) => s.tonnage);
  const techBase = useUnitStore((s) => s.techBase);
  const rulesLevel = useUnitStore((s) => s.rulesLevel);
  const year = useUnitStore((s) => s.year);
  const unitType = useUnitStore((s) => s.unitType);

  // Mech component fields
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const gyroType = useUnitStore((s) => s.gyroType);
  const cockpitType = useUnitStore((s) => s.cockpitType);
  const internalStructureType = useUnitStore((s) => s.internalStructureType);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);
  const heatSinkType = useUnitStore((s) => s.heatSinkType);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const armorTonnage = useUnitStore((s) => s.armorTonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const equipment = useUnitStore((s) => s.equipment);

  // Compute total armor points outside useMemo to ensure reactivity
  // This primitive value will definitely trigger re-renders when armor changes
  const totalArmorPointsComputed = getTotalAllocatedArmor(armorAllocation, configuration);

  // Derive era from year using the era utility function
  const era = year ? getEraForYear(year) : Era.DARK_AGE;

  // Optional fields that might exist on the store
  const extinctionYear = useUnitStore((s) => (s as { extinctionYear?: number }).extinctionYear);
  const cost = useUnitStore((s) => (s as { cost?: number }).cost) ?? 0;
  const battleValue = useUnitStore((s) => (s as { battleValue?: number }).battleValue) ?? 0;

  // Initialize validation rules on first mount
  useEffect(() => {
    if (!hasInitialized.current && !areRulesInitialized()) {
      initializeUnitValidationRules();
      hasInitialized.current = true;
    }
  }, []);

  // Build validatable unit object and run validation
  const validationState = useMemo<UnitValidationState>(() => {
    // Return default state if disabled
    if (options?.disabled) {
      return DEFAULT_STATE;
    }

    // Ensure rules are initialized
    if (!areRulesInitialized()) {
      initializeUnitValidationRules();
    }

    // Use the pre-computed total for reactivity (computed outside useMemo)
    const totalArmorPoints = totalArmorPointsComputed;
    const maxArmorPoints = getMaxTotalArmor(tonnage || 20, configuration);
    const effectiveTonnage = tonnage || 20;

    // Build per-location armor data for detailed validation
    // Handles all mech configurations: Biped, Quad, Tripod, LAM, QuadVee
    const armorByLocation = buildArmorByLocation(armorAllocation, effectiveTonnage, configuration);

    // Build per-location slot data for critical slot validation
    const slotsByLocation = buildSlotsByLocation(equipment, configuration);

    // Calculate total weight for weight overflow validation
    const structuralWeight = calculateStructuralWeight({
      tonnage: effectiveTonnage,
      engineType,
      engineRating,
      gyroType,
      internalStructureType,
      cockpitType,
      heatSinkType,
      heatSinkCount,
      armorTonnage,
    });
    const equipmentWeight = getTotalEquipmentWeight(equipment);
    const allocatedWeight = structuralWeight + equipmentWeight;

    // Build validatable unit from store state
    const validatableUnit: IValidatableUnit = {
      id: id || 'new-unit',
      name: name || 'Unnamed',
      unitType: (unitType as UnitType) || UnitType.BATTLEMECH,
      techBase: (techBase as TechBase) || TechBase.INNER_SPHERE,
      rulesLevel: (rulesLevel as RulesLevel) || RulesLevel.STANDARD,
      era: era || Era.DARK_AGE,
      introductionYear: year || 3025,
      extinctionYear,
      weight: tonnage || 0,
      cost,
      battleValue,
      engineType,
      gyroType,
      cockpitType,
      internalStructureType,
      heatSinkCount,
      heatSinkType,
      totalArmorPoints,
      maxArmorPoints,
      armorByLocation,
      // Weight validation fields
      allocatedWeight,
      maxWeight: effectiveTonnage,
      // Slot validation fields
      slotsByLocation,
    };

    try {
      // Run validation
      const result = validateUnit(validatableUnit, {
        campaignYear: options?.campaignYear,
        rulesLevelFilter: options?.rulesLevelFilter,
        skipRules: options?.skipRules,
        maxErrors: options?.maxErrors,
        categories: options?.categories,
        unitCategories: options?.unitCategories,
        strictMode: options?.strictMode ?? true,
        includeWarnings: options?.includeWarnings ?? true,
        includeInfos: options?.includeInfos ?? true,
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
      };
    }
  }, [
    id,
    name,
    tonnage,
    techBase,
    rulesLevel,
    year,
    era,
    extinctionYear,
    cost,
    battleValue,
    unitType,
    engineType,
    engineRating,
    gyroType,
    cockpitType,
    internalStructureType,
    heatSinkCount,
    heatSinkType,
    armorAllocation,
    armorTonnage,
    configuration,
    equipment,
    totalArmorPointsComputed,
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
  ]);

  return validationState;
}

/**
 * Get a simple validation summary string
 */
export function getValidationSummary(state: UnitValidationState): string {
  if (state.isLoading) {
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
    parts.push(`${state.warningCount} warning${state.warningCount !== 1 ? 's' : ''}`);
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
          details: warning.details ? JSON.stringify(warning.details) : undefined,
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
