/**
 * Durable correction-lease storage (add-authoritative-history-branches
 * task 2.1; design D2).
 *
 * One additive table. A correction lease is the durable answer to "who is
 * currently allowed to rebuild this stream's history, against which head,
 * and until when" - the thing that survives a host restart, so a crashed
 * owner does not leave a stream rebuildable by nobody and writable by
 * everybody.
 *
 * `event_history_correction_leases` is APPEND-MOSTLY: every lease a stream
 * has ever held stays as a row. Only two columns move after insert - the
 * expiry (renewal extends it) and the state (active -> terminal, once).
 * Keeping the dead rows is not sentiment: the fencing epoch is minted from
 * `MAX(fencing_epoch)` over the whole stream, so deleting a reaped lease
 * would let the next acquirer reuse a dead epoch, and a fence stamped with
 * a reused epoch cannot tell an old writer from a new one.
 *
 * The constraints the spec asks for as CONSTRAINTS rather than convention:
 *
 * - **Monotonically increasing fencing epoch.** A trigger requires every
 *   INSERT to carry exactly `MAX(fencing_epoch) + 1` for its stream, with
 *   the first at 1. This is the `delivery_generation` idiom already in this
 *   schema. Strictly increasing AND gapless is stronger than the spec's
 *   "monotonically increasing" and is what makes an epoch comparison a
 *   total order rather than a guess.
 * - **At most one active lease per stream.** A PARTIAL unique index over
 *   `(stream_type, stream_id) WHERE state = 'active'`. Load-bearing: it
 *   binds any writer, including one that never comes through the store.
 * - **Identity is immutable, expiry only extends, state moves once.** Three
 *   triggers. Renewal must preserve the epoch (design D2), so the epoch is
 *   in the immutable set and only `expires_at_ms` may move - upward.
 * - **A lease binds to a branch that exists in its own stream.** A
 *   composite foreign key into `event_history_branches`. Without it a lease
 *   could pin an expected head this stream never had, and the activation
 *   comparison in PR 2's later seam would be against a fiction.
 *
 * Expiry is stored, never enforced by SQL. A row whose `expires_at_ms` has
 * passed is still `state = 'active'` until an acquirer reaps it: SQLite's
 * `now` is not the domain clock, and a CHECK against it would make the same
 * row legal or illegal depending on when it is read. Whether a lease is
 * LIVE is a domain question the store answers with an explicit clock; the
 * table only records what was promised and until when.
 *
 * ADDITIVE ONLY: no foreign key into `event_journal_*`, no column or
 * trigger change on any existing table.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

const MAX_SAFE_INTEGER = 9007199254740991;

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

const safeIntegerRange = (column: string, minimum: number): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${minimum} AND ${MAX_SAFE_INTEGER}`;

const safeNonnegative = (column: string): string => safeIntegerRange(column, 0);
const safePositive = (column: string): string => safeIntegerRange(column, 1);

/** Exactly 64 lowercase hex characters - the journal digest shape. */
const digest = (column: string): string =>
  `length(${column}) = 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

/**
 * Lease ids are opaque 32-hex handles minted from server randomness, never
 * derived from the stream or the owner - the same shape `delivery_epoch_id`
 * uses. A derivable id would let a caller name a lease it does not hold.
 */
const opaqueLeaseId = (column: string): string =>
  `length(${column}) = 32 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

/** The columns no UPDATE may ever move; only expiry and state are free. */
const IMMUTABLE_LEASE_COLUMNS = [
  'stream_type',
  'stream_id',
  'lease_id',
  'owner',
  'actor',
  'reason',
  'fencing_epoch',
  'expected_branch_id',
  'expected_revision',
  'expected_digest',
  'expected_generation',
  'acquired_at_ms',
] as const;

const immutableLeaseGuard = (): string =>
  IMMUTABLE_LEASE_COLUMNS.map(
    (column) => `NEW.${column} <> OLD.${column}`,
  ).join('\n        OR ');

export const EVENT_HISTORY_CORRECTION_LEASES_MIGRATION = {
  version: 24,
  name: 'event_history_correction_leases_schema',
  up: `
    CREATE TABLE IF NOT EXISTS event_history_correction_leases (
      stream_type         TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id           TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      lease_id            TEXT NOT NULL CHECK (${opaqueLeaseId('lease_id')}),
      -- The process/session that holds the lease. Fencing compares this.
      owner               TEXT NOT NULL CHECK (${nonempty('owner')}),
      -- The principal who authorized the correction. Audit reads this.
      -- Deliberately separate from owner: the same GM may authorize a
      -- correction that two different hosts hold the lease for in turn.
      actor               TEXT NOT NULL CHECK (${nonempty('actor')}),
      reason              TEXT NOT NULL CHECK (${nonempty('reason')}),
      fencing_epoch       INTEGER NOT NULL
                            CHECK (${safePositive('fencing_epoch')}),
      -- The head the build is bound to. A mismatch at activation blocks
      -- rather than silently rebasing (design D2 risk row).
      expected_branch_id  TEXT NOT NULL
                            CHECK (${nonempty('expected_branch_id')}),
      expected_revision   INTEGER NOT NULL
                            CHECK (${safeNonnegative('expected_revision')}),
      expected_digest     TEXT NOT NULL CHECK (${digest('expected_digest')}),
      expected_generation INTEGER NOT NULL
                            CHECK (${safePositive('expected_generation')}),
      acquired_at_ms      INTEGER NOT NULL
                            CHECK (${safePositive('acquired_at_ms')}),
      expires_at_ms       INTEGER NOT NULL
                            CHECK (${safePositive('expires_at_ms')}),
      state               TEXT NOT NULL
                            CHECK (state IN ('active', 'released', 'expired')),
      PRIMARY KEY (stream_type, stream_id, lease_id),
      -- A lease that expires at or before it was acquired was never live.
      CHECK (expires_at_ms > acquired_at_ms),
      -- An epoch is spent once per stream, whatever happened to its lease.
      UNIQUE (stream_type, stream_id, fencing_epoch),
      FOREIGN KEY (stream_type, stream_id, expected_branch_id)
        REFERENCES event_history_branches(stream_type, stream_id, branch_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    -- At most one active lease per stream.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_event_history_correction_leases_one_active
      ON event_history_correction_leases(stream_type, stream_id)
      WHERE state = 'active';

    -- The fencing epoch climbs by exactly one, counting terminal rows, so
    -- takeover after expiry can never reuse the epoch it replaced.
    CREATE TRIGGER IF NOT EXISTS event_history_correction_leases_epoch_monotonic
      BEFORE INSERT ON event_history_correction_leases
      WHEN NEW.fencing_epoch <> COALESCE(
        (SELECT MAX(prior.fencing_epoch)
         FROM event_history_correction_leases AS prior
         WHERE prior.stream_type = NEW.stream_type
           AND prior.stream_id = NEW.stream_id), 0) + 1
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_correction_leases fencing epoch must increase by exactly one');
      END;

    -- Everything but expiry and state is frozen at acquisition. Renewal
    -- preserving the epoch (design D2) is exactly this trigger.
    CREATE TRIGGER IF NOT EXISTS event_history_correction_leases_immutable
      BEFORE UPDATE ON event_history_correction_leases
      WHEN ${immutableLeaseGuard()}
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_correction_leases identity is immutable');
      END;

    -- Renewal extends. Shortening an expiry would let an owner retire a
    -- lease without a state move, hiding the handover from the epoch ladder.
    CREATE TRIGGER IF NOT EXISTS event_history_correction_leases_expiry_extends_only
      BEFORE UPDATE ON event_history_correction_leases
      WHEN NEW.expires_at_ms < OLD.expires_at_ms
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_correction_leases expiry may only extend');
      END;

    -- Active is the only state a lease may leave, and it leaves once. A
    -- no-op 'active' -> 'active' write is refused too: a reaper that saw
    -- one row changed would otherwise believe it reclaimed a live lease.
    CREATE TRIGGER IF NOT EXISTS event_history_correction_leases_state_terminal
      BEFORE UPDATE OF state ON event_history_correction_leases
      WHEN OLD.state <> 'active' OR NEW.state = 'active'
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_correction_leases state moves from active to a terminal state exactly once');
      END;

    -- Dead leases are the epoch ledger; deleting one reopens a spent epoch.
    CREATE TRIGGER IF NOT EXISTS event_history_correction_leases_no_delete
      BEFORE DELETE ON event_history_correction_leases
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_correction_leases are never deleted');
      END;
  `,
} as const;
