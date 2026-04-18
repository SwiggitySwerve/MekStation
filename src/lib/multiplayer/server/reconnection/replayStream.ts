/**
 * replayStream — pure helper that builds the `ReplayStart` →
 * `ReplayChunk[]` → `ReplayEnd` envelope sequence the server uses to
 * stream missed events to a (re)connecting client.
 *
 * Wave 4 of Phase 4. Wave 1 only ever sent a single chunk; Wave 4
 * paginates so that long matches don't push a single megabyte payload.
 *
 * Why pure: the host previously inlined this logic in `sendReplay`,
 * which made it hard to test the chunking math without a live socket.
 * Extracting the framing as a function lets unit tests assert envelope
 * sequence + chunk boundaries independently of the host's broadcast
 * machinery.
 *
 * @spec openspec/changes/add-reconnection-and-session-rehydration/proposal.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  REPLAY_CHUNK_SIZE,
  type IServerMessage,
  nowIso,
} from '@/types/multiplayer/Protocol';

// =============================================================================
// Output shape
// =============================================================================

/**
 * Bundle of envelopes ready for the host to push down the socket. The
 * caller is responsible for actually invoking `socket.send()`; the
 * helper itself is sync + pure.
 */
export interface IReplayStreamFrames {
  readonly start: IServerMessage;
  readonly chunks: readonly IServerMessage[];
  readonly end: IServerMessage;
}

// =============================================================================
// streamReplay
// =============================================================================

/**
 * Build the envelope triple that streams `events` (already filtered to
 * sequence > caller's lastSeq) to a single socket.
 *
 * Behaviour:
 *   - Always emits exactly ONE `ReplayStart` and ONE `ReplayEnd`.
 *   - Chunks the events into `chunkSize` slices (default 50). An empty
 *     event list still emits one zero-length chunk so the client's
 *     `ReplayStart → ReplayChunk → ReplayEnd` invariant holds without a
 *     special-case.
 *   - `ReplayEnd.toSeq` is the highest sequence in the chunked events,
 *     OR `fromSeq` if there were none (the client's high-water mark
 *     stays put).
 *   - Each envelope carries a fresh `nowIso()` timestamp so observers
 *     can correlate by `ts`.
 *
 * @param matchId  Match identifier — stamped on every envelope.
 * @param events   The events to stream. Caller has already filtered to
 *                 the slice the client needs.
 * @param fromSeq  The client's high-water mark (`lastSeq + 1`). Echoed
 *                 in `ReplayStart.fromSeq` so the client can sanity-check.
 * @param chunkSize Override for the default chunk size; tests use this
 *                 to drive multi-chunk behaviour without 50+ events.
 */
export function streamReplay(
  matchId: string,
  events: readonly IGameEvent[],
  fromSeq: number,
  chunkSize: number = REPLAY_CHUNK_SIZE,
): IReplayStreamFrames {
  const safeChunkSize = Math.max(1, Math.floor(chunkSize));
  const start: IServerMessage = {
    kind: 'ReplayStart',
    matchId,
    ts: nowIso(),
    fromSeq,
    totalEvents: events.length,
  };

  const chunks: IServerMessage[] = [];
  if (events.length === 0) {
    chunks.push({
      kind: 'ReplayChunk',
      matchId,
      ts: nowIso(),
      events: [],
    });
  } else {
    for (let i = 0; i < events.length; i += safeChunkSize) {
      const slice = events.slice(i, i + safeChunkSize);
      chunks.push({
        kind: 'ReplayChunk',
        matchId,
        ts: nowIso(),
        events: slice as unknown[],
      });
    }
  }

  const toSeq =
    events.length > 0 ? events[events.length - 1].sequence : fromSeq;
  const end: IServerMessage = {
    kind: 'ReplayEnd',
    matchId,
    ts: nowIso(),
    toSeq,
  };

  return { start, chunks, end };
}
