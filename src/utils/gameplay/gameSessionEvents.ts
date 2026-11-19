import type { IGameEvent, IGameSession } from '@/types/gameplay';

import { toCanonicalJson } from '@/utils/events/hashUtils';
import { logger } from '@/utils/logger';

import { deriveFoldedState, deriveState } from './gameState';
import {
  foldRevisionMatches,
  readFoldRevision,
} from './gameState/foldRevision';

export class GameEventIdCollisionError extends Error {
  constructor(eventId: string) {
    super(`Game event id ${eventId} already exists with different content`);
    this.name = 'GameEventIdCollisionError';
  }
}

export class GameEventSequenceError extends Error {
  constructor(sequence: number, lastSequence: number | undefined) {
    super(
      `Game event sequence ${sequence} must be a safe integer greater than ${lastSequence ?? 'the empty log'}`,
    );
    this.name = 'GameEventSequenceError';
  }
}

/**
 * The session's `currentState` is not the fold of its event log, so an
 * incremental append would carry a state no event produced (D-8).
 */
export class GameStateRevisionError extends Error {
  constructor(sessionId: string, stamp: string, log: string) {
    super(
      `Game session ${sessionId} currentState is not the fold of its event log ` +
        `(state folded from ${stamp}; session log is ${log}); refusing to append`,
    );
    this.name = 'GameStateRevisionError';
  }
}

/**
 * This module, with createGameSession and hydrateGameSessionFromEvents in
 * gameSessionCore.ts, owns event-log mutation. Every session they return
 * carries a `currentState` stamped (gameState/foldRevision.ts) as the fold of
 * that session's very `events` array.
 *
 * Owned: the stamp matches. A session respread with other fields
 * (`{ ...session, updatedAt }`) stays owned; one whose `events` or
 * `currentState` was replaced outside the owner, or that was rebuilt from
 * JSON or transport, is not.
 */
export function isOwnedGameSession(session: IGameSession): boolean {
  const revision = readFoldRevision(session.currentState);
  return (
    revision !== undefined && foldRevisionMatches(revision, session.events)
  );
}

/**
 * Set by the Jest setup only (src/__tests__/helpers/unownedAppendGuard.ts),
 * which fails the test unless its file is allow-listed. Never set in dev or
 * production builds. The second argument tells the measuring collector whether
 * the unowned state still equals the fold of its log; only it calls that.
 */
const UNOWNED_APPEND_HOOK = '__MEKSTATION_UNOWNED_APPEND__';

let warnedUnownedAppend = false;

function reportUnownedAppend(session: IGameSession): void {
  const hook = (globalThis as Record<string, unknown>)[UNOWNED_APPEND_HOOK];
  if (typeof hook === 'function') {
    hook(
      session,
      () =>
        toCanonicalJson(deriveState(session.id, session.events)) ===
        toCanonicalJson(session.currentState),
    );
    return;
  }
  if (warnedUnownedAppend) return;
  warnedUnownedAppend = true;
  logger.warn(
    `[game-session] appendEvent: session ${session.id} was not produced by the event-log owner; refolding its full event log`,
  );
}

/**
 * Identical redelivery is a no-op, including JSON-transported events with
 * reordered keys. Conflicting ids and non-increasing new sequences are
 * corruption, not retries. Gaps are allowed; only ordering is enforced here.
 * The new state is always the full fold of the extended log; a session the
 * owner did not produce is reported first (isOwnedGameSession).
 * @spec openspec/changes/fix-p2p-guest-reconnect-baseline/specs/multiplayer-sync/spec.md
 */
export function appendEvent(
  session: IGameSession,
  event: IGameEvent,
): IGameSession {
  const existing = session.events.find((held) => held.id === event.id);
  if (existing) {
    if (toCanonicalJson(existing) === toCanonicalJson(event)) return session;
    throw new GameEventIdCollisionError(event.id);
  }
  const lastSequence = session.events.at(-1)?.sequence;
  if (
    !Number.isSafeInteger(event.sequence) ||
    (lastSequence !== undefined && event.sequence <= lastSequence)
  ) {
    throw new GameEventSequenceError(event.sequence, lastSequence);
  }
  if (!isOwnedGameSession(session)) reportUnownedAppend(session);
  const events = [...session.events, event];
  const currentState = deriveFoldedState(session.id, events);

  return {
    ...session,
    events,
    currentState,
    updatedAt: new Date().toISOString(),
  };
}

/** Check a received tail before any live append or durable write can occur. */
export function assertGameEventBatchAdmissible(
  session: IGameSession,
  events: readonly IGameEvent[],
): void {
  events.reduce(appendEvent, session);
}
