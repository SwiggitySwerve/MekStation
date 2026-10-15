/** Durable application evidence only; deliberately no cursor/membership backfill. */
export const CAMPAIGN_PUBLIC_APPLIED_VIEWS_MIGRATION = {
  version: 32,
  name: 'campaign_public_applied_view_schema',
  up: `
    CREATE TABLE IF NOT EXISTS campaign_public_applied_view (
      campaign_id TEXT NOT NULL CHECK (length(trim(campaign_id)) > 0),
      session_id TEXT NOT NULL CHECK (length(trim(session_id)) > 0),
      participant_id TEXT NOT NULL CHECK (length(trim(participant_id)) > 0),
      branch_id TEXT NOT NULL CHECK (length(trim(branch_id)) > 0),
      effective_generation INTEGER NOT NULL CHECK (
        typeof(effective_generation) = 'integer' AND effective_generation BETWEEN 0 AND 9007199254740991),
      acknowledged_journal_cut INTEGER NOT NULL CHECK (
        typeof(acknowledged_journal_cut) = 'integer' AND acknowledged_journal_cut BETWEEN 0 AND 9007199254740991),
      viewer_authority_fingerprint TEXT NOT NULL CHECK (length(trim(viewer_authority_fingerprint)) > 0),
      receipt_id TEXT NOT NULL CHECK (length(trim(receipt_id)) > 0),
      applied_at TEXT NOT NULL CHECK (length(trim(applied_at)) > 0),
      PRIMARY KEY (campaign_id, session_id, participant_id)
    );
  `,
};
