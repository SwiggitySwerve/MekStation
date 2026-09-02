/**
 * Session-scoped action-audit identity (task 2.3 residuals 7 and 8).
 *
 * PK stays command_id. readByCommandId, linkPublishedReceipt, PUBLISH_SQL
 * (`SQLiteActionAuditRepository`), and CommandRejectionAudit all treat
 * command_id as the global key. Rebuilding the PK would break those
 * callers and would not be additive. The same command_id still cannot
 * exist in two sessions.
 *
 * The unique index names the (campaign_session_id, command_id) pair the
 * 2.1 box asked for. PK plus NOT NULL already implies that uniqueness;
 * the index exists so the pair has a name a dropped-index mutant can
 * turn red.
 *
 * action_audit_no_rewrite is left untouched. This migration adds a
 * second UPDATE guard with the same admitted transition: accepted may
 * stamp published once, identity pinned. Residual 8 asked for a
 * _no_update trigger; the admitted stamp is still the one exception.
 */
const identityUnchanged = [
  'OLD.command_id = NEW.command_id',
  'OLD.campaign_session_id = NEW.campaign_session_id',
  'OLD.match_id IS NEW.match_id',
  'OLD.stream_type = NEW.stream_type',
  'OLD.stream_id = NEW.stream_id',
  'OLD.command_digest = NEW.command_digest',
  'OLD.actor_principal_id = NEW.actor_principal_id',
  'OLD.actor_participant_id = NEW.actor_participant_id',
  'OLD.actor_role = NEW.actor_role',
  'OLD.safe_reason_code IS NEW.safe_reason_code',
  'OLD.correlation_id IS NEW.correlation_id',
  'OLD.created_at = NEW.created_at',
  'OLD.committed_first_revision IS NEW.committed_first_revision',
  'OLD.committed_last_revision IS NEW.committed_last_revision',
  'OLD.committed_event_count IS NEW.committed_event_count',
].join('\n      AND ');

export const ACTION_AUDIT_SESSION_IDENTITY_MIGRATION = {
  version: 28,
  name: 'action_audit_session_command_identity',
  up: `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_action_audit_session_command
      ON action_audit (campaign_session_id, command_id);

    CREATE TRIGGER IF NOT EXISTS action_audit_no_update
      BEFORE UPDATE ON action_audit
      WHEN NOT (
        OLD.lifecycle_state = 'accepted'
        AND NEW.lifecycle_state = 'published'
        AND OLD.published_receipt_id IS NULL
        AND NEW.published_receipt_id IS NOT NULL
        AND length(trim(NEW.published_receipt_id)) > 0
        AND ${identityUnchanged}
      )
      BEGIN
        SELECT RAISE(ABORT, 'action_audit rows are append-once; only accepted may stamp published once');
      END;
  `,
};
