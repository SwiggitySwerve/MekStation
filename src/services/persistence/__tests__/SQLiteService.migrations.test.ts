/**
 * SQLiteService migration-runner hardening tests (audit 2026-06-09, H
 * cluster, W5.2).
 *
 * Pins three defects from the audit:
 *  1. `campaigns.current_date` is silently shadowed by SQLite's builtin
 *     `CURRENT_DATE` keyword — any bare-column query returns *today*,
 *     never the stored value. Migration v7 renames the column to
 *     `campaign_date`.
 *  2. The v4 `pilot_abilities` ALTERs are non-idempotent: a half-applied
 *     state (columns exist, migrations record missing — exactly what the
 *     old swallowed record-write failure produced) crash-loops startup
 *     with "duplicate column name". The fixed runner guards ALTERs on
 *     `pragma table_info` and recovers.
 *  3. The migration-record INSERT failure was swallowed (logger.warn),
 *     leaving the schema applied but unrecorded — the engine re-ran
 *     every migration on every startup forever. The fixed runner wraps
 *     each migration + its record in ONE transaction and lets the
 *     failure propagate.
 *
 * Uses a file-backed tmpdir database (not `:memory:`) because the
 * half-applied scenarios require closing and reopening the same DB.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

describe('SQLiteService migrations', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'sqlite-migrations-test-'));
    dbPath = path.join(dir, 'test.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    // Close the singleton's handle before deleting the file — Windows
    // refuses to remove open files.
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Read MAX(version) from the migrations table of a closed/raw DB. */
  function maxRecordedVersion(raw: Database.Database): number {
    const row = raw
      .prepare('SELECT MAX(version) AS v FROM migrations')
      .get() as { v: number | null };
    return row.v ?? 0;
  }

  function columnNames(raw: Database.Database, table: string): string[] {
    const cols = raw.pragma(`table_info(${table})`) as Array<{ name: string }>;
    return cols.map((c) => c.name);
  }

  it('fresh initialize renames campaigns.current_date to campaign_date (CURRENT_DATE builtin shadowing)', () => {
    getSQLiteService({ path: dbPath }).initialize();
    const db = getSQLiteService().getDatabase();

    const cols = columnNames(db, 'campaigns');
    // The bare identifier `current_date` is parsed as the SQLite builtin
    // (returns today's date) — the column MUST NOT keep that name.
    expect(cols).toContain('campaign_date');
    expect(cols).not.toContain('current_date');

    // The stored value must round-trip through a bare-column query —
    // this is exactly what the builtin shadowing broke.
    db.prepare(
      `INSERT INTO campaigns
         (id, version, schema_version, name, faction_id, campaign_date,
          balance, saved_at, origin_device_id, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('c1', 1, 1, 'n', 'f', '3025-01-15', 0, '2026-01-01', 'dev', '{}');
    const row = db
      .prepare('SELECT campaign_date AS v FROM campaigns WHERE id = ?')
      .get('c1') as { v: string };
    expect(row.v).toBe('3025-01-15');
  });

  it('records every applied migration version', () => {
    getSQLiteService({ path: dbPath }).initialize();
    const db = getSQLiteService().getDatabase();

    const max = maxRecordedVersion(db);
    // v7 (campaign_date rename) is the newest migration.
    expect(max).toBeGreaterThanOrEqual(7);
    const count = (
      db.prepare('SELECT COUNT(*) AS c FROM migrations').get() as { c: number }
    ).c;
    expect(count).toBe(max);
  });

  it('recovers from a half-applied v4 (columns exist, record missing) instead of crash-looping', () => {
    // Full migrate, then simulate the brick state the old swallowed
    // record-write produced: schema changes applied, records gone.
    getSQLiteService({ path: dbPath }).initialize();
    resetSQLiteService();

    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version >= 4').run();
    raw.close();

    // Old runner: re-runs v4 → "duplicate column name: designation_kind"
    // → initialize() throws on every startup. Fixed runner must recover.
    expect(() => getSQLiteService({ path: dbPath }).initialize()).not.toThrow();

    const db = getSQLiteService().getDatabase();
    expect(columnNames(db, 'pilot_abilities')).toEqual(
      expect.arrayContaining([
        'designation_kind',
        'designation_value',
        'xp_spent',
      ]),
    );
    expect(maxRecordedVersion(db)).toBeGreaterThanOrEqual(7);
  });

  it('re-runs the campaign_date rename idempotently when only its record is missing', () => {
    getSQLiteService({ path: dbPath }).initialize();
    resetSQLiteService();

    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version >= 7').run();
    raw.close();

    expect(() => getSQLiteService({ path: dbPath }).initialize()).not.toThrow();
    const db = getSQLiteService().getDatabase();
    expect(columnNames(db, 'campaigns')).toContain('campaign_date');
    expect(maxRecordedVersion(db)).toBeGreaterThanOrEqual(7);
  });

  it('surfaces a migration-record write failure instead of swallowing it', () => {
    getSQLiteService({ path: dbPath }).initialize();
    resetSQLiteService();

    // Corrupt the migrations table: recreate it without the `name` /
    // `applied_at` columns. The record INSERT now fails. The old runner
    // logger.warn-ed and carried on — every startup silently re-ran the
    // whole migration chain with nothing ever recorded. The fixed runner
    // must throw so the operator sees the corruption.
    const raw = new Database(dbPath);
    raw.exec(
      'DROP TABLE migrations; CREATE TABLE migrations (version INTEGER PRIMARY KEY);',
    );
    raw.close();

    expect(() => getSQLiteService({ path: dbPath }).initialize()).toThrow();
  });
});
