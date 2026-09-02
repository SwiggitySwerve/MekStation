/**
 * Live match history as IBranchHistoryReader (umbrella task 15.2 MATCH).
 *
 * Revisions are sequence + 1 via revisionForMatchSequence: match
 * sequences start at 0, and branch revision 0 means "nothing has
 * happened yet". Using sequence as the revision would drop GameCreated
 * and shift every checkpoint tail by one.
 *
 * Digests reuse matchEventChainDigest. A second hash over a different
 * field order would be a different chain, and a row attested against
 * the segment reader would fail to verify here.
 */

import type { IBranchHistoryReader } from '@/lib/events/checkpoints/BranchCheckpointCache';
import type { IReplayEquivalenceEvent } from '@/lib/events/replay/ReplayEquivalenceHarness';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import {
  matchEventChainDigest,
  revisionForMatchSequence,
  type IMatchEventSource,
} from './history/matchStoreBranchSegmentReader';

interface IChainedMatchEvent {
  readonly event: IGameEvent;
  readonly revision: number;
  readonly digest: string;
}

async function chainMatchEvents(
  source: IMatchEventSource,
  matchId: string,
): Promise<readonly IChainedMatchEvent[]> {
  const events = [...(await source.getEvents(matchId, 0))].sort(
    (left, right) => left.sequence - right.sequence,
  );
  const chained: IChainedMatchEvent[] = [];
  let previous: string | null = null;
  for (const event of events) {
    const digest = matchEventChainDigest(previous, event);
    chained.push({
      event,
      revision: revisionForMatchSequence(event.sequence),
      digest,
    });
    previous = digest;
  }
  return chained;
}

export function matchStoreHistoryReader(
  source: IMatchEventSource,
  matchId: string,
): IBranchHistoryReader {
  return {
    chainDigestAt: async (revision) => {
      const chained = await chainMatchEvents(source, matchId);
      return chained.find((row) => row.revision === revision)?.digest ?? null;
    },
    readTail: async (fromExclusive) => {
      const tail: IReplayEquivalenceEvent[] = [];
      for (const row of await chainMatchEvents(source, matchId)) {
        if (row.revision <= fromExclusive) continue;
        tail.push({
          revision: row.revision,
          eventType: String(row.event.type),
          schemaVersion: 1,
          payload: row.event,
        });
      }
      return tail;
    },
  };
}
