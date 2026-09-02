/**
 * Authoritative history branch records and their typed refusals
 * (add-authoritative-history-branches tasks 1.1 / 1.2; design D1).
 *
 * The storage constraints in `SQLiteService.historyBranches.migration`
 * are the coarse net - they hold even against a writer that bypasses the
 * store. This module is the precise one: every rule the schema can only
 * approximate is stated here as a TYPED REFUSAL, never as a silent no-op
 * and never as a bare `Error`. A caller that asks for something illegal
 * is told which rule it broke.
 *
 * The two rules the schema deliberately under-specifies:
 *
 * - **Status monotonicity vs the legal-transition table.** SQL enforces
 *   only that the rank never decreases. That admits `blocked -> effective`,
 *   which the domain forbids: a candidate that failed verification is
 *   terminal, and re-admitting it would let a branch that was rejected
 *   become authoritative without a fresh build. The transition table below
 *   is what actually decides.
 * - **Branch creation is off in production.** PR 1 ships branch STORAGE
 *   and the prior-head resolver; nothing in production may mint a second
 *   branch until candidate build and atomic activation land (PR 2). The
 *   creation path therefore requires an explicit seam object, and the
 *   production seam refuses. This is a capability, not a boolean flag read
 *   from ambient state: a caller cannot create a branch without visibly
 *   holding the thing that permits it.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import { sha256Sync } from '@/utils/events/hashUtils';

import { canonicalizeJsonV1 } from './EventJournalCanonicalizer';

/**
 * The genesis digest a root branch carries: the canonicalizer's digest of
 * an empty history. Identical to the value `genesisJournalAuthorityBaseline`
 * records for an empty match stream, so a root branch and a genesis
 * baseline agree about what "nothing has happened yet" hashes to.
 *
 * The migration pins the same value as a hex literal (it may not import
 * from `lib/`); `EventHistoryBranchContract.test` proves the two agree.
 */
export const EVENT_HISTORY_GENESIS_DIGEST = sha256Sync(canonicalizeJsonV1([]));

/** The revision a root branch is anchored at. */
export const EVENT_HISTORY_GENESIS_REVISION = 0;

/** The depth of a root branch. Children are strictly deeper. */
export const EVENT_HISTORY_GENESIS_DEPTH = 0;

export const EVENT_HISTORY_BRANCH_STATUSES = [
  'building',
  'waiting-effects',
  'blocked',
  'effective',
  'superseded',
] as const;

export type EventHistoryBranchStatus =
  (typeof EVENT_HISTORY_BRANCH_STATUSES)[number];

/**
 * The rank ladder the storage trigger enforces. Declared here too so the
 * two cannot drift apart unnoticed - the store test compares them.
 */
export const EVENT_HISTORY_BRANCH_STATUS_RANK: Readonly<
  Record<EventHistoryBranchStatus, number>
> = Object.freeze({
  building: 1,
  'waiting-effects': 2,
  blocked: 3,
  effective: 4,
  superseded: 5,
});

/**
 * The legal transitions. Every one strictly increases the rank, so this
 * table is a refinement of the storage trigger rather than a second,
 * competing rule. `blocked` and `superseded` are terminal.
 */
export const EVENT_HISTORY_BRANCH_TRANSITIONS: Readonly<
  Record<EventHistoryBranchStatus, readonly EventHistoryBranchStatus[]>
> = Object.freeze({
  building: Object.freeze(['waiting-effects', 'blocked', 'effective'] as const),
  'waiting-effects': Object.freeze(['blocked', 'effective'] as const),
  blocked: Object.freeze([] as const),
  effective: Object.freeze(['superseded'] as const),
  superseded: Object.freeze([] as const),
});

/** One immutable branch record (design D1). */
export interface IEventHistoryBranch {
  readonly streamType: string;
  readonly streamId: string;
  readonly branchId: string;
  readonly parentBranchId: string | null;
  readonly ancestorDepth: number;
  readonly baseRevision: number;
  readonly baseEventId: string | null;
  readonly baseDigest: string;
  readonly status: EventHistoryBranchStatus;
  readonly createdBy: string;
  readonly reason: string;
  readonly createdAt: string;
}

/** The branch a stream is currently answering from, and its generation. */
export interface IEventHistoryEffectiveHead {
  readonly streamType: string;
  readonly streamId: string;
  readonly branchId: string;
  readonly effectiveGeneration: number;
  readonly installedAt: string;
}

/** One immutable supersession fact binding a generation step. */
export interface IEventHistorySupersession {
  readonly streamType: string;
  readonly streamId: string;
  readonly supersededBranchId: string;
  readonly replacementBranchId: string;
  readonly priorGeneration: number;
  readonly replacementGeneration: number;
  readonly reason: string;
  readonly recordedAt: string;
}

/** The stream a branch question is asked about. */
export interface IEventHistoryStreamRef {
  readonly streamType: string;
  readonly streamId: string;
}

export type EventHistoryBranchErrorCode =
  /** Production asked to mint a branch; only PR 2's seam may. */
  | 'branch-creation-disabled'
  /** Parent missing, in another stream, at the wrong depth, or self. */
  | 'invalid-ancestry'
  /** Root/child semantics disagree, or a field is out of range. */
  | 'invalid-branch-record'
  /** The named branch does not exist in this stream. */
  | 'unknown-branch'
  /** A branch already occupies this identity slot. */
  | 'duplicate-branch'
  /** The stream already has an effective branch; there may be only one. */
  | 'duplicate-effective-branch'
  /** The stream has no effective branch (never backfilled). */
  | 'no-effective-branch'
  /** The transition is not in the legal table. */
  | 'illegal-status-transition'
  /** A resolved path has a gap, wrong base, or broken digest chain. */
  | 'branch-integrity';

/** Every refusal in this module carries one of the codes above. */
export class EventHistoryBranchError extends Error {
  public readonly name = 'EventHistoryBranchError';
  public constructor(
    public readonly code: EventHistoryBranchErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The capability that permits minting a branch.
 *
 * Production holds the refusing one. There is no setter, no environment
 * read, and no default that permits: a path that can create a branch has
 * to have been handed this object explicitly, which makes every such path
 * greppable.
 */
export interface IBranchCreationSeam {
  readonly allowsBranchCreation: boolean;
}

/** The seam every production surface gets. Genesis-only. */
export const PRODUCTION_BRANCH_CREATION_SEAM: IBranchCreationSeam =
  Object.freeze({ allowsBranchCreation: false });

/** Test-only: the seam PR 2's authorized build path will one day hold. */
export function _branchCreationSeamForTests(): IBranchCreationSeam {
  return Object.freeze({ allowsBranchCreation: true });
}

/** True when `to` is reachable from `from` in the legal table. */
function isLegalBranchStatusTransition(
  from: EventHistoryBranchStatus,
  to: EventHistoryBranchStatus,
): boolean {
  return EVENT_HISTORY_BRANCH_TRANSITIONS[from].includes(to);
}

/**
 * Refuse an illegal transition explicitly. Callers get the code and both
 * statuses rather than a swallowed no-op that leaves the branch where it
 * was while the caller believes it moved.
 */
export function assertLegalBranchStatusTransition(
  from: EventHistoryBranchStatus,
  to: EventHistoryBranchStatus,
): void {
  if (isLegalBranchStatusTransition(from, to)) return;
  throw new EventHistoryBranchError(
    'illegal-status-transition',
    `A branch may not move from '${from}' to '${to}'`,
  );
}

/**
 * Validate one branch record's own shape before it reaches storage.
 *
 * Root genesis semantics are one fact stated four ways - depth 0, null
 * parent, null base event, base revision 0 - and this is where they are
 * required to agree. The schema repeats the same CHECKs; a caller that
 * goes through the store gets a typed refusal instead of a raw SQLite
 * constraint error naming a column.
 */
export function assertValidBranchRecord(branch: IEventHistoryBranch): void {
  const fail = (message: string): never => {
    throw new EventHistoryBranchError('invalid-branch-record', message);
  };
  for (const [field, value] of [
    ['streamType', branch.streamType],
    ['streamId', branch.streamId],
    ['branchId', branch.branchId],
    ['baseDigest', branch.baseDigest],
    ['createdBy', branch.createdBy],
    ['reason', branch.reason],
    ['createdAt', branch.createdAt],
  ] as const) {
    if (value.trim().length === 0) fail(`${field} must not be empty`);
  }
  if (
    !Number.isSafeInteger(branch.ancestorDepth) ||
    branch.ancestorDepth < EVENT_HISTORY_GENESIS_DEPTH
  ) {
    fail('ancestorDepth must be a non-negative safe integer');
  }
  if (
    !Number.isSafeInteger(branch.baseRevision) ||
    branch.baseRevision < EVENT_HISTORY_GENESIS_REVISION
  ) {
    fail('baseRevision must be a non-negative safe integer');
  }
  const isRoot = branch.parentBranchId === null;
  if (isRoot !== (branch.ancestorDepth === EVENT_HISTORY_GENESIS_DEPTH)) {
    fail('Only a root branch may have a null parent, and only at depth 0');
  }
  if (isRoot) {
    if (
      branch.baseEventId !== null ||
      branch.baseRevision !== EVENT_HISTORY_GENESIS_REVISION
    ) {
      fail('A root branch has no base event and is anchored at revision 0');
    }
    return;
  }
  if (branch.parentBranchId === branch.branchId) {
    throw new EventHistoryBranchError(
      'invalid-ancestry',
      'A branch may not be its own parent',
    );
  }
  if (
    branch.baseEventId === null ||
    branch.baseEventId.trim().length === 0 ||
    branch.baseRevision < EVENT_HISTORY_GENESIS_REVISION + 1
  ) {
    fail('A child branch anchors to a base event at revision 1 or later');
  }
}
