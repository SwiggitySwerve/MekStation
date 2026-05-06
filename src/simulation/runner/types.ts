/**
 * Simulation Runner Types
 * Type definitions for simulation execution.
 */

import type { IAnomaly } from '@/types/simulation-viewer/IAnomaly';
import type { IKeyMoment } from '@/types/simulation-viewer/IKeyMoment';

import type { MatchTerminalState } from './matchTerminalState';

import { ISimulationResult } from '../core/types';
import { IViolation } from '../invariants/types';

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
 * Single participant record capturing the unit and pilot identifiers plus
 * the resolved skill values used for a given simulation run. Stored on
 * ISimulationRunResult so downstream analysis can reconstruct which pilot/mech
 * combination produced a given outcome.
 *
 * @design D7 — participants payload; Phase 4 captures at force-construction time
 */
export interface IParticipant {
  /** Logical side ("player" | "opfor" | any custom label) */
  readonly sideId: string;
  /** Unit identifier from the catalog (IUnitIndexEntry.id) */
  readonly unitId: string;
  /** Chassis name for grouping (IUnitIndexEntry.chassis) */
  readonly chassisId: string;
  /** Pilot identifier — synthesized or vault pilot id */
  readonly pilotId: string;
  /** Resolved gunnery skill used for this run */
  readonly gunnery: number;
  /** Resolved piloting skill used for this run */
  readonly piloting: number;
  /** AI behavior variant key (e.g. "default", "aggressive") */
  readonly aiVariant: string;
}

/**
 * Extended simulation result with violations, key moments, and anomalies.
 *
 * Schema versioning (D7):
 *   schemaVersion 1 — legacy result, no participants field
 *   schemaVersion 2 — includes participants[] (Phase 4+ swarm harness)
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
  /**
   * Schema version for downstream consumers.
   * 1 = legacy (no participants); 2 = includes participants.
   * Omitted / undefined is treated as version 1 by consumers.
   */
  readonly schemaVersion?: 1 | 2;
  /**
   * Participant records for this run. Present when schemaVersion === 2.
   * Each entry describes one unit+pilot combination active during the battle.
   */
  readonly participants?: readonly IParticipant[];
  /**
   * Engine-layer match terminal state (closed snake_case enum). Authored
   * under `add-combat-fidelity-suite` Phase 0.5 ("Closed-set hygiene").
   * Distinct from the existing `winner: 'player' | 'opponent' | 'draw' | null`
   * field on `ISimulationResult` and from the ACAR statistical layer's
   * `'victory' | 'defeat' | 'draw'` taxonomy used in
   * `Scenario Resolution`. All three coexist; see `matchTerminalState.ts`
   * for the full taxonomy and conservation invariants.
   *
   * Optional during P0.5 to keep backward compat with existing
   * consumers; runner populations land alongside this type addition.
   * Follow-on PRs (P1+) MAY tighten this to required after the catalog
   * hydration wave.
   */
  readonly matchTerminalState?: MatchTerminalState;
}

/**
 * Progress callback for batch runs.
 */
export type ProgressCallback = (current: number, total: number) => void;
