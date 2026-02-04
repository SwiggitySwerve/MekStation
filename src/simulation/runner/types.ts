/**
 * Simulation Runner Types
 * Type definitions for simulation execution.
 */

import { ISimulationResult } from '../core/types';
import { IViolation } from '../invariants/types';
import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';
import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';

/**
 * Configuration for simulation anomaly/key-moment detectors.
 *
 * All thresholds are optional; detectors use built-in defaults when omitted.
 */
export interface IDetectorConfig {
  /** Heat threshold for heat-suicide detection (default: 30) */
  readonly heatSuicideThreshold?: number;
  /** Turns of inactivity before passive-unit detection (default: 5) */
  readonly passiveUnitTurns?: number;
  /** Turns without progress before no-progress detection (default: 5) */
  readonly noProgressTurns?: number;
  /** Turn count threshold for long-game detection (default: 50) */
  readonly longGameTurns?: number;
  /** Repetition count for state-cycle detection (default: 3) */
  readonly stateCycleLength?: number;
  /** Halt simulation when a critical-severity anomaly is detected */
  readonly haltOnCritical?: boolean;
}

/**
 * Extended simulation result with violations, key moments, and anomalies.
 */
export interface ISimulationRunResult extends ISimulationResult {
  /** Invariant violations detected during simulation */
  readonly violations: readonly IViolation[];
  /** Key battle moments detected by KeyMomentDetector */
  readonly keyMoments: readonly IKeyMoment[];
  /** Anomalies detected by anomaly detectors */
  readonly anomalies: readonly IAnomaly[];
  /** Whether simulation was halted due to a critical anomaly */
  readonly haltedByCriticalAnomaly: boolean;
}

/**
 * Progress callback for batch runs.
 */
export type ProgressCallback = (current: number, total: number) => void;
