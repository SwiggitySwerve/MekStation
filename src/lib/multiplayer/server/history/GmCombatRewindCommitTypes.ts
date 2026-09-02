/**
 * Closed result vocabulary for the combat rewind COMMIT
 * (add-authoritative-history-branches; seam 3b-iv-a).
 *
 * Preview members are reused verbatim so a surface that already branches
 * on `GmCombatRewindPreviewRefusal` can keep one switch. The three
 * extra members are commit-only: they name failures that a read-only
 * preview cannot produce.
 */

import type Database from 'better-sqlite3';

import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { SQLiteEventHistoryArtifactManifestStore } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IBranchSegmentReader } from '@/lib/events/journal/EventHistoryBranchResolver';
import type { ICandidateVerificationOptions } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { IEventHistoryCorrectionLease } from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';
import type { IViewerProjectionProbe } from '@/lib/events/journal/EventHistoryImpactDerivation';
import type { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import type { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';

import { GENERATION_EXHAUSTED } from '@/lib/events/journal/EventHistoryActivation';
import { EventHistoryArtifactManifestError } from '@/lib/events/journal/EventHistoryArtifactManifest';
import { EventHistoryBranchError } from '@/lib/events/journal/EventHistoryBranchContract';
import { EventHistoryCorrectionLeaseError } from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';

import type {
  GmCombatRewindPreviewRefusal,
  IGmCombatRewindPreviewRequest,
} from './GmCombatRewindPreview';

export const GM_COMBAT_REWIND_COMMIT_REFUSALS = [
  'gm-role-required',
  'actor-mismatch',
  'state-not-owned',
  'replacement-events-unsupported',
  'PROJECTION_REBUILDING',
  'campaign-receipt-delivered',
  'no-authoritative-history',
  'fog-preview-unsupported',
  'STALE_BRANCH',
  'STALE_REVISION',
  'STALE_GENERATION',
  'rewind-target-above-head',
  'rewind-target-below-branch-base',
  'candidate-verification-failed',
  'generation-exhausted',
  'correction-lease-held',
] as const satisfies readonly (
  | GmCombatRewindPreviewRefusal
  | 'candidate-verification-failed'
  | 'generation-exhausted'
  | 'correction-lease-held'
)[];

export type GmCombatRewindCommitRefusal =
  (typeof GM_COMBAT_REWIND_COMMIT_REFUSALS)[number];

export interface IGmCombatRewindCommitRequest extends IGmCombatRewindPreviewRequest {
  readonly actor: string;
  readonly reason: string;
}

export type GmCombatRewindCommitResult =
  | {
      readonly kind: 'committed';
      readonly matchId: string;
      readonly activatedBranchId: string;
      readonly priorBranchId: string;
      readonly effectiveGeneration: number;
      readonly invalidations: readonly IAffectedArtifact[];
    }
  | {
      readonly kind: 'refused';
      readonly reason: GmCombatRewindCommitRefusal;
      readonly detail: string;
    };

export interface IGmCombatRewindCommitDeps<TState = unknown> {
  readonly db: Database.Database;
  readonly branches: SQLiteEventHistoryBranchStore;
  readonly leases: SQLiteEventHistoryCorrectionLeaseStore;
  readonly manifests: SQLiteEventHistoryArtifactManifestStore;
  readonly reader: IBranchSegmentReader<IProjectableBranchEvent>;
  readonly probe: IViewerProjectionProbe;
  readonly readOutcomeId: (matchId: string) => Promise<string | null>;
  readonly priorHeadRevision: number;
  readonly viewerIds: readonly string[];
  readonly verification: ICandidateVerificationOptions<TState>;
  /** Process holding the lease. Fencing compares this; the actor is audit. */
  readonly owner: string;
  readonly ttlMs?: number;
  readonly nowIso: () => string;
  /**
   * Fires while the lease is live (after acquire, and again just before
   * activate) so a test can observe the shipped 14.3 window without a
   * new gate here.
   */
  readonly onLeaseHeld?: (
    lease: IEventHistoryCorrectionLease,
  ) => void | Promise<void>;
}

export function refuseCommit(
  reason: GmCombatRewindCommitRefusal,
  detail: string,
): GmCombatRewindCommitResult {
  return Object.freeze({ kind: 'refused', reason, detail });
}

/**
 * True when a campaign has accepted this outcome. Presence is the whole
 * answer - copied from the preview so the two halves cannot disagree
 * about which row closes the 13.4 boundary.
 */
export function campaignHasTakenDelivery(
  db: Database.Database,
  outcomeId: string,
): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS present FROM campaign_combat_outcome_inbox
        WHERE outcome_id = ? LIMIT 1`,
    )
    .get(outcomeId) as { readonly present: number } | undefined;
  return row !== undefined;
}

function isCommitRefusal(value: string): value is GmCombatRewindCommitRefusal {
  return (GM_COMBAT_REWIND_COMMIT_REFUSALS as readonly string[]).includes(
    value,
  );
}

export function mapCommitCaught(error: unknown): GmCombatRewindCommitResult {
  if (error instanceof EventHistoryCorrectionLeaseError) {
    if (
      error.code === 'stale-expected-head' &&
      error.staleHeadReason !== undefined &&
      isCommitRefusal(error.staleHeadReason)
    ) {
      return refuseCommit(error.staleHeadReason, error.message);
    }
    if (error.staleHeadReason === 'STALE_DIGEST') {
      return refuseCommit('STALE_REVISION', error.message);
    }
    return refuseCommit('correction-lease-held', error.message);
  }
  if (error instanceof EventHistoryBranchError) {
    if (error.code === GENERATION_EXHAUSTED) {
      return refuseCommit('generation-exhausted', error.message);
    }
    if (error.code === 'branch-integrity') {
      return refuseCommit('candidate-verification-failed', error.message);
    }
  }
  if (error instanceof EventHistoryArtifactManifestError) {
    return refuseCommit('candidate-verification-failed', error.message);
  }
  throw error;
}
