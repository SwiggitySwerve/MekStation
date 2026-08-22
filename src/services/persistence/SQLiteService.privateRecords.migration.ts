/** Non-whitespace TEXT CHECK fragment shared by identity columns. */
const nonempty = (column: string): string => `length(trim(${column})) > 0`;

/**
 * True when a TEXT column is lowercase hex of the required opaque-ref
 * length. Refs are server-generated crypto randomness, never a digest
 * of payload or command identity (design D4).
 */
const opaqueRefShape = (column: string): string =>
  `length(${column}) BETWEEN 32 AND 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

const RECORD_KINDS =
  "'gm-reason', 'gm-draft', 'hidden-impact', 'rejection-detail'";
const PAYLOAD_STATES = "'present', 'erased', 'redacted'";
const RETENTION_CLASSES = "'session', 'campaign', 'audit-hold'";
const RETENTION_POLICIES = "'keep', 'erase-on-expiry'";
const ACCESS_PURPOSES =
  "'lookup', 'export-attempt', 'retention-action', 'erasure', 'redaction'";
const ACCESS_RESULTS = "'granted', 'denied'";
const ACCESS_REASONS =
  "'invalid-request', 'no-viewer', 'scope-escalation', 'wrong-session', 'role-denied', 'not-found', 'already-terminal'";

/**
 * Identity columns stay pinned across the only legal UPDATEs
 * (present-to-erased and present-to-redacted). Player-safe facts live
 * on action_audit; this table never rewrites them.
 */
const identityUnchanged = [
  'OLD.opaque_ref = NEW.opaque_ref',
  'OLD.campaign_session_id = NEW.campaign_session_id',
  'OLD.command_id IS NEW.command_id',
  'OLD.record_kind = NEW.record_kind',
  'OLD.retention_class = NEW.retention_class',
  'OLD.created_at = NEW.created_at',
].join('\n      AND ');

/**
 * payload_state 'present' and 'redacted' require a nonempty payload;
 * 'erased' requires NULL payload (unavailable-detail marker).
 */
const payloadLaw = `(
        payload_state = 'present'
        AND payload IS NOT NULL
        AND ${nonempty('payload')}
      )
      OR (
        payload_state = 'erased'
        AND payload IS NULL
      )
      OR (
        payload_state = 'redacted'
        AND payload IS NOT NULL
        AND ${nonempty('payload')}
      )`;

/**
 * GM-private storage class (authority-audit PR 5, design D4).
 *
 * ADDITIVE ONLY: three new tables, no foreign keys into action_audit
 * or journal tables, and no column/trigger changes on them. command_id
 * on private_record is an identity-value link only.
 *
 * Opaque refs are the only handle. Player-safe rows may store the ref
 * but MUST NOT hash or embed private payload content.
 *
 * Erasure is a state transition, not DELETE. Access-audit rows have no
 * payload column, so they cannot copy private content.
 *
 * This seam is the tables plus repository plus proofs. Live lookup,
 * export, and retention wiring is owned by later PRs.
 */
export const PRIVATE_RECORDS_MIGRATION = {
  version: 12,
  name: 'private_records_schema',
  up: `
    CREATE TABLE IF NOT EXISTS private_record (
      opaque_ref TEXT PRIMARY KEY NOT NULL CHECK (${opaqueRefShape('opaque_ref')}),
      campaign_session_id TEXT NOT NULL CHECK (${nonempty('campaign_session_id')}),
      command_id TEXT CHECK (command_id IS NULL OR ${nonempty('command_id')}),
      record_kind TEXT NOT NULL CHECK (record_kind IN (${RECORD_KINDS})),
      payload TEXT,
      payload_state TEXT NOT NULL CHECK (payload_state IN (${PAYLOAD_STATES})),
      retention_class TEXT NOT NULL CHECK (retention_class IN (${RETENTION_CLASSES})),
      created_at TEXT NOT NULL CHECK (${nonempty('created_at')}),
      updated_at TEXT NOT NULL CHECK (${nonempty('updated_at')}),
      CHECK (${payloadLaw})
    );

    CREATE INDEX IF NOT EXISTS idx_private_record_campaign_session
      ON private_record (campaign_session_id);

    CREATE TRIGGER IF NOT EXISTS private_record_insert_present
      BEFORE INSERT ON private_record
      WHEN NEW.payload_state != 'present'
      BEGIN
        SELECT RAISE(ABORT, 'private_record inserts must be payload_state present; erasure is a state transition');
      END;

    CREATE TRIGGER IF NOT EXISTS private_record_no_delete
      BEFORE DELETE ON private_record
      BEGIN
        SELECT RAISE(ABORT, 'private_record rows may not be deleted; erasure is a state transition');
      END;

    CREATE TRIGGER IF NOT EXISTS private_record_no_rewrite
      BEFORE UPDATE ON private_record
      WHEN NOT (
        (
          OLD.payload_state = 'present'
          AND NEW.payload_state = 'erased'
          AND NEW.payload IS NULL
          AND ${identityUnchanged}
        )
        OR (
          OLD.payload_state = 'present'
          AND NEW.payload_state = 'redacted'
          AND NEW.payload IS NOT NULL
          AND length(trim(NEW.payload)) > 0
          AND ${identityUnchanged}
        )
      )
      BEGIN
        SELECT RAISE(ABORT, 'private_record updates are only present-to-erased or present-to-redacted with identity pinned');
      END;

    CREATE TABLE IF NOT EXISTS private_access_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opaque_ref TEXT NOT NULL CHECK (${nonempty('opaque_ref')}),
      actor_principal_id TEXT NOT NULL CHECK (${nonempty('actor_principal_id')}),
      actor_role TEXT CHECK (actor_role IS NULL OR actor_role IN ('gm', 'player')),
      purpose TEXT NOT NULL CHECK (purpose IN (${ACCESS_PURPOSES})),
      result TEXT NOT NULL CHECK (result IN (${ACCESS_RESULTS})),
      safe_reason_code TEXT CHECK (
        safe_reason_code IS NULL OR safe_reason_code IN (${ACCESS_REASONS})
      ),
      occurred_at TEXT NOT NULL CHECK (${nonempty('occurred_at')}),
      CHECK (
        (result = 'granted' AND safe_reason_code IS NULL)
        OR (
          result = 'denied'
          AND safe_reason_code IN (${ACCESS_REASONS})
        )
      )
    );

    CREATE INDEX IF NOT EXISTS idx_private_access_audit_opaque_ref
      ON private_access_audit (opaque_ref);

    CREATE TRIGGER IF NOT EXISTS private_access_audit_no_update
      BEFORE UPDATE ON private_access_audit
      BEGIN
        SELECT RAISE(ABORT, 'private_access_audit rows are append-only');
      END;

    CREATE TRIGGER IF NOT EXISTS private_access_audit_no_delete
      BEFORE DELETE ON private_access_audit
      BEGIN
        SELECT RAISE(ABORT, 'private_access_audit rows are append-only');
      END;

    CREATE TABLE IF NOT EXISTS private_retention_state (
      retention_class TEXT PRIMARY KEY NOT NULL CHECK (
        retention_class IN (${RETENTION_CLASSES})
      ),
      policy TEXT NOT NULL CHECK (policy IN (${RETENTION_POLICIES})),
      configured_at TEXT NOT NULL CHECK (${nonempty('configured_at')})
    );

    INSERT OR IGNORE INTO private_retention_state (
      retention_class, policy, configured_at
    ) VALUES
      ('session', 'keep', '1970-01-01T00:00:00.000Z'),
      ('campaign', 'keep', '1970-01-01T00:00:00.000Z'),
      ('audit-hold', 'keep', '1970-01-01T00:00:00.000Z');
  `,
};
