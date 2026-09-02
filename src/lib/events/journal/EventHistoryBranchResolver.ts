/**
 * Prior-head resolver (add-authoritative-history-branches task 1.3;
 * design D1).
 *
 * Resolving a head means answering "what history does this branch hold at
 * this revision?" - and the honest answer is a VERIFIED PARENT PREFIX
 * followed by a CONTIGUOUS CHILD SUFFIX. Nothing here may substitute the
 * current effective head for the one that was asked for: that substitution
 * is the whole failure this module exists to prevent, and it is invisible
 * when both heads happen to have the same revision count.
 *
 * The path is built from branch records only (cheap, no event reads).
 * Materialising it is where the proof happens, and every one of these is a
 * typed `branch-integrity` refusal rather than a best-effort read:
 *
 * - **Identity.** Every event carries a non-empty id, unique across the
 *   whole path, and belongs to the branch its segment names.
 * - **Revision.** Each segment holds exactly the contiguous run
 *   `fromRevision + 1 .. throughRevision`, ascending, with no gap and no
 *   overshoot.
 * - **Digest linkage.** Each event chains to its predecessor - INCLUDING
 *   across the parent/child boundary, where the child's first event must
 *   chain to the parent event the branch record named as its base. A base
 *   that does not match what the parent actually holds is a wrong base,
 *   not a rounding error.
 * - **Event schema version.** A positive safe integer, so a corrupt or
 *   pre-versioning row cannot be projected as though it were current.
 *
 * Projector compatibility is the fifth check the spec names; it belongs to
 * the checkpoint contract and lands with candidate verification (PR 2). It
 * is deliberately NOT claimed here.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type {
  IEventHistoryStreamRef,
  IEventHistoryBranch,
} from './EventHistoryBranchContract';
import type { IEntityEventRef, IEventJournal } from './EventJournalContract';
import type { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';

import {
  EVENT_HISTORY_GENESIS_DEPTH,
  EVENT_HISTORY_GENESIS_REVISION,
  EventHistoryBranchError,
} from './EventHistoryBranchContract';
import {
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
} from './EventJournalContract';

/**
 * The part of a stored event this resolver reasons about. Narrower than
 * `IStoredEvent` on purpose: `IStoredEvent` pins `branchId` to the literal
 * `'root'` (the journal stores one branch and PR 1 does not widen it), and
 * a path over several branches has to be expressible without touching that
 * pin. Every `IStoredEvent` is assignable to this.
 */
export interface IBranchEventView {
  readonly eventId: string;
  readonly branchId: string;
  readonly streamRevision: number;
  readonly eventVersion: number;
  readonly previousStreamEventDigest: string | null;
  readonly eventDigest: string;
  readonly entityRefs: readonly IEntityEventRef[];
}

/**
 * One contiguous run on one branch. `fromRevision` is exclusive and is the
 * revision the run is anchored AT; `throughRevision` is inclusive.
 */
export interface IBranchPathSegment {
  /** `suffix` is the branch that was asked for; the rest are its ancestry. */
  readonly kind: 'prefix' | 'suffix';
  readonly branchId: string;
  readonly fromRevision: number;
  readonly throughRevision: number;
  /** The event this run continues from; null only at genesis. */
  readonly baseEventId: string | null;
  readonly baseDigest: string;
}

export interface IResolvedBranchPath extends IEventHistoryStreamRef {
  readonly branchId: string;
  readonly revision: number;
  /** Ascending: root first, the asked-for branch last. */
  readonly segments: readonly IBranchPathSegment[];
}

/** The narrow read this resolver needs. */
export interface IBranchSegmentReader {
  read(
    stream: IEventHistoryStreamRef,
    segment: IBranchPathSegment,
  ): Promise<readonly IBranchEventView[]>;
}

/** Which entity's history to prove at a head. */
export interface IBranchEntitySelector {
  readonly entityType: string;
  readonly entityId: string;
  readonly role?: string;
}

function integrity(message: string): never {
  throw new EventHistoryBranchError('branch-integrity', message);
}

/**
 * Build the path from the asked-for branch back to the root.
 *
 * The walk is bounded by the branch's own recorded depth and every step
 * re-checks that the parent sits exactly one depth above, so a lineage
 * that was somehow written cyclically cannot spin here.
 */
export function resolveBranchPath(
  store: SQLiteEventHistoryBranchStore,
  stream: IEventHistoryStreamRef,
  branchId: string,
  revision: number,
): IResolvedBranchPath {
  if (
    !Number.isSafeInteger(revision) ||
    revision < EVENT_HISTORY_GENESIS_REVISION
  ) {
    integrity(`Revision ${revision} must be a non-negative safe integer`);
  }
  const target = store.requireBranch(stream, branchId);
  if (revision < target.baseRevision) {
    integrity(
      `Revision ${revision} precedes branch '${branchId}' base revision ${target.baseRevision}`,
    );
  }

  const segments: IBranchPathSegment[] = [];
  let current: IEventHistoryBranch = target;
  let upper = revision;
  let remaining = target.ancestorDepth + 1;
  for (;;) {
    if (remaining-- <= 0) {
      integrity(
        `Branch '${branchId}' ancestry is deeper than its recorded depth`,
      );
    }
    segments.unshift({
      kind: current.branchId === branchId ? 'suffix' : 'prefix',
      branchId: current.branchId,
      fromRevision: current.baseRevision,
      throughRevision: upper,
      baseEventId: current.baseEventId,
      baseDigest: current.baseDigest,
    });
    if (current.parentBranchId === null) break;
    const parent = store.requireBranch(stream, current.parentBranchId);
    if (parent.ancestorDepth !== current.ancestorDepth - 1) {
      throw new EventHistoryBranchError(
        'invalid-ancestry',
        `Branch '${current.branchId}' parent '${parent.branchId}' is not one depth above it`,
      );
    }
    upper = current.baseRevision;
    current = parent;
  }
  if (current.ancestorDepth !== EVENT_HISTORY_GENESIS_DEPTH) {
    integrity(`Branch '${branchId}' ancestry does not terminate at a root`);
  }
  return Object.freeze({ ...stream, branchId, revision, segments });
}

/**
 * Read and verify every segment, returning the whole history at that head
 * in ascending revision order.
 */
export async function materializeBranchPath(
  reader: IBranchSegmentReader,
  path: IResolvedBranchPath,
): Promise<readonly IBranchEventView[]> {
  const materialized: IBranchEventView[] = [];
  const seenEventIds = new Set<string>();
  // The event the next segment must continue from. Starts at genesis, and
  // survives an empty segment unchanged - a branch whose base equals its
  // parent's base contributes no event of its own to chain through.
  let anchor: { readonly eventId: string | null; readonly digest: string } = {
    eventId: path.segments[0].baseEventId,
    digest: path.segments[0].baseDigest,
  };
  for (const segment of path.segments) {
    if (
      segment.baseEventId !== anchor.eventId ||
      segment.baseDigest !== anchor.digest
    ) {
      integrity(
        `Branch '${segment.branchId}' is anchored to a base its parent does not hold at revision ${segment.fromRevision}`,
      );
    }
    const events = await readSegment(reader, path, segment);
    verifySegment(segment, events, anchor, seenEventIds);
    materialized.push(...events);
    const last = events.at(-1);
    if (last !== undefined) {
      anchor = { eventId: last.eventId, digest: last.eventDigest };
    }
  }
  return Object.freeze(materialized);
}

/**
 * The entity's history AT THAT HEAD. The same entity has a different
 * history on a superseded branch than on the effective one, which is
 * precisely what prior-head inspection is for.
 */
export async function readEntityHistoryAtHead(
  reader: IBranchSegmentReader,
  path: IResolvedBranchPath,
  selector: IBranchEntitySelector,
): Promise<readonly IBranchEventView[]> {
  const events = await materializeBranchPath(reader, path);
  return Object.freeze(
    events.filter((event) =>
      event.entityRefs.some(
        (ref) =>
          ref.entityType === selector.entityType &&
          ref.entityId === selector.entityId &&
          (selector.role === undefined || ref.role === selector.role),
      ),
    ),
  );
}

/**
 * Production reader over the real journal.
 *
 * The journal stores exactly one branch, so this refuses any other id
 * rather than quietly answering with root events under a candidate's name.
 * PR 2's candidate storage is what will make other branches readable.
 */
export function journalBranchSegmentReader(
  journal: IEventJournal,
): IBranchSegmentReader {
  return {
    read: async (stream, segment) => {
      if (segment.branchId !== ROOT_EVENT_BRANCH_ID) {
        throw new EventHistoryBranchError(
          'unknown-branch',
          `The journal stores only the '${ROOT_EVENT_BRANCH_ID}' branch; '${segment.branchId}' has no events`,
        );
      }
      const collected: IBranchEventView[] = [];
      let after = segment.fromRevision;
      while (after < segment.throughRevision) {
        const page = await journal.readStream({
          streamType: stream.streamType,
          streamId: stream.streamId,
          branchId: ROOT_EVENT_BRANCH_ID,
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

async function readSegment(
  reader: IBranchSegmentReader,
  path: IResolvedBranchPath,
  segment: IBranchPathSegment,
): Promise<readonly IBranchEventView[]> {
  return reader.read(
    { streamType: path.streamType, streamId: path.streamId },
    segment,
  );
}

/**
 * Identity, revision contiguity, digest linkage, and event schema version
 * for one run. A failure quarantines the branch with a typed error; it is
 * never repaired and never partially returned.
 */
function verifySegment(
  segment: IBranchPathSegment,
  events: readonly IBranchEventView[],
  anchor: { readonly eventId: string | null; readonly digest: string },
  seenEventIds: Set<string>,
): void {
  const expected = segment.throughRevision - segment.fromRevision;
  if (events.length !== expected) {
    integrity(
      `Branch '${segment.branchId}' holds ${events.length} of the ${expected} revisions in ${segment.fromRevision + 1}..${segment.throughRevision}`,
    );
  }
  let previousDigest = anchor.eventId === null ? null : anchor.digest;
  events.forEach((event, index) => {
    if (event.branchId !== segment.branchId) {
      integrity(
        `Event ${event.eventId} belongs to branch '${event.branchId}', not '${segment.branchId}'`,
      );
    }
    if (event.eventId.trim().length === 0 || seenEventIds.has(event.eventId)) {
      integrity(`Event identity '${event.eventId}' is empty or repeated`);
    }
    seenEventIds.add(event.eventId);
    if (event.streamRevision !== segment.fromRevision + index + 1) {
      integrity(
        `Branch '${segment.branchId}' revision ${event.streamRevision} is out of order at position ${index}`,
      );
    }
    if (!Number.isSafeInteger(event.eventVersion) || event.eventVersion < 1) {
      integrity(
        `Event ${event.eventId} has an unusable schema version ${event.eventVersion}`,
      );
    }
    if (event.previousStreamEventDigest !== previousDigest) {
      integrity(
        `Event ${event.eventId} does not chain to the preceding digest on branch '${segment.branchId}'`,
      );
    }
    previousDigest = event.eventDigest;
  });
}
