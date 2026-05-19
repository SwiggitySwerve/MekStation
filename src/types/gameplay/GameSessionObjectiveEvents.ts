/**
 * Scenario objective lifecycle event payloads.
 *
 * Per `add-scenario-objective-engine` (design.md D7): the control-
 * detection pass emits `ObjectiveCaptured` / `ObjectiveLost` /
 * `ObjectiveProgress` as deterministic functions of unit positions, so
 * replaying the event log reconstructs objective state exactly.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type { ObjectiveSide } from '@/types/scenario/ScenarioInterfaces';

/**
 * `ObjectiveCaptured` payload — a marker's `controlSide` changed to a
 * concrete side this turn.
 */
export interface IObjectiveCapturedPayload {
  /** Stable marker id (`objective-1`, …). */
  readonly objectiveId: string;
  /** Canonical `"q,r"` hex key of the captured objective. */
  readonly hexKey: string;
  /** Side that took control. */
  readonly capturingSide: ObjectiveSide;
  /** Turn on which the capture was detected. */
  readonly turn: number;
}

/**
 * `ObjectiveLost` payload — a marker a side controlled became
 * contested / neutral / flipped, resetting its hold progress.
 */
export interface IObjectiveLostPayload {
  /** Stable marker id. */
  readonly objectiveId: string;
  /** Canonical `"q,r"` hex key of the objective. */
  readonly hexKey: string;
  /** Side that lost the accrued hold. */
  readonly losingSide: ObjectiveSide;
  /** Turn on which the loss was detected. */
  readonly turn: number;
}

/**
 * `ObjectiveProgress` payload — a marker's `holdProgress` changed
 * during the control-detection pass.
 */
export interface IObjectiveProgressPayload {
  /** Stable marker id. */
  readonly objectiveId: string;
  /** Canonical `"q,r"` hex key of the objective. */
  readonly hexKey: string;
  /** Side currently holding the marker (`neutral` when uncontrolled). */
  readonly controlSide: ObjectiveSide;
  /** Consecutive turns held after this pass. */
  readonly holdProgress: number;
  /** Consecutive turns required for a Capture win. */
  readonly holdTurnsRequired: number;
  /** Turn on which the progress changed. */
  readonly turn: number;
}
