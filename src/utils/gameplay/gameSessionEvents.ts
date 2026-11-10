import type { IGameEvent, IGameSession } from '@/types/gameplay';

import { toCanonicalJson } from '@/utils/events/hashUtils';

import { deriveState } from './gameState';

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
 * Identical redelivery is a no-op, including JSON-transported events with
 * reordered keys. Conflicting ids and non-increasing new sequences are
 * corruption, not retries. Gaps are allowed; only ordering is enforced here.
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
  const events = [...session.events, event];
  const currentState = deriveState(session.id, events);

  return {
    ...session,
    events,
    currentState,
    updatedAt: new Date().toISOString(),
  };
}
