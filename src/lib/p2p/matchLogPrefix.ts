/**
 * Browser match-log prefix check.
 *
 * IndexedDB is a cache of an immutable event-id prefix. Compare the
 * stored order to an authoritative stream by identity, never by
 * authority sequence (player frames after the delivery-first cutover
 * do not carry one).
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { MatchLogStorageUnavailableError } from './matchLogStorageSchema';

export interface IMatchLogPrefixEvent {
  readonly id: string;
  readonly sequence?: number;
}

export type MatchLogPrefixVerdict =
  | { readonly kind: 'match' }
  | {
      readonly kind: 'replaced';
      readonly position: number;
      readonly storedId: string;
      readonly receivedId: string;
    }
  | { readonly kind: 'truncated'; readonly position: number };

export type MatchLogPrefixStorage = {
  getEventsForMatch(matchId: string): Promise<readonly IGameEvent[]>;
  deleteEventsForMatch(matchId: string): Promise<void>;
};

/**
 * Position-by-position identity check. `storedEvents` is the mirror's
 * order for the match; `receivedEvents` is the authoritative stream
 * in arrival/id order. A longer stream is still a match: the mirror
 * is a prefix.
 */
export function verifyMatchLogPrefix(
  storedEvents: readonly IMatchLogPrefixEvent[],
  receivedEvents: readonly IMatchLogPrefixEvent[],
): MatchLogPrefixVerdict {
  for (let position = 0; position < storedEvents.length; position += 1) {
    const storedEvent = storedEvents[position];
    const receivedEvent = receivedEvents[position];
    if (storedEvent === undefined) {
      break;
    }
    if (receivedEvent === undefined) {
      return { kind: 'truncated', position };
    }
    if (storedEvent.id !== receivedEvent.id) {
      return {
        kind: 'replaced',
        position,
        storedId: storedEvent.id,
        receivedId: receivedEvent.id,
      };
    }
  }
  return { kind: 'match' };
}

export async function reconcileMatchLogMirror(input: {
  readonly matchId: string;
  readonly receivedEvents: readonly IMatchLogPrefixEvent[];
  readonly storage: MatchLogPrefixStorage;
  readonly assumePrefixSnapshot?: boolean;
}): Promise<MatchLogPrefixVerdict> {
  let storedEvents: readonly IGameEvent[];
  try {
    storedEvents = await input.storage.getEventsForMatch(input.matchId);
  } catch (error) {
    if (error instanceof MatchLogStorageUnavailableError) {
      return { kind: 'match' };
    }
    throw error;
  }

  if (storedEvents.length === 0) {
    return { kind: 'match' };
  }

  if (
    !input.assumePrefixSnapshot &&
    !isAuthoritativePrefix(storedEvents, input.receivedEvents)
  ) {
    return { kind: 'match' };
  }

  const verdict = verifyMatchLogPrefix(storedEvents, input.receivedEvents);
  if (verdict.kind !== 'match') {
    await input.storage.deleteEventsForMatch(input.matchId);
  }
  return verdict;
}

function isAuthoritativePrefix(
  storedEvents: readonly IMatchLogPrefixEvent[],
  receivedEvents: readonly IMatchLogPrefixEvent[],
): boolean {
  if (storedEvents.length === 0 || receivedEvents.length === 0) {
    return false;
  }
  return storedEvents[0]?.id === receivedEvents[0]?.id;
}
