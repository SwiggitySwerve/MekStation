/**
 * Immutable match authority baseline (adopt-combat-event-journal-authority
 * task 1.3; design D4).
 *
 * Before a match can be run from the journal, something has to record
 * WHERE its truth began. Without that, a reader cannot tell a match
 * whose whole history is in the journal from one that was adopted
 * partway through, and the difference decides which reader is truthful
 * after a rollback.
 *
 * One row per match, carrying the tuple D4 names:
 * `(streamType, streamId, branchId, revision, digest, effectiveGeneration)`.
 *
 * IMMUTABLE BY CONSTRUCTION. There is no UPDATE path in the store, and
 * the primary key makes a second insert fail rather than overwrite. A
 * baseline that can be rewritten is not a baseline - it is a guess that
 * happens to be current, and a rollback reader consulting it would be
 * told whatever the last writer believed rather than what was imported.
 *
 * MISSING PREFIXES ARE LABELLED, NEVER INVENTED. `source` records
 * whether the retained log actually began at the start of the stream or
 * whether truth begins later, and `first_retained_revision` says where.
 * Fabricating the missing prefix would put events into history that
 * nobody ever committed.
 *
 * ADDITIVE ONLY: no foreign key into matches. This row records what was
 * imported, and never becomes a second authority on whether the match
 * itself exists.
 */

const nonempty = (column: string): string => `length(trim(${column})) > 0`;

export const MATCH_AUTHORITY_BASELINE_MIGRATION = {
  version: 18,
  name: 'match_authority_baseline_schema',
  up: `
    CREATE TABLE IF NOT EXISTS match_authority_baseline (
      stream_id               TEXT NOT NULL PRIMARY KEY
                                CHECK (${nonempty('stream_id')}),
      stream_type             TEXT NOT NULL CHECK (stream_type = 'match'),
      branch_id               TEXT NOT NULL CHECK (${nonempty('branch_id')}),
      revision                INTEGER NOT NULL CHECK (revision >= 0),
      digest                  TEXT NOT NULL CHECK (${nonempty('digest')}),
      effective_generation    INTEGER NOT NULL CHECK (effective_generation >= 1),
      source                  TEXT NOT NULL
                                CHECK (source IN ('retained-log', 'legacy-baseline')),
      first_retained_revision INTEGER NOT NULL
                                CHECK (first_retained_revision >= 0),
      imported_at             TEXT NOT NULL CHECK (${nonempty('imported_at')})
    );
  `,
};
