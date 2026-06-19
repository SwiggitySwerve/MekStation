import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';
import type { IC3NetworkState } from '@/utils/gameplay/c3Network';

import {
  GameEventType,
  GamePhase,
  GameSide,
  IEncounterMeta,
  IGameConfig,
  IGameCreatedPayload,
  IGameEndedPayload,
  IGameEvent,
  IGameStartedPayload,
  IGameUnit,
  IHexTerrain,
  type IRepresentedGroundObjectState,
  type IRepresentedMinefieldState,
} from '@/types/gameplay';

import { createEventBase } from './base';

type GameCreatedEventArgs = [
  gameId: string,
  config: IGameConfig,
  units: readonly IGameUnit[],
  encounterMeta?: IEncounterMeta,
  objectives?: Record<string, IObjectiveMarker>,
  hexTerrain?: readonly IHexTerrain[],
  c3Network?: IC3NetworkState,
  groundObjects?: Record<string, IRepresentedGroundObjectState>,
  minefields?: Readonly<Record<string, IRepresentedMinefieldState>>,
];

export interface ICreateGameCreatedEventInput {
  readonly gameId: string;
  readonly config: IGameConfig;
  readonly units: readonly IGameUnit[];
  readonly encounterMeta?: IEncounterMeta;
  readonly objectives?: Record<string, IObjectiveMarker>;
  readonly hexTerrain?: readonly IHexTerrain[];
  readonly c3Network?: IC3NetworkState;
  readonly groundObjects?: Record<string, IRepresentedGroundObjectState>;
  readonly minefields?: Readonly<Record<string, IRepresentedMinefieldState>>;
}

/**
 * Per `link-encounters-to-replays` PR 3: optional `encounterMeta` is
 * stamped onto the GameCreated event payload when the session
 * originates from an encounter launch. Snapshot semantics — see
 * `IEncounterMeta` doc comment. Null/omitted for non-encounter
 * sessions (swarm runner, raw quick-game). Carried verbatim onto the
 * payload so the replay-library backfill scan can recover the
 * per-encounter fields without resolving any external references.
 *
 * Per `add-scenario-objective-engine`: optional `objectives` carries
 * the placed objective markers so `deriveState` can reconstruct the
 * objective map from the event log. Omitted for destruction-only
 * scenarios.
 *
 * Optional `hexTerrain` carries non-default starting map terrain so
 * replay projection and recovery can reconstruct initial elevation and
 * terrain without depending on a live engine grid.
 *
 * Optional `c3Network` carries producer-authored C3/C3i network formation
 * as an event-sourced seed. Combat consumers refresh member positions and
 * lifecycle state from live unit state before using it.
 *
 * Optional `minefields` carries explicit coordinate-authored represented
 * minefield state. Abstract/random scenario modifier data must be resolved
 * by a producer before it reaches this event payload.
 */
export function createGameCreatedEvent(
  ...args: [ICreateGameCreatedEventInput] | GameCreatedEventArgs
): IGameEvent {
  const input = normalizeGameCreatedEventInput(args);
  const payload: IGameCreatedPayload = {
    config: input.config,
    units: input.units,
    ...(input.encounterMeta !== undefined
      ? { encounterMeta: input.encounterMeta }
      : {}),
    ...(input.hexTerrain !== undefined && input.hexTerrain.length > 0
      ? { hexTerrain: input.hexTerrain }
      : {}),
    ...(input.objectives !== undefined &&
    Object.keys(input.objectives).length > 0
      ? { objectives: input.objectives }
      : {}),
    ...(input.c3Network !== undefined && input.c3Network.networks.length > 0
      ? { c3Network: input.c3Network }
      : {}),
    ...(input.groundObjects !== undefined &&
    Object.keys(input.groundObjects).length > 0
      ? { groundObjects: input.groundObjects }
      : {}),
    ...(input.minefields !== undefined &&
    Object.keys(input.minefields).length > 0
      ? { minefields: input.minefields }
      : {}),
  };
  return {
    ...createEventBase(
      input.gameId,
      0,
      GameEventType.GameCreated,
      0,
      GamePhase.Initiative,
    ),
    payload,
  };
}

function normalizeGameCreatedEventInput(
  args: [ICreateGameCreatedEventInput] | GameCreatedEventArgs,
): ICreateGameCreatedEventInput {
  if (typeof args[0] !== 'string') {
    return args[0];
  }

  const [
    gameId,
    config,
    units,
    encounterMeta,
    objectives,
    hexTerrain,
    c3Network,
    groundObjects,
    minefields,
  ] = args as GameCreatedEventArgs;

  return {
    gameId,
    config,
    units,
    ...(encounterMeta !== undefined ? { encounterMeta } : {}),
    ...(objectives !== undefined ? { objectives } : {}),
    ...(hexTerrain !== undefined ? { hexTerrain } : {}),
    ...(c3Network !== undefined ? { c3Network } : {}),
    ...(groundObjects !== undefined ? { groundObjects } : {}),
    ...(minefields !== undefined ? { minefields } : {}),
  };
}

export function createGameStartedEvent(
  gameId: string,
  sequence: number,
  firstSide: GameSide,
): IGameEvent {
  const payload: IGameStartedPayload = { firstSide };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.GameStarted,
      1,
      GamePhase.Initiative,
    ),
    payload,
  };
}

export function createGameEndedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  winner: GameSide | 'draw',
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective' | 'aborted',
): IGameEvent {
  // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
  // (game-event-system / piloting-skill-rolls deltas): backfill the final
  // turn count onto `IGameEndedPayload.turns` so summary consumers don't
  // have to re-derive it from the last `turn_started` event.
  const payload: IGameEndedPayload = { winner, reason, turns: turn };
  return {
    ...createEventBase(gameId, sequence, GameEventType.GameEnded, turn, phase),
    payload,
  };
}
