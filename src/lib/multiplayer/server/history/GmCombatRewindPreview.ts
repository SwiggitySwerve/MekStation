/**
 * What a GM would be approving if they rewound this match
 * (add-authoritative-history-branches; umbrella 13.4 / 13.5).
 *
 * The GM asks "what breaks if I take this match back to revision N?" and
 * gets the answer WITHOUT anything being created, sealed, or activated.
 * Non-mutating is not a nice property here, it is the entire point: an
 * operator cannot be asked to approve a blast radius that the act of
 * showing it to them has already committed to.
 *
 * The truncation is materialised as the PRIOR branch read only as far as
 * the target - `resolveBranchPath(store, stream, priorHead.branchId,
 * targetRevision)`. No candidate row is written, so nothing has to be
 * cleaned up when the GM says no, and a GM who previews ten targets
 * leaves exactly as much behind as one who previews none.
 *
 * The comparison itself is `deriveImpactBetween`, the same function the
 * sealing path runs. A preview computed by a second implementation would
 * agree with activation right up until somebody edited one of them, and
 * the failure mode is an operator approving a radius that was never the
 * real one.
 *
 * REWIND IS TRUNCATION ONLY. Replacement events wait for the journal's
 * root-branch pin to be widened by its own change; a request carrying
 * them is refused rather than silently truncated to the part we can do.
 *
 * THE CAMPAIGN BOUNDARY (13.4), and why receipt-presence is the precise
 * rule rather than a revision comparison: a combat outcome is derived
 * from the match's FINAL state. Once a campaign has received that
 * outcome, there is no revision of this match a combat-only truncation
 * could honestly keep - every revision contributed to the number the
 * campaign already spent, salvaged and repaired against. So the question
 * is not "which revisions are safe" but "has the campaign taken
 * delivery", and the answer is the presence of a receipt.
 *
 * That consult reads TWO DATABASES. `mp_combat_outcome_outbox` (match
 * id -> outcome id) lives in the match store's file; the inbox row that
 * says a campaign accepted it lives in `SQLiteService`'s. There is no
 * SQL join available, and `campaign_combat_outcome_inbox` carries no
 * match id of its own - the outbox is the only bridge between them.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';
import type { IBranchSegmentReader } from '@/lib/events/journal/EventHistoryBranchResolver';
import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { StreamRebuildRefusal } from '@/lib/events/journal/EventHistoryCommandAdmission';
import type { IActiveBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';
import type { IViewerProjectionProbe } from '@/lib/events/journal/EventHistoryImpactDerivation';
import type { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import type { IGmAuthorityContext } from '@/types/interventions';

import {
  materializeBranchPath,
  resolveBranchPath,
} from '@/lib/events/journal/EventHistoryBranchResolver';
import { readDurableStreamRebuild } from '@/lib/events/journal/EventHistoryDurableRebuild';
import {
  readActiveBranchHead,
  validateExpectedBranchHead,
} from '@/lib/events/journal/EventHistoryExpectedHead';
import {
  deriveImpactBetween,
  readStaleCheckpoints,
} from '@/lib/events/journal/EventHistoryImpactDerivation';
import { evaluateGmInterventionAuthority } from '@/lib/interventions/GmInterventionAuthority';

/** The stream a match's authoritative history lives on. */
export function matchStreamRef(matchId: string): IEventHistoryStreamRef {
  return { streamType: 'match', streamId: matchId };
}

/**
 * Every way a preview can be refused. A closed set, so a caller can
 * branch on it and a surface can phrase each one for the GM.
 */
export type GmCombatRewindPreviewRefusal =
  /** The caller is not the owning GM (from the shared authority rule). */
  | 'gm-role-required'
  | 'actor-mismatch'
  | 'state-not-owned'
  /** The request carried replacement events; this rewind truncates only. */
  | 'replacement-events-unsupported'
  /** Another correction holds the lease; the history is moving. */
  | 'PROJECTION_REBUILDING'
  /** A campaign has taken delivery of this combat's outcome (13.4). */
  | 'campaign-receipt-delivered'
  /** The head the GM named is not the one the authority holds. */
  | 'STALE_BRANCH'
  | 'STALE_REVISION'
  | 'STALE_GENERATION'
  /** The target sits outside the branch it would truncate. */
  | 'rewind-target-above-head'
  | 'rewind-target-below-branch-base';

export interface IGmCombatRewindPreviewRequest {
  readonly matchId: string;
  readonly targetRevision: number;
  readonly expectedBranchId: string;
  readonly expectedRevision: number;
  readonly expectedDigest: string;
  readonly expectedGeneration: number;
}

export type GmCombatRewindPreviewResult =
  | {
      readonly kind: 'preview';
      readonly matchId: string;
      readonly targetRevision: number;
      /** The head the truncation would replace. */
      readonly priorHead: IActiveBranchHead;
      readonly changedViewerIds: readonly string[];
      readonly entries: readonly IAffectedArtifact[];
    }
  | {
      readonly kind: 'refused';
      readonly reason: GmCombatRewindPreviewRefusal;
      readonly detail: string;
    };

export interface IGmCombatRewindPreviewDeps {
  /** `SQLiteService`'s database: branches, leases, checkpoints, inbox. */
  readonly db: Database.Database;
  readonly branches: SQLiteEventHistoryBranchStore;
  readonly reader: IBranchSegmentReader<IProjectableBranchEvent>;
  /** The journal revision the prior effective head answers at. */
  readonly priorHeadRevision: number;
  readonly viewerIds: readonly string[];
  readonly probe: IViewerProjectionProbe;
  /**
   * This match's combat-outcome outbox row. A separate port because it
   * lives in the MATCH store's database, which `db` is not.
   */
  readonly readOutcomeId: (matchId: string) => Promise<string | null>;
  /** Seam for the rebuild consult; absent means the durable reader. */
  readonly readRebuild?: (
    stream: IEventHistoryStreamRef,
  ) => StreamRebuildRefusal | null;
}

function refuse(
  reason: GmCombatRewindPreviewRefusal,
  detail: string,
): GmCombatRewindPreviewResult {
  return Object.freeze({ kind: 'refused', reason, detail });
}

/**
 * True when a campaign has accepted this outcome. Presence is the whole
 * answer - the row's revisions are CAMPAIGN stream revisions and mean
 * nothing on this side.
 */
function campaignHasTakenDelivery(
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

/**
 * Derive what a rewind to `targetRevision` would invalidate. Reads only.
 *
 * The order of the refusals is deliberate. Authorization comes first and
 * the probe is never invoked before it passes - a refused caller must
 * not learn the impact through a side channel, which is the whole reason
 * a preview needs a gate at all. The campaign boundary is asked before
 * the expected head, because it is a fact about this match that does not
 * depend on how fresh the GM's view is: a GM holding a stale head should
 * still be told the real reason this rewind can never happen.
 */
export async function previewGmCombatRewind(
  deps: IGmCombatRewindPreviewDeps,
  authority: IGmAuthorityContext,
  request: IGmCombatRewindPreviewRequest,
): Promise<GmCombatRewindPreviewResult> {
  // `kind: 'undo'` is the closed-set member a rewind is; the domain is
  // open. The command's actor is taken FROM the branded authority
  // context, never from the request - which is also why this caller
  // cannot itself produce `actor-mismatch`, even though the shared rule
  // can and the closed set below still names it.
  const decision = evaluateGmInterventionAuthority(authority, {
    domain: 'combat',
    kind: 'undo',
    actorId: authority.actorId,
    targetRefs: [`game:${request.matchId}`],
  });
  if (decision.status === 'rejected') {
    return refuse(
      decision.code as GmCombatRewindPreviewRefusal,
      decision.reason,
    );
  }

  // Truncation only. Refused rather than trimmed: a caller that sent
  // replacement events and got a preview back would believe they had
  // been previewed.
  if ('replacementEvents' in request) {
    return refuse(
      'replacement-events-unsupported',
      'This rewind truncates history; replacement events are not yet supported',
    );
  }

  const stream = matchStreamRef(request.matchId);

  const rebuilding = (deps.readRebuild ?? readDurableStreamRebuild)(stream);
  if (rebuilding !== null) {
    return refuse(
      'PROJECTION_REBUILDING',
      `Another correction is rebuilding this history; ${rebuilding.action}`,
    );
  }

  const outcomeId = await deps.readOutcomeId(request.matchId);
  if (outcomeId !== null && campaignHasTakenDelivery(deps.db, outcomeId)) {
    return refuse(
      'campaign-receipt-delivered',
      `A campaign has taken delivery of outcome '${outcomeId}'; a combat-only rewind cannot unmake what it was spent on`,
    );
  }

  const verdict = validateExpectedBranchHead(
    deps.branches,
    stream,
    deps.priorHeadRevision,
    {
      branchId: request.expectedBranchId,
      revision: request.expectedRevision,
      effectiveGeneration: request.expectedGeneration,
    },
  );
  if (verdict.kind === 'refused') {
    return refuse(
      verdict.code,
      `The named head is ${verdict.code}; resync to the active head first`,
    );
  }

  const priorHead = readActiveBranchHead(
    deps.branches,
    stream,
    deps.priorHeadRevision,
  );
  if (request.targetRevision >= deps.priorHeadRevision) {
    return refuse(
      'rewind-target-above-head',
      `Revision ${request.targetRevision} is not below the head at ${deps.priorHeadRevision}; there is nothing to take back`,
    );
  }
  const branch = deps.branches.requireBranch(stream, priorHead.branchId);
  if (request.targetRevision < branch.baseRevision) {
    return refuse(
      'rewind-target-below-branch-base',
      `Revision ${request.targetRevision} precedes branch '${branch.branchId}' base revision ${branch.baseRevision}`,
    );
  }

  // Both heads come off the SAME branch: the full prior history, and the
  // same history read only as far as the target. That is what makes this
  // a truncation and what lets it need no candidate row.
  const priorEvents = await materializeBranchPath(
    deps.reader,
    resolveBranchPath(
      deps.branches,
      stream,
      priorHead.branchId,
      deps.priorHeadRevision,
    ),
  );
  const truncatedEvents = await materializeBranchPath(
    deps.reader,
    resolveBranchPath(
      deps.branches,
      stream,
      priorHead.branchId,
      request.targetRevision,
    ),
  );

  const derived = deriveImpactBetween({
    priorEvents,
    candidateEvents: truncatedEvents,
    viewerIds: deps.viewerIds,
    probe: deps.probe,
    baseRevision: request.targetRevision,
    checkpoints: readStaleCheckpoints(deps.db, stream, request.targetRevision),
  });

  return Object.freeze({
    kind: 'preview',
    matchId: request.matchId,
    targetRevision: request.targetRevision,
    priorHead,
    changedViewerIds: derived.changedViewerIds,
    entries: derived.entries,
  });
}
