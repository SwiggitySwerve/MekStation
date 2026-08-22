const MAX_SAFE_INTEGER = 9007199254740991;

const nonempty = (column: string): string => `length(trim(${column})) > 0`;
const safeIntegerRange = (column: string, minimum: number): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${minimum} AND ${MAX_SAFE_INTEGER}`;
const safePositive = (column: string): string => safeIntegerRange(column, 1);
const digest = (column: string): string =>
  `length(${column}) = 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

/**
 * Append-once action-audit provenance (authority-audit PR 4, design D3).
 *
 * ADDITIVE ONLY: one new table, no foreign keys into journal or
 * checkpoint tables, and no column/trigger changes on them. Audit never
 * duplicates gameplay history; accepted rows LINK to a committed batch
 * by command_id plus the stored revision range.
 *
 * PK is command_id. The journal already treats command_id as the global
 * command identity, readByCommandId needs a unique key, and a conflicting
 * retry is defined as the same command_id with a different digest or
 * terminal state. campaign_session_id / stream_type / stream_id are
 * required identity attributes compared on retry; they do not form a
 * composite PK because the same command_id must not exist in two sessions.
 *
 * State machine (minimal): INSERT only accepted | rejected | vetoed |
 * timed-out (already terminal). published is a one-time stamp on an
 * accepted row via UPDATE of published_receipt_id + lifecycle_state.
 * Failure rows cannot carry a committed range or a published receipt.
 *
 * Safe reason codes are a closed id-free set. Private free-text reasons
 * belong in PR 5's separate storage class (design D4), not this table.
 *
 * This seam is the table plus repository plus proofs. Live intent/command
 * wiring is owned by later PRs.
 */
const REJECT_REASONS =
  "'invalid-request', 'no-viewer', 'scope-escalation', 'wrong-session', 'command-rejected'";

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

const committedRange = `${safePositive('committed_first_revision')}
        AND ${safePositive('committed_last_revision')}
        AND ${safePositive('committed_event_count')}
        AND committed_last_revision = committed_first_revision + committed_event_count - 1`;

const lifecycleLaw = `(
        lifecycle_state IN ('rejected', 'vetoed', 'timed-out')
        AND committed_first_revision IS NULL
        AND committed_last_revision IS NULL
        AND committed_event_count IS NULL
        AND published_receipt_id IS NULL
        AND (
          (lifecycle_state = 'rejected' AND safe_reason_code IN (${REJECT_REASONS}))
          OR (lifecycle_state = 'vetoed' AND safe_reason_code = 'policy-veto')
          OR (lifecycle_state = 'timed-out' AND safe_reason_code = 'deadline-expired')
        )
      )
      OR (
        lifecycle_state = 'accepted'
        AND safe_reason_code IS NULL
        AND published_receipt_id IS NULL
        AND ${committedRange}
      )
      OR (
        lifecycle_state = 'published'
        AND safe_reason_code IS NULL
        AND published_receipt_id IS NOT NULL
        AND ${nonempty('published_receipt_id')}
        AND ${committedRange}
      )`;

export const ACTION_AUDIT_MIGRATION = {
  version: 11,
  name: 'action_audit_schema',
  up: `
    CREATE TABLE IF NOT EXISTS action_audit (
      command_id TEXT PRIMARY KEY NOT NULL CHECK (${nonempty('command_id')}),
      campaign_session_id TEXT NOT NULL CHECK (${nonempty('campaign_session_id')}),
      match_id TEXT CHECK (match_id IS NULL OR ${nonempty('match_id')}),
      stream_type TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      command_digest TEXT NOT NULL CHECK (${digest('command_digest')}),
      actor_principal_id TEXT NOT NULL CHECK (${nonempty('actor_principal_id')}),
      actor_participant_id TEXT NOT NULL CHECK (${nonempty('actor_participant_id')}),
      actor_role TEXT NOT NULL CHECK (actor_role IN ('gm', 'player')),
      lifecycle_state TEXT NOT NULL CHECK (
        lifecycle_state IN ('accepted', 'rejected', 'vetoed', 'timed-out', 'published')
      ),
      safe_reason_code TEXT CHECK (
        safe_reason_code IS NULL OR safe_reason_code IN (
          ${REJECT_REASONS}, 'policy-veto', 'deadline-expired'
        )
      ),
      correlation_id TEXT CHECK (
        correlation_id IS NULL OR ${nonempty('correlation_id')}
      ),
      created_at TEXT NOT NULL CHECK (${nonempty('created_at')}),
      updated_at TEXT NOT NULL CHECK (${nonempty('updated_at')}),
      published_receipt_id TEXT CHECK (
        published_receipt_id IS NULL OR ${nonempty('published_receipt_id')}
      ),
      committed_first_revision INTEGER,
      committed_last_revision INTEGER,
      committed_event_count INTEGER,
      CHECK (${lifecycleLaw})
    );

    CREATE INDEX IF NOT EXISTS idx_action_audit_campaign_session
      ON action_audit (campaign_session_id);

    CREATE TRIGGER IF NOT EXISTS action_audit_insert_not_published
      BEFORE INSERT ON action_audit
      WHEN NEW.lifecycle_state = 'published'
      BEGIN
        SELECT RAISE(ABORT, 'action_audit inserts must be terminal non-published; published is a one-time stamp');
      END;

    CREATE TRIGGER IF NOT EXISTS action_audit_no_delete
      BEFORE DELETE ON action_audit
      BEGIN
        SELECT RAISE(ABORT, 'action_audit rows are append-once and may not be deleted');
      END;

    CREATE TRIGGER IF NOT EXISTS action_audit_no_rewrite
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
