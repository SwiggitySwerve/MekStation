/**
 * Affected-artifact manifest storage (add-authoritative-history-branches
 * task 2.3; design D2).
 *
 * Before a candidate may activate, the authority has to know what
 * activating it would INVALIDATE - the replays, exports, checkpoints and
 * cached projections that were derived from history the replacement is
 * about to supersede. These two tables are where that list lives.
 *
 * - `event_history_artifact_manifest_entries` - one immutable row per
 *   affected artifact: its kind, its identity, and the revision whose
 *   replacement makes it stale.
 * - `event_history_artifact_manifests` - the header that SEALS the list:
 *   the digest of the entries it covers, how many there were, and when it
 *   was derived.
 *
 * The rule that makes this a manifest rather than a scratch list:
 *
 * - **Sealing.** Entries are written first; the header last. A trigger then
 *   refuses any further entry for a candidate whose header exists. So the
 *   blast radius of an activation is fixed at the moment it is recorded,
 *   and cannot be widened afterwards by a writer that reviewed nothing.
 *   Before the header lands the list is still being derived; after it
 *   lands, it is evidence.
 * - **Immutable and undeletable.** Both tables refuse UPDATE and DELETE.
 *   A manifest is the record of what an activation promised to invalidate;
 *   editing it after the fact would let the promise be rewritten to match
 *   whatever actually happened.
 * - **Bound to a real candidate in its own stream.** A composite foreign
 *   key into `event_history_branches`. A manifest for a branch this stream
 *   never had would describe an invalidation nobody can audit.
 *
 * Deliberately NOT constrained here: that the header's `entry_count` and
 * `manifest_digest` match the rows. SQL can count, but it cannot hash the
 * canonical form the rest of this change hashes with, and a count that
 * agreed while the digest did not would be worse than no check at all. The
 * digest is verified in the store, over the same canonicalizer the journal
 * uses, and the seal is what stops the rows from moving underneath it.
 *
 * Also not constrained: the candidate's status. A manifest is derived while
 * the branch is `building` and must still read after it becomes
 * `effective`, so status has no place in these constraints.
 *
 * ADDITIVE ONLY: two new tables, no foreign key into `event_journal_*`, no
 * column or trigger change on any existing table.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

const MAX_SAFE_INTEGER = 9007199254740991;

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

const safeIntegerRange = (column: string, minimum: number): string =>
  `typeof(${column}) = 'integer' AND ${column} BETWEEN ${minimum} AND ${MAX_SAFE_INTEGER}`;

const safeNonnegative = (column: string): string => safeIntegerRange(column, 0);

/** Exactly 64 lowercase hex characters - the journal digest shape. */
const digest = (column: string): string =>
  `length(${column}) = 64 AND ${column} NOT GLOB '*[^0-9a-f]*'`;

/**
 * The artifact families an activation can invalidate. A closed set: an
 * unknown kind would be an artifact nothing knows how to invalidate, which
 * is the same as not recording it.
 */
export const EVENT_HISTORY_ARTIFACT_KINDS = [
  'replay',
  'export',
  'checkpoint',
  'projection',
] as const;

const artifactKindList = EVENT_HISTORY_ARTIFACT_KINDS.map(
  (kind) => `'${kind}'`,
).join(', ');

export const EVENT_HISTORY_ARTIFACT_MANIFEST_MIGRATION = {
  version: 25,
  name: 'event_history_artifact_manifest_schema',
  up: `
    CREATE TABLE IF NOT EXISTS event_history_artifact_manifest_entries (
      stream_type         TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id           TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      candidate_branch_id TEXT NOT NULL
                            CHECK (${nonempty('candidate_branch_id')}),
      artifact_kind       TEXT NOT NULL
                            CHECK (artifact_kind IN (${artifactKindList})),
      artifact_id         TEXT NOT NULL CHECK (${nonempty('artifact_id')}),
      -- The revision whose replacement makes this artifact stale.
      source_revision     INTEGER NOT NULL
                            CHECK (${safeNonnegative('source_revision')}),
      PRIMARY KEY (stream_type, stream_id, candidate_branch_id,
                   artifact_kind, artifact_id),
      FOREIGN KEY (stream_type, stream_id, candidate_branch_id)
        REFERENCES event_history_branches(stream_type, stream_id, branch_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS event_history_artifact_manifests (
      stream_type         TEXT NOT NULL CHECK (${nonempty('stream_type')}),
      stream_id           TEXT NOT NULL CHECK (${nonempty('stream_id')}),
      candidate_branch_id TEXT NOT NULL
                            CHECK (${nonempty('candidate_branch_id')}),
      -- Digest of the canonical entry list this header seals.
      manifest_digest     TEXT NOT NULL CHECK (${digest('manifest_digest')}),
      entry_count         INTEGER NOT NULL
                            CHECK (${safeNonnegative('entry_count')}),
      derived_at          TEXT NOT NULL CHECK (${nonempty('derived_at')}),
      PRIMARY KEY (stream_type, stream_id, candidate_branch_id),
      FOREIGN KEY (stream_type, stream_id, candidate_branch_id)
        REFERENCES event_history_branches(stream_type, stream_id, branch_id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
    );

    -- The seal. Once a candidate's header exists its list is closed, so
    -- the blast radius reviewed before activation is the one that stands.
    CREATE TRIGGER IF NOT EXISTS event_history_artifact_manifest_sealed
      BEFORE INSERT ON event_history_artifact_manifest_entries
      WHEN EXISTS (
        SELECT 1 FROM event_history_artifact_manifests AS sealed
        WHERE sealed.stream_type = NEW.stream_type
          AND sealed.stream_id = NEW.stream_id
          AND sealed.candidate_branch_id = NEW.candidate_branch_id)
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_artifact_manifest is sealed; entries are closed');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_artifact_manifests_no_update
      BEFORE UPDATE ON event_history_artifact_manifests
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_artifact_manifests are immutable');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_artifact_manifests_no_delete
      BEFORE DELETE ON event_history_artifact_manifests
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_artifact_manifests are immutable');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_artifact_entries_no_update
      BEFORE UPDATE ON event_history_artifact_manifest_entries
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_artifact_manifest entries are immutable');
      END;

    CREATE TRIGGER IF NOT EXISTS event_history_artifact_entries_no_delete
      BEFORE DELETE ON event_history_artifact_manifest_entries
      BEGIN
        SELECT RAISE(ABORT,
          'event_history_artifact_manifest entries are immutable');
      END;
  `,
} as const;
