import type { IGameEvent, IGameSession, IGameState } from '@/types/gameplay';

import { toCanonicalJson } from '@/utils/events/hashUtils';

import { applyEvent, deriveState } from './gameState';
import {
  describeEventLog,
  describeFoldRevision,
  foldRevisionMatches,
  NOT_FOLDED,
  readFoldRevision,
  stampFoldRevision,
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
 * Event id -> position, shared by an events array and every array that
 * appendEvent extends from it. Entries are never removed, so an id the map
 * lacks is in none of those arrays. A position goes stale only when two
 * appends branch from one array, so a hit is confirmed against the array and
 * a stale hit falls back to a scan.
 */
const eventIdPositions = new WeakMap<
  readonly IGameEvent[],
  Map<string, number>
>();

function idPositionsFor(events: readonly IGameEvent[]): Map<string, number> {
  let positions = eventIdPositions.get(events);
  if (positions === undefined) {
    const built = new Map<string, number>();
    events.forEach((event, position) => {
      if (!built.has(event.id)) built.set(event.id, position);
    });
    eventIdPositions.set(events, built);
    positions = built;
  }
  return positions;
}

function findHeldEvent(
  events: readonly IGameEvent[],
  eventId: string,
): IGameEvent | undefined {
  const position = idPositionsFor(events).get(eventId);
  if (position === undefined) return undefined;
  const held = events[position];
  if (held?.id === eventId) return held;
  return events.find((candidate) => candidate.id === eventId);
}

/**
 * The fold of `session.events`, which the next event is applied to.
 *
 * - Stamped by the fold: it must have been folded from this very events
 *   array (see foldRevision.ts), or the append is refused with
 *   GameStateRevisionError. A rewrite of any event, not only the last,
 *   makes a new array and so is refused.
 * - Marked as set outside the fold (applyCorrectedState): refused.
 * - Unstamped: refolded from the log, exactly as before P1. This is a
 *   deliberate compatibility path for states rebuilt from JSON or transport,
 *   or built by hand, and costs one full fold on the first append after such
 *   a load; the result is stamped, so later appends are incremental again.
 */
function foldedStateOf(session: IGameSession): IGameState {
  const revision = readFoldRevision(session.currentState);
  if (revision === undefined) return deriveState(session.id, session.events);
  if (foldRevisionMatches(revision, session.events)) {
    return session.currentState;
  }
  throw new GameStateRevisionError(
    session.id,
    describeFoldRevision(revision),
    describeEventLog(session.events),
  );
}

/**
 * A session whose log was replaced under a folded state (a truncated or
 * rewritten history) gets an unstamped copy of that state, so its next append
 * refolds from the new log exactly as before P1. The InteractiveSession's
 * setSession applies this; the history-tamper check there reports the
 * divergence. A state marked by applyCorrectedState keeps its mark and is
 * still refused.
 */
export function dropStaleFoldStamp(session: IGameSession): IGameSession {
  const revision = readFoldRevision(session.currentState);
  if (
    revision === undefined ||
    revision === NOT_FOLDED ||
    foldRevisionMatches(revision, session.events)
  ) {
    return session;
  }
  return { ...session, currentState: { ...session.currentState } };
}

/**
 * Identical redelivery is a no-op, including JSON-transported events with
 * reordered keys. Conflicting ids and non-increasing new sequences are
 * corruption, not retries. Gaps are allowed; only ordering is enforced here.
 * The new state is the held state with only the new event applied.
 * @spec openspec/changes/fix-p2p-guest-reconnect-baseline/specs/multiplayer-sync/spec.md
 */
export function appendEvent(
  session: IGameSession,
  event: IGameEvent,
): IGameSession {
  const existing = findHeldEvent(session.events, event.id);
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
  const heldState = foldedStateOf(session);
  const positions = idPositionsFor(session.events);
  const events = [...session.events, event];
  positions.set(event.id, session.events.length);
  eventIdPositions.set(events, positions);

  const applied = applyEvent(heldState, event);
  // A no-op handler returns its input; copy it so the held state keeps its
  // own stamp for any other append from the same session.
  const currentState = applied === heldState ? { ...applied } : applied;
  stampFoldRevision(currentState, events);

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
