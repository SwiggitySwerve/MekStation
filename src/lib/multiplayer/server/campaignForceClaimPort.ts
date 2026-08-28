/**
 * Production force-claim port for `bindCampaignSyncConnection`.
 *
 * Kept as a separate module rather than a default inside the bind
 * function for the same reason the membership port is: a default would
 * reach for SQLite from every test that binds a socket, and those tests
 * have no database. Absence stays meaningful — a session without this
 * port behaves exactly as it did before durable force ownership existed.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (9.1)
 */

import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';

import type { ICampaignForceClaimPort } from './bindCampaignSyncConnection';

/** The production port. */
export function createCampaignForceClaimPort(): ICampaignForceClaimPort {
  return {
    claim: (input) =>
      claimCampaignSessionForce({
        campaignId: input.campaignId,
        sessionId: input.sessionId,
        missionId: input.missionId,
        forceId: input.forceId,
        participantId: input.participantId,
        claimedAt: new Date().toISOString(),
      }),
  };
}
