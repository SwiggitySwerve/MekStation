/**
 * Branch-aware expected-head validation (add-authoritative-history-branches
 * task 1.4; design D5).
 *
 * A client names the branch, revision, and generation it believes is
 * current. This decides whether that belief still holds, and when it does
 * not it says WHICH part went stale - a superseded branch, a moved
 * revision, and a bumped generation are three different recoveries, and
 * collapsing them into one "conflict" leaves the client guessing.
 *
 * Two properties this module holds deliberately:
 *
 * - **It appends nothing.** Every path is a read. The spec's SHALL for a
 *   stale command is "return `STALE_BRANCH` with the active head and
 *   resync action AND append nothing"; the way that is guaranteed here is
 *   that there is no write path to reach.
 * - **It enables no branch creation.** Validation needs no creation
 *   capability, so a production surface can adopt it while its store still
 *   holds the refusing seam and stays genesis-only until PR 2.
 *
 * An unknown branch id is STALE, not an error: a client reconnecting with
 * a branch this server never had is in exactly the position a superseded
 * client is in, and telling it to resync is the useful answer.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/gm-combat-interventions/spec.md
 */

import type {
  EventHistoryBranchStatus,
  IEventHistoryStreamRef,
} from './EventHistoryBranchContract';
import type { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';

/** What a refused client should do next. */
export const EXPECTED_HEAD_RESYNC_ACTION = 'resync-to-active-head' as const;

export type ExpectedHeadRefusalCode =
  /** The named branch is not the effective one (superseded, candidate, gone). */
  | 'STALE_BRANCH'
  /** The right branch, at the wrong revision. */
  | 'STALE_REVISION'
  /** The right branch and revision, from before an activation. */
  | 'STALE_GENERATION';

/** The head a client claims to be writing against. */
export interface IExpectedBranchHead {
  readonly branchId: string;
  readonly revision: number;
  readonly effectiveGeneration: number;
}

/** The head the authority actually holds. */
export interface IActiveBranchHead {
  readonly branchId: string;
  readonly revision: number;
  readonly effectiveGeneration: number;
}

export type ExpectedHeadVerdict =
  | { readonly kind: 'current'; readonly activeHead: IActiveBranchHead }
  | {
      readonly kind: 'refused';
      readonly code: ExpectedHeadRefusalCode;
      /** The status of the branch the client named; null when unknown. */
      readonly namedBranchStatus: EventHistoryBranchStatus | null;
      readonly activeHead: IActiveBranchHead;
      readonly resyncAction: typeof EXPECTED_HEAD_RESYNC_ACTION;
    };

/**
 * The active head: the stream's effective branch and generation, at the
 * revision the caller read from the journal.
 *
 * Refuses when the stream has no effective branch. Answering `root` anyway
 * would manufacture an authority nobody installed, and every comparison
 * downstream would then be against a head that does not exist.
 */
export function readActiveBranchHead(
  store: SQLiteEventHistoryBranchStore,
  stream: IEventHistoryStreamRef,
  currentRevision: number,
): IActiveBranchHead {
  const head = store.requireEffectiveHead(stream);
  return Object.freeze({
    branchId: head.branchId,
    revision: currentRevision,
    effectiveGeneration: head.effectiveGeneration,
  });
}

/**
 * Compare an expected head against the active one.
 *
 * Order matters: branch first, then revision, then generation. A client on
 * a superseded branch is told `STALE_BRANCH` even when its revision happens
 * to match, because "revision 4" means something different on each branch
 * and reporting a revision match would invite it to retry rather than
 * resync.
 */
export function evaluateExpectedBranchHead(
  active: IActiveBranchHead,
  expected: IExpectedBranchHead,
  namedBranchStatus: EventHistoryBranchStatus | null,
): ExpectedHeadVerdict {
  const refuse = (code: ExpectedHeadRefusalCode): ExpectedHeadVerdict =>
    Object.freeze({
      kind: 'refused',
      code,
      namedBranchStatus,
      activeHead: active,
      resyncAction: EXPECTED_HEAD_RESYNC_ACTION,
    });
  if (expected.branchId !== active.branchId) return refuse('STALE_BRANCH');
  if (expected.revision !== active.revision) return refuse('STALE_REVISION');
  if (expected.effectiveGeneration !== active.effectiveGeneration) {
    return refuse('STALE_GENERATION');
  }
  return Object.freeze({ kind: 'current', activeHead: active });
}

/** Read the active head and the named branch's status, then compare. */
export function validateExpectedBranchHead(
  store: SQLiteEventHistoryBranchStore,
  stream: IEventHistoryStreamRef,
  currentRevision: number,
  expected: IExpectedBranchHead,
): ExpectedHeadVerdict {
  return evaluateExpectedBranchHead(
    readActiveBranchHead(store, stream, currentRevision),
    expected,
    store.readBranch(stream, expected.branchId)?.status ?? null,
  );
}
