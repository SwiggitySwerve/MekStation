/**
 * The first ReplayProjector over IGameSession (umbrella task 15.2 MATCH).
 *
 * Completeness is asserted over Object.values(GameEventType) only.
 * REPLAY_BASELINE_CANONICAL_EVENT_TYPES also names campaign types this
 * fold cannot apply, and REPLAY_SURFACE_REGISTRY parses combat payloads
 * rather than IGameEvent envelopes — using either here would reject a
 * legal match log or drop the envelope the history reader chains.
 *
 * Every decision applies foldMatchSession. appendEvent is never called:
 * it stamps updatedAt from the clock, which is not byte-stable across
 * two recoveries of the same log.
 */

import type { IBranchCheckpointPipeline } from '@/lib/events/checkpoints/BranchCheckpointCache';
import type { ICurrentReplayPayload } from '@/lib/events/replay/ReplaySchemaRegistry';
import type {
  IGameConfig,
  IGameEvent,
  IGameSession,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';

import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import {
  assertReplayProjectorCompleteness,
  ReplayProjector,
} from '@/lib/events/replay/ReplayProjectorRegistry';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import {
  GameEventType,
  GamePhase,
  GameStatus,
  isGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

export const MATCH_AUTHORITATIVE_PROJECTOR_ID = 'match.authoritative';
export const MATCH_AUTHORITATIVE_PROJECTOR_VERSION = 1;

const MATCH_EVENT_TYPES: readonly string[] = Object.values(GameEventType);

const SENTINEL_CONFIG: IGameConfig = Object.freeze({
  mapRadius: 0,
  turnLimit: 0,
  victoryConditions: [],
  optionalRules: [],
});

const SENTINEL_STATE: IGameState = Object.freeze({
  gameId: '',
  status: GameStatus.Setup,
  turn: 0,
  phase: GamePhase.Initiative,
  activationIndex: 0,
  units: {},
  turnEvents: Object.freeze([]),
});

/**
 * Fold a match tail onto an optional base.
 *
 * An empty tail returns the base: hydrateGameSessionFromEvents throws
 * on an empty list, and a checkpoint that already covers the head has
 * nothing left to apply.
 */
export function foldMatchSession(
  matchId: string,
  events: readonly IGameEvent[],
  base?: IGameSession,
): IGameSession {
  if (events.length === 0) {
    if (base === undefined) {
      throw new Error('Match log not found');
    }
    return base;
  }
  return canonicalSession(
    hydrateGameSessionFromEvents(
      matchId,
      base !== undefined ? [...base.events, ...events] : events,
    ),
  );
}

/**
 * The hydrated session carries optional fields set to `undefined`, and the
 * checkpoint digest is JCS, which refuses `undefined` outright rather than
 * dropping it. The cache stores the state as JSON and parses it back, so the
 * shape it can ever hand us is the JSON shape; normalizing through the same
 * round-trip here makes the live fold and the cached fold the same bytes.
 * Safe because the session is plain data: ISO strings, no Map, Set or Date.
 */
function canonicalSession(session: IGameSession): IGameSession {
  return JSON.parse(JSON.stringify(session)) as IGameSession;
}

function gameEventPayload(payload: unknown): IGameEvent {
  if (!isGameEvent(payload)) {
    throw new Error('Match projector payload is not an IGameEvent');
  }
  return payload;
}

function applyMatchEvent(
  matchId: string,
  state: IGameSession,
  event: ICurrentReplayPayload,
): IGameSession {
  return foldMatchSession(matchId, [gameEventPayload(event.payload)], state);
}

/** Identity registry: the payload is the whole IGameEvent envelope. */
export const MATCH_SESSION_SCHEMA_REGISTRY = new ReplaySchemaRegistry({
  events: MATCH_EVENT_TYPES.map((eventType) => ({
    eventType,
    targetSchemaVersion: 1,
    schemas: [
      {
        schemaVersion: 1,
        schemaId: `match.event.${eventType}.v1`,
        parse: (payload: unknown) => payload,
      },
    ],
    transitions: [],
  })),
});

export const MATCH_SESSION_PIPELINE_FINGERPRINT =
  MATCH_SESSION_SCHEMA_REGISTRY.fingerprintPipeline(
    MATCH_EVENT_TYPES.map((eventType) => ({ eventType, schemaVersion: 1 })),
  );

export function createMatchSessionProjector(
  matchId: string,
): ReplayProjector<IGameSession> {
  const projector = new ReplayProjector<IGameSession>({
    projectorId: MATCH_AUTHORITATIVE_PROJECTOR_ID,
    projectorVersion: MATCH_AUTHORITATIVE_PROJECTOR_VERSION,
    initialState: () =>
      Object.freeze({
        id: matchId,
        matchId,
        createdAt: '',
        updatedAt: '',
        config: SENTINEL_CONFIG,
        units: Object.freeze([]),
        events: Object.freeze([]),
        currentState: SENTINEL_STATE,
      }),
    decisions: MATCH_EVENT_TYPES.map((eventType) => ({
      eventType,
      decision: {
        kind: 'apply' as const,
        apply: (state: IGameSession, event: ICurrentReplayPayload) =>
          applyMatchEvent(matchId, state, event),
      },
    })),
  });
  assertReplayProjectorCompleteness(projector, MATCH_EVENT_TYPES);
  return projector;
}

/** Pipeline identity taken from a live projector instance. */
export function matchAuthoritativePipeline(
  matchId: string,
  projector: ReplayProjector<IGameSession>,
): IBranchCheckpointPipeline {
  return {
    stream: { streamType: 'match', streamId: matchId },
    branchId: ROOT_EVENT_BRANCH_ID,
    projectorId: projector.projectorId,
    projectorVersion: projector.projectorVersion,
    schemaPipelineFingerprint: MATCH_SESSION_PIPELINE_FINGERPRINT,
  };
}
