/**
 * Simulation Runner Types
 * Type definitions for simulation execution.
 */

import { ISimulationResult } from '../core/types';
import { IViolation } from '../invariants/types';

/**
 * Extended simulation result with violations.
 */
export interface ISimulationRunResult extends ISimulationResult {
  /** Invariant violations detected during simulation */
  readonly violations: readonly IViolation[];
}

/**
 * Progress callback for batch runs.
 */
export type ProgressCallback = (current: number, total: number) => void;
