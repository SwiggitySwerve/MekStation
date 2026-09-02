/**
 * Authoritative history branch storage (add-authoritative-history-branches
 * task 1.1 / 1.2; design D1).
 *
 * Three additive tables. They record LINEAGE, never events: per D1 branch
 * metadata is separate from domain events. Migration 26 lifted the journal's
 * `branch_id = 'root'` pin, so a stream may hold several
 * `event_journal_stream_heads` rows; these tables still do not write those
 * rows and are not a second authority on whether the stream's events exist.
 *
 * - `event_history_branches` - one immutable row per branch: stream,
 *   opaque branch id, parent, base revision/event/digest, creator, reason,
 *   typed status.
 * - `event_history_effective_heads` - one row per stream naming the branch
 *   that is currently effective and the effective generation it carries.
 * - `event_history_supersessions` - one immutable row per superseded
 *   branch, binding the prior generation to its replacement.
 *
 * The constraints below are the ones the spec asks for as CONSTRAINTS
 * rather than as convention:
 *
 * - **Same-stream acyclic ancestry.** `ancestor_depth` is 0 at the root
 *   and a trigger requires every child's parent to already exist IN THE
 *   SAME STREAM at exactly `ancestor_depth - 1`. Depth therefore strictly
 *   increases along parentage, and because lineage columns are immutable
 *   (second trigger) no later UPDATE can bend an edge back on itself. A
 *   cycle would need either a parent at equal-or-greater depth or a
 *   re-pointed edge, and neither can be written.
 * - **Root genesis semantics.** Depth 0, a null parent, a null base event
 *   and base revision 0 are one fact expressed four ways; the CHECKs
 *   require them to agree, so a child cannot masquerade as a root (or the
 *   reverse) to escape the depth guard.
 * - **Exactly one effective branch.** A PARTIAL unique index over
 *   `(stream_type, stream_id) WHERE status = 'effective'`. This is the
 *   load-bearing guard: the effective-heads primary key only says which
 *   branch is installed, and without the partial index two rows could
 *   both claim to be effective while the head named one of them.
 * - **Monotonic status.** A rank ladder (building < waiting-effects <
 *   blocked < effective < superseded) that an UPDATE may only climb. The
 *   precise legal-transition table is a typed refusal in
 *   `EventHistoryBranchContract`; this trigger is the coarse net that
 *   holds even for a writer that bypasses the store.
 *
 * ADDITIVE ONLY: no foreign key into `event_journal_*` or into matches.
 * These rows describe lineage over a stream and never become a second
 * authority on whether the stream's events exist.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

const MAX_SAFE_INTEGER = 9007199254740991;

const nonempty = (column: string): string => `length(trim(${column})) > 0`;
const safeIntegerRange = (column: string, minimum: number): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${minimum} AND ${MAX_SAFE_INTEGER}`;
const safeNonnegative = (column: string): string => safeIntegerRange(column, 0);
const safePositive = (column: string): string => safeIntegerRange(column, 1);
const digest = (column: string): string =>
  `length(${column}) = 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

/**
 * The algorithm-defined genesis digest a root branch carries: the journal
 * canonicalizer's digest of an empty history, `sha256(canonicalizeJsonV1([]))`.
 * It is the SAME value `genesisJournalAuthorityBaseline` already records
 * for an empty match stream, so a root branch and a genesis baseline agree
 * about what "nothing has happened yet" hashes to.
 *
 * Pinned as a literal rather than imported so `services/persistence` keeps
 * its one-way dependency out of `lib/events`; the branch contract test
 * proves the literal still equals the derivation.
 */
export const EVENT_HISTORY_GENESIS_DIGEST_LITERAL =
  '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';

/** The generation a stream with no stored generation of its own starts at. */
const FIRST_EFFECTIVE_GENERATION = 1;

/** Rank ladder used by the monotonic-status trigger. */
const statusRank = (column: string): string =>
  `(CASE ${column}
      WHEN 'building' THEN 1
      WHEN 'waiting-effects' THEN 2
      WHEN 'blocked' THEN 3
      WHEN 'effective' THEN 4
      WHEN 'superseded' THEN 5
    END)`;

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;

/**
 * Genesis backfill.
 *
 * One genesis/effective branch per stream that ALREADY has journal events,
 * and one effective head carrying that stream's generation. Both statements
 * are guarded by `NOT EXISTS`, so a re-run after a lost migration record
 * (or a cold reopen) inserts nothing and mutates nothing.
 *
 * The generation is READ, never computed: `match_authority_baseline` is the
 * stream's stored generation when it has one, and 1 otherwise. Deriving it
 * from `stream_revision` would silently promote every adopted stream to a
 * generation nobody ever activated, and resetting a stored generation to 1
 * would erase the record of a rewind that already happened.
 */
export const EVENT_HISTORY_GENESIS_BACKFILL_SQL = `
  INSERT INTO event_history_branches (
    stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
    base_revision, base_event_id, base_digest, status, created_by,
    reason, created_at
  )
  SELECT head.stream_type, head.stream_id, head.branch_id, NULL, 0,
         0, NULL, '${EVENT_HISTORY_GENESIS_DIGEST_LITERAL}', 'effective',
         'migration', 'genesis branch backfilled for an existing linear stream',
         ${NOW}
  FROM event_journal_stream_heads AS head
  WHERE NOT EXISTS (
    SELECT 1 FROM event_history_branches AS branch
    WHERE branch.stream_type = head.stream_type
      AND branch.stream_id = head.stream_id
  );

  INSERT INTO event_history_effective_heads (
    stream_type, stream_id, branch_id, effective_generation, installed_at
  )
  SELECT head.stream_type, head.stream_id, head.branch_id,
         COALESCE(
           (SELECT baseline.effective_generation
            FROM match_authority_baseline AS baseline
            WHERE baseline.stream_type = head.stream_type
              AND baseline.stream_id = head.stream_id),
           ${FIRST_EFFECTIVE_GENERATION}
         ),
         ${NOW}
  FROM event_journal_stream_heads AS head
  WHERE NOT EXISTS (
    SELECT 1 FROM event_history_effective_heads AS effective
    WHERE effective.stream_type = head.stream_type
      AND effective.stream_id = head.stream_id
  );
`;

export const EVENT_HISTORY_BRANCHES_MIGRATION = {
  version: 23,
  name: 'event_history_branches_schema',
  up: `
    CREATE TABLE IF NOT EXISTS event_history_branches (
      stream_type      TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id        TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      branch_id        TEXT NOT NULL CHECK (${nonempty('branch_id')}),
      parent_branch_id TEXT CHECK (parent_branch_id IS NULL OR (${nonempty('parent_branch_id')})),
      ancestor_depth   INTEGER NOT NULL CHECK (${safeNonnegative('ancestor_depth')}),
      base_revision    INTEGER NOT NULL CHECK (${safeNonnegative('base_revision')}),
      base_event_id    TEXT CHECK (base_event_id IS NULL OR (${nonempty('base_event_id')})),
      base_digest      TEXT NOT NULL CHECK (${digest('base_digest')}),
      status           TEXT NOT NULL CHECK (
                         status IN ('building', 'waiting-effects', 'blocked',
                                    'effective', 'superseded')),
      created_by       TEXT NOT NULL CHECK (${nonempty('created_by')}),
      reason           TEXT NOT NULL CHECK (${nonempty('reason')}),
      created_at       TEXT NOT NULL CHECK (${nonempty('created_at')}),
      PRIMARY KEY (stream_type, stream_id, branch_id),
      -- Depth and parentage are one fact: only the root has neither.
      CHECK ((ancestor_depth = 0) = (parent_branch_id IS NULL)),
      -- Root genesis semantics: no base event, revision 0.
      CHECK (parent_branch_id IS NOT NULL
             OR (base_revision = 0 AND base_event_id IS NULL)),
      -- A child anchors to a real event on its parent.
      CHECK (parent_branch_id IS NULL
             OR (base_event_id IS NOT NULL AND base_revision >= 1)),
      CHECK (parent_branch_id IS NULL OR parent_branch_id <> branch_id),
      FOREIGN KEY (stream_type, stream_id, parent_branch_id)
        REFERENCES event_history_branches(stream_type, stream_id, branch_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    -- Exactly one effective branch per stream.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_event_history_branches_one_effective
      ON event_history_branches(stream_type, stream_id)
      WHERE status = 'effective';

    CREATE INDEX IF NOT EXISTS idx_event_history_branches_parent
      ON event_history_branches(stream_type, stream_id, parent_branch_id);

    CREATE TABLE IF NOT EXISTS event_history_effective_heads (
      stream_type          TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id            TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      branch_id            TEXT NOT NULL CHECK (${nonempty('branch_id')}),
      effective_generation INTEGER NOT NULL
                             CHECK (${safePositive('effective_generation')}),
      installed_at         TEXT NOT NULL CHECK (${nonempty('installed_at')}),
      PRIMARY KEY (stream_type, stream_id),
      FOREIGN KEY (stream_type, stream_id, branch_id)
        REFERENCES event_history_branches(stream_type, stream_id, branch_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS event_history_supersessions (
      stream_type            TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id              TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      superseded_branch_id   TEXT NOT NULL
                               CHECK (${nonempty('superseded_branch_id')}),
      replacement_branch_id  TEXT NOT NULL
                               CHECK (${nonempty('replacement_branch_id')}),
      prior_generation       INTEGER NOT NULL
                               CHECK (${safePositive('prior_generation')}),
      replacement_generation INTEGER NOT NULL
                               CHECK (${safePositive('replacement_generation')}),
      reason                 TEXT NOT NULL CHECK (${nonempty('reason')}),
      recorded_at            TEXT NOT NULL CHECK (${nonempty('recorded_at')}),
      PRIMARY KEY (stream_type, stream_id, superseded_branch_id),
      -- Activation increments the generation by exactly one.
      CHECK (replacement_generation = prior_generation + 1),
      CHECK (superseded_branch_id <> replacement_branch_id),
      FOREIGN KEY (stream_type, stream_id, superseded_branch_id)
        REFERENCES event_history_branches(stream_type, stream_id, branch_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
      FOREIGN KEY (stream_type, stream_id, replacement_branch_id)
        REFERENCES event_history_branches(stream_type, stream_id, branch_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    -- Same-stream acyclic ancestry: the parent must already exist, in this
    -- stream, at exactly one less depth.
    CREATE TRIGGER IF NOT EXISTS event_history_branches_ancestry_guard
      BEFORE INSERT ON event_history_branches
      WHEN NEW.parent_branch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM event_history_branches AS parent
        WHERE parent.stream_type = NEW.stream_type
          AND parent.stream_id = NEW.stream_id
          AND parent.branch_id = NEW.parent_branch_id
          AND parent.ancestor_depth = NEW.ancestor_depth - 1)
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_branches ancestry must be same-stream and acyclic');
      END;

    -- Lineage is immutable; only status may move.
    CREATE TRIGGER IF NOT EXISTS event_history_branches_immutable_lineage
      BEFORE UPDATE ON event_history_branches
      WHEN NEW.stream_type <> OLD.stream_type
        OR NEW.stream_id <> OLD.stream_id
        OR NEW.branch_id <> OLD.branch_id
        OR NEW.ancestor_depth <> OLD.ancestor_depth
        OR NEW.base_revision <> OLD.base_revision
        OR NEW.base_digest <> OLD.base_digest
        OR NEW.created_by <> OLD.created_by
        OR NEW.reason <> OLD.reason
        OR NEW.created_at <> OLD.created_at
        OR COALESCE(NEW.parent_branch_id, '') <> COALESCE(OLD.parent_branch_id, '')
        OR COALESCE(NEW.base_event_id, '') <> COALESCE(OLD.base_event_id, '')
      BEGIN
        SELECT RAISE(ABORT, 'event_history_branches lineage is immutable');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_branches_no_delete
      BEFORE DELETE ON event_history_branches
      BEGIN
        SELECT RAISE(ABORT, 'event_history_branches lineage is immutable');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_branches_status_monotonic
      BEFORE UPDATE OF status ON event_history_branches
      WHEN ${statusRank('NEW.status')} <= ${statusRank('OLD.status')}
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_branches status must advance monotonically');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_supersessions_no_update
      BEFORE UPDATE ON event_history_supersessions
      BEGIN
        SELECT RAISE(ABORT, 'event_history_supersessions are immutable');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_supersessions_no_delete
      BEFORE DELETE ON event_history_supersessions
      BEGIN
        SELECT RAISE(ABORT, 'event_history_supersessions are immutable');
      END;

    ${EVENT_HISTORY_GENESIS_BACKFILL_SQL}
  `,
} as const;
