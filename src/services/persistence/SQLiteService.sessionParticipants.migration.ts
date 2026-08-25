/**
 * Durable campaign-session membership (umbrella task 6.1).
 *
 * Admission is currently decided per connection from a room code and the
 * registry's in-memory host identity. That means membership does not
 * survive a restart and cannot be revoked out of band: the only record
 * that someone was allowed in is the socket that was allowed in.
 *
 * This table is the durable half. One row per
 * (campaign, session, participant), carrying the seat they hold.
 *
 * REVOCATION IS A TIMESTAMP, NEVER A DELETE. Removing the row would
 * destroy the fact that the participant was ever a member, which is
 * exactly what the audit timeline needs to say ("was a member, then was
 * not"). It would also make a revoke-then-rejoin indistinguishable from
 * someone who never left.
 *
 * The program admits ONE non-playing GM plus exactly two tactical player
 * seats. The single-GM rule is enforceable in the schema and is enforced
 * here, because a second GM is an authority split and no amount of
 * application care makes a second row safe. The two-seat player cap is
 * a count, which SQLite cannot express as a constraint, so it lives in
 * the store beside the insert that could violate it.
 *
 * ADDITIVE ONLY: no foreign keys into campaigns or matches. A membership
 * row records who was admitted, and never becomes a second authority on
 * whether the campaign or match itself exists.
 */

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const CAMPAIGN_SESSION_PARTICIPANTS_MIGRATION = {
  version: 17,
  name: 'campaign_session_participant_schema',
  up: `
    CREATE TABLE IF NOT EXISTS campaign_session_participant (
      campaign_id    TEXT NOT NULL CHECK (${nonempty('campaign_id')}),
      session_id     TEXT NOT NULL CHECK (${nonempty('session_id')}),
      participant_id TEXT NOT NULL CHECK (${nonempty('participant_id')}),
      seat           TEXT NOT NULL CHECK (seat IN ('gm', 'player')),
      bound_at       TEXT NOT NULL CHECK (${nonempty('bound_at')}),
      revoked_at     TEXT,
      PRIMARY KEY (campaign_id, session_id, participant_id)
    );

    -- At most one ACTIVE gm per session. Partial, so a revoked gm does
    -- not block their replacement - which is the whole point of keeping
    -- the revoked row rather than deleting it.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_session_single_gm
      ON campaign_session_participant (campaign_id, session_id)
      WHERE seat = 'gm' AND revoked_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_campaign_session_active
      ON campaign_session_participant (campaign_id, session_id)
      WHERE revoked_at IS NULL;
  `,
};
