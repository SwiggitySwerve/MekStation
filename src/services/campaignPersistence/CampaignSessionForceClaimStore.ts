/**
 * Durable force claims for a co-op campaign session.
 *
 * A campaign has ONE shared roster, so nothing upstream records whose a
 * force is. The rule the session enforces — first claim on a mission
 * owns the force — lived only in the registry's in-memory participation
 * records, so a restart handed every force back to whoever asked first
 * next. This gives that rule somewhere to live.
 *
 * The insert IS the decision. Claiming is an INSERT whose primary key
 * already says one claimant per force per mission, so two participants
 * racing for the same force are separated by the database rather than by
 * a read-then-write in application code that both could pass.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (9.1)
 */

import { getSQLiteService } from '../persistence/SQLiteService';

/** What the store did, or who stopped it. */
export type ClaimForceResult =
  | { readonly kind: 'claimed' }
  /** Same participant, same force. Re-sending a claim is not an error. */
  | { readonly kind: 'already-held' }
  | { readonly kind: 'held-by-other'; readonly participantId: string };

interface IClaimRow {
  readonly participant_id: string;
}

/** One durable claim row, as migration reads them back. */
export interface ICampaignSessionForceClaim {
  readonly missionId: string;
  readonly forceId: string;
  readonly participantId: string;
}

interface IFullClaimRow {
  readonly mission_id: string;
  readonly force_id: string;
  readonly participant_id: string;
}

/**
 * Every claim recorded for this session, across every mission.
 *
 * The per-mission reader answers "may this participant take this force
 * now?". Migration asks a different question - "whose is this force,
 * over the campaign's whole history?" - and a force with two holders on
 * two missions is exactly the ambiguity it must refuse to resolve, so it
 * needs all the rows rather than one mission's.
 */
export function listCampaignSessionForceClaims(
  campaignId: string,
  sessionId: string,
): readonly ICampaignSessionForceClaim[] {
  return (
    getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT mission_id, force_id, participant_id
           FROM campaign_session_force_claim
          WHERE campaign_id = ? AND session_id = ?
          ORDER BY mission_id, force_id, participant_id`,
      )
      .all(campaignId, sessionId) as IFullClaimRow[]
  ).map((row) => ({
    missionId: row.mission_id,
    forceId: row.force_id,
    participantId: row.participant_id,
  }));
}

/**
 * Record that `participantId` holds `forceId` for this mission, unless
 * somebody else already does.
 */
export function claimCampaignSessionForce(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly forceId: string;
  readonly participantId: string;
  readonly claimedAt: string;
}): ClaimForceResult {
  const db = getSQLiteService().getDatabase();
  return db.transaction((): ClaimForceResult => {
    const existing = db
      .prepare(
        `SELECT participant_id FROM campaign_session_force_claim
          WHERE campaign_id = ? AND session_id = ?
            AND mission_id = ? AND force_id = ?`,
      )
      .get(input.campaignId, input.sessionId, input.missionId, input.forceId) as
      | IClaimRow
      | undefined;

    if (existing !== undefined) {
      return existing.participant_id === input.participantId
        ? { kind: 'already-held' }
        : { kind: 'held-by-other', participantId: existing.participant_id };
    }

    db.prepare(
      `INSERT INTO campaign_session_force_claim
         (campaign_id, session_id, mission_id, force_id, participant_id, claimed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      input.campaignId,
      input.sessionId,
      input.missionId,
      input.forceId,
      input.participantId,
      input.claimedAt,
    );
    return { kind: 'claimed' };
  })();
}

/**
 * Who holds `forceId` for this mission, or null when nobody does.
 *
 * Read-only, so an admission check can consult durable ownership before
 * deciding — the claim itself still goes through
 * `claimCampaignSessionForce`, which is what settles a race.
 */
export function readCampaignSessionForceHolder(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly forceId: string;
}): string | null {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT participant_id FROM campaign_session_force_claim
        WHERE campaign_id = ? AND session_id = ?
          AND mission_id = ? AND force_id = ?`,
    )
    .get(input.campaignId, input.sessionId, input.missionId, input.forceId) as
    | IClaimRow
    | undefined;
  return row?.participant_id ?? null;
}

/**
 * The forces `participantId` holds for this mission, ascending by id.
 *
 * The mirror of `readCampaignSessionForceHolder`: that one asks "whose is
 * this force", this one asks "what does this holder own". Scenario
 * materialization needs the second question - it starts from a player
 * slot and has to find the slot's force, not the other way round - and
 * answering it by scanning every force in the campaign would make the
 * read O(forces) against a table that already carries the
 * (campaign, session, mission, participant) index this query uses.
 *
 * Returns an empty list rather than null: a holder with no claims and an
 * unknown holder are the same fact here, and neither is an error.
 */
export function readCampaignSessionForcesHeldBy(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly participantId: string;
}): readonly string[] {
  return (
    getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT force_id FROM campaign_session_force_claim
          WHERE campaign_id = ? AND session_id = ?
            AND mission_id = ? AND participant_id = ?
          ORDER BY force_id`,
      )
      .all(
        input.campaignId,
        input.sessionId,
        input.missionId,
        input.participantId,
      ) as { readonly force_id: string }[]
  ).map((row) => row.force_id);
}
