import type { IGameEvent } from '@/types/gameplay';

import { acceptReplayStoredImage } from '@/lib/events/replay/ReplayEventAcceptance';
import { logger } from '@/utils/logger';

export type StoredGameEventFormat =
  | 'simulation-report-jsonl'
  | 'match-log-idb'
  | 'match-broadcast';

export class UnreadableStoredEventError extends Error {
  readonly name = 'UnreadableStoredEventError';
  constructor(
    readonly eventId: string,
    readonly formatId: StoredGameEventFormat,
    readonly cause: unknown,
  ) {
    super(
      `Stored game event ${eventId} is unreadable as ${formatId}: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

/** What is written must be readable. The reader schema decides validity of
 * the JSON image, including PR-18's supported null representations.
 */
export function prepareEventForSerialization<T extends IGameEvent>(
  event: T,
  formatId: StoredGameEventFormat = 'simulation-report-jsonl',
): T {
  let image: IGameEvent | undefined;
  let numbersChangedByJson = false;
  try {
    const candidate: unknown = JSON.parse(
      JSON.stringify(event, (_key, value: unknown) => {
        // This tracks representation changes only; it does not reject numbers.
        if (typeof value === 'number' && !Number.isFinite(value))
          numbersChangedByJson = true;
        return value;
      }),
    );
    image = candidate as IGameEvent;
    acceptReplayStoredImage(image, formatId);
    // Preserve valid finite caller objects, undefined keys and JSON key order.
    // A supported non-finite image must also be safe for the journal's JCS.
    return numbersChangedByJson ? (image as T) : event;
  } catch (cause) {
    const error = new UnreadableStoredEventError(event.id, formatId, cause);
    // A host must never commit a fact every mirror will refuse. Unlike the
    // single-player journal, publication has no mark-and-continue policy.
    if (formatId === 'match-broadcast') {
      // Validation causes can include private field names and fogged event
      // identities. Keep the complete cause on the server, off the wire.
      logger.warn('[multiplayer] unreadable stored event', {
        eventId: event.id,
        formatId,
        cause,
      });
      throw error;
    }
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test')
      throw error;
    // If JSON itself failed, preserve a minimal serializable envelope so the
    // recording can still truthfully retain its unverifiable-event marker.
    const recording = image ?? {
      id: event.id,
      gameId: event.gameId,
      sequence: event.sequence,
      timestamp: event.timestamp,
      type: event.type,
      turn: event.turn,
      phase: event.phase,
      payload: {},
    };
    return {
      ...recording,
      replayIntegrity: {
        status: 'unverifiable',
        reason: 'unreadable-stored-event',
        formatId,
      },
    } as T;
  }
}

export function serializeEvent(
  event: IGameEvent,
  formatId: StoredGameEventFormat = 'simulation-report-jsonl',
): string {
  return JSON.stringify(prepareEventForSerialization(event, formatId));
}

export function deserializeEvent(json: string): IGameEvent {
  return JSON.parse(json) as IGameEvent;
}

export function serializeEvents(events: readonly IGameEvent[]): string {
  return JSON.stringify(
    events.map((event) => prepareEventForSerialization(event)),
  );
}

export function deserializeEvents(json: string): IGameEvent[] {
  return JSON.parse(json) as IGameEvent[];
}
