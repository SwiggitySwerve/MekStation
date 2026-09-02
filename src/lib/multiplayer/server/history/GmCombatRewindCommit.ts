/**
 * The COMMIT half of a GM combat rewind
 * (add-authoritative-history-branches; umbrella 13.5, seam 3b-iv-a).
 *
 * Preview answered "what would break?". This module does the correction:
 * fence the stream, cut a candidate at the approved target, prove it,
 * seal the blast radius, and activate. The route (3b-iv-b) authorizes
 * the caller and wires the same deps shape the preview route already
 * uses; this file never opens a database of its own.
 *
 * ORDER IS THE CONTRACT. A delivered campaign receipt is asked BEFORE
 * any write because presence is the whole 13.4 rule - once a campaign
 * spent the outcome, no combat-only truncation can unmake that spend,
 * and a lease or branch written first would have to be cleaned up for
 * a rewind that was never allowed. The lease opens the rebuild window
 * the shipped 14.3 gate already watches (`refuseDuringHistoryRebuild`
 * via `readMatchStreamRebuild`); this module adds no second gate. The
 * lease is released in `finally` so every refusal reopens the stream
 * the same way a successful activation does.
 *
 * REWIND IS TRUNCATION ONLY. The candidate is cut at `targetRevision`
 * (`baseRevision` on the build request), not at the fenced head - a
 * cut at the head would replay history forward and leave nothing taken
 * back. Replacement events wait for their own journal change.
 *
 * GM here means the match's current host (finding #55), the same
 * identity the preview module re-checks through
 * `evaluateGmInterventionAuthority`.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IHeldCorrectionLease } from '@/lib/events/journal/EventHistoryCorrectionLeaseContract';
import type { IGmAuthorityContext } from '@/types/interventions';

import { activateCandidateBranch } from '@/lib/events/journal/EventHistoryActivation';
import { resolveBranchPath } from '@/lib/events/journal/EventHistoryBranchResolver';
import { createCorrectionCandidateBranch } from '@/lib/events/journal/EventHistoryCandidateBuild';
import { verifyCandidatePath } from '@/lib/events/journal/EventHistoryCandidateVerification';
import { readActiveBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import { deriveAndSealCandidateImpact } from '@/lib/events/journal/EventHistoryImpactDerivation';
import { evaluateGmInterventionAuthority } from '@/lib/interventions/GmInterventionAuthority';

import {
  campaignHasTakenDelivery,
  mapCommitCaught,
  refuseCommit,
  type IGmCombatRewindCommitDeps,
  type IGmCombatRewindCommitRequest,
  type GmCombatRewindCommitResult,
} from './GmCombatRewindCommitTypes';
import { matchStreamRef } from './GmCombatRewindPreview';

export {
  GM_COMBAT_REWIND_COMMIT_REFUSALS,
  refuseCommit,
  type GmCombatRewindCommitRefusal,
  type GmCombatRewindCommitResult,
  type IGmCombatRewindCommitDeps,
  type IGmCombatRewindCommitRequest,
} from './GmCombatRewindCommitTypes';

const DEFAULT_LEASE_TTL_MS = 30_000;

/**
 * Perform the approved rewind. Authorization of the HTTP caller is the
 * route's job; the actor/GM check below is the same domain re-check the
 * preview runs so a direct caller cannot skip it.
 */
export async function commitGmCombatRewind<TState>(
  deps: IGmCombatRewindCommitDeps<TState>,
  authority: IGmAuthorityContext,
  request: IGmCombatRewindCommitRequest,
): Promise<GmCombatRewindCommitResult> {
  const decision = evaluateGmInterventionAuthority(authority, {
    domain: 'combat',
    kind: 'undo',
    actorId: request.actor,
    targetRefs: [`game:${request.matchId}`],
  });
  if (decision.status === 'rejected') {
    return refuseCommit(decision.code, decision.reason);
  }

  if ('replacementEvents' in request) {
    return refuseCommit(
      'replacement-events-unsupported',
      'This rewind truncates history; replacement events are not yet supported',
    );
  }

  const stream = matchStreamRef(request.matchId);
  const outcomeId = await deps.readOutcomeId(request.matchId);
  if (outcomeId !== null && campaignHasTakenDelivery(deps.db, outcomeId)) {
    return refuseCommit(
      'campaign-receipt-delivered',
      `A campaign has taken delivery of outcome '${outcomeId}'; a combat-only rewind cannot unmake what it was spent on`,
    );
  }

  if (deps.branches.readEffectiveHead(stream) === null) {
    return refuseCommit(
      'no-authoritative-history',
      `Match '${request.matchId}' has no authoritative history to rewind; nothing has been recorded against its stream`,
    );
  }

  const priorHead = readActiveBranchHead(
    deps.branches,
    stream,
    deps.priorHeadRevision,
  );
  if (request.targetRevision >= deps.priorHeadRevision) {
    return refuseCommit(
      'rewind-target-above-head',
      `Revision ${request.targetRevision} is not below the head at ${deps.priorHeadRevision}; there is nothing to take back`,
    );
  }
  const parent = deps.branches.requireBranch(stream, priorHead.branchId);
  if (
    request.targetRevision < parent.baseRevision ||
    request.targetRevision < 1
  ) {
    return refuseCommit(
      'rewind-target-below-branch-base',
      `Revision ${request.targetRevision} precedes branch '${parent.branchId}' base revision ${parent.baseRevision}`,
    );
  }

  return runCorrection(deps, request, stream);
}

/**
 * The mutating half. Isolated so a receipt or target refusal never
 * reaches acquire - those paths must leave storage byte-identical.
 */
async function runCorrection<TState>(
  deps: IGmCombatRewindCommitDeps<TState>,
  request: IGmCombatRewindCommitRequest,
  stream: IEventHistoryStreamRef,
): Promise<GmCombatRewindCommitResult> {
  let held: IHeldCorrectionLease | null = null;
  try {
    const lease = deps.leases.acquireCorrectionLease({
      ...stream,
      owner: deps.owner,
      actor: request.actor,
      reason: request.reason,
      ttlMs: deps.ttlMs ?? DEFAULT_LEASE_TTL_MS,
      expectedBranchId: request.expectedBranchId,
      expectedRevision: request.expectedRevision,
      expectedDigest: request.expectedDigest,
      expectedGeneration: request.expectedGeneration,
    });
    held = {
      leaseId: lease.leaseId,
      owner: lease.owner,
      fencingEpoch: lease.fencingEpoch,
    };
    await deps.onLeaseHeld?.(lease);

    const now = deps.nowIso();
    const candidate = createCorrectionCandidateBranch(deps.db, deps.leases, {
      ...stream,
      ...held,
      baseRevision: request.targetRevision,
      createdAt: now,
    });

    try {
      await verifyCandidatePath(
        deps.reader,
        resolveBranchPath(
          deps.branches,
          stream,
          candidate.branchId,
          candidate.baseRevision,
        ),
        deps.verification,
      );
    } catch (error) {
      return refuseCommit(
        'candidate-verification-failed',
        error instanceof Error
          ? error.message
          : 'The candidate path would not reproduce',
      );
    }

    await deriveAndSealCandidateImpact(deps.db, deps.branches, deps.reader, {
      stream,
      candidateBranchId: candidate.branchId,
      priorHeadRevision: deps.priorHeadRevision,
      viewerIds: deps.viewerIds,
      probe: deps.probe,
      derivedAt: now,
      verification: deps.verification,
    });

    await deps.onLeaseHeld?.(lease);
    const activated = activateCandidateBranch(
      deps.db,
      deps.branches,
      deps.leases,
      deps.manifests,
      {
        stream,
        candidateBranchId: candidate.branchId,
        held,
        reason: request.reason,
        activatedAt: now,
      },
    );

    return Object.freeze({
      kind: 'committed',
      matchId: request.matchId,
      activatedBranchId: activated.branchId,
      priorBranchId: activated.supersededBranchId,
      effectiveGeneration: activated.effectiveGeneration,
      invalidations: activated.invalidations,
    });
  } catch (error) {
    return mapCommitCaught(error);
  } finally {
    if (held !== null) {
      try {
        deps.leases.releaseCorrectionLease(stream, {
          leaseId: held.leaseId,
          owner: held.owner,
        });
      } catch {
        // Already released or taken over: the stream is open or fenced
        // by its new owner. Swallow so the domain result is what returns.
      }
    }
  }
}
