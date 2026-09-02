/**
 * Authorized correction candidate creation (add-authoritative-history-branches
 * task 2.1, candidate half; design D2).
 *
 * PR 1 shipped branch creation as a CAPABILITY: `createBranch` refuses
 * unless the store was constructed with an `IBranchCreationSeam` that
 * permits it, and the production seam does not. This module is the one
 * authorized path that presents a permitting seam, and it may only do so
 * after proving a live correction lease.
 *
 * The permitting seam is a module-private constant with no export and no
 * setter. There is deliberately no factory a caller could reach for: the
 * only ways to get a store that can create a branch are this function,
 * which demands a live lease first, and the test-only seam PR 1 already
 * exposes. `grep 'allowsBranchCreation: true'` finds both and nothing else.
 *
 * What a candidate is, and is not:
 *
 * - It is a `building` child anchored to EXACTLY the head its lease bound -
 *   that branch, revision, event, and digest. The binding is re-verified
 *   here against the live head, because an append between acquisition and
 *   build would leave the candidate anchored to history that moved.
 * - It is NOT effective, and creating it changes nothing about who answers
 *   for the stream. No effective head moves, no generation increments, no
 *   supersession is written. Activation is a later seam.
 *
 * Expiry, restart, and takeover all run through the lease store's
 * `requireLiveLease`: a resuming owner presents its id, owner, and epoch,
 * and only the epoch can reveal that somebody took the stream while it was
 * gone. An owner whose lease lapsed mid-build is refused - the permission
 * it is still acting on no longer exists - and the candidate it was
 * building is left exactly where it stands, `building` and inert, never
 * silently promoted and never deleted.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { randomBytes } from 'node:crypto';

import type {
  IBranchCreationSeam,
  IEventHistoryBranch,
  IEventHistoryStreamRef,
} from './EventHistoryBranchContract';
import type {
  IEventHistoryCorrectionLease,
  IHeldCorrectionLease,
} from './EventHistoryCorrectionLeaseContract';
import type { SQLiteEventHistoryCorrectionLeaseStore } from './SQLiteEventHistoryCorrectionLeaseStore';

import { EventHistoryBranchError } from './EventHistoryBranchContract';
import { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';

/**
 * The one permitting seam in production code. Module-private on purpose:
 * a path that can create a branch has to be THIS path, which cannot run
 * without a live lease.
 */
const CORRECTION_BRANCH_CREATION_SEAM: IBranchCreationSeam = Object.freeze({
  allowsBranchCreation: true,
});

/** Marks a branch reason as machine-readable and names its schema. */
const CANDIDATE_REASON_TAG = 'correction-rebuild';

/** What a caller must present to build: the stream, the lease, and when. */
export interface ICandidateBuildRequest
  extends IEventHistoryStreamRef, IHeldCorrectionLease {
  readonly createdAt: string;
}

/** The lease a candidate's reason names. */
export interface ICandidateLeaseRef {
  readonly leaseId: string;
  readonly fencingEpoch: number;
}

/** The journal event a candidate anchors to. */
interface IBaseEvent {
  readonly eventId: string;
  readonly eventDigest: string;
}

/**
 * Mint an opaque 32-char hex branch id.
 *
 * Server randomness, never derived from the lease, the stream, or the
 * revision: a derivable candidate id would let a client name a branch that
 * does not exist yet and watch for it to appear, which leaks that a
 * correction is underway.
 */
function mintCandidateBranchId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Build the candidate's reason so it stays traceable to its lease.
 *
 * An abandoned candidate has to answer "which lease stranded you?", and a
 * sentence somebody wrote would not survive that question. The lease id and
 * epoch lead; the human reason is preserved after them so the row still
 * reads.
 */
function formatCandidateReason(lease: IEventHistoryCorrectionLease): string {
  return `${CANDIDATE_REASON_TAG}:${lease.leaseId}:${lease.fencingEpoch}:${lease.reason}`;
}

/**
 * Read the lease a candidate names, or null when the branch was not built
 * by a correction (a genesis root, for instance).
 */
export function readCandidateLeaseRef(
  branch: IEventHistoryBranch,
): ICandidateLeaseRef | null {
  const parts = branch.reason.split(':');
  if (parts.length < 4 || parts[0] !== CANDIDATE_REASON_TAG) return null;
  const fencingEpoch = Number(parts[2]);
  if (!Number.isSafeInteger(fencingEpoch) || fencingEpoch < 1) return null;
  return Object.freeze({ leaseId: parts[1], fencingEpoch });
}

/**
 * Create the `building` candidate a live correction lease authorizes.
 *
 * Order matters and each step is a refusal the caller can act on:
 * 1. Prove the lease is live and held by this owner at this epoch. A
 *    lapsed, released, or taken-over lease refuses here, before any read
 *    of the journal and long before any write.
 * 2. Re-verify the head the lease bound. Acquisition checked it; time has
 *    passed since.
 * 3. Resolve the base event at that revision, so the candidate anchors to
 *    a real event rather than to a revision number.
 * 4. Create through a store holding the permitting seam.
 */
export function createCorrectionCandidateBranch(
  db: Database.Database,
  leases: SQLiteEventHistoryCorrectionLeaseStore,
  request: ICandidateBuildRequest,
): IEventHistoryBranch {
  const stream = {
    streamType: request.streamType,
    streamId: request.streamId,
  };
  // One transaction: the lease proof, the head re-verification, and the
  // insert must all describe the same instant. Splitting them would let a
  // takeover land between "you hold it" and "here is your branch".
  return db.transaction((): IEventHistoryBranch => {
    const lease = leases.requireLiveLease(stream, {
      leaseId: request.leaseId,
      owner: request.owner,
      fencingEpoch: request.fencingEpoch,
    });
    leases.assertExpectedHeadIsCurrent(stream, lease);

    const parent = requireParentBranch(db, stream, lease);
    const base = requireBaseEvent(db, stream, lease);
    const candidate: IEventHistoryBranch = {
      ...stream,
      branchId: mintCandidateBranchId(),
      parentBranchId: lease.expectedBranchId,
      ancestorDepth: parent.ancestorDepth + 1,
      baseRevision: lease.expectedRevision,
      baseEventId: base.eventId,
      baseDigest: base.eventDigest,
      status: 'building',
      // The owner is what fencing compares, so the owner is who built it.
      createdBy: lease.owner,
      reason: formatCandidateReason(lease),
      createdAt: request.createdAt,
    };
    const authorized = new SQLiteEventHistoryBranchStore(
      db,
      CORRECTION_BRANCH_CREATION_SEAM,
    );
    authorized.createBranch(candidate);
    seedCandidateJournalHead(db, candidate);
    return authorized.requireBranch(stream, candidate.branchId);
  })();
}

/**
 * Anchor the candidate's journal head at the base it was cut from
 * (umbrella 16.2, Wave D2 finding #80).
 *
 * `createBranch` writes `event_history_branches` and nothing else, so
 * before this a candidate had NO `event_journal_stream_heads` row - and
 * the journal writer reads that row for three things at once: the
 * revision an append is expected at (`?? 0`), the revision it numbers
 * from, and the digest it chains to (`?? null`). A first append onto a
 * candidate anchored at base revision N therefore committed at revision
 * 1 chained to nothing, while `EventHistoryBranchResolver.verifySegment`
 * requires revision N+1 chained to the branch's own `baseDigest`. The
 * candidate was storable and unmaterializable at the same time.
 *
 * Seeding the head is what makes the two agree, and it is done HERE, in
 * the transaction that mints the branch, because a candidate that exists
 * without its anchor is exactly the state that was wrong: there is no
 * window in which a caller could observe one and not the other.
 *
 * The values are not a choice. `baseRevision` and `baseDigest` are the
 * branch record's own, so the head this seeds and the base the resolver
 * verifies against are the same two numbers read from the same row.
 */
function seedCandidateJournalHead(
  db: Database.Database,
  candidate: IEventHistoryBranch,
): void {
  db.prepare(
    `INSERT INTO event_journal_stream_heads
       (stream_type, stream_id, branch_id, stream_revision, event_digest)
     VALUES (@streamType, @streamId, @branchId, @streamRevision, @eventDigest)`,
  ).run({
    streamType: candidate.streamType,
    streamId: candidate.streamId,
    branchId: candidate.branchId,
    streamRevision: candidate.baseRevision,
    eventDigest: candidate.baseDigest,
  });
}

/** The branch the candidate descends from - by definition the lease's. */
function requireParentBranch(
  db: Database.Database,
  stream: IEventHistoryStreamRef,
  lease: IEventHistoryCorrectionLease,
): IEventHistoryBranch {
  return new SQLiteEventHistoryBranchStore(db).requireBranch(
    stream,
    lease.expectedBranchId,
  );
}

/**
 * The event the candidate anchors to.
 *
 * A candidate anchors to a real event, never to a revision number: the
 * digest chain a rebuild replays from starts at that event. There is one
 * refusal rather than a separate empty-stream case, because "revision 0"
 * is just the revision with no event - and a stream with no history cannot
 * hold a lease in the first place, since it has no effective branch to bind
 * one to.
 */
function requireBaseEvent(
  db: Database.Database,
  stream: IEventHistoryStreamRef,
  lease: IEventHistoryCorrectionLease,
): IBaseEvent {
  const row = db
    .prepare(
      `SELECT event_id AS eventId, event_digest AS eventDigest
       FROM event_journal_events
       WHERE stream_type = ? AND stream_id = ? AND stream_revision = ?`,
    )
    .get(stream.streamType, stream.streamId, lease.expectedRevision) as
    | IBaseEvent
    | undefined;
  if (row === undefined) {
    throw new EventHistoryBranchError(
      'branch-integrity',
      `Stream ${stream.streamType}/${stream.streamId} has no event at revision ${lease.expectedRevision} to anchor a candidate to`,
    );
  }
  return row;
}
