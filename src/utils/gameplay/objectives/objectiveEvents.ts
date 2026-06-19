/**
 * Scenario objective lifecycle event builders + the per-turn control-
 * detection pass that emits them.
 *
 * @spec openspec/changes/add-scenario-objective-engine/specs/scenario-objectives/spec.md
 */

import type {
  IGameEvent,
  IGameState,
  IObjectiveCapturedPayload,
  IObjectiveLostPayload,
  IObjectiveProgressPayload,
} from '@/types/gameplay';
import type {
  IObjectiveMarker,
  ObjectiveSide,
} from '@/types/scenario/ScenarioInterfaces';

import { GameEventType, GamePhase } from '@/types/gameplay';
import { createEventBase } from '@/utils/gameplay/gameEvents/base';

import { advanceObjectiveControl } from './objectiveEngine';

interface IObjectiveLifecycleEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly objectiveId: string;
  readonly hexKey: string;
  readonly phase?: GamePhase;
}

export interface ICreateObjectiveCapturedEventInput extends IObjectiveLifecycleEventInput {
  readonly capturingSide: ObjectiveSide;
}

/**
 * Builds an `ObjectiveCaptured` event. Emitted when a marker's
 * `controlSide` changes to a concrete side.
 */
export function createObjectiveCapturedEvent(
  input: ICreateObjectiveCapturedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        objectiveId: string,
        hexKey: string,
        capturingSide: ObjectiveSide,
        phase?: GamePhase,
      ]
): IGameEvent {
  const [sequence, turn, objectiveId, hexKey, capturingSide, phase] =
    legacy as [
      number,
      number,
      string,
      string,
      ObjectiveSide,
      GamePhase | undefined,
    ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          objectiveId,
          hexKey,
          capturingSide,
          phase,
        };
  const payload: IObjectiveCapturedPayload = {
    objectiveId: eventInput.objectiveId,
    hexKey: eventInput.hexKey,
    capturingSide: eventInput.capturingSide,
    turn: eventInput.turn,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.ObjectiveCaptured,
      eventInput.turn,
      eventInput.phase ?? GamePhase.End,
    ),
    payload,
  };
}

export interface ICreateObjectiveLostEventInput extends IObjectiveLifecycleEventInput {
  readonly losingSide: ObjectiveSide;
}

/**
 * Builds an `ObjectiveLost` event. Emitted when a marker a side
 * controlled becomes contested / neutral / flips.
 */
export function createObjectiveLostEvent(
  input: ICreateObjectiveLostEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        objectiveId: string,
        hexKey: string,
        losingSide: ObjectiveSide,
        phase?: GamePhase,
      ]
): IGameEvent {
  const [sequence, turn, objectiveId, hexKey, losingSide, phase] = legacy as [
    number,
    number,
    string,
    string,
    ObjectiveSide,
    GamePhase | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          objectiveId,
          hexKey,
          losingSide,
          phase,
        };
  const payload: IObjectiveLostPayload = {
    objectiveId: eventInput.objectiveId,
    hexKey: eventInput.hexKey,
    losingSide: eventInput.losingSide,
    turn: eventInput.turn,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.ObjectiveLost,
      eventInput.turn,
      eventInput.phase ?? GamePhase.End,
    ),
    payload,
  };
}

/**
 * Builds an `ObjectiveProgress` event. Emitted when a marker's
 * `holdProgress` changes during the control-detection pass.
 */
export function createObjectiveProgressEvent(
  gameId: string,
  sequence: number,
  turn: number,
  marker: IObjectiveMarker,
  phase: GamePhase = GamePhase.End,
): IGameEvent {
  const payload: IObjectiveProgressPayload = {
    objectiveId: marker.id,
    hexKey: marker.hexKey,
    controlSide: marker.controlSide,
    holdProgress: marker.holdProgress,
    holdTurnsRequired: marker.holdTurnsRequired,
    turn,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.ObjectiveProgress,
      turn,
      phase,
    ),
    payload,
  };
}

/**
 * Result of running the once-per-turn objective control-detection
 * pass: the updated objective map plus the lifecycle events to append
 * to the game event log.
 */
export interface IObjectiveControlPassResult {
  /** Objective map after control + hold-progress advancement. */
  readonly objectives: Record<string, IObjectiveMarker>;
  /** Lifecycle events produced this pass, in deterministic order. */
  readonly events: readonly IGameEvent[];
}

/**
 * Runs the per-turn control-detection pass over every objective marker
 * in `state.objectives`. Markers are processed in `hexKey`-sorted order
 * so event emission is deterministic. Returns the new objective map and
 * the `ObjectiveCaptured` / `ObjectiveLost` / `ObjectiveProgress`
 * events to append. Events are sequenced starting at `startSequence`.
 *
 * Designed to be a pure function of `state` (unit positions) so
 * replaying the event log reconstructs objective state exactly
 * (design.md D7).
 *
 * @spec scenario-objectives — Objective Lifecycle Events
 */
export function runObjectiveControlPass(
  gameId: string,
  state: IGameState,
  startSequence: number,
  turn: number,
  phase: GamePhase = GamePhase.End,
): IObjectiveControlPassResult {
  const current = state.objectives ?? {};
  const keys = Object.keys(current).sort();
  if (keys.length === 0) {
    return { objectives: {}, events: [] };
  }

  const nextObjectives: Record<string, IObjectiveMarker> = {};
  const events: IGameEvent[] = [];
  let sequence = startSequence;

  for (const key of keys) {
    const change = advanceObjectiveControl(current[key], state);
    nextObjectives[key] = change.marker;

    if (change.lost) {
      const losing =
        change.previousControlSide !== 'neutral'
          ? change.previousControlSide
          : change.marker.controlSide;
      events.push(
        createObjectiveLostEvent(
          gameId,
          sequence++,
          turn,
          change.marker.id,
          change.marker.hexKey,
          losing,
          phase,
        ),
      );
    }

    if (change.captured) {
      events.push(
        createObjectiveCapturedEvent(
          gameId,
          sequence++,
          turn,
          change.marker.id,
          change.marker.hexKey,
          change.marker.controlSide,
          phase,
        ),
      );
    }

    if (change.progressChanged) {
      events.push(
        createObjectiveProgressEvent(
          gameId,
          sequence++,
          turn,
          change.marker,
          phase,
        ),
      );
    }
  }

  return { objectives: nextObjectives, events };
}
