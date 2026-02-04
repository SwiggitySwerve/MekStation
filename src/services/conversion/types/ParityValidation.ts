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
  UnknownEquipment = 'UNKNOWN_EQUIPMENT',
  EquipmentMismatch = 'EQUIPMENT_MISMATCH',

  // Actuator issues
  MissingActuator = 'MISSING_ACTUATOR',
  ExtraActuator = 'EXTRA_ACTUATOR',

  // Critical slot issues
  SlotMismatch = 'SLOT_MISMATCH',
  SlotCountMismatch = 'SLOT_COUNT_MISMATCH',

  // Structural issues
  ArmorMismatch = 'ARMOR_MISMATCH',
  EngineMismatch = 'ENGINE_MISMATCH',
  MovementMismatch = 'MOVEMENT_MISMATCH',

  // Other
  HeaderMismatch = 'HEADER_MISMATCH',
  QuirkMismatch = 'QUIRK_MISMATCH',
  FluffMismatch = 'FLUFF_MISMATCH',
  ParseError = 'PARSE_ERROR',
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
