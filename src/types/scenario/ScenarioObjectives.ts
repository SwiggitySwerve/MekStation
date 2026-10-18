/**
 * Scenario Generation Interfaces
 * Type definitions for scenario templates, OpFor generation, and battle modifiers.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */
import type { GameSide } from '@/types/gameplay/GameSessionCoreTypes';

import { ScenarioObjectiveType } from './ScenarioEnums';

// =============================================================================
// Type Guards
// =============================================================================

// =============================================================================
// Scenario Objective Engine
// =============================================================================

/**
 * Canonical hex-coordinate key — the `"q,r"` string produced by
 * `coordToKey`. Used as the map key for the objective-marker map carried
 * on the game session.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */
export type HexKey = string;

/**
 * Side that can control an objective hex. `'neutral'` is the
 * uncontrolled state — every generated marker starts neutral
 * (design.md Open Question: generated scenarios start all markers
 * neutral; campaign scenarios may pre-assign in a later change).
 */
export type ObjectiveSide = 'player' | 'opponent' | 'neutral';

/**
 * Control rule used to decide which side holds an objective hex.
 * Only `'sole-occupancy'` is supported today (design.md D3): a side
 * controls a hex when it has >=1 unit on it and the opposing side has 0.
 */
export type ObjectiveControlRule = 'sole-occupancy';

/**
 * Hex-based objective types covered by this engine. `escort` / `recon`
 * are explicitly out of scope (proposal Non-Goals) and `destroy` is the
 * markerless default — neither appears here because neither produces an
 * `IObjectiveMarker`.
 */
export type ObjectiveMarkerType = 'capture' | 'defend' | 'breakthrough';

/**
 * A single scenario objective bound to one hex. Markers live on the
 * game session in an `objectives: Record<HexKey, IObjectiveMarker>`
 * map (design.md D1) — `IHex` is never modified.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */
export interface IObjectiveMarker {
  /** Stable unique id (e.g. `objective-1`). */
  readonly id: string;
  /** Canonical `"q,r"` key of the hex this marker sits on. */
  readonly hexKey: HexKey;
  /** Which hex-objective family this marker belongs to. */
  readonly objectiveType: ObjectiveMarkerType;
  /** Initial controller at generation time (always `neutral` today). */
  readonly owningSide: ObjectiveSide;
  /** Current controller — mutated by the control-detection pass. */
  readonly controlSide: ObjectiveSide;
  /** Control rule applied when detecting `controlSide`. */
  readonly controlRule: ObjectiveControlRule;
  /**
   * Consecutive turns of sole control required to win a Capture
   * scenario. Ignored for `defend` / `breakthrough` markers.
   */
  readonly holdTurnsRequired: number;
  /**
   * Consecutive turns the current `controlSide` has held the hex.
   * Resets to 0 whenever control is lost or contested.
   */
  readonly holdProgress: number;
}

/**
 * Decided outcome returned by `evaluateObjectiveOutcome`. `null` (not
 * this interface) is returned while a scenario is still undecided.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */
export interface IObjectiveOutcome {
  /** Always `true` — the presence of this object means "decided". */
  readonly decided: true;
  /** Side that won the scenario. */
  readonly winningSide: GameSide;
  /** Always `'objective'` — distinguishes from the destruction path. */
  readonly reason: 'objective';
  /** Objective type that produced the win. */
  readonly objectiveType: ScenarioObjectiveType;
}

/**
 * Generation-time objective configuration derived from the scenario's
 * `IVictoryCondition` (task 1.3). Drives `ScenarioGenerator` placement.
 */
export interface IObjectivePlacementConfig {
  /** Objective family to place. */
  readonly objectiveType: ObjectiveMarkerType;
  /** Number of objective hexes to place. */
  readonly hexCount: number;
  /** Consecutive hold turns for a Capture win (1 when not Capture). */
  readonly holdTurnsRequired: number;
  /** Attacker units that must exit for a Breakthrough win. */
  readonly requiredUnits: number;
}

/**
 * Type guard for `IObjectiveMarker`.
 */
export function isObjectiveMarker(obj: unknown): obj is IObjectiveMarker {
  if (typeof obj !== 'object' || obj === null) return false;
  const marker = obj as IObjectiveMarker;
  return (
    typeof marker.id === 'string' &&
    typeof marker.hexKey === 'string' &&
    (marker.objectiveType === 'capture' ||
      marker.objectiveType === 'defend' ||
      marker.objectiveType === 'breakthrough') &&
    typeof marker.controlSide === 'string' &&
    typeof marker.holdTurnsRequired === 'number' &&
    typeof marker.holdProgress === 'number'
  );
}
