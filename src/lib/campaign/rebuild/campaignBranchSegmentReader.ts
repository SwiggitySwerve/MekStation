/**
 * A campaign branch segment, read from the branch the segment names
 * (umbrella 16.2, Seam C1c-ii).
 *
 * `journalBranchSegmentReader` still answers only `root`. That was
 * honest when the journal stored one branch. A candidate now has its
 * own events (and its own head), and answering a candidate segment
 * with root rows would let `materializeBranchPath` accept a path whose
 * suffix never happened - or refuse a path that did, depending on
 * which root revisions happened to overlap the window.
 *
 * The SQL is the parent reader's: `SQLiteEventJournal.readStream`
 * already binds `WHERE stream_type = ? AND stream_id = ? AND
 * branch_id = ? AND stream_revision > ?`. This wrapper passes the
 * segment's own `branchId` through that bind. It never substitutes
 * root. Column mapping stays `SQLITE_EVENT_JOURNAL_EVENT_COLUMNS`
 * inside the journal hydrate, so a candidate row is the same shape
 * as a root row.
 *
 * Choosing which segment to ask for is the resolver's job. This
 * reader only answers the branch it was pointed at.
 */

import type { IBranchSegmentReader } from '@/lib/events/journal/EventHistoryBranchResolver';
import type {
  IEventJournal,
  IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';

import { EVENT_JOURNAL_MAX_PAGE_SIZE } from '@/lib/events/journal/EventJournalContract';

/**
 * Read one campaign segment from the branch it names, never from root
 * by default.
 */
export function campaignBranchSegmentReader<TPayload>(
  journal: IEventJournal<TPayload>,
): IBranchSegmentReader<IStoredEvent<TPayload>> {
  return {
    read: async (stream, segment) => {
      const collected: IStoredEvent<TPayload>[] = [];
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
        collected.push(...page);
        after = page[page.length - 1].streamRevision;
      }
      return collected;
    },
  };
}
