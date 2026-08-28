/**
 * Durable campaign-session restart fields (umbrella task 9.1 remainder).
 *
 * Role, revocation, acknowledgement cursor, and force ownership already
 * live in their own tables. What a restart still forgot is the pair the
 * readiness projection is validated against: the monotonic
 * `readiness_revision` and the `active_branch` the session was on.
 *
 * These are SESSION facts, not per-participant ones. Putting them on
 * `campaign_session_participant` would copy the same counter onto every
 * seat and invite those copies to diverge. Readiness itself stays a
 * computed projection from live state (#1381); this row only remembers
 * the revision and branch a restart must recompute against.
 *
 * ADDITIVE ONLY: no foreign keys into campaigns, matches, or
 * participants. A session row records what to remember, and never
 * becomes a second authority on whether the campaign exists.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/tasks.md (9.1)
 */

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const CAMPAIGN_SESSION_STATE_MIGRATION = {
  version: 20,
  name: 'campaign_session_schema',
  up: `
    -- NULL active_branch means the genesis/default branch.
    CREATE TABLE IF NOT EXISTS campaign_session (
      campaign_id         TEXT    NOT NULL CHECK (${nonempty('campaign_id')}),
      session_id          TEXT    NOT NULL CHECK (${nonempty('session_id')}),
      readiness_revision  INTEGER NOT NULL DEFAULT 0
                            CHECK (readiness_revision >= 0),
      active_branch       TEXT    CHECK (
                            active_branch IS NULL OR ${nonempty('active_branch')}
                          ),
      PRIMARY KEY (campaign_id, session_id)
    );
  `,
};
