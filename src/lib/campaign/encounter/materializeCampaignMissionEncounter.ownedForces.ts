/**
 * The owned-force gate for scenario materialization (umbrella 10.3).
 *
 * Extracted from the materializer rather than living inside it: the
 * materializer is the REST choreography, and this is the authority
 * decision that runs before any of it. Keeping them in one file pushed
 * that file past its size budget, which is the codebase noticing the
 * same thing.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Scenario Materialization Uses Authoritative Owned Forces")
 */

import type { IActiveBranchHead } from '@/lib/events/journal/EventHistoryExpectedHead';

import { EXPECTED_HEAD_RESYNC_ACTION } from '@/lib/events/journal/EventHistoryExpectedHead';

import type {
  OwnedForceMaterializationResult,
  OwnedForceRefusalCode,
} from './campaignOwnedForceMaterialization';
/**
 * A launch refused because the client view of the campaign has moved.
 *
 * Carries the head the authority actually holds and the action that
 * recovers, so the caller can resync rather than retry - a bare message
 * would leave a stale client guessing which of branch, revision or
 * ownership went out from under it.
 */
export class CampaignOwnedForceStaleError extends Error {
  public constructor(
    public readonly code: OwnedForceRefusalCode,
    reason: string,
    public readonly activeHead: IActiveBranchHead,
    public readonly resyncAction: typeof EXPECTED_HEAD_RESYNC_ACTION = EXPECTED_HEAD_RESYNC_ACTION,
  ) {
    super(`Campaign launch refused (${code}): ${reason}`);
    this.name = 'CampaignOwnedForceStaleError';
  }
}

/**
 * Refuse a stale launch before anything is created.
 *
 * Runs first, ahead of the roster preflight, because a client whose head
 * has moved should be told to resync rather than handed a complaint about
 * a roster belonging to a world that no longer exists.
 */
export function assertOwnedForcesCurrent(
  ownedForces: OwnedForceMaterializationResult | undefined,
): void {
  if (ownedForces?.kind !== 'refused') return;
  throw new CampaignOwnedForceStaleError(
    ownedForces.code,
    ownedForces.reason,
    ownedForces.activeHead,
    ownedForces.resyncAction,
  );
}
