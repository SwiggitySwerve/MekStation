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

/**
 * `buildOnce`: the chain is read and hashed on the first call and every
 * later call reads that one build. For a caller that rebuilds one match
 * once (recovery), where re-reading the whole log and re-hashing it per
 * call is pure repetition. Safe because the log is append-only: a later
 * read could only add revisions past the build's head, and the digest at
 * any revision the build holds is a function of the prefix up to it.
 * A failed build is not kept, so the next call reads again.
 */
export function matchStoreHistoryReader(
  source: IMatchEventSource,
  matchId: string,
  options: { readonly buildOnce?: boolean } = {},
): IBranchHistoryReader {
  let built: Promise<readonly IChainedMatchEvent[]> | null = null;
  const chain = (): Promise<readonly IChainedMatchEvent[]> => {
    if (options.buildOnce !== true) return chainMatchEvents(source, matchId);
    if (built === null) {
      built = chainMatchEvents(source, matchId);
      built.catch(() => {
        built = null;
      });
    }
    return built;
  };
  return {
    chainDigestAt: async (revision) => {
      const chained = await chain();
      return chained.find((row) => row.revision === revision)?.digest ?? null;
    },
    readTail: async (fromExclusive) => {
      const tail: IReplayEquivalenceEvent[] = [];
      for (const row of await chain()) {
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
