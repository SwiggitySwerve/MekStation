/**
 * Parity Validation Types
 *
 * Types for MTF round-trip validation system.
 *
 * @spec openspec/specs/mtf-parity-validation/spec.md
 */

/**
 * Categories of discrepancies found during validation
 */
export enum DiscrepancyCategory {
  // Equipment issues
  UNKNOWN_EQUIPMENT = 'UNKNOWN_EQUIPMENT',
  EQUIPMENT_MISMATCH = 'EQUIPMENT_MISMATCH',

  // Actuator issues
  MISSING_ACTUATOR = 'MISSING_ACTUATOR',
  EXTRA_ACTUATOR = 'EXTRA_ACTUATOR',

  // Critical slot issues
  SLOT_MISMATCH = 'SLOT_MISMATCH',
  SLOT_COUNT_MISMATCH = 'SLOT_COUNT_MISMATCH',

  // Structural issues
  ARMOR_MISMATCH = 'ARMOR_MISMATCH',
  ENGINE_MISMATCH = 'ENGINE_MISMATCH',
  MOVEMENT_MISMATCH = 'MOVEMENT_MISMATCH',

  // Other
  HEADER_MISMATCH = 'HEADER_MISMATCH',
  QUIRK_MISMATCH = 'QUIRK_MISMATCH',
  FLUFF_MISMATCH = 'FLUFF_MISMATCH',
  PARSE_ERROR = 'PARSE_ERROR',
}

/**
 * A single discrepancy found during validation
 */
export interface IDiscrepancy {
  readonly category: DiscrepancyCategory;
  readonly location?: string;
  readonly index?: number;
  readonly field?: string;
  readonly expected: string;
  readonly actual: string;
  readonly suggestion: string;
}

/**
 * Validation result for a single unit
 */
export interface IUnitValidationResult {
  readonly id: string;
  readonly chassis: string;
  readonly model: string;
  readonly mtfPath: string;
  readonly generatedPath: string;
  readonly status: 'PASSED' | 'ISSUES_FOUND' | 'PARSE_ERROR';
  readonly issues: IDiscrepancy[];
  readonly parseErrors?: string[];
}

/**
 * Options for parity validation
 */
export interface IParityValidationOptions {
  readonly mmDataPath: string;
  readonly outputPath: string;
  readonly unitFilter?: (mtfPath: string) => boolean;
  readonly verbose?: boolean;
  readonly includeFluff?: boolean;
}

/**
 * Summary statistics for validation run
 */
export interface IValidationSummary {
  readonly generatedAt: string;
  readonly mmDataCommit?: string;
  readonly unitsValidated: number;
  readonly unitsPassed: number;
  readonly unitsWithIssues: number;
  readonly unitsWithParseErrors: number;
  readonly issuesByCategory: Record<DiscrepancyCategory, number>;
}

/**
 * Manifest entry for a validated unit
 */
export interface IManifestEntry {
  readonly id: string;
  readonly chassis: string;
  readonly model: string;
  readonly mtfPath: string;
  readonly status: 'PASSED' | 'ISSUES_FOUND' | 'PARSE_ERROR';
  readonly primaryIssueCategory?: DiscrepancyCategory;
  readonly issueCount: number;
}

/**
 * Full manifest file structure
 */
export interface IValidationManifest {
  readonly generatedAt: string;
  readonly mmDataCommit?: string;
  readonly summary: IValidationSummary;
  readonly units: IManifestEntry[];
}

/**
 * Per-unit issue report file structure
 */
export interface IUnitIssueReport {
  readonly id: string;
  readonly chassis: string;
  readonly model: string;
  readonly mtfPath: string;
  readonly generatedPath: string;
  readonly issues: IDiscrepancy[];
}
