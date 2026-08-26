/**
 * SQLite store for the immutable match authority baseline
 * (adopt-combat-event-journal-authority task 1.3).
 *
 * There is deliberately NO update method. Immutability is not a comment
 * here — it is the absence of a way to write twice, backed by the
 * primary key, so a second insert throws rather than overwrites.
 */

import type { IMatchAuthorityBaseline } from '@/lib/multiplayer/server/matchAuthorityBaseline';

import { getSQLiteService } from '@/services/persistence/SQLiteService';

interface IRow {
  readonly stream_id: string;
  readonly stream_type: string;
  readonly branch_id: string;
  readonly revision: number;
  readonly digest: string;
  readonly effective_generation: number;
  readonly source: string;
  readonly first_retained_revision: number;
  readonly imported_at: string;
}

function toBaseline(row: IRow): IMatchAuthorityBaseline {
  return {
    streamType: 'match',
    streamId: row.stream_id,
    branchId: row.branch_id,
    revision: row.revision,
    digest: row.digest,
    effectiveGeneration: row.effective_generation,
    source:
      row.source === 'legacy-baseline' ? 'legacy-baseline' : 'retained-log',
    firstRetainedRevision: row.first_retained_revision,
    importedAt: row.imported_at,
  };
}

/** The stored baseline for a match, or null when none was imported. */
export function readMatchAuthorityBaseline(
  streamId: string,
): IMatchAuthorityBaseline | null {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(`SELECT * FROM match_authority_baseline WHERE stream_id = ?`)
    .get(streamId) as IRow | undefined;
  return row === undefined ? null : toBaseline(row);
}

/**
 * Writes a baseline exactly once. A second call for the same match
 * throws on the primary key rather than replacing the row — callers go
 * through `importMatchAuthorityBaseline`, which reads first and never
 * reaches here twice.
 */
export function insertMatchAuthorityBaseline(
  baseline: IMatchAuthorityBaseline,
): void {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO match_authority_baseline (
         stream_id, stream_type, branch_id, revision, digest,
         effective_generation, source, first_retained_revision, imported_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      baseline.streamId,
      baseline.streamType,
      baseline.branchId,
      baseline.revision,
      baseline.digest,
      baseline.effectiveGeneration,
      baseline.source,
      baseline.firstRetainedRevision,
      baseline.importedAt,
    );
}

/** The store shape `importMatchAuthorityBaseline` expects. */
export function sqliteMatchBaselineStore(): {
  read: (streamId: string) => IMatchAuthorityBaseline | null;
  insert: (baseline: IMatchAuthorityBaseline) => void;
} {
  return {
    read: readMatchAuthorityBaseline,
    insert: insertMatchAuthorityBaseline,
  };
}
