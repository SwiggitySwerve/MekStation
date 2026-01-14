/**
 * Unit Validation Hook
 * 
 * Provides centralized validation for unit configurations.
 * Returns categorized validation issues that can be filtered by context.
 * 
 * @spec openspec/specs/construction-validation/spec.md
 */

import { useMemo } from 'react';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
// MechConfiguration will be used when configuration-specific validation is added

// =============================================================================
// Types
// =============================================================================

/**
 * Severity levels for validation issues
 */
export enum ValidationSeverity {
  ERROR = 'error',     // Prevents export/play - must be fixed
  WARNING = 'warning', // May cause issues - should be addressed
  INFO = 'info',       // Informational - optional improvements
}

/**
 * Categories of validation issues - used for filtering
 */
export enum ValidationCategory {
  ARMOR = 'armor',
  STRUCTURE = 'structure',
  ENGINE = 'engine',
  MOVEMENT = 'movement',
  HEAT = 'heat',
  EQUIPMENT = 'equipment',
  CRITICALS = 'criticals',
  WEIGHT = 'weight',
  IDENTITY = 'identity',
  CONFIGURATION = 'configuration',
}

/**
 * Context where validation is relevant
 */
export enum ValidationContext {
  PREVIEW = 'preview',     // Affects PDF/preview rendering
  EXPORT = 'export',       // Affects file export
  GAMEPLAY = 'gameplay',   // Affects gameplay validity
  GENERAL = 'general',     // Always relevant
}

/**
 * A single validation issue
 */
export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  contexts: ValidationContext[];
  message: string;
  details?: string;
  location?: MechLocation;
  fix?: string; // Suggested fix
}

/**
 * Validation result summary
 */
export interface ValidationResult {
  isValid: boolean;           // No errors
  hasWarnings: boolean;       // Has warnings
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate armor allocation
 */
function validateArmor(
  armorAllocation: Record<string, number>,
  configuration: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Calculate total armor
  const totalArmor = Object.values(armorAllocation).reduce((sum, val) => {
    if (typeof val === 'number') return sum + val;
    return sum;
  }, 0);

  if (totalArmor === 0) {
    issues.push({
      id: 'armor-none',
      severity: ValidationSeverity.WARNING,
      category: ValidationCategory.ARMOR,
      contexts: [ValidationContext.PREVIEW, ValidationContext.GAMEPLAY],
      message: 'No armor allocated',
      details: 'Armor pips will not be generated on the record sheet. The unit is extremely vulnerable.',
      fix: 'Allocate armor points in the Armor tab',
    });
  }

  // Check for head armor (critical for survival)
  const headArmor = armorAllocation[MechLocation.HEAD] ?? 0;
  if (headArmor === 0 && totalArmor > 0) {
    issues.push({
      id: 'armor-head-none',
      severity: ValidationSeverity.WARNING,
      category: ValidationCategory.ARMOR,
      contexts: [ValidationContext.GAMEPLAY],
      message: 'No head armor',
      details: 'Head hits will immediately damage internal structure. This is extremely dangerous.',
      fix: 'Allocate at least some armor to the head',
    });
  }

  // Check for quad-specific locations if quad
  if (configuration.toLowerCase().includes('quad')) {
    const quadLegs = [
      MechLocation.FRONT_LEFT_LEG,
      MechLocation.FRONT_RIGHT_LEG,
      MechLocation.REAR_LEFT_LEG,
      MechLocation.REAR_RIGHT_LEG,
    ];
    
    const hasQuadLegArmor = quadLegs.some(leg => (armorAllocation[leg] ?? 0) > 0);
    if (!hasQuadLegArmor && totalArmor > 0) {
      issues.push({
        id: 'armor-quad-legs-none',
        severity: ValidationSeverity.WARNING,
        category: ValidationCategory.ARMOR,
        contexts: [ValidationContext.PREVIEW, ValidationContext.GAMEPLAY],
        message: 'No quad leg armor allocated',
        details: 'Quad mech legs have no armor protection.',
        fix: 'Allocate armor to FLL, FRL, RLL, and RRL locations',
      });
    }
  }

  return issues;
}

/**
 * Validate engine configuration
 */
function validateEngine(
  engineType: string,
  engineRating: number,
  tonnage: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (engineRating <= 0) {
    issues.push({
      id: 'engine-rating-invalid',
      severity: ValidationSeverity.ERROR,
      category: ValidationCategory.ENGINE,
      contexts: [ValidationContext.PREVIEW, ValidationContext.EXPORT, ValidationContext.GAMEPLAY],
      message: 'Invalid engine rating',
      details: `Engine rating is ${engineRating}. Must be positive.`,
      fix: 'Set a valid engine rating in the Chassis tab',
    });
  }

  if (!engineType || engineType.trim() === '') {
    issues.push({
      id: 'engine-type-missing',
      severity: ValidationSeverity.ERROR,
      category: ValidationCategory.ENGINE,
      contexts: [ValidationContext.EXPORT, ValidationContext.GAMEPLAY],
      message: 'No engine type selected',
      fix: 'Select an engine type in the Chassis tab',
    });
  }

  // Check for walk MP calculation
  const walkMP = engineRating > 0 && tonnage > 0 ? Math.floor(engineRating / tonnage) : 0;
  if (walkMP === 0 && engineRating > 0) {
    issues.push({
      id: 'movement-walk-zero',
      severity: ValidationSeverity.WARNING,
      category: ValidationCategory.MOVEMENT,
      contexts: [ValidationContext.PREVIEW, ValidationContext.GAMEPLAY],
      message: 'Walk MP is 0',
      details: 'Engine rating is too low for the tonnage.',
      fix: 'Increase engine rating or reduce tonnage',
    });
  }

  return issues;
}

/**
 * Validate unit identity
 */
function validateIdentity(
  name: string,
  chassis: string,
  _model: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!name && !chassis) {
    issues.push({
      id: 'identity-name-missing',
      severity: ValidationSeverity.INFO,
      category: ValidationCategory.IDENTITY,
      contexts: [ValidationContext.PREVIEW, ValidationContext.EXPORT],
      message: 'No unit name or chassis specified',
      details: 'The record sheet will show "Unknown" for the unit name.',
      fix: 'Set a chassis name in the Chassis tab',
    });
  }

  return issues;
}

/**
 * Validate tonnage
 */
function validateTonnage(tonnage: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (tonnage <= 0) {
    issues.push({
      id: 'tonnage-invalid',
      severity: ValidationSeverity.ERROR,
      category: ValidationCategory.CONFIGURATION,
      contexts: [ValidationContext.PREVIEW, ValidationContext.EXPORT, ValidationContext.GAMEPLAY],
      message: 'Invalid tonnage',
      details: `Tonnage is ${tonnage}. Must be between 20 and 100 for standard mechs.`,
      fix: 'Set a valid tonnage in the Chassis tab',
    });
  }

  return issues;
}

/**
 * Validate heat sinks
 */
function validateHeatSinks(
  heatSinkCount: number,
  engineRating: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Calculate integrated heat sinks (for future use when checking external heat sinks)
  const _integratedHeatSinks = Math.floor(engineRating / 25);
  const minHeatSinks = 10;

  if (heatSinkCount < minHeatSinks) {
    issues.push({
      id: 'heatsinks-below-minimum',
      severity: ValidationSeverity.WARNING,
      category: ValidationCategory.HEAT,
      contexts: [ValidationContext.GAMEPLAY],
      message: `Heat sink count below minimum`,
      details: `Unit has ${heatSinkCount} heat sinks but requires at least ${minHeatSinks}.`,
      fix: `Add ${minHeatSinks - heatSinkCount} more heat sinks`,
    });
  }

  return issues;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to get unit validation results
 * 
 * @param contexts - Optional filter for specific contexts
 * @returns ValidationResult with all issues and summary counts
 */
export function useUnitValidation(
  contexts?: ValidationContext[]
): ValidationResult {
  // Get unit state from store
  const name = useUnitStore((s) => s.name);
  const chassis = useUnitStore((s) => s.chassis);
  const model = useUnitStore((s) => s.model);
  const tonnage = useUnitStore((s) => s.tonnage);
  const configuration = useUnitStore((s) => s.configuration);
  const engineType = useUnitStore((s) => s.engineType);
  const engineRating = useUnitStore((s) => s.engineRating);
  const armorAllocation = useUnitStore((s) => s.armorAllocation);
  const heatSinkCount = useUnitStore((s) => s.heatSinkCount);

  return useMemo(() => {
    // Collect all issues
    const allIssues: ValidationIssue[] = [
      ...validateArmor(armorAllocation, configuration),
      ...validateEngine(engineType, engineRating, tonnage),
      ...validateIdentity(name, chassis, model),
      ...validateTonnage(tonnage),
      ...validateHeatSinks(heatSinkCount, engineRating),
    ];

    // Filter by context if specified
    const filteredIssues = contexts
      ? allIssues.filter(issue => 
          issue.contexts.some(ctx => contexts.includes(ctx))
        )
      : allIssues;

    // Calculate counts
    const errorCount = filteredIssues.filter(i => i.severity === ValidationSeverity.ERROR).length;
    const warningCount = filteredIssues.filter(i => i.severity === ValidationSeverity.WARNING).length;
    const infoCount = filteredIssues.filter(i => i.severity === ValidationSeverity.INFO).length;

    return {
      isValid: errorCount === 0,
      hasWarnings: warningCount > 0,
      errorCount,
      warningCount,
      infoCount,
      issues: filteredIssues,
    };
  }, [
    name, chassis, model, tonnage, configuration,
    engineType, engineRating, armorAllocation, heatSinkCount,
    contexts,
  ]);
}

/**
 * Get validation issues for preview rendering context
 */
export function usePreviewValidation(): ValidationResult {
  return useUnitValidation([ValidationContext.PREVIEW]);
}

/**
 * Get validation issues for export context
 */
export function useExportValidation(): ValidationResult {
  return useUnitValidation([ValidationContext.EXPORT]);
}

/**
 * Get validation issues for gameplay context
 */
export function useGameplayValidation(): ValidationResult {
  return useUnitValidation([ValidationContext.GAMEPLAY]);
}
