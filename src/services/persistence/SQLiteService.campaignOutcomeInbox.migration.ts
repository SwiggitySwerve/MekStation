/**
 * Durable campaign receipt for a terminal combat outcome.
 *
 * The key is deliberately the combat outcome identity/version pair rather
 * than a campaign-local command id: an outbox is at-least-once, so replaying
 * the same delivery must find the original campaign consequence range.
 */

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const CAMPAIGN_COMBAT_OUTCOME_INBOX_MIGRATION = {
  version: 21,
  name: 'campaign_combat_outcome_inbox_schema',
  up: `
    CREATE TABLE IF NOT EXISTS campaign_combat_outcome_inbox (
      outcome_id              TEXT    NOT NULL CHECK (${nonempty('outcome_id')}),
      outcome_version         INTEGER NOT NULL CHECK (outcome_version > 0),
      campaign_id             TEXT    NOT NULL CHECK (${nonempty('campaign_id')}),
      command_id              TEXT    NOT NULL CHECK (${nonempty('command_id')}),
      command_digest          TEXT    NOT NULL CHECK (length(command_digest) = 64),
      first_stream_revision   INTEGER NOT NULL CHECK (first_stream_revision > 0),
      last_stream_revision    INTEGER NOT NULL CHECK (last_stream_revision >= first_stream_revision),
      first_commit_position   INTEGER NOT NULL CHECK (first_commit_position > 0),
      last_commit_position    INTEGER NOT NULL CHECK (last_commit_position >= first_commit_position),
      received_at             TEXT    NOT NULL CHECK (${nonempty('received_at')}),
      PRIMARY KEY (outcome_id, outcome_version)
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_combat_outcome_inbox_campaign
      ON campaign_combat_outcome_inbox (campaign_id, received_at);
  `,
};
