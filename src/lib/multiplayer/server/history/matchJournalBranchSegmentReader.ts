/**
 * A match's JOURNAL history, read as a branch segment (U21;
 * FN-u2b-rewind-commit-verifies-through-the-match-store).
 *
 * WHY THE JOURNAL. A GM rewind cuts its candidate at the journal's own
 * event for the target revision (`EventHistoryCandidateBuild` reads the
 * base from `event_journal_events`). `matchStoreBranchSegmentReader`
 * re-derives a second line from `mp_match_events` - other event ids,
 * other digests - so a candidate verified through it is "anchored to a
 * base its parent does not hold" on every commit. This reader serves the
 * journal's stored events, so the anchor and the path that verifies it
 * are one history.
 *
 * ANY BRANCH. Each segment is read under its own `branchId`: the live
 * path (`main` for a mirrored stream, `root` at genesis) and an
 * activated candidate alike. `journalBranchSegmentReader` refuses every
 * id but `root` and is deliberately not wrapped.
 *
 * STORED DIGESTS, NEVER RECHAINED. Every event carries the predecessor
 * digest the journal recorded when it was appended, so a window that
 * starts mid-stream chains from its real predecessor and is exactly the
 * same slice of a full read.
 *
 * THE PAYLOAD IS THE MATCH EVENT. The mirror wraps each game event in an
 * `IMatchJournalEnvelope`; the verification projector, the viewer probe
 * and the rebuild fold all consume the game event itself, so
 * `payload.matchEvent` is what each projectable event carries. A stored
 * event without a game event there is refused as `branch-integrity`.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type {
  IBranchEventView,
  IBranchSegmentReader,
} from '@/lib/events/journal/EventHistoryBranchResolver';
import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';

import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { EVENT_JOURNAL_MAX_PAGE_SIZE } from '@/lib/events/journal/EventJournalContract';
import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchJournalEnvelope } from '../MatchStreamJournalMirror';

/**
 * The fields of a journal event this reader carries across. Named
 * narrowly, not as the journal's row type: the history folder does not
 * expose stored journal rows (ViewerHistoryBoundary.test.ts).
 */
type JournalMatchEvent = IBranchEventView & {
  readonly eventType: string;
  readonly payload: IMatchJournalEnvelope;
};

/**
 * One stored journal event as a projectable branch event: identity,
 * revision and both digests exactly as stored, and the envelope's game
 * event as the payload. Throws `branch-integrity` when the envelope
 * carries no game event.
 */
function toProjectableMatchEvent(
  stored: JournalMatchEvent,
): IProjectableBranchEvent {
  const matchEvent: unknown = stored.payload?.matchEvent;
  if (!isGameEvent(matchEvent)) {
    throw new EventHistoryBranchError(
      'branch-integrity',
      `Journal event ${stored.eventId} carries no match event`,
    );
  }
  return {
    eventId: stored.eventId,
    branchId: stored.branchId,
    streamRevision: stored.streamRevision,
    eventVersion: stored.eventVersion,
    previousStreamEventDigest: stored.previousStreamEventDigest,
    eventDigest: stored.eventDigest,
    entityRefs: stored.entityRefs,
    eventType: stored.eventType,
    payload: matchEvent,
  };
}

/**
 * Read `(fromRevision, throughRevision]` of the segment's own branch from
 * the journal, page by page, and map each stored event through
 * `toProjectableMatchEvent`. Stops early when the journal runs out, so a
 * short branch answers fewer events and the resolver's count check
 * refuses it; nothing is padded or re-derived.
 */
export function matchJournalBranchSegmentReader(
  journal: IEventJournal<IMatchJournalEnvelope>,
): IBranchSegmentReader<IProjectableBranchEvent> {
  return {
    read: async (stream, segment) => {
      const collected: IProjectableBranchEvent[] = [];
      let after = segment.fromRevision;
      while (after < segment.throughRevision) {
        const page = await journal.readStream({
          streamType: stream.streamType,
          streamId: stream.streamId,
          branchId: segment.branchId,
          afterRevision: after,
          limit: Math.min(
            EVENT_JOURNAL_MAX_PAGE_SIZE,
            segment.throughRevision - after,
          ),
        });
        if (page.length === 0) break;
        collected.push(...page.map(toProjectableMatchEvent));
        after = page[page.length - 1].streamRevision;
      }
      return collected;
    },
  };
}
