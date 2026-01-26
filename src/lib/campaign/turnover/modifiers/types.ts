/**
 * Turnover modifier types
 *
 * @module campaign/turnover/modifiers
 */

/**
 * Result of a single turnover modifier calculation.
 *
 * Each modifier function returns a numeric value that is added to the
 * turnover target number. Positive values make it harder to retain
 * personnel, negative values make it easier.
 */
export interface TurnoverModifierResult {
  /** Unique identifier for this modifier (e.g., 'founder', 'age') */
  readonly modifierId: string;

  /** Human-readable name for display (e.g., 'Founder Bonus') */
  readonly displayName: string;

  /** Numeric modifier value (positive = harder to retain, negative = easier) */
  readonly value: number;

  /** Whether this modifier is a stub (not yet fully implemented) */
  readonly isStub: boolean;
}
