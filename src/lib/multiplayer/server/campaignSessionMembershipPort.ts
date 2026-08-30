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
import { getSQLiteService } from '@/services/persistence/SQLiteService';

import type { ICampaignSessionMembershipPort } from './bindCampaignSyncConnection';

/**
 * Whether a participant has a row at all, active or revoked.
 *
 * `activeCampaignSessionMembership` deliberately reports a revoked row
 * as absent, so "revoked" needs its own question rather than being
 * inferred from the absence of an active membership - a newcomer and a
 * revoked member look identical through that lens, and only one of them
 * may be let in.
 */
function readRevokedAt(
  campaignId: string,
  sessionId: string,
  participantId: string,
): string | null {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT revoked_at FROM campaign_session_participant
       WHERE campaign_id = ? AND session_id = ? AND participant_id = ?`,
    )
    .get(campaignId, sessionId, participantId) as
    | { revoked_at: string | null }
    | undefined;
  return row?.revoked_at ?? null;
}

/** The production port. */
export function createCampaignSessionMembershipPort(): ICampaignSessionMembershipPort {
  return {
    isActive: (campaignId, sessionId, participantId) =>
      activeCampaignSessionMembership(campaignId, sessionId, participantId) !==
      null,
    isRevoked: (campaignId, sessionId, participantId) =>
      readRevokedAt(campaignId, sessionId, participantId) !== null,
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
