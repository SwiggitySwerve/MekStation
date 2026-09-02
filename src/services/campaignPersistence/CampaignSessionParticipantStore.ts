/**
 * Durable campaign-session membership store (umbrella task 6.1).
 *
 * The socket layer decides admission per connection today. This is the
 * record that outlives the connection, so membership survives a restart
 * and can be revoked without waiting for the member to reconnect.
 *
 * Two rules are enforced here rather than left to callers, because both
 * are the kind that a caller "handles" until the one path that doesn't:
 *
 * - **One active GM per session.** A second GM is an authority split,
 *   and the schema's partial unique index makes it impossible rather
 *   than merely discouraged. The store surfaces it as a typed refusal
 *   instead of a raw constraint error.
 * - **Two tactical player seats.** A count, which SQLite cannot express
 *   as a constraint, so it lives next to the insert that could violate
 *   it and is checked inside the same transaction.
 *
 * Revocation writes a timestamp. Deleting the row would lose the fact
 * that the participant was ever a member - what the audit timeline needs
 * - and would make revoke-then-rejoin look like never having left.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (6.1)
 */

import { isSqliteUniqueConstraintError } from '@/services/persistence/sqliteConstraintErrors';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

/** Seats the program admits: one GM, two tactical players. */
export type CampaignSeat = 'gm' | 'player';

/** Tactical seats available per session (the program's "exactly two"). */
export const TACTICAL_SEAT_LIMIT = 2;

export interface ICampaignSessionMembership {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly participantId: string;
  readonly seat: CampaignSeat;
  readonly boundAt: string;
  readonly revokedAt: string | null;
}

export type BindParticipantResult =
  | { readonly kind: 'bound'; readonly membership: ICampaignSessionMembership }
  /** Same participant, same seat, already active. Not an error. */
  | {
      readonly kind: 'already-bound';
      readonly membership: ICampaignSessionMembership;
    }
  | { readonly kind: 'gm-seat-taken' }
  | { readonly kind: 'tactical-seats-full'; readonly limit: number }
  /** Bound before, then revoked. Rejoining is a decision, not a retry. */
  | { readonly kind: 'revoked' };

interface IRow {
  readonly campaign_id: string;
  readonly session_id: string;
  readonly participant_id: string;
  readonly seat: CampaignSeat;
  readonly bound_at: string;
  readonly revoked_at: string | null;
}

function toMembership(row: IRow): ICampaignSessionMembership {
  return {
    campaignId: row.campaign_id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    seat: row.seat,
    boundAt: row.bound_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * Binds a participant to a session seat.
 *
 * The seat checks and the insert run in ONE transaction: counting free
 * seats and then inserting as separate statements would let two
 * simultaneous joins each see one seat left and both take it.
 */
export function bindCampaignSessionParticipant(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly participantId: string;
  readonly seat: CampaignSeat;
  readonly boundAt: string;
}): BindParticipantResult {
  const db = getSQLiteService().getDatabase();
  const tx = db.transaction((): BindParticipantResult => {
    const existing = db
      .prepare(
        `SELECT * FROM campaign_session_participant
         WHERE campaign_id = ? AND session_id = ? AND participant_id = ?`,
      )
      .get(input.campaignId, input.sessionId, input.participantId) as
      | IRow
      | undefined;
    if (existing) {
      if (existing.revoked_at !== null) {
        // Readmitting a revoked participant is a decision someone has to
        // make explicitly; silently reinstating them on reconnect would
        // make revocation last exactly until they tried again.
        return { kind: 'revoked' };
      }
      return { kind: 'already-bound', membership: toMembership(existing) };
    }

    if (input.seat === 'player') {
      const taken = db
        .prepare(
          `SELECT COUNT(*) AS n FROM campaign_session_participant
           WHERE campaign_id = ? AND session_id = ?
             AND seat = 'player' AND revoked_at IS NULL`,
        )
        .get(input.campaignId, input.sessionId) as { n: number };
      if (taken.n >= TACTICAL_SEAT_LIMIT) {
        return { kind: 'tactical-seats-full', limit: TACTICAL_SEAT_LIMIT };
      }
    }

    try {
      db.prepare(
        `INSERT INTO campaign_session_participant
           (campaign_id, session_id, participant_id, seat, bound_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, NULL)`,
      ).run(
        input.campaignId,
        input.sessionId,
        input.participantId,
        input.seat,
        input.boundAt,
      );
    } catch (error) {
      // The single-active-GM index is the authority on that rule; this
      // turns its raw violation into the typed refusal a caller can act
      // on, rather than letting a constraint error cross the boundary.
      if (isSqliteUniqueConstraintError(error)) {
        return { kind: 'gm-seat-taken' };
      }
      throw error;
    }

    return {
      kind: 'bound',
      membership: {
        campaignId: input.campaignId,
        sessionId: input.sessionId,
        participantId: input.participantId,
        seat: input.seat,
        boundAt: input.boundAt,
        revokedAt: null,
      },
    };
  });
  return tx();
}

/**
 * The participant's ACTIVE membership, or null.
 *
 * Null for a revoked row as well as a missing one - a caller asking "may
 * this socket attach?" must not be able to read a revoked membership as
 * a present one.
 */
export function activeCampaignSessionMembership(
  campaignId: string,
  sessionId: string,
  participantId: string,
): ICampaignSessionMembership | null {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT * FROM campaign_session_participant
       WHERE campaign_id = ? AND session_id = ? AND participant_id = ?
         AND revoked_at IS NULL`,
    )
    .get(campaignId, sessionId, participantId) as IRow | undefined;
  return row ? toMembership(row) : null;
}

/**
 * Whether THIS participant holds an active `gm` seat on this campaign,
 * in whichever session holds it.
 *
 * Asks about the caller rather than fetching "the GM" and comparing. The
 * difference is not cosmetic: a fetch-then-compare has to pick one row
 * out of the campaign, so its answer depends on the ordering it picked -
 * and a campaign carrying two co-op sessions has two active GM rows for
 * that ordering to choose between (the partial unique index
 * `idx_campaign_session_single_gm` is per (campaign, session), not per
 * campaign). It was also weak to test: a seat filter widened to accept
 * players still refused a seated player whenever the GM's row happened
 * to sort first, so the fixtures were doing the refusing.
 *
 * Campaign-scoped rather than session-scoped because the caller that
 * needs it - the share surface's authorization gate - is addressed by
 * campaign id alone and has no session id to quote.
 *
 * A revoked GM is NOT active: `revoked_at IS NULL` is what separates
 * "the GM" from "someone who used to be the GM", and an authorization
 * gate must not read the second as the first.
 */
export function isActiveCampaignGm(
  campaignId: string,
  participantId: string,
): boolean {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT 1 AS present FROM campaign_session_participant
       WHERE campaign_id = ? AND participant_id = ?
         AND seat = 'gm' AND revoked_at IS NULL
       LIMIT 1`,
    )
    .get(campaignId, participantId) as { present: number } | undefined;
  return row !== undefined;
}

/**
 * Whether this campaign has ANY active participant at all.
 *
 * Deliberately campaign-scoped, unlike its two neighbours: this asks
 * whether there is anybody to authorize AGAINST, which is a property of
 * the campaign and not of a caller. It is the one question in this file
 * that a caller's identity cannot answer.
 */
export function campaignHasAnyActiveSeat(campaignId: string): boolean {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT 1 AS present FROM campaign_session_participant
       WHERE campaign_id = ? AND revoked_at IS NULL
       LIMIT 1`,
    )
    .get(campaignId) as { present: number } | undefined;
  return row !== undefined;
}

/**
 * Whether THIS participant holds ANY active seat on this campaign - GM
 * or player - in whichever session holds it.
 *
 * Sibling of `isActiveCampaignGm`, and caller-scoped for the same
 * reason: the question is asked ABOUT the caller, so no row ordering
 * stands between a stranger and their refusal.
 *
 * The seat distinction is deliberate rather than absent. Administering
 * who may READ a campaign is the GM's alone (`isActiveCampaignGm`);
 * COMMANDING one is something every participant does, so a gate that
 * demanded the GM seat here would refuse the players the campaign
 * exists for.
 */
export function isActiveCampaignSeat(
  campaignId: string,
  participantId: string,
): boolean {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT 1 AS present FROM campaign_session_participant
       WHERE campaign_id = ? AND participant_id = ?
         AND revoked_at IS NULL
       LIMIT 1`,
    )
    .get(campaignId, participantId) as { present: number } | undefined;
  return row !== undefined;
}

/** Every active membership for a session, GM first then seat order. */
export function listActiveCampaignSessionParticipants(
  campaignId: string,
  sessionId: string,
): readonly ICampaignSessionMembership[] {
  return (
    getSQLiteService()
      .getDatabase()
      .prepare(
        `SELECT * FROM campaign_session_participant
         WHERE campaign_id = ? AND session_id = ? AND revoked_at IS NULL
         ORDER BY seat, bound_at, participant_id`,
      )
      .all(campaignId, sessionId) as IRow[]
  ).map(toMembership);
}

/**
 * Revokes a membership. Idempotent, and never deletes.
 *
 * Returns whether this call performed the revocation, so a caller can
 * tell "I revoked them" from "they were already out" without reading the
 * row back and racing another revoker.
 */
export function revokeCampaignSessionParticipant(input: {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly participantId: string;
  readonly revokedAt: string;
}): boolean {
  const result = getSQLiteService()
    .getDatabase()
    .prepare(
      `UPDATE campaign_session_participant
         SET revoked_at = ?
       WHERE campaign_id = ? AND session_id = ? AND participant_id = ?
         AND revoked_at IS NULL`,
    )
    .run(
      input.revokedAt,
      input.campaignId,
      input.sessionId,
      input.participantId,
    );
  return result.changes > 0;
}
