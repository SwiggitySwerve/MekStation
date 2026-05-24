import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

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
} from '@/types/gameplay';

import { createEventBase } from './base';

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
 */
export function createGameCreatedEvent(
  gameId: string,
  config: IGameConfig,
  units: readonly IGameUnit[],
  encounterMeta?: IEncounterMeta,
  objectives?: Record<string, IObjectiveMarker>,
  hexTerrain?: readonly IHexTerrain[],
): IGameEvent {
  const payload: IGameCreatedPayload = {
    config,
    units,
    ...(encounterMeta !== undefined ? { encounterMeta } : {}),
    ...(hexTerrain !== undefined && hexTerrain.length > 0
      ? { hexTerrain }
      : {}),
    ...(objectives !== undefined && Object.keys(objectives).length > 0
      ? { objectives }
      : {}),
  };
  return {
    ...createEventBase(
      gameId,
      0,
      GameEventType.GameCreated,
      0,
      GamePhase.Initiative,
    ),
    payload,
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
