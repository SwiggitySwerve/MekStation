/**
 * Stream command admission (add-authoritative-history-branches task 2.2;
 * design D2).
 *
 * One decision, taken before a command is allowed to append: may this
 * command touch this stream right now, and if not, which refusal is the
 * true one? Three answers - admitted, `PROJECTION_REBUILDING`, or one of
 * PR 1's expected-head staleness codes.
 *
 * The two properties this module exists to hold:
 *
 * - **The rebuild refusal comes FIRST.** A client arriving mid-rebuild is
 *   very often also stale, because the head it knows is the one the rebuild
 *   is about to replace. Answering `STALE_BRANCH` would send it to resync
 *   against a head that is on its way out, and it would arrive stale again.
 *   The rebuild verdict is the one still true a moment from now.
 * - **Nothing is queued.** The verdict is the RETURN VALUE of a synchronous
 *   call. There is no queue, no timer, and no promise a caller could be
 *   holding while work drains later - so "refused during rebuild" cannot
 *   quietly become "applied after activation". A refused command leaves no
 *   trace at all: this function reads, and never writes.
 *
 * Expiry releases the stream BY THE CLOCK, not by a write. `readLiveLease`
 * stops reporting a lapsed lease the instant it lapses, so admission
 * resumes with no reaper having to run. A write-based release would be one
 * more thing that can fail, and its failure mode is a stream blocked
 * forever by a lease whose owner is already gone.
 *
 * Not claimed here: this is the decision, not its adoption. No server
 * command path calls it yet - the same shape PR 1 shipped
 * `validateExpectedBranchHead` in, and wiring it into the live match and
 * campaign command paths is the adoption step that lands with PR 3.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/gm-combat-interventions/spec.md
 */

import type {
  EventHistoryBranchStatus,
  IEventHistoryStreamRef,
} from './EventHistoryBranchContract';
import type {
  ExpectedHeadRefusalCode,
  IActiveBranchHead,
  IExpectedBranchHead,
} from './EventHistoryExpectedHead';
import type { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';
import type { SQLiteEventHistoryCorrectionLeaseStore } from './SQLiteEventHistoryCorrectionLeaseStore';

import {
  EXPECTED_HEAD_RESYNC_ACTION,
  readActiveBranchHead,
  validateExpectedBranchHead,
} from './EventHistoryExpectedHead';

/**
 * What a client refused mid-rebuild should do: come back. Deliberately not
 * "resync" - the head it would resync to is the one being replaced.
 */
export const REBUILD_RETRY_ACTION = 'retry-after-rebuild' as const;

export const PROJECTION_REBUILDING_CODE = 'PROJECTION_REBUILDING' as const;

export type StreamCommandAdmission =
  | { readonly kind: 'admitted'; readonly activeHead: IActiveBranchHead }
  | {
      readonly kind: 'rebuilding';
      readonly code: typeof PROJECTION_REBUILDING_CODE;
      /** Always true: the stream reopens on expiry, release, or activation. */
      readonly retryable: true;
      readonly leaseId: string;
      readonly owner: string;
      readonly fencingEpoch: number;
      readonly activeHead: IActiveBranchHead;
      readonly action: typeof REBUILD_RETRY_ACTION;
    }
  | {
      readonly kind: 'stale';
      readonly code: ExpectedHeadRefusalCode;
      readonly namedBranchStatus: EventHistoryBranchStatus | null;
      readonly activeHead: IActiveBranchHead;
      readonly resyncAction: typeof EXPECTED_HEAD_RESYNC_ACTION;
    };

/**
 * The rebuild verdict on its own, named so the paths that can only
 * produce THIS arm do not each spell the `Extract<>` out again.
 */
export type StreamRebuildRefusal = Extract<
  StreamCommandAdmission,
  { kind: 'rebuilding' }
>;

/**
 * The rebuild arm on its own: is a correction lease live on this stream?
 *
 * Extracted because not every command path can consume the full
 * admission. The combat wire carries no client-claimed expected head, so
 * there is nothing there to compare and only this question can honestly be
 * asked. Pulling it out means the gate that asks less runs the SAME rule
 * rather than a second copy that could drift from it.
 *
 * Returns null when no rebuild is running - which is not the same as
 * "admitted": a caller that can compare an expected head still has to.
 */
export function readRebuildRefusal(
  branches: SQLiteEventHistoryBranchStore,
  leases: SQLiteEventHistoryCorrectionLeaseStore,
  stream: IEventHistoryStreamRef,
  currentRevision: number,
): StreamRebuildRefusal | null {
  const live = leases.readLiveLease(stream);
  if (live === null) return null;
  return Object.freeze({
    kind: 'rebuilding',
    code: PROJECTION_REBUILDING_CODE,
    retryable: true,
    leaseId: live.leaseId,
    owner: live.owner,
    fencingEpoch: live.fencingEpoch,
    activeHead: readActiveBranchHead(branches, stream, currentRevision),
    action: REBUILD_RETRY_ACTION,
  });
}

/**
 * Decide whether one ordinary command may append to this stream.
 *
 * Reads only. `currentRevision` is the journal revision the caller already
 * read, kept a parameter rather than a second read so the whole decision is
 * taken against one instant the caller controls.
 *
 * The lease id, owner, and epoch ride on the rebuild verdict because the
 * authority needs them - they are what a resuming owner or an operator
 * matches against. Player-facing serialization redacts identifiers a viewer
 * may not see (design D5); that projection is the wire layer's job, not
 * this decision's.
 */
export function admitStreamCommand(
  branches: SQLiteEventHistoryBranchStore,
  leases: SQLiteEventHistoryCorrectionLeaseStore,
  stream: IEventHistoryStreamRef,
  currentRevision: number,
  expected: IExpectedBranchHead,
): StreamCommandAdmission {
  const rebuilding = readRebuildRefusal(
    branches,
    leases,
    stream,
    currentRevision,
  );
  if (rebuilding !== null) return rebuilding;
  const verdict = validateExpectedBranchHead(
    branches,
    stream,
    currentRevision,
    expected,
  );
  if (verdict.kind === 'current') {
    return Object.freeze({
      kind: 'admitted',
      activeHead: verdict.activeHead,
    });
  }
  return Object.freeze({
    kind: 'stale',
    code: verdict.code,
    namedBranchStatus: verdict.namedBranchStatus,
    activeHead: verdict.activeHead,
    resyncAction: verdict.resyncAction,
  });
}
