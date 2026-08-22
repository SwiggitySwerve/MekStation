/** Non-whitespace TEXT CHECK fragment shared by identity columns. */
const nonempty = (column: string): string => `length(trim(${column})) > 0`;

/**
 * True when a TEXT column is exactly 32 lowercase hex chars. Grant ids
 * are server-minted crypto randomness, never a digest of participant
 * or campaign identity.
 */
const opaqueGrantId = (column: string): string =>
  `length(${column}) = 32 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

/**
 * Identity columns stay pinned across the only legal UPDATE (active to
 * revoked). Scopes are included: a holder must not widen the set by
 * rewriting the stored row.
 */
const identityUnchanged = [
  'OLD.grant_id = NEW.grant_id',
  'OLD.campaign_id = NEW.campaign_id',
  'OLD.participant_id = NEW.participant_id',
  'OLD.issuer_public_key = NEW.issuer_public_key',
  'OLD.scopes = NEW.scopes',
  'OLD.issued_at = NEW.issued_at',
  'OLD.expires_at = NEW.expires_at',
  'OLD.created_at = NEW.created_at',
].join('\n      AND ');

/**
 * Source-instance campaign grants (design D5, task 2.1).
 *
 * ADDITIVE ONLY: one new table, no foreign keys into journal, audit,
 * delivery-epoch, or campaign tables, and no column or trigger changes
 * on them. Linkage to a campaign is by identity values only.
 *
 * Grant ids are opaque 32-hex handles minted server-side. Scopes are
 * stored as the canonical JSON array of a sorted, deduped set so one
 * logical set has exactly one byte representation (the same bytes the
 * grant token signs). INSERT is active-only; revoke is a one-way UPDATE
 * that stamps revoked_at and pins every identity column. DELETE is
 * refused: a revoked grant is an audit fact.
 *
 * Re-revoke: the trigger ABORTS a second UPDATE. The store maps that
 * to a typed already-revoked result without rewriting the timestamp
 * (the first revocation is the durable fact).
 *
 * This seam is the table plus store plus token mint/verify. Share UI
 * is task 2.2, replica durability is 2.3, and the campaign-sync
 * channel is 3.3. None of those are wired here.
 */
export const CAMPAIGN_GRANTS_MIGRATION = {
  version: 14,
  name: 'campaign_grants_schema',
  up: `
    CREATE TABLE IF NOT EXISTS campaign_grant (
      grant_id TEXT PRIMARY KEY NOT NULL CHECK (${opaqueGrantId('grant_id')}),
      campaign_id TEXT NOT NULL CHECK (${nonempty('campaign_id')}),
      participant_id TEXT NOT NULL CHECK (${nonempty('participant_id')}),
      -- The issuing identity's Ed25519 public key, pinned at issue time.
      -- Verification checks a presented token against THIS key, never
      -- against a key the token carries: an unbound trust anchor would
      -- reduce the whole grant to a bearer secret, since anyone holding
      -- a grant id could sign with their own keypair and pass.
      issuer_public_key TEXT NOT NULL CHECK (${nonempty('issuer_public_key')}),
      scopes TEXT NOT NULL CHECK (
        json_valid(scopes)
        AND json_array_length(scopes) >= 1
      ),
      issued_at TEXT NOT NULL CHECK (${nonempty('issued_at')}),
      expires_at TEXT NOT NULL CHECK (
        ${nonempty('expires_at')}
        AND expires_at > issued_at
      ),
      revoked_at TEXT CHECK (
        revoked_at IS NULL OR ${nonempty('revoked_at')}
      ),
      created_at TEXT NOT NULL CHECK (${nonempty('created_at')})
    );

    CREATE INDEX IF NOT EXISTS idx_campaign_grant_campaign_id
      ON campaign_grant (campaign_id);

    CREATE TRIGGER IF NOT EXISTS campaign_grant_insert_active
      BEFORE INSERT ON campaign_grant
      WHEN NEW.revoked_at IS NOT NULL
      BEGIN
        SELECT RAISE(ABORT, 'campaign_grant inserts must be active; revoke is a later UPDATE');
      END;

    CREATE TRIGGER IF NOT EXISTS campaign_grant_no_delete
      BEFORE DELETE ON campaign_grant
      BEGIN
        SELECT RAISE(ABORT, 'campaign_grant rows are audit facts and may not be deleted');
      END;

    CREATE TRIGGER IF NOT EXISTS campaign_grant_revoke_only
      BEFORE UPDATE ON campaign_grant
      WHEN NOT (
        OLD.revoked_at IS NULL
        AND NEW.revoked_at IS NOT NULL
        AND length(trim(NEW.revoked_at)) > 0
        AND ${identityUnchanged}
      )
      BEGIN
        SELECT RAISE(ABORT, 'campaign_grant updates may only revoke an active grant; identity columns are immutable');
      END;
  `,
};
