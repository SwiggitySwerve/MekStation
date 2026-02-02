/**
 * Invariant Checker Types
 * Type definitions for game state invariant checking.
 */

import { IGameState } from '@/types/gameplay';

/**
 * Severity level for invariant violations.
 */
export type ViolationSeverity = 'critical' | 'warning';

/**
 * Violation of a game state invariant.
 */
export interface IViolation {
  /** Name of the invariant that was violated */
  readonly invariant: string;
  /** Severity of the violation */
  readonly severity: ViolationSeverity;
  /** Human-readable description of the violation */
  readonly message: string;
  /** Additional context for debugging */
  readonly context: {
    readonly [key: string]: unknown;
  };
}

/**
 * An invariant checker function.
 */
export interface IInvariant {
  /** Unique name for this invariant */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Severity level if violated */
  readonly severity: ViolationSeverity;
  /** Check function - must be pure (no side effects) */
  readonly check: (state: IGameState) => readonly IViolation[];
}
