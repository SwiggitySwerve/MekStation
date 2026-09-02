/**
 * The revision a campaign command lands at, resolved from the branch it
 * lands on (umbrella task 16.2, Seam C1).
 *
 * `JournalCampaignEventStore` has always answered this with
 * `expectedRevision: input.events[0].sequence`, and its header states the
 * invariant that makes it true: "an append of sequence N carries
 * `expectedRevision` N". That equation holds on the genesis branch only.
 * A campaign SEQUENCE is stream-global and monotonic across the whole
 * campaign's life; a candidate branch is anchored at a BASE REVISION and
 * numbers its own revisions from there. The first rewind makes the two
 * different numbers, and every place that assumes they are equal is a
 * bug (finding #70).
 *
 * So the expected revision is READ, never computed. There is deliberately
 * no offset arithmetic here - not `sequence - baseRevision`, not
 * `baseRevision + retained.length`. An offset is a second opinion about
 * where a branch is, and the moment it disagrees with the journal the
 * append either conflicts or, far worse, commits at a revision nobody
 * meant.
 *
 * TWO SOURCES, in order, and the second one matters:
 *
 * 1. The branch's own `event_journal_stream_heads` row - where it is now.
 * 2. Failing that, the branch record's `(baseRevision, baseDigest)` -
 *    where it starts.
 *
 * Arm 2 is not dead code. A candidate gets its head row seeded when it is
 * minted (finding #80, `EventHistoryCandidateBuild`), but a ROOT branch on
 * a stream that has never been appended to has a branch record and no head
 * row, and it sits at revision 0 on the genesis digest. Answering 0 by
 * accident - because a missing row coalesces to zero - is right for the
 * wrong reason, and stops being right the moment the branch is not root.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type Database from 'better-sqlite3';

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';

import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';

/** The stream type every campaign journal record carries. */
export const CAMPAIGN_STREAM_TYPE = 'campaign';

/**
 * Where a branch is: the revision its next append is expected at, and the
 * digest that append must chain to.
 *
 * The two travel together because they are read together. Handing back a
 * revision alone would let a caller pair it with a digest from somewhere
 * else, which is the precise shape of the bug this module exists to stop.
 */
export interface ICampaignBranchAnchor {
  readonly branchId: string;
  readonly revision: number;
  readonly digest: string;
}

interface IHeadRow {
  readonly revision: number;
  readonly digest: string;
}

/**
 * The anchor for one branch of one campaign stream.
 *
 * Refuses an unknown branch through the branch store rather than
 * answering a default: a caller asking about a branch this stream does
 * not have is not asking about revision 0, it is wrong about the stream.
 */
export function readCampaignBranchAnchor(
  db: Database.Database,
  campaignId: string,
  branchId: string,
): ICampaignBranchAnchor {
  const stream: IEventHistoryStreamRef = {
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: campaignId,
  };
  const branch = new SQLiteEventHistoryBranchStore(db).requireBranch(
    stream,
    branchId,
  );
  const head = db
    .prepare(
      `SELECT stream_revision AS revision, event_digest AS digest
         FROM event_journal_stream_heads
        WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
    )
    .get(stream.streamType, stream.streamId, branchId) as IHeadRow | undefined;

  const anchor =
    head === undefined
      ? { revision: branch.baseRevision, digest: branch.baseDigest }
      : head;

  // A head BELOW the branch's own base is not a stale read to work
  // around; it is a head row and a branch record that disagree about
  // where the branch starts, and appending against either answer would
  // write history the resolver cannot materialise.
  if (anchor.revision < branch.baseRevision) {
    throw new EventHistoryBranchError(
      'branch-integrity',
      `Branch '${branchId}' holds a head at revision ${anchor.revision}, below its base revision ${branch.baseRevision}`,
    );
  }
  return Object.freeze({ branchId, ...anchor });
}
