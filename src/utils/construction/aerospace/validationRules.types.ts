/**
 * Shared types for aerospace validation rules — leaf module to break the
 * 3-way circular dependency between validationRules.ts, bombBays.ts, and
 * wingHeavyWeapons.ts.
 *
 * @spec openspec/changes/add-aerospace-construction/specs/aerospace-unit-system/spec.md
 */

/** A single construction validation failure. */
export interface AerospaceValidationError {
  /** Stable rule identifier, e.g. "VAL-AERO-TONNAGE" */
  readonly ruleId: string;
  /** Human-readable description of the violation */
  readonly message: string;
}
