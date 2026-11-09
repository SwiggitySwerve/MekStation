/**
 * Retroactive campaign correction as replacement-branch replay
 * (umbrella 16.2, 16.4 writer half).
 *
 * A rewind is not a negative forward-day loop. The trusted base is the
 * cutoff `previewGmCampaignRewind` already validated. This module
 * fences the campaign stream, cuts a candidate there, replays only the
 * retained set the caller named, verifies that path, and seals the
 * campaign impact manifest. Activation is 16.3 clause B and is not
 * performed here.
 *
 * Two things this file does not claim:
 * - Sealing does not declare every affected family. The manifest
 *   carries artifactKind, artifactId, sourceRevision and no family.
 * - Retained-set selection is unowned. A segment read above the base
 *   returns the whole tail; a correction drops something.
 *   `IRetainedSourceEvent` is produced nowhere. The caller passes it.
 */

import type Database from 'better-sqlite3';

import type { IRetainedSourceEvent } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import type { ICampaignJournalEnvelope } from '@/lib/campaign/sync/JournalCampaignEventStore';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { ICandidateVerificationOptions } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type {
  IEventHistoryCorrectionLease,
  IHeldCorrectionLease,
} from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';
import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type {
  CampaignFoldFact,
  IDerivedCampaignImpact,
} from '@/lib/interventions/GmCampaignImpactDerivation';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import { readCampaignBranchAnchor } from '@/lib/campaign/rebuild/CampaignBranchAnchor';
import { campaignBranchSegmentReader } from '@/lib/campaign/rebuild/campaignBranchSegmentReader';
import { replayCampaignReplacement } from '@/lib/campaign/rebuild/CampaignReplacementReplay';
import {
  EventHistoryArtifactManifestError,
  SQLiteEventHistoryArtifactManifestStore,
} from '@/lib/events/journal/EventHistoryArtifactManifest';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { resolveBranchPath } from '@/lib/events/journal/EventHistoryBranchResolver';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { verifyCandidatePath } from '@/lib/events/journal/EventHistoryCandidateVerification';
import { EventHistoryCorrectionLeaseError } from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import { deriveAndSealCampaignImpact } from '@/lib/interventions/GmCampaignImpactDerivation';

const DEFAULT_LEASE_TTL_MS = 30_000;

export const CAMPAIGN_RETROACTIVE_CORRECTION_REFUSALS = [
  'correction-lease-held',
  'base-ahead-of-head',
  'replay-divergence',
  'candidate-verification-failed',
  'sealer-failure',
] as const;

export type CampaignRetroactiveCorrectionRefusal =
  (typeof CAMPAIGN_RETROACTIVE_CORRECTION_REFUSALS)[number];

export interface ICampaignRetroactiveCorrectionCommitRequest {
  readonly campaignId: string;
  /**
   * Validated preview cutoff. Used as the candidate cut, never as a
   * day count to walk backward.
   */
  readonly baseRevision: number;
  /** Caller-chosen keep-set. This module does not invent a policy. */
  readonly retainedEvents: readonly IRetainedSourceEvent[];
  readonly owner: string;
  readonly actor: string;
  readonly reason: string;
  readonly extras?: readonly CampaignFoldFact[];
}

export interface ICampaignRetroactiveCorrectionCommitDeps<TState> {
  readonly db: Database.Database;
  readonly journal: IEventJournal<ICampaignJournalEnvelope>;
  readonly verification: ICandidateVerificationOptions<TState>;
  readonly ttlMs?: number;
  readonly nowIso: () => string;
  /**
   * Fires while the lease is live so a nested commit can observe the
   * held window without this module activating anything.
   */
  readonly onLeaseHeld?: (
    lease: IEventHistoryCorrectionLease,
  ) => void | Promise<void>;
}

export type CampaignRetroactiveCorrectionCommitResult =
  | {
      readonly kind: 'sealed';
      readonly campaignId: string;
      readonly candidateBranchId: string;
      readonly baseRevision: number;
      readonly sourceBranchId: string;
      readonly sourceHeadRevision: number;
      readonly replayedCommandCount: number;
      readonly manifest: IDerivedCampaignImpact;
    }
  | {
      readonly kind: 'refused';
      readonly reason: CampaignRetroactiveCorrectionRefusal;
      readonly detail: string;
    };

/**
 * Build a typed refusal. Keeps every exit on the same closed shape
 * so a caller never has to catch a thrown string.
 */
function refuse(
  reason: CampaignRetroactiveCorrectionRefusal,
  detail: string,
): CampaignRetroactiveCorrectionCommitResult {
  return Object.freeze({ kind: 'refused', reason, detail });
}

/**
 * Release a held lease and swallow a race on the same handle.
 * A takeover or a double-release must not hide the domain result.
 */
function releaseHeldLease(
  leases: SQLiteEventHistoryCorrectionLeaseStore,
  campaignId: string,
  held: IHeldCorrectionLease | null,
): void {
  if (held === null) return;
  try {
    leases.releaseCorrectionLease(campaignStreamRef(campaignId), {
      leaseId: held.leaseId,
      owner: held.owner,
    });
  } catch {
    // Stream is already open or fenced by a new owner.
  }
}

/**
 * D-3a: under a freshly acquired lease, an earlier `building` candidate
 * with no sealed manifest is a correction that crashed or was abandoned:
 * the partial unique index allows one live lease and it is ours, so
 * nothing can still be building it. Block it. A SEALED candidate is not
 * swept: sealing is where this commit stops, and activation (16.3) is a
 * later step that has not run for it yet. Runs before this commit mints
 * its own candidate, so that one is never swept.
 */
function blockStrandedCandidates(
  branches: SQLiteEventHistoryBranchStore,
  manifests: SQLiteEventHistoryArtifactManifestStore,
  stream: IEventHistoryStreamRef,
): void {
  for (const branch of branches.listBranches(stream)) {
    if (branch.status !== 'building') continue;
    if (manifests.readArtifactManifest(stream, branch.branchId) !== null) {
      continue;
    }
    branches.transitionBranchStatus(stream, branch.branchId, 'blocked');
  }
}

/**
 * D-3a: a candidate this commit built and refused or failed on is
 * terminal. Blocked while the lease is still held. A failure to block
 * must not replace the refusal or error the caller is owed (and this
 * module must not import the logger, which reads `process.env`); the
 * next commit's stranded sweep retries it.
 */
function blockFailedCandidate(
  branches: SQLiteEventHistoryBranchStore,
  stream: IEventHistoryStreamRef,
  branchId: string,
): void {
  try {
    if (branches.readBranch(stream, branchId)?.status === 'building') {
      branches.transitionBranchStatus(stream, branchId, 'blocked');
    }
  } catch {
    // Left `building`; the next commit's sweep blocks it.
  }
}

/**
 * Map a lease or mint failure that escaped the inner steps.
 * Acquire and cut have no other closed reasons in this vocabulary.
 */
function mapOuterRefusal(
  error: unknown,
): CampaignRetroactiveCorrectionCommitResult {
  if (error instanceof EventHistoryCorrectionLeaseError) {
    return refuse('correction-lease-held', error.message);
  }
  if (error instanceof EventHistoryBranchError) {
    return refuse('base-ahead-of-head', error.message);
  }
  throw error;
}

/**
 * Fence, cut, replay, verify, and seal. Stops before activation.
 *
 * Order is the contract: a held lease is acquired before any branch
 * row, every failure releases it, and the source effective head is
 * never swapped here.
 */
export async function commitCampaignRetroactiveCorrection<TState>(
  deps: ICampaignRetroactiveCorrectionCommitDeps<TState>,
  request: ICampaignRetroactiveCorrectionCommitRequest,
): Promise<CampaignRetroactiveCorrectionCommitResult> {
  const stream = campaignStreamRef(request.campaignId);
  const branches = new SQLiteEventHistoryBranchStore(deps.db);
  const leases = new SQLiteEventHistoryCorrectionLeaseStore(deps.db, branches);
  const sourceHead = readEffectiveStreamHead(deps.db, branches, stream);
  const effective = branches.requireEffectiveHead(stream);
  const manifests = new SQLiteEventHistoryArtifactManifestStore(deps.db);
  let held: IHeldCorrectionLease | null = null;
  let candidateBranchId: string | null = null;
  try {
    const lease = leases.acquireCorrectionLease({
      ...stream,
      owner: request.owner,
      actor: request.actor,
      reason: request.reason,
      ttlMs: deps.ttlMs ?? DEFAULT_LEASE_TTL_MS,
      expectedBranchId: sourceHead.branchId,
      expectedRevision: sourceHead.revision,
      expectedDigest: sourceHead.digest,
      expectedGeneration: effective.effectiveGeneration,
    });
    held = {
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
    };
    blockStrandedCandidates(branches, manifests, stream);
    await deps.onLeaseHeld?.(lease);

    // A base ahead of the head (or not an integer) is refused by the
    // candidate minter itself, which throws EventHistoryBranchError before
    // anything is written; mapOuterRefusal turns that into the typed
    // base-ahead-of-head refusal. No second guard here: one owner.

    const now = deps.nowIso();
    const candidate = createCorrectionCandidateBranch(deps.db, leases, {
      ...stream,
      ...held,
      baseRevision: request.baseRevision,
      createdAt: now,
    });
    candidateBranchId = candidate.branchId;

    let replayedCommandCount = 0;
    try {
      const receipts = await replayCampaignReplacement(deps.journal, deps.db, {
        campaignId: request.campaignId,
        candidateBranchId: candidate.branchId,
        events: request.retainedEvents,
      });
      replayedCommandCount = receipts.length;
    } catch (error) {
      blockFailedCandidate(branches, stream, candidate.branchId);
      return refuse(
        'replay-divergence',
        error instanceof Error
          ? error.message
          : 'Replacement replay diverged from the trusted base',
      );
    }

    const candidateHead = readCampaignBranchAnchor(
      deps.db,
      request.campaignId,
      candidate.branchId,
    );
    try {
      await verifyCandidatePath(
        campaignBranchSegmentReader(deps.journal),
        resolveBranchPath(
          branches,
          stream,
          candidate.branchId,
          candidateHead.revision,
        ),
        deps.verification,
      );
    } catch (error) {
      blockFailedCandidate(branches, stream, candidate.branchId);
      return refuse(
        'candidate-verification-failed',
        error instanceof Error
          ? error.message
          : 'The candidate path would not reproduce',
      );
    }

    try {
      const manifest = await deriveAndSealCampaignImpact(
        deps.db,
        deps.journal,
        {
          stream,
          candidateBranchId: candidate.branchId,
          cutoffRevision: request.baseRevision,
          derivedAt: now,
          extras: request.extras,
        },
      );
      return Object.freeze({
        kind: 'sealed',
        campaignId: request.campaignId,
        candidateBranchId: candidate.branchId,
        baseRevision: request.baseRevision,
        sourceBranchId: sourceHead.branchId,
        sourceHeadRevision: sourceHead.revision,
        replayedCommandCount,
        manifest,
      });
    } catch (error) {
      blockFailedCandidate(branches, stream, candidate.branchId);
      return refuse(
        'sealer-failure',
        error instanceof EventHistoryArtifactManifestError ||
          error instanceof Error
          ? error.message
          : 'Campaign impact sealer failed',
      );
    }
  } catch (error) {
    if (candidateBranchId !== null) {
      blockFailedCandidate(branches, stream, candidateBranchId);
    }
    return mapOuterRefusal(error);
  } finally {
    releaseHeldLease(leases, request.campaignId, held);
  }
}
