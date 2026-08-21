const MAX_SAFE_INTEGER = 9007199254740991;

const nonempty = (column: string): string => `length(trim(${column})) > 0`;
const safeIntegerRange = (column: string, minimum: number): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${minimum} AND ${MAX_SAFE_INTEGER}`;
const safeNonnegative = (column: string): string => safeIntegerRange(column, 0);
const safePositive = (column: string): string => safeIntegerRange(column, 1);
const digest = (column: string): string =>
  `length(${column}) = 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

/**
 * Replay checkpoint storage (replay-safety PR 15A, per design D6).
 *
 * ADDITIVE ONLY: one new table binding exactly the PR-14
 * IReplayCheckpointMetadata identity set plus the cached state bytes.
 * Nothing here touches journal authority - no foreign keys into, no
 * triggers on, and no column changes to any event_journal_* table, so
 * a corrupt, deleted, or tampered checkpoint row can never alter
 * authoritative history (the migration test proves this directly).
 *
 * Rows are WRITE-ONCE: an UPDATE trigger aborts, because a checkpoint
 * is an immutable claim about one prefix under one pipeline identity.
 * DELETE stays allowed - checkpoints are disposable caches and discard
 * is their designed failure mode (spec: "discarded without changing
 * authoritative events").
 *
 * The digest columns enforce sha256 hex shape at the row level; whether
 * state_json actually hashes to state_digest is repository-level
 * integrity (PR 15B) - SQLite CHECKs cannot hash.
 *
 * The UNIQUE identity tuple doubles as the selection index (SQLite
 * scans it in either direction), so no extra index is needed for
 * "newest compatible revision" selection.
 */
export const REPLAY_CHECKPOINTS_MIGRATION = {
  version: 10,
  name: 'replay_checkpoints_schema',
  up: `
    CREATE TABLE IF NOT EXISTS replay_checkpoints (
      checkpoint_id TEXT PRIMARY KEY NOT NULL CHECK (${nonempty('checkpoint_id')}),
      stream_id TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      branch_id TEXT NOT NULL CHECK (branch_id = 'root'),
      revision INTEGER NOT NULL CHECK (${safeNonnegative('revision')}),
      schema_pipeline_fingerprint TEXT NOT NULL
        CHECK (${digest('schema_pipeline_fingerprint')}),
      projector_id TEXT NOT NULL CHECK (${nonempty('projector_id')}),
      projector_version INTEGER NOT NULL
        CHECK (${safePositive('projector_version')}),
      source_tail_digest TEXT NOT NULL
        CHECK (${digest('source_tail_digest')}),
      state_digest TEXT NOT NULL CHECK (${digest('state_digest')}),
      state_json TEXT NOT NULL CHECK (length(state_json) > 0),
      recorded_at TEXT NOT NULL CHECK (${nonempty('recorded_at')}),
      UNIQUE (
        stream_id, branch_id, projector_id, projector_version,
        schema_pipeline_fingerprint, revision
      )
    );

    CREATE TRIGGER IF NOT EXISTS replay_checkpoints_no_update
      BEFORE UPDATE ON replay_checkpoints
      BEGIN
        SELECT RAISE(ABORT, 'replay_checkpoints rows are write-once; discard and re-record');
      END;
  `,
};
