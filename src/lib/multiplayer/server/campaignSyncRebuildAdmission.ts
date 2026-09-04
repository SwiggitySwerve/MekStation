/**
 * LIVE campaign-stream rebuild admission (umbrella 16.3 clause A).
 *
 * Mirrors `refuseDuringHistoryRebuild` on the combat host: a synchronous
 * read of the durable rebuild state, a typed Error, and no queue. The
 * three mutating campaign arms (CampaignProposal, CampaignDecision,
 * CampaignHostIntent) consult this before dispatch so a command cannot
 * commit into the history a correction is replacing.
 *
 * CampaignGmArbiter.commitProposal is private and reachable only through
 * submitProposal and decide, both under those arms, so gating them is
 * the whole LIVE door.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { StreamRebuildRefusal } from '@/lib/events/journal/EventHistoryCommandAdmission';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import { readDurableStreamRebuild } from '@/lib/events/journal/EventHistoryDurableRebuild';
import { nowIso } from '@/types/multiplayer/Protocol';

/**
 * WHAT: the {branchId, revision} pair a rebuild refusal may name.
 * WHY: HTTP emits this as activeHead; the socket Error carries the same
 * pair as both conflictHead (Protocol) and activeHead (lifecycle / 17.3).
 */
export interface ICampaignRebuildHead {
  readonly branchId: string;
  readonly revision: number;
}

/**
 * WHAT: pick branchId + revision off the durable rebuild verdict.
 * WHY: the lease refusal already resolved the head; repeating that
 * resolution here would let the two doors drift.
 */
export function campaignRebuildHead(
  rebuilding: StreamRebuildRefusal,
): ICampaignRebuildHead {
  return {
    branchId: rebuilding.activeHead.branchId,
    revision: rebuilding.activeHead.revision,
  };
}

/**
 * WHAT: typed PROJECTION_REBUILDING Error naming the active head.
 * WHY: CHANGE spec campaign-persistence lines 80-85 require the refusal
 * to return the active branch and revision and to append nothing.
 */
export function campaignRebuildErrorFrame(
  matchId: string,
  rebuilding: StreamRebuildRefusal,
  correlationId?: string,
): Extract<IServerMessage, { kind: 'Error' }> {
  const head = campaignRebuildHead(rebuilding);
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code: rebuilding.code,
    reason: rebuilding.action,
    ...(correlationId !== undefined ? { intentId: correlationId } : {}),
    conflictHead: head,
    activeHead: head,
    recoveryAction: rebuilding.action,
  };
}

/**
 * WHAT: consult the campaign stream's durable rebuild and send the
 * typed refusal when a lease is live.
 * WHY: the LIVE door used to dispatch the three mutating arms before
 * any rebuild consult, so a CampaignHostIntent could commit into the
 * history the correction is replacing. Same reader the HTTP pipeline
 * uses; a store with no lease table answers null.
 */
export function refusedWhileCampaignRebuilding(
  campaignId: string,
  matchId: string,
  send: (message: IServerMessage) => void,
  correlationId?: string,
): boolean {
  const rebuilding = readDurableStreamRebuild(campaignStreamRef(campaignId));
  if (rebuilding === null) return false;
  send(campaignRebuildErrorFrame(matchId, rebuilding, correlationId));
  return true;
}
