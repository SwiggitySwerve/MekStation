/**
 * Store-backed membership port for the campaign socket (umbrella 6.2).
 *
 * `bindCampaignSyncConnection` takes membership as an optional port and
 * keeps its pre-6.2 behaviour when none is supplied. This is the adapter
 * production passes, so the durable record is actually consulted rather
 * than merely written.
 *
 * Kept as a separate module rather than a default inside the bind
 * function on purpose: a default would reach for SQLite from every test
 * that binds a socket, and those tests have no database. Absence stays
 * the structural flag; production is the thing that supplies it.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (6.1, 6.2)
 */

import {
  activeCampaignSessionMembership,
  bindCampaignSessionParticipant,
  revokeCampaignSessionParticipant,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import * as CampaignSessionParticipantStore from '@/services/campaignPersistence/CampaignSessionParticipantStore';

import type { ICampaignSessionMembershipPort } from './bindCampaignSyncConnection';

/** The production port. */
export function createCampaignSessionMembershipPort(): ICampaignSessionMembershipPort {
  return {
    isActive: (campaignId, sessionId, participantId) =>
      activeCampaignSessionMembership(campaignId, sessionId, participantId) !==
      null,
    isRevoked: (campaignId, sessionId, participantId) =>
      CampaignSessionParticipantStore.isRevokedCampaignSessionParticipant(
        campaignId,
        sessionId,
        participantId,
      ),
    bind: (input) => {
      // The seat refusals are returned rather than swallowed. They used
      // to be dropped here because the socket layer had nowhere to put
      // them; the tactical-seat refusal now has somewhere to go, so the
      // store's answer is handed back whole and the caller decides.
      return bindCampaignSessionParticipant({
        campaignId: input.campaignId,
        sessionId: input.sessionId,
        participantId: input.participantId,
        seat: input.seat,
        boundAt: new Date().toISOString(),
      });
    },
    revoke: (input) => revokeCampaignSessionParticipant(input),
  };
}
