/**
 * Durable force claims for a co-op campaign session.
 *
 * Force ownership had no durable home. A campaign has ONE shared roster,
 * so nothing upstream says whose a force is, and the in-session rule
 * ("first claim on a mission owns it") lived entirely in the registry's
 * in-memory participation records — which means a restart handed every
 * force back to whoever asked first next.
 *
 * The primary key IS the rule: one claimant per force per mission. A
 * second participant's insert conflicts rather than being talked out of
 * it by application code, which is the same instinct as the partial
 * unique index that enforces one active GM.
 *
 * ADDITIVE ONLY: no foreign keys into campaigns, missions or
 * participants. A claim row records who asked first, and never becomes a
 * second authority on whether any of those exist.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (9.1)
 */

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const CAMPAIGN_SESSION_FORCE_CLAIMS_MIGRATION = {
  version: 19,
  name: 'campaign_session_force_claim_schema',
  up: `
    CREATE TABLE IF NOT EXISTS campaign_session_force_claim (
      campaign_id    TEXT NOT NULL CHECK (${nonempty('campaign_id')}),
      session_id     TEXT NOT NULL CHECK (${nonempty('session_id')}),
      mission_id     TEXT NOT NULL CHECK (${nonempty('mission_id')}),
      force_id       TEXT NOT NULL CHECK (${nonempty('force_id')}),
      participant_id TEXT NOT NULL CHECK (${nonempty('participant_id')}),
      claimed_at     TEXT NOT NULL CHECK (${nonempty('claimed_at')}),
      PRIMARY KEY (campaign_id, session_id, mission_id, force_id)
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_session_force_claim_participant
      ON campaign_session_force_claim
      (campaign_id, session_id, mission_id, participant_id);
  `,
};
