/**
 * Atomic candidate activation (add-authoritative-history-branches tasks
 * 2.4 / 2.5, receipt-free arms; design D2).
 *
 * The moment a replacement becomes authoritative. Four facts change
 * together or none of them do: the prior branch is superseded, the
 * candidate becomes effective, the supersession row binding the two
 * generations is written, and the effective head is repointed one
 * generation higher.
 *
 * **This one really is atomic, and that is worth stating** because the
 * sibling seam is not. Impact derivation could not be one transaction:
 * materialising a branch path is async and better-sqlite3 transactions are
 * strictly synchronous, so "no manifest for an unverified candidate" holds
 * there by control flow. Here every write is synchronous, so the lock, the
 * verification, and all four mutations sit inside a single
 * `db.transaction`. A failure at any point takes the whole activation back
 * out - there is no half-activated stream to recover from.
 *
 * **The supersession row IS the fence.** "Generation N is fenced" and "a
 * supersession row exists with `prior_generation = N`" are the same fact,
 * so it is recorded once rather than twice. A separate pre-activation fence
 * record earns its existence only in the arm where a verified candidate is
 * fenced but WAITS on an unresolved old-generation delivery - and that arm
 * is not claimed here (see below). With nothing to wait for, the fence and
 * the activation are the same commit.
 *
 * **Stopping new corrections needs no new mechanism.** Acquiring a
 * correction lease already compares the caller's expected head against the
 * live one, so once the generation moves, a lease that still names the old
 * one is refused. The fence is enforced by machinery that already existed;
 * a test pins it rather than a second guard duplicating it.
 *
 * Order inside the transaction is forced by storage: the prior branch is
 * demoted BEFORE the candidate is promoted, because the partial unique
 * index permits exactly one effective branch per stream and would fire on
 * the overlap.
 *
 * `GENERATION_EXHAUSTED` is checked before any write. Being inside a
 * transaction would roll a late refusal back anyway, but a rejection that
 * arrives only as a constraint violation after the branches have moved
 * tells the caller the wrong thing about what happened.
 *
 * NOT claimed, and none of it is buildable here: "serialize the fence
 * against lease-to-admitted promotion" and "stop new admissions". There is
 * no delivery lease, no admission state, and no lease-to-admitted promotion
 * anywhere on main - the cross-stream effect-receipt change that owns them
 * is unstarted, and the only outbox that exists is a pending/published
 * publication outbox with no lease or admission states at all. Both serial
 * orders are therefore proven against the correction lease, which is the
 * lease this stream actually has. Also not claimed: superseding unleased
 * pending rows, the waiting arm for an unknown target result, the
 * higher-version replacement outbox and pending saga, and the
 * accepted-prior-receipt path.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import type { IAffectedArtifact } from './EventHistoryArtifactManifest';
import type { SQLiteEventHistoryArtifactManifestStore } from './EventHistoryArtifactManifest';
import type {
  IEventHistoryStreamRef,
  IEventHistoryBranch,
} from './EventHistoryBranchContract';
import type { IHeldCorrectionLease } from './EventHistoryCorrectionLeaseContract';
import type { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';
import type { SQLiteEventHistoryCorrectionLeaseStore } from './SQLiteEventHistoryCorrectionLeaseStore';

import { EventHistoryBranchError } from './EventHistoryBranchContract';

/** The typed refusal the spec names when the generation cannot advance. */
export const GENERATION_EXHAUSTED = 'generation-exhausted' as const;

export interface IActivationRequest {
  readonly stream: IEventHistoryStreamRef;
  readonly candidateBranchId: string;
  /** The lease the activating owner holds, proven before anything moves. */
  readonly held: IHeldCorrectionLease;
  readonly reason: string;
  readonly activatedAt: string;
}

export interface IActivationResult {
  /** The branch that is now effective. */
  readonly branchId: string;
  readonly supersededBranchId: string;
  readonly priorGeneration: number;
  readonly effectiveGeneration: number;
  /** What this activation invalidated, from the sealed manifest. */
  readonly invalidations: readonly IAffectedArtifact[];
}

/**
 * Activate a verified candidate.
 *
 * Everything - the lease lock, the head comparison, the manifest check, the
 * generation bound, and all four writes - happens inside ONE transaction,
 * so a caller either sees the whole new generation or the untouched old
 * one. Each guard is a typed refusal raised by the machinery that owns the
 * rule, not restated here: the lease store refuses a stale owner or a moved
 * head, and the manifest store refuses a candidate whose impact was never
 * sealed or no longer matches its rows.
 */
export function activateCandidateBranch(
  db: Database.Database,
  branches: SQLiteEventHistoryBranchStore,
  leases: SQLiteEventHistoryCorrectionLeaseStore,
  manifests: SQLiteEventHistoryArtifactManifestStore,
  request: IActivationRequest,
): IActivationResult {
  const { stream } = request;
  return db.transaction((): IActivationResult => {
    // 1. The lease, locked and verified: id, owner, and fencing epoch. An
    //    owner that was taken over while it was away fails here.
    const lease = leases.requireLiveLease(stream, request.held);
    // 2. The head the lease bound must still be the head.
    leases.assertExpectedHeadIsCurrent(stream, lease);

    const candidate = branches.requireBranch(stream, request.candidateBranchId);
    const priorHead = branches.requireEffectiveHead(stream);

    // 3. The impact must be sealed AND still describe its own rows.
    //    Activation publishes invalidations from it; without one there is
    //    no answer to what this activation breaks.
    manifests.verifyArtifactManifest(stream, candidate.branchId);
    const manifest = manifests.readArtifactManifest(stream, candidate.branchId);
    const invalidations = manifest === null ? [] : manifest.entries;

    // 4. Before any write: is there a generation to activate into?
    const priorGeneration = priorHead.effectiveGeneration;
    assertGenerationCanAdvance(priorGeneration, stream);
    const effectiveGeneration = priorGeneration + 1;

    // 5. Demote first - the partial unique index permits one effective
    //    branch, and promoting before demoting would overlap.
    branches.transitionBranchStatus(stream, priorHead.branchId, 'superseded');
    branches.transitionBranchStatus(stream, candidate.branchId, 'effective');
    writeSupersession(db, {
      stream,
      priorBranch: priorHead.branchId,
      candidate,
      priorGeneration,
      effectiveGeneration,
      reason: request.reason,
      recordedAt: request.activatedAt,
    });
    repointEffectiveHead(db, {
      stream,
      branchId: candidate.branchId,
      effectiveGeneration,
      installedAt: request.activatedAt,
    });

    return Object.freeze({
      branchId: candidate.branchId,
      supersededBranchId: priorHead.branchId,
      priorGeneration,
      effectiveGeneration,
      invalidations,
    });
  })();
}

/**
 * Refuse when the prior generation has no successor inside the safe-integer
 * range. The storage CHECK bounds the column at the same value, so an
 * activation past it could not be written anyway - but it would fail as an
 * anonymous constraint violation after the branches had already moved, and
 * the caller deserves the specific answer before that.
 */
function assertGenerationCanAdvance(
  priorGeneration: number,
  stream: IEventHistoryStreamRef,
): void {
  if (
    Number.isSafeInteger(priorGeneration) &&
    Number.isSafeInteger(priorGeneration + 1) &&
    priorGeneration + 1 > priorGeneration
  ) {
    return;
  }
  throw new EventHistoryBranchError(
    GENERATION_EXHAUSTED,
    `Stream ${stream.streamType}/${stream.streamId} is at generation ${priorGeneration} and has no next safe integer to activate into`,
  );
}

/** The immutable fact binding one generation step. This is the fence. */
function writeSupersession(
  db: Database.Database,
  input: {
    readonly stream: IEventHistoryStreamRef;
    readonly priorBranch: string;
    readonly candidate: IEventHistoryBranch;
    readonly priorGeneration: number;
    readonly effectiveGeneration: number;
    readonly reason: string;
    readonly recordedAt: string;
  },
): void {
  db.prepare(
    `INSERT INTO event_history_supersessions (
       stream_type, stream_id, superseded_branch_id, replacement_branch_id,
       prior_generation, replacement_generation, reason, recorded_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.stream.streamType,
    input.stream.streamId,
    input.priorBranch,
    input.candidate.branchId,
    input.priorGeneration,
    input.effectiveGeneration,
    input.reason,
    input.recordedAt,
  );
}

/** Install the new head. One row per stream, so this is an update. */
function repointEffectiveHead(
  db: Database.Database,
  input: {
    readonly stream: IEventHistoryStreamRef;
    readonly branchId: string;
    readonly effectiveGeneration: number;
    readonly installedAt: string;
  },
): void {
  const result = db
    .prepare(
      `UPDATE event_history_effective_heads
         SET branch_id = ?, effective_generation = ?, installed_at = ?
       WHERE stream_type = ? AND stream_id = ?`,
    )
    .run(
      input.branchId,
      input.effectiveGeneration,
      input.installedAt,
      input.stream.streamType,
      input.stream.streamId,
    );
  if (result.changes === 1) return;
  throw new EventHistoryBranchError(
    'no-effective-branch',
    `Stream ${input.stream.streamType}/${input.stream.streamId} has no effective head row to repoint`,
  );
}
