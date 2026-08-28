const MAX_SAFE_INTEGER = 9007199254740991;

/** Non-whitespace TEXT CHECK fragment shared by identity columns. */
const nonempty = (column: string): string => `length(trim(${column})) > 0`;

/**
 * True when a TEXT column is exactly 32 lowercase hex chars. Epoch ids
 * are server-minted crypto randomness, never a digest of the epoch key.
 */
const opaqueEpochId = (column: string): string =>
  `length(${column}) = 32 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

const safeIntegerRange = (column: string, minimum: number): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${minimum} AND ${MAX_SAFE_INTEGER}`;

const safePositive = (column: string): string => safeIntegerRange(column, 1);

/**
 * membershipRevision is an epoch HASH (non-monotonic). It must be a
 * whole integer but is not required to be positive.
 */
const membershipRevision = (column: string): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${-MAX_SAFE_INTEGER} AND ${MAX_SAFE_INTEGER}`;

/**
 * Durable viewer delivery epochs (authority-audit PR 7, design D2).
 *
 * ADDITIVE ONLY: three new tables, no foreign keys into journal, audit,
 * or private-record tables, and no column or trigger changes on them.
 * Linkage to a stream is by identity values only.
 *
 * Epoch ids are opaque 32-hex handles minted server-side. The complete
 * 8-column key is UNIQUE so resolve is race-safe via insert-then-read.
 * Mapping rows are append-only: sequences start at 1 and never reuse
 * a slot. Generation is the monotonic rebaseline axis this schema owns
 * (membershipRevision is a non-monotonic hash owned by admission).
 *
 * Generation bootstrap: INSERT is legal only at 1. A bump is an UPDATE
 * that advances by exactly 1. Absent rows mean implicit generation 1;
 * the first bump materializes 1 then advances to 2 in one transaction.
 *
 * This seam is the tables plus store plus proofs. Live socket and
 * route adoption is owned by PR 8.
 */
export const DELIVERY_EPOCHS_MIGRATION = {
  version: 13,
  name: 'delivery_epochs_schema',
  up: `
    CREATE TABLE IF NOT EXISTS delivery_epoch (
      delivery_epoch_id TEXT PRIMARY KEY NOT NULL CHECK (${opaqueEpochId('delivery_epoch_id')}),
      principal_id TEXT NOT NULL CHECK (${nonempty('principal_id')}),
      campaign_session_id TEXT NOT NULL CHECK (${nonempty('campaign_session_id')}),
      participant_id TEXT NOT NULL CHECK (${nonempty('participant_id')}),
      membership_revision INTEGER NOT NULL CHECK (${membershipRevision('membership_revision')}),
      stream_type TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      projector_version INTEGER NOT NULL CHECK (${safePositive('projector_version')}),
      effective_generation INTEGER NOT NULL CHECK (${safePositive('effective_generation')}),
      created_at TEXT NOT NULL CHECK (${nonempty('created_at')}),
      UNIQUE (
        principal_id,
        campaign_session_id,
        participant_id,
        membership_revision,
        stream_type,
        stream_id,
        projector_version,
        effective_generation
      )
    );

    CREATE TRIGGER IF NOT EXISTS delivery_epoch_no_update
      BEFORE UPDATE ON delivery_epoch
      BEGIN
        SELECT RAISE(ABORT, 'delivery_epoch rows are append-only');
      END;

    CREATE TRIGGER IF NOT EXISTS delivery_epoch_no_delete
      BEFORE DELETE ON delivery_epoch
      BEGIN
        SELECT RAISE(ABORT, 'delivery_epoch rows are append-only');
      END;

    CREATE TABLE IF NOT EXISTS delivery_event_mapping (
      delivery_epoch_id TEXT NOT NULL CHECK (${opaqueEpochId('delivery_epoch_id')}),
      projected_event_identity TEXT NOT NULL CHECK (${nonempty('projected_event_identity')}),
      delivery_sequence INTEGER NOT NULL CHECK (${safePositive('delivery_sequence')}),
      created_at TEXT NOT NULL CHECK (${nonempty('created_at')}),
      UNIQUE (delivery_epoch_id, projected_event_identity),
      UNIQUE (delivery_epoch_id, delivery_sequence)
    );

    CREATE TRIGGER IF NOT EXISTS delivery_event_mapping_no_update
      BEFORE UPDATE ON delivery_event_mapping
      BEGIN
        SELECT RAISE(ABORT, 'delivery_event_mapping rows are append-only');
      END;

    CREATE TRIGGER IF NOT EXISTS delivery_event_mapping_no_delete
      BEFORE DELETE ON delivery_event_mapping
      BEGIN
        SELECT RAISE(ABORT, 'delivery_event_mapping rows are append-only');
      END;

    CREATE TABLE IF NOT EXISTS delivery_generation (
      campaign_session_id TEXT NOT NULL CHECK (${nonempty('campaign_session_id')}),
      stream_type TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      effective_generation INTEGER NOT NULL CHECK (${safePositive('effective_generation')}),
      UNIQUE (campaign_session_id, stream_type, stream_id)
    );

    CREATE TRIGGER IF NOT EXISTS delivery_generation_insert_baseline
      BEFORE INSERT ON delivery_generation
      WHEN NEW.effective_generation != 1
      BEGIN
        SELECT RAISE(ABORT, 'delivery_generation inserts must start at 1; bump advances by 1');
      END;

    CREATE TRIGGER IF NOT EXISTS delivery_generation_bump_only
      BEFORE UPDATE ON delivery_generation
      WHEN NOT (
        OLD.campaign_session_id = NEW.campaign_session_id
        AND OLD.stream_type = NEW.stream_type
        AND OLD.stream_id = NEW.stream_id
        AND NEW.effective_generation = OLD.effective_generation + 1
      )
      BEGIN
        SELECT RAISE(ABORT, 'delivery_generation updates may only increment effective_generation by 1');
      END;

    CREATE TRIGGER IF NOT EXISTS delivery_generation_no_delete
      BEFORE DELETE ON delivery_generation
      BEGIN
        SELECT RAISE(ABORT, 'delivery_generation rows may not be deleted');
      END;
  `,
};
