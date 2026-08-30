/**
 * Adds the private-record authorized-write audit purpose without
 * weakening the append-only or payload-free access-log invariants.
 * SQLite cannot alter a CHECK expression in place, so this additive
 * migration rebuilds the one private audit table and copies every row.
 */
export const PRIVATE_ACCESS_WRITE_MIGRATION = {
  version: 22,
  name: 'private_access_audit_write_purpose',
  up: `
    CREATE TABLE private_access_audit_v22 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opaque_ref TEXT NOT NULL CHECK (length(trim(opaque_ref)) > 0),
      actor_principal_id TEXT NOT NULL CHECK (length(trim(actor_principal_id)) > 0),
      actor_role TEXT CHECK (actor_role IS NULL OR actor_role IN ('gm', 'player')),
      purpose TEXT NOT NULL CHECK (purpose IN (
        'write', 'lookup', 'export-attempt', 'retention-action', 'erasure', 'redaction'
      )),
      result TEXT NOT NULL CHECK (result IN ('granted', 'denied')),
      safe_reason_code TEXT CHECK (
        safe_reason_code IS NULL OR safe_reason_code IN (
          'invalid-request', 'no-viewer', 'scope-escalation', 'wrong-session',
          'role-denied', 'not-found', 'already-terminal'
        )
      ),
      occurred_at TEXT NOT NULL CHECK (length(trim(occurred_at)) > 0),
      CHECK (
        (result = 'granted' AND safe_reason_code IS NULL)
        OR (result = 'denied' AND safe_reason_code IS NOT NULL)
      )
    );

    INSERT INTO private_access_audit_v22 (
      id, opaque_ref, actor_principal_id, actor_role, purpose, result,
      safe_reason_code, occurred_at
    )
    SELECT id, opaque_ref, actor_principal_id, actor_role, purpose, result,
           safe_reason_code, occurred_at
    FROM private_access_audit;

    DROP TABLE private_access_audit;
    ALTER TABLE private_access_audit_v22 RENAME TO private_access_audit;

    CREATE INDEX idx_private_access_audit_opaque_ref
      ON private_access_audit (opaque_ref);

    CREATE TRIGGER private_access_audit_no_update
      BEFORE UPDATE ON private_access_audit
      BEGIN
        SELECT RAISE(ABORT, 'private_access_audit rows are append-only');
      END;

    CREATE TRIGGER private_access_audit_no_delete
      BEFORE DELETE ON private_access_audit
      BEGIN
        SELECT RAISE(ABORT, 'private_access_audit rows are append-only');
      END;
  `,
};
