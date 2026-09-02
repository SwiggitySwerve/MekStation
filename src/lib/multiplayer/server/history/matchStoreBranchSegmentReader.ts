/**
 * A match's events, read as a branch segment
 * (add-authoritative-history-branches; umbrella 13.5).
 *
 * FINDING #48: combat is journal-authority-CAPABLE - the baseline,
 * branches, correction leases and the command admission all key on
 * `('match', matchId)` - while its EVENTS live in `mp_match_events`.
 * Nothing writes match events to `event_journal_events`, so the journal
 * side is nominal until a combat cutover. `journalBranchSegmentReader`
 * over a match stream therefore reads an empty history and would let the
 * GM's rewind preview answer "nothing changes" for every match, which is
 * false rather than merely unhelpful. This reader is the seam that makes
 * the branch machinery answer about a REAL match today.
 *
 * THE REVISION CONTRACT, and it is not an identity:
 *
 * - `mp_match_events` sequences start at **0**
 *   (`DurableMatchStore`: `SELECT COALESCE(MAX(sequence) + 1, 0)`).
 * - Branch revision **0 means "nothing has happened yet"**: it is the
 *   root branch's `baseRevision`, and what a stream with no head row
 *   reads as.
 * - So **`revision = sequence + 1`** - the same off-by-one the campaign
 *   side already carries ("`ICampaignEvent.sequence` N lives at journal
 *   `streamRevision` N + 1"). A reader using `revision = sequence` would
 *   silently drop every match's first event and shift every truncation
 *   target by one against the lease guard and the checkpoint read.
 * - Segments are **`(fromRevision, throughRevision]`**: low exclusive,
 *   high inclusive, exactly as `IBranchPathSegment` documents.
 *
 * The digest chain is computed from the START of the stream and then
 * sliced, never from the window. A truncation has to be a PREFIX of the
 * history it truncates - if a shorter read rechained, the same event
 * would digest differently depending on how much of it you asked for,
 * and every comparison between two heads would be meaningless.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type { IBranchSegmentReader } from '@/lib/events/journal/EventHistoryBranchResolver';
import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { sha256Sync } from '@/utils/events/hashUtils';

/** The revision a match event at this sequence occupies. */
export function revisionForMatchSequence(sequence: number): number {
  return sequence + 1;
}

/** The narrow read this reader needs - `IMatchStore` satisfies it. */
export interface IMatchEventSource {
  getEvents(matchId: string, fromSeq?: number): Promise<readonly IGameEvent[]>;
}

/**
 * Digest one event against its predecessor.
 *
 * Chained rather than standalone so the digest carries POSITION as well
 * as content: two identical events at different points in a match are
 * different history, and a chain is what `verifySegment` checks. Field
 * order is `{ previous, event }` on purpose — a second helper that
 * hashed `{ event, previous }` would be a different chain, and every
 * checkpoint attested against this one would fail to verify.
 */
export function matchEventChainDigest(
  previous: string | null,
  event: IGameEvent,
): string {
  return sha256Sync(canonicalizeJsonV1({ previous, event }));
}

/**
 * Read match events as branch events.
 *
 * The whole stream is materialised and chained before the window is
 * applied, which is what makes a truncated read a prefix of the full one
 * rather than a re-derivation of it.
 */
export function matchStoreBranchSegmentReader(
  source: IMatchEventSource,
): IBranchSegmentReader<IProjectableBranchEvent> {
  return {
    read: async (stream, segment) => {
      if (segment.branchId !== ROOT_EVENT_BRANCH_ID) {
        // The match store keeps exactly one line of history. Answering a
        // candidate's name with root events would be the same lie the
        // journal reader refuses to tell.
        throw new EventHistoryBranchError(
          'unknown-branch',
          `A match store holds only the '${ROOT_EVENT_BRANCH_ID}' branch; '${segment.branchId}' has no events`,
        );
      }
      const events = [...(await source.getEvents(stream.streamId, 0))].sort(
        (left, right) => left.sequence - right.sequence,
      );
      const chained: IProjectableBranchEvent[] = [];
      let previous: string | null = null;
      for (const event of events) {
        const eventDigest = matchEventChainDigest(previous, event);
        chained.push({
          eventId: event.id,
          branchId: ROOT_EVENT_BRANCH_ID,
          streamRevision: revisionForMatchSequence(event.sequence),
          eventVersion: 1,
          previousStreamEventDigest: previous,
          eventDigest,
          entityRefs: [],
          eventType: String(event.type),
          // The whole game event rides as the payload: the viewer probe
          // fogs and field-projects the REAL event, not a summary of it.
          payload: event,
        });
        previous = eventDigest;
      }
      return chained.filter(
        (event) =>
          event.streamRevision > segment.fromRevision &&
          event.streamRevision <= segment.throughRevision,
      );
    },
  };
}
