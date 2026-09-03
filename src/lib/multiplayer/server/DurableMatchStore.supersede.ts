/**
 * Logical truncation of the match-store log by supersession marks.
 *
 * A committed rewind used to leave every mp_match_events row in place.
 * Live uniqueness was PRIMARY KEY (match_id, sequence), so the first
 * persist at the cut collided. SQLite cannot ALTER a PK, so this step
 * rebuilds events and outbox inside one transaction and replaces that
 * unique with a PARTIAL index on live rows only.
 *
 * Receipts keep (match_id, command_id) — new commands mint new ids —
 * and take the same nullable mark so last-receipt and the outbox drain
 * can skip the tail without a join. A join on marked events would miss
 * an outbox row whose sequence the event rewrite had not yet reached,
 * and receipts do not share that key.
 *
 * This match file never had schema_version. Open still execs CREATE
 * TABLE IF NOT EXISTS. This migrate decides per table from PRAGMA
 * table_info (add the mark / rebuild only where it is missing) and
 * stamps PRAGMA user_version = 1 last so a crash mid-rebuild retries.
 *
 * 15.2 checkpoint law is unchanged: an old-head checkpoint is already
 * unattested by digest against the activated prefix. Marks do not
 * delete or rewrite checkpoint rows.
 */

import type Database from 'better-sqlite3';

export const MATCH_STORE_SUPERSESSION_USER_VERSION = 1;

/** Live-row predicate shared by every head / read / drain filter. */
export const LIVE_ROW_SQL = 'superseded_at IS NULL';

interface ITableColumn {
  readonly name: string;
  readonly pk: number;
}

function columns(db: Database.Database, table: string): ITableColumn[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as ITableColumn[];
}

function hasColumn(
  db: Database.Database,
  table: string,
  name: string,
): boolean {
  return columns(db, table).some((column) => column.name === name);
}

function hasPrimaryKey(db: Database.Database, table: string): boolean {
  return columns(db, table).some((column) => column.pk > 0);
}

function tableExists(db: Database.Database, table: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
    )
    .get(table) as { ok: number } | undefined;
  return row !== undefined;
}

function eventsNeedRebuild(db: Database.Database): boolean {
  if (!tableExists(db, 'mp_match_events')) return false;
  return (
    !hasColumn(db, 'mp_match_events', 'superseded_at') ||
    hasPrimaryKey(db, 'mp_match_events')
  );
}

function outboxNeedRebuild(db: Database.Database): boolean {
  if (!tableExists(db, 'mp_match_outbox')) return false;
  return (
    !hasColumn(db, 'mp_match_outbox', 'superseded_at') ||
    hasPrimaryKey(db, 'mp_match_outbox')
  );
}

function receiptsNeedMark(db: Database.Database): boolean {
  if (!tableExists(db, 'mp_command_receipts')) return false;
  return !hasColumn(db, 'mp_command_receipts', 'superseded_at');
}

/**
 * True when events/outbox still carry a full PK or any of the three
 * tables is missing superseded_at. Used so a second open is a no-op
 * even if user_version was stamped by an older build.
 */
export function matchStoreNeedsSupersessionMigrate(
  db: Database.Database,
): boolean {
  return (
    eventsNeedRebuild(db) || outboxNeedRebuild(db) || receiptsNeedMark(db)
  );
}

function stampSupersessionUserVersion(db: Database.Database): void {
  db.pragma(`user_version = ${MATCH_STORE_SUPERSESSION_USER_VERSION}`);
}

/** Partial live uniques — only after superseded_at exists on the table. */
function ensureLiveUniqueIndexes(db: Database.Database): void {
  if (
    tableExists(db, 'mp_match_events') &&
    hasColumn(db, 'mp_match_events', 'superseded_at')
  ) {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_match_events_live
        ON mp_match_events(match_id, sequence) WHERE superseded_at IS NULL;
    `);
  }
  if (
    tableExists(db, 'mp_match_outbox') &&
    hasColumn(db, 'mp_match_outbox', 'superseded_at')
  ) {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_match_outbox_live
        ON mp_match_outbox(match_id, sequence) WHERE superseded_at IS NULL;
    `);
  }
}

export function migrateMatchStoreSupersession(db: Database.Database): void {
  // Per-table PRAGMA table_info, never user_version, decides work.
  // A stamp-first / version-gated skip would leave a pre-mark file
  // (or a file that only rebuilt one table) without superseded_at.
  const needEvents = eventsNeedRebuild(db);
  const needOutbox = outboxNeedRebuild(db);
  const needReceipts = receiptsNeedMark(db);
  if (!needEvents && !needOutbox && !needReceipts) {
    ensureLiveUniqueIndexes(db);
    stampSupersessionUserVersion(db);
    return;
  }
  // foreign_keys cannot change inside a transaction.
  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      if (needEvents) rebuildEventsTable(db);
      if (needOutbox) rebuildOutboxTable(db);
      if (needReceipts) addReceiptsMark(db);
      ensureLiveUniqueIndexes(db);
      stampSupersessionUserVersion(db);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

function rebuildEventsTable(db: Database.Database): void {
  if (!tableExists(db, 'mp_match_events')) return;
  if (
    hasColumn(db, 'mp_match_events', 'superseded_at') &&
    !hasPrimaryKey(db, 'mp_match_events')
  ) {
    return;
  }
  const mark = hasColumn(db, 'mp_match_events', 'superseded_at')
    ? 'superseded_at'
    : 'NULL';
  db.exec(`
    CREATE TABLE mp_match_events_next (
      match_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      event_json TEXT NOT NULL,
      superseded_at TEXT,
      FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
    );
    INSERT INTO mp_match_events_next
      (match_id, sequence, event_json, superseded_at)
      SELECT match_id, sequence, event_json, ${mark} FROM mp_match_events;
    DROP TABLE mp_match_events;
    ALTER TABLE mp_match_events_next RENAME TO mp_match_events;
    CREATE INDEX IF NOT EXISTS idx_mp_match_events_match
      ON mp_match_events(match_id, sequence);
  `);
}

function rebuildOutboxTable(db: Database.Database): void {
  if (!tableExists(db, 'mp_match_outbox')) return;
  if (
    hasColumn(db, 'mp_match_outbox', 'superseded_at') &&
    !hasPrimaryKey(db, 'mp_match_outbox')
  ) {
    return;
  }
  const mark = hasColumn(db, 'mp_match_outbox', 'superseded_at')
    ? 'superseded_at'
    : 'NULL';
  db.exec(`
    CREATE TABLE mp_match_outbox_next (
      match_id TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      command_id TEXT NOT NULL,
      event_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      published_at TEXT,
      superseded_at TEXT,
      FOREIGN KEY (match_id) REFERENCES mp_matches(match_id) ON DELETE CASCADE
    );
    INSERT INTO mp_match_outbox_next
      (match_id, sequence, command_id, event_json, created_at,
       published_at, superseded_at)
      SELECT match_id, sequence, command_id, event_json, created_at,
             published_at, ${mark}
        FROM mp_match_outbox;
    DROP TABLE mp_match_outbox;
    ALTER TABLE mp_match_outbox_next RENAME TO mp_match_outbox;
    CREATE INDEX IF NOT EXISTS idx_mp_match_outbox_pending
      ON mp_match_outbox(match_id, published_at, sequence);
  `);
}

function addReceiptsMark(db: Database.Database): void {
  if (!tableExists(db, 'mp_command_receipts')) return;
  if (hasColumn(db, 'mp_command_receipts', 'superseded_at')) return;
  db.exec(
    `ALTER TABLE mp_command_receipts ADD COLUMN superseded_at TEXT`,
  );
}

/**
 * Mark the live tail from `fromSequence` inclusive. Idempotent on
 * already-marked rows. `fromSequence` is the first discarded store
 * sequence (revision = sequence + 1, so this equals the kept
 * through-revision).
 */
export function supersedeMatchStoreFrom(
  db: Database.Database,
  matchId: string,
  fromSequence: number,
  at: string,
): void {
  db.transaction(() => {
    db.prepare(
      `UPDATE mp_match_events SET superseded_at = ?
       WHERE match_id = ? AND sequence >= ? AND superseded_at IS NULL`,
    ).run(at, matchId, fromSequence);
    db.prepare(
      `UPDATE mp_match_outbox SET superseded_at = ?
       WHERE match_id = ? AND sequence >= ? AND superseded_at IS NULL`,
    ).run(at, matchId, fromSequence);
    db.prepare(
      `UPDATE mp_command_receipts SET superseded_at = ?
       WHERE match_id = ? AND last_revision >= ? AND superseded_at IS NULL`,
    ).run(at, matchId, fromSequence);
  })();
}
