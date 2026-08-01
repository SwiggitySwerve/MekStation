const MAX_SAFE_INTEGER = 9007199254740991;

const nonempty = (column: string): string => `length(trim(${column})) > 0`;
const safeIntegerRange = (column: string, minimum: number): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${minimum} AND ${MAX_SAFE_INTEGER}`;
const safeNonnegative = (column: string): string => safeIntegerRange(column, 0);
const safePositive = (column: string): string => safeIntegerRange(column, 1);
const digest = (column: string): string =>
  `length(${column}) = 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

export const EVENT_JOURNAL_MIGRATION = {
  version: 8,
  name: 'event_journal_schema',
  up: `
    CREATE TABLE IF NOT EXISTS event_journal_store_state (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      last_commit_position INTEGER NOT NULL DEFAULT 0
        CHECK (${safeNonnegative('last_commit_position')})
    );

    INSERT INTO event_journal_store_state (singleton_id, last_commit_position)
    VALUES (1, 0)
    ON CONFLICT(singleton_id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS event_journal_batches (
      command_id TEXT PRIMARY KEY CHECK (${nonempty('command_id')}),
      command_digest TEXT NOT NULL CHECK (${digest('command_digest')}),
      canonicalizer_version INTEGER NOT NULL
        CHECK (${safePositive('canonicalizer_version')}),
      stream_type TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      branch_id TEXT NOT NULL CHECK (branch_id = 'root'),
      event_count INTEGER NOT NULL CHECK (${safePositive('event_count')}),
      first_stream_revision INTEGER NOT NULL
        CHECK (${safePositive('first_stream_revision')}),
      last_stream_revision INTEGER NOT NULL
        CHECK (${safePositive('last_stream_revision')}),
      first_commit_position INTEGER NOT NULL
        CHECK (${safePositive('first_commit_position')}),
      last_commit_position INTEGER NOT NULL
        CHECK (${safePositive('last_commit_position')}),
      recorded_at TEXT NOT NULL CHECK (${nonempty('recorded_at')}),
      CHECK (last_stream_revision = first_stream_revision + event_count - 1),
      CHECK (last_commit_position = first_commit_position + event_count - 1),
      UNIQUE (first_commit_position),
      UNIQUE (last_commit_position)
    );

    CREATE TABLE IF NOT EXISTS event_journal_events (
      event_id TEXT PRIMARY KEY CHECK (${nonempty('event_id')}),
      command_id TEXT NOT NULL,
      stream_type TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      branch_id TEXT NOT NULL CHECK (branch_id = 'root'),
      stream_revision INTEGER NOT NULL CHECK (${safePositive('stream_revision')}),
      commit_position INTEGER NOT NULL CHECK (${safePositive('commit_position')}),
      command_index INTEGER NOT NULL CHECK (${safeNonnegative('command_index')}),
      event_type TEXT NOT NULL CHECK (${nonempty('event_type')}),
      event_version INTEGER NOT NULL CHECK (${safePositive('event_version')}),
      correlation_id TEXT NOT NULL CHECK (${nonempty('correlation_id')}),
      actor_kind TEXT NOT NULL CHECK (actor_kind IN ('human', 'system', 'migration')),
      actor_id TEXT NOT NULL CHECK (${nonempty('actor_id')}),
      authority_type TEXT NOT NULL CHECK (${nonempty('authority_type')}),
      authority_id TEXT NOT NULL CHECK (${nonempty('authority_id')}),
      occurred_at TEXT NOT NULL CHECK (${nonempty('occurred_at')}),
      recorded_at TEXT NOT NULL CHECK (${nonempty('recorded_at')}),
      canonicalizer_version INTEGER NOT NULL
        CHECK (${safePositive('canonicalizer_version')}),
      previous_stream_event_digest TEXT
        CHECK (previous_stream_event_digest IS NULL OR (${digest('previous_stream_event_digest')})),
      event_digest TEXT NOT NULL CHECK (${digest('event_digest')}),
      payload_json TEXT NOT NULL CHECK (length(payload_json) > 0),
      FOREIGN KEY (command_id) REFERENCES event_journal_batches(command_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      CHECK (
        (stream_revision = 1 AND previous_stream_event_digest IS NULL) OR
        (stream_revision > 1 AND previous_stream_event_digest IS NOT NULL)
      ),
      UNIQUE (commit_position),
      UNIQUE (stream_type, stream_id, branch_id, stream_revision),
      UNIQUE (command_id, command_index),
      UNIQUE (event_id, commit_position)
    );

    CREATE TABLE IF NOT EXISTS event_journal_stream_heads (
      stream_type TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      branch_id TEXT NOT NULL CHECK (branch_id = 'root'),
      stream_revision INTEGER NOT NULL CHECK (${safePositive('stream_revision')}),
      event_digest TEXT NOT NULL CHECK (${digest('event_digest')}),
      PRIMARY KEY (stream_type, stream_id, branch_id)
    );

    CREATE TABLE IF NOT EXISTS event_journal_entity_refs (
      event_id TEXT NOT NULL,
      commit_position INTEGER NOT NULL CHECK (${safePositive('commit_position')}),
      entity_type TEXT NOT NULL CHECK (${nonempty('entity_type')}),
      entity_id TEXT NOT NULL CHECK (${nonempty('entity_id')}),
      role TEXT NOT NULL CHECK (${nonempty('role')}),
      PRIMARY KEY (event_id, entity_type, entity_id, role),
      FOREIGN KEY (event_id, commit_position)
        REFERENCES event_journal_events(event_id, commit_position)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS event_journal_causations (
      event_id TEXT NOT NULL,
      commit_position INTEGER NOT NULL CHECK (${safePositive('commit_position')}),
      causation_event_id TEXT NOT NULL CHECK (${nonempty('causation_event_id')}),
      PRIMARY KEY (event_id, causation_event_id),
      FOREIGN KEY (event_id, commit_position)
        REFERENCES event_journal_events(event_id, commit_position)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_event_journal_authority_position
      ON event_journal_events(authority_type, authority_id, commit_position);
    CREATE INDEX IF NOT EXISTS idx_event_journal_correlation_position
      ON event_journal_events(correlation_id, commit_position);
    CREATE INDEX IF NOT EXISTS idx_event_journal_entity_position
      ON event_journal_entity_refs(entity_type, entity_id, commit_position, event_id);
    CREATE INDEX IF NOT EXISTS idx_event_journal_entity_role_position
      ON event_journal_entity_refs(entity_type, entity_id, role, commit_position, event_id);
    CREATE INDEX IF NOT EXISTS idx_event_journal_causation_position
      ON event_journal_causations(causation_event_id, commit_position, event_id);

    CREATE TRIGGER IF NOT EXISTS event_journal_batches_no_update
      BEFORE UPDATE ON event_journal_batches
      BEGIN SELECT RAISE(ABORT, 'event_journal_batches are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS event_journal_batches_no_delete
      BEFORE DELETE ON event_journal_batches
      BEGIN SELECT RAISE(ABORT, 'event_journal_batches are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS event_journal_events_no_update
      BEFORE UPDATE ON event_journal_events
      BEGIN SELECT RAISE(ABORT, 'event_journal_events are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS event_journal_events_no_delete
      BEFORE DELETE ON event_journal_events
      BEGIN SELECT RAISE(ABORT, 'event_journal_events are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS event_journal_entity_refs_no_update
      BEFORE UPDATE ON event_journal_entity_refs
      BEGIN SELECT RAISE(ABORT, 'event_journal_entity_refs are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS event_journal_entity_refs_no_delete
      BEFORE DELETE ON event_journal_entity_refs
      BEGIN SELECT RAISE(ABORT, 'event_journal_entity_refs are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS event_journal_causations_no_update
      BEFORE UPDATE ON event_journal_causations
      BEGIN SELECT RAISE(ABORT, 'event_journal_causations are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS event_journal_causations_no_delete
      BEFORE DELETE ON event_journal_causations
      BEGIN SELECT RAISE(ABORT, 'event_journal_causations are immutable'); END;
  `,
} as const;
