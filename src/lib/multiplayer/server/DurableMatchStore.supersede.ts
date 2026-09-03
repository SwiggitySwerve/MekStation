/**
 * Logical truncation by moving the live tail into sibling tables.
 *
 * Live uniqueness stays PRIMARY KEY (match_id, sequence). An in-table
 * superseded_at mark cannot share that composite PK with a partial
 * live unique, and dropping the PK broke mp_imported_legacy_events
 * (SQLite FK parent must be UNIQUE/PK) plus any DML that checked it
 * (import, prune, admission).
 *
 * supersedeFrom MOVEs rows at/after the cut into mp_*_superseded
 * (same columns + superseded_at) in one transaction. Live tables stay
 * the original unique space, so live reads need no filter. Sibling
 * tables use rowid identity: a second rewind can reuse a sequence
 * under the same `at` stamp, so (match_id, sequence) cannot be the
 * sibling PK.
 *
 * 15.2 checkpoint law is unchanged: an old-head checkpoint is already
 * unattested by digest against the activated prefix. Read superseded
 * bytes from the sibling table, never from the live log.
 */

import type Database from 'better-sqlite3';

export const MATCH_STORE_SUPERSESSION_USER_VERSION = 1;

/**
 * Live tables hold only live rows. Older `AND ${LIVE_ROW_SQL}` filters
 * stay valid as a tautology; do not add superseded_at back to live.
 */
export const LIVE_ROW_SQL = '1';

export const EVENTS_SUPERSEDED_TABLE = 'mp_match_events_superseded';
export const OUTBOX_SUPERSEDED_TABLE = 'mp_match_outbox_superseded';
export const RECEIPTS_SUPERSEDED_TABLE = 'mp_command_receipts_superseded';

export const SUPERSESSION_SIBLING_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS ${EVENTS_SUPERSEDED_TABLE} (
    match_id       TEXT NOT NULL,
    sequence       INTEGER NOT NULL,
    event_json     TEXT NOT NULL,
    superseded_at  TEXT NOT NULL,
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_mp_match_events_superseded_match
    ON ${EVENTS_SUPERSEDED_TABLE}(match_id, sequence);

  CREATE TABLE IF NOT EXISTS ${OUTBOX_SUPERSEDED_TABLE} (
    match_id       TEXT NOT NULL,
    sequence       INTEGER NOT NULL,
    command_id     TEXT NOT NULL,
    event_json     TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    published_at   TEXT,
    superseded_at  TEXT NOT NULL,
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_mp_match_outbox_superseded_match
    ON ${OUTBOX_SUPERSEDED_TABLE}(match_id, sequence);

  CREATE TABLE IF NOT EXISTS ${RECEIPTS_SUPERSEDED_TABLE} (
    match_id       TEXT NOT NULL,
    command_id     TEXT NOT NULL,
    actor_id       TEXT NOT NULL,
    first_revision INTEGER NOT NULL,
    last_revision  INTEGER NOT NULL,
    event_count    INTEGER NOT NULL,
    fingerprint    TEXT NOT NULL,
    post_digest    TEXT,
    committed_at   TEXT NOT NULL,
    superseded_at  TEXT NOT NULL,
    FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_mp_command_receipts_superseded_match
    ON ${RECEIPTS_SUPERSEDED_TABLE}(match_id, last_revision);
`;

function tableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(table) as { ok: number } | undefined;
  return row !== undefined;
}

/**
 * True when any sibling table is missing. A second open is a no-op
 * once all three exist — CREATE IF NOT EXISTS is the migrate.
 */
export function matchStoreNeedsSupersessionMigrate(
  db: Database.Database,
): boolean {
  return (
    !tableExists(db, EVENTS_SUPERSEDED_TABLE) ||
    !tableExists(db, OUTBOX_SUPERSEDED_TABLE) ||
    !tableExists(db, RECEIPTS_SUPERSEDED_TABLE)
  );
}

function stampSupersessionUserVersion(db: Database.Database): void {
  db.pragma(`user_version = ${MATCH_STORE_SUPERSESSION_USER_VERSION}`);
}

export function migrateMatchStoreSupersession(db: Database.Database): void {
  // Sibling CREATE IF NOT EXISTS only. Live PKs are never rebuilt.
  // Drop leftover 14.4-b partial uniques so a second open matches
  // SCHEMA_SQL (those indexes named a superseded_at live column).
  db.exec(SUPERSESSION_SIBLING_SCHEMA_SQL);
  db.exec(`
    DROP INDEX IF EXISTS idx_mp_match_events_live;
    DROP INDEX IF EXISTS idx_mp_match_outbox_live;
  `);
  stampSupersessionUserVersion(db);
}

/**
 * Move the live tail from `fromSequence` inclusive. Idempotent when
 * the live tail is already empty. `fromSequence` is the first
 * discarded store sequence (revision = sequence + 1).
 */
export function supersedeMatchStoreFrom(
  db: Database.Database,
  matchId: string,
  fromSequence: number,
  at: string,
): void {
  db.transaction(() => {
    db.prepare(
      `INSERT INTO ${EVENTS_SUPERSEDED_TABLE}
         (match_id, sequence, event_json, superseded_at)
       SELECT match_id, sequence, event_json, ?
         FROM mp_match_events
        WHERE match_id = ? AND sequence >= ?`,
    ).run(at, matchId, fromSequence);
    db.prepare(
      `DELETE FROM mp_match_events
        WHERE match_id = ? AND sequence >= ?`,
    ).run(matchId, fromSequence);

    db.prepare(
      `INSERT INTO ${OUTBOX_SUPERSEDED_TABLE}
         (match_id, sequence, command_id, event_json, created_at,
          published_at, superseded_at)
       SELECT match_id, sequence, command_id, event_json, created_at,
              published_at, ?
         FROM mp_match_outbox
        WHERE match_id = ? AND sequence >= ?`,
    ).run(at, matchId, fromSequence);
    db.prepare(
      `DELETE FROM mp_match_outbox
        WHERE match_id = ? AND sequence >= ?`,
    ).run(matchId, fromSequence);

    db.prepare(
      `INSERT INTO ${RECEIPTS_SUPERSEDED_TABLE}
         (match_id, command_id, actor_id, first_revision, last_revision,
          event_count, fingerprint, post_digest, committed_at, superseded_at)
       SELECT match_id, command_id, actor_id, first_revision, last_revision,
              event_count, fingerprint, post_digest, committed_at, ?
         FROM mp_command_receipts
        WHERE match_id = ? AND last_revision >= ?`,
    ).run(at, matchId, fromSequence);
    db.prepare(
      `DELETE FROM mp_command_receipts
        WHERE match_id = ? AND last_revision >= ?`,
    ).run(matchId, fromSequence);
  })();
}

/**
 * Drop sibling rows for matches about to be pruned. CASCADE from
 * mp_matches would also clear them; an explicit delete keeps prune
 * from failing if a sibling FK is missing or foreign_keys is off.
 */
export function deleteSupersededRowsForMatches(
  db: Database.Database,
  matchIds: readonly string[],
): void {
  if (matchIds.length === 0) return;
  const deleteEvents = db.prepare(
    `DELETE FROM ${EVENTS_SUPERSEDED_TABLE} WHERE match_id = ?`,
  );
  const deleteOutbox = db.prepare(
    `DELETE FROM ${OUTBOX_SUPERSEDED_TABLE} WHERE match_id = ?`,
  );
  const deleteReceipts = db.prepare(
    `DELETE FROM ${RECEIPTS_SUPERSEDED_TABLE} WHERE match_id = ?`,
  );
  for (const matchId of matchIds) {
    deleteEvents.run(matchId);
    deleteOutbox.run(matchId);
    deleteReceipts.run(matchId);
  }
}

export interface ISupersededMatchEventRow {
  readonly matchId: string;
  readonly sequence: number;
  readonly eventJson: string;
  readonly supersededAt: string;
}

/** Sibling read for 15.2 / replay of superseded bytes. */
export function readSupersededMatchEvents(
  db: Database.Database,
  matchId: string,
): readonly ISupersededMatchEventRow[] {
  if (!tableExists(db, EVENTS_SUPERSEDED_TABLE)) return [];
  const rows = db
    .prepare(
      `SELECT match_id, sequence, event_json, superseded_at
         FROM ${EVENTS_SUPERSEDED_TABLE}
        WHERE match_id = ?
        ORDER BY sequence ASC, rowid ASC`,
    )
    .all(matchId) as Array<{
    match_id: string;
    sequence: number;
    event_json: string;
    superseded_at: string;
  }>;
  return rows.map((row) => ({
    matchId: row.match_id,
    sequence: row.sequence,
    eventJson: row.event_json,
    supersededAt: row.superseded_at,
  }));
}
