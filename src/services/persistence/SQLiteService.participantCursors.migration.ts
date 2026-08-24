/**
 * Durable participant delivery cursors (design D4/D5, task 5.5).
 *
 * One row per (campaign, grant, participant): the highest per-grant
 * delivery sequence that participant has reported applying, plus the
 * delivery epoch that sequence belongs to. Sequences are only ever
 * comparable within an epoch, so storing the epoch beside the number is
 * what keeps a cursor from being read against the wrong generation
 * after a revocation or scope change.
 *
 * ADDITIVE ONLY: no foreign keys into campaigns, grants, or the journal.
 * A cursor is a convenience for resuming, never an authority on
 * membership - authorization is re-derived on every use.
 */

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const CAMPAIGN_PARTICIPANT_CURSORS_MIGRATION = {
  version: 16,
  name: 'campaign_participant_cursor_schema',
  up: `
    CREATE TABLE IF NOT EXISTS campaign_participant_cursor (
      campaign_id TEXT NOT NULL CHECK (${nonempty('campaign_id')}),
      grant_id TEXT NOT NULL CHECK (${nonempty('grant_id')}),
      participant_id TEXT NOT NULL CHECK (${nonempty('participant_id')}),
      delivery_epoch_id TEXT NOT NULL CHECK (${nonempty('delivery_epoch_id')}),
      acked_sequence INTEGER NOT NULL CHECK (acked_sequence >= 0),
      updated_at TEXT NOT NULL CHECK (${nonempty('updated_at')}),
      PRIMARY KEY (campaign_id, grant_id, participant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_participant_cursor_epoch
      ON campaign_participant_cursor (delivery_epoch_id);
  `,
};
