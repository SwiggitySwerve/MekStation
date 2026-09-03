/**
 * SCHEMA_SQL re-apply contract for mp_command_receipts and mp_match_outbox.
 *
 * DurableMatchStore execs SCHEMA_SQL on every constructor. IF NOT EXISTS
 * is what keeps a second open of the same file from throwing or wiping
 * receipts and unpublished outbox rows.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DurableMatchStore } from '../DurableMatchStore';

const RECEIPTS = 'mp_command_receipts';
const OUTBOX = 'mp_match_outbox';
const STAMP = '2026-09-02T00:00:00.000Z';

const SCHEMA_TABLES = [RECEIPTS, OUTBOX] as const;

/** Plain objects so toStrictEqual does not fail on better-sqlite3's null prototype. */
function plain<T extends object>(row: T): T {
  return Object.assign({}, row);
}

function applyStore(file: string): void {
  const store = new DurableMatchStore({ path: file });
  store.close();
}

function openRaw(file: string): Database.Database {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  return db;
}

function columnNames(db: Database.Database, table: string): string[] {
  return (
    db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  ).map((column) => column.name);
}

function schemaSnapshot(db: Database.Database): Array<{
  name: string;
  type: string;
  sql: string;
}> {
  return (
    db
      .prepare(
        `SELECT name, type, sql FROM sqlite_master
         WHERE tbl_name IN ('mp_command_receipts', 'mp_match_outbox')
           AND sql IS NOT NULL
         ORDER BY type, name`,
      )
      .all() as Array<{ name: string; type: string; sql: string }>
  ).map((row) => plain(row));
}

function seedParentMatch(db: Database.Database): void {
  db.prepare(
    `INSERT INTO mp_matches (
       match_id, status, room_code, created_at, updated_at, meta_json
     ) VALUES (?, 'active', NULL, ?, ?, '{}')`,
  ).run('match-1', STAMP, STAMP);
}

function seedReceiptAndOutbox(db: Database.Database): void {
  // Every NOT NULL column on mp_command_receipts (post_digest is nullable).
  db.prepare(
    `INSERT INTO mp_command_receipts (
       match_id, command_id, actor_id, first_revision, last_revision,
       event_count, fingerprint, post_digest, committed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
  ).run('match-1', 'cmd-1', 'actor-1', 1, 1, 1, 'fingerprint-1', STAMP);
  // Every NOT NULL column on mp_match_outbox (published_at is nullable).
  db.prepare(
    `INSERT INTO mp_match_outbox (
       match_id, sequence, command_id, event_json, created_at, published_at
     ) VALUES (?, ?, ?, ?, ?, NULL)`,
  ).run('match-1', 1, 'cmd-1', '{"kind":"probe"}', STAMP);
}

describe('DurableMatchStore SCHEMA_SQL re-apply', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'durable-match-schema-reapply-'));
    dbPath = path.join(dir, 'matches.db');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('applies SCHEMA_SQL, creates mp_command_receipts and mp_match_outbox, and re-initializes idempotently', () => {
    applyStore(dbPath);
    const db = openRaw(dbPath);
    try {
      // Quoted from DurableMatchStore.ts SCHEMA_SQL:
      // match_id, command_id, actor_id, first_revision, last_revision,
      // event_count, fingerprint, post_digest, committed_at, superseded_at
      expect(columnNames(db, RECEIPTS)).toStrictEqual([
        'match_id',
        'command_id',
        'actor_id',
        'first_revision',
        'last_revision',
        'event_count',
        'fingerprint',
        'post_digest',
        'committed_at',
        'superseded_at',
      ]);
      // Quoted from DurableMatchStore.ts SCHEMA_SQL after the
      // supersession migrate (outbox PK is dropped; mark stays last):
      // match_id, sequence, command_id, event_json, created_at,
      // published_at, superseded_at
      expect(columnNames(db, OUTBOX)).toStrictEqual([
        'match_id',
        'sequence',
        'command_id',
        'event_json',
        'created_at',
        'published_at',
        'superseded_at',
      ]);

      seedParentMatch(db);
      seedReceiptAndOutbox(db);
      const schemaBefore = schemaSnapshot(db);
      const countsBefore = Object.fromEntries(
        SCHEMA_TABLES.map((table) => [
          table,
          plain(
            db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as {
              c: number;
            },
          ),
        ]),
      );
      db.close();

      applyStore(dbPath);
      const reopened = openRaw(dbPath);
      try {
        expect(schemaSnapshot(reopened)).toStrictEqual(schemaBefore);
        for (const table of SCHEMA_TABLES) {
          expect(
            plain(
              reopened.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as {
                c: number;
              },
            ),
          ).toStrictEqual(countsBefore[table]);
        }
      } finally {
        reopened.close();
      }
    } finally {
      if (db.open) {
        db.close();
      }
    }
  });

  it('preserves rows across re-apply', () => {
    applyStore(dbPath);
    const db = openRaw(dbPath);
    let seededReceipts: object[];
    let seededOutbox: object[];
    try {
      seedParentMatch(db);
      seedReceiptAndOutbox(db);
      seededReceipts = (
        db.prepare(`SELECT * FROM ${RECEIPTS}`).all() as object[]
      ).map((row) => plain(row));
      seededOutbox = (
        db.prepare(`SELECT * FROM ${OUTBOX}`).all() as object[]
      ).map((row) => plain(row));
    } finally {
      db.close();
    }

    applyStore(dbPath);
    const reopened = openRaw(dbPath);
    try {
      expect(
        (reopened.prepare(`SELECT * FROM ${RECEIPTS}`).all() as object[]).map(
          (row) => plain(row),
        ),
      ).toStrictEqual(seededReceipts);
      expect(
        (reopened.prepare(`SELECT * FROM ${OUTBOX}`).all() as object[]).map(
          (row) => plain(row),
        ),
      ).toStrictEqual(seededOutbox);
    } finally {
      reopened.close();
    }
  });
});
