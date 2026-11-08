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
import { readFileSync, rmSync, statSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

describe('SQLiteService migrations', () => {
  let dir: string;
  let dbPath: string;
  const failedConnections: Database.Database[] = [];

  beforeEach(async () => {
    // Keep file reads scoped to this test directory for the Jest cache key.
    dir = await mkdtemp(path.join(__dirname, 'sqlite-migrations-test-'));
    dbPath = path.join(dir, 'test.db');
    resetSQLiteService();
  });

  afterEach(() => {
    try {
      jest.restoreAllMocks();
      // Close the singleton's handle before deleting the file — Windows
      // refuses to remove open files.
      resetSQLiteService();
      for (const connection of failedConnections.splice(0)) {
        if (connection.open) connection.close();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
    }
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

  it.each([
    ['table-existence read', /SELECT name FROM sqlite_master/],
    [
      'maximum-version read',
      /SELECT MAX\(version\) as version FROM migrations/,
    ],
  ] as const)(
    'retries a failed %s without replacing or truncating the user database',
    (_, query) => {
      getSQLiteService({ path: dbPath, maxMigrationVersion: 31 }).initialize();
      const seeded = getSQLiteService().getDatabase();
      seeded.exec('CREATE TABLE s13_user_data (payload BLOB NOT NULL)');
      const payload = Buffer.from([0, 255, 1, 128, 42]);
      seeded.prepare('INSERT INTO s13_user_data VALUES (?)').run(payload);
      const records = seeded
        .prepare('SELECT * FROM migrations ORDER BY version')
        .all();
      resetSQLiteService();
      const originalFile = statSync(dbPath);
      const originalBytes = readFileSync(dbPath);

      const service = getSQLiteService({ path: dbPath });
      const failure = new Error('injected transient version read failure');
      const prepare = Database.prototype.prepare;
      const read = jest
        .spyOn(Database.prototype, 'prepare')
        .mockImplementation(function (this: Database.Database, sql) {
          if (query.test(sql)) {
            failedConnections.push(this);
            throw failure;
          }
          return prepare.call(this, sql);
        });
      const transaction = jest.spyOn(Database.prototype, 'transaction');
      let caught: unknown;
      try {
        service.initialize();
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(failure);
      expect(transaction).not.toHaveBeenCalled();
      expect(service.isInitialized()).toBe(false);
      expect(() => service.getDatabase()).toThrow('Database not initialized');
      expect(failedConnections[0].open).toBe(false);
      expect(statSync(dbPath).ino).toBe(originalFile.ino);
      expect(statSync(dbPath).dev).toBe(originalFile.dev);
      expect(readFileSync(dbPath)).toEqual(originalBytes);
      read.mockRestore();
      transaction.mockRestore();

      // Inspect the existing file before retrying so migrations cannot hide data loss.
      const raw = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        expect(raw.prepare('SELECT payload FROM s13_user_data').get()).toEqual({
          payload,
        });
        expect(
          raw.prepare('SELECT * FROM migrations ORDER BY version').all(),
        ).toEqual(records);
        expect(maxRecordedVersion(raw)).toBe(31);
      } finally {
        raw.close();
      }

      service.initialize();
      expect(getSQLiteService()).toBe(service);
      expect(service.isInitialized()).toBe(true);
      const ready = service.getDatabase();
      expect(ready).not.toBe(failedConnections[0]);
      expect(ready.prepare('SELECT payload FROM s13_user_data').get()).toEqual({
        payload,
      });
      expect(
        ready
          .prepare(
            'SELECT * FROM migrations WHERE version <= 31 ORDER BY version',
          )
          .all(),
      ).toEqual(records);
      expect(maxRecordedVersion(ready)).toBeGreaterThan(31);
      expect(statSync(dbPath).ino).toBe(originalFile.ino);
      service.initialize();
      expect(service.getDatabase()).toBe(ready);
    },
  );

  it.each(['journal_mode = WAL', 'foreign_keys = ON'])(
    'closes the failed connection and retries after a %s failure',
    (statement) => {
      const service = getSQLiteService({ path: dbPath });
      const failure = new Error('injected pragma failure');
      const pragma = Database.prototype.pragma;
      const fault = jest
        .spyOn(Database.prototype, 'pragma')
        .mockImplementation(function (this: Database.Database, sql, options) {
          if (sql === statement) {
            failedConnections.push(this);
            throw failure;
          }
          return pragma.call(this, sql, options);
        });
      expect(service.initialize).toThrow(failure);
      expect(service.isInitialized()).toBe(false);
      expect(() => service.getDatabase()).toThrow('Database not initialized');
      expect(failedConnections[0].open).toBe(false);
      fault.mockRestore();
      service.initialize();
      expect(service.isInitialized()).toBe(true);
      expect(maxRecordedVersion(service.getDatabase())).toBeGreaterThan(31);
    },
  );

  it('preserves the initialization error and clears the handle when closing also fails', () => {
    const service = getSQLiteService({ path: dbPath });
    const failure = new Error('original initialization error');
    const cleanupFailure = new Error('secondary close error');
    const read = jest
      .spyOn(Database.prototype, 'prepare')
      .mockImplementationOnce(function (this: Database.Database) {
        failedConnections.push(this);
        throw failure;
      });
    const close = jest
      .spyOn(Database.prototype, 'close')
      .mockImplementationOnce(() => {
        throw cleanupFailure;
      });
    let caught: unknown;
    try {
      service.initialize();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(failure);
    expect(close).toHaveBeenCalledTimes(1);
    expect(service.isInitialized()).toBe(false);
    expect(() => service.getDatabase()).toThrow('Database not initialized');
    read.mockRestore();
    close.mockRestore();
    service.initialize();
    expect(service.isInitialized()).toBe(true);
    expect(service.getDatabase()).not.toBe(failedConnections[0]);
  });

  it('creates an empty applied-view table and reapplies without losing accepted bytes', () => {
    getSQLiteService({ path: dbPath }).initialize();
    let db = getSQLiteService().getDatabase();
    expect(
      db.prepare('SELECT * FROM campaign_public_applied_view').all(),
    ).toEqual([]);
    expect(db.pragma('table_info(campaign_public_applied_view)')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'campaign_id', pk: 1 }),
        expect.objectContaining({ name: 'session_id', pk: 2 }),
        expect.objectContaining({ name: 'participant_id', pk: 3 }),
      ]),
    );
    db.prepare(
      'INSERT INTO campaign_public_applied_view VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run('c', 's', 'p', 'root', 0, 0, 'authority', 'receipt', '2026-10-16');
    const before = db
      .prepare('SELECT * FROM campaign_public_applied_view')
      .all();
    db.prepare('DELETE FROM migrations WHERE version >= 32').run();
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();
    expect(
      db.prepare('SELECT * FROM campaign_public_applied_view').all(),
    ).toEqual(before);
    expect(
      db
        .prepare('SELECT COUNT(*) AS n FROM migrations WHERE version = 32')
        .get(),
    ).toEqual({ n: 1 });
  });

  it('rolls back the applied-view schema when its migration record is rejected', () => {
    getSQLiteService({ path: dbPath, maxMigrationVersion: 31 }).initialize();
    const db = getSQLiteService().getDatabase();
    const before = db
      .prepare('SELECT * FROM migrations ORDER BY version')
      .all();
    db.exec(`CREATE TRIGGER reject_applied_view_migration BEFORE INSERT ON migrations
      WHEN NEW.version = 32 BEGIN SELECT RAISE(ABORT, 'injected migration failure'); END`);
    resetSQLiteService();
    expect(() => getSQLiteService({ path: dbPath }).initialize()).toThrow(
      'injected migration failure',
    );
    const service = getSQLiteService();
    expect(service.isInitialized()).toBe(false);
    expect(() => service.getDatabase()).toThrow('Database not initialized');
    const failed = new Database(dbPath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      expect(
        failed
          .prepare(
            "SELECT name FROM sqlite_master WHERE name = 'campaign_public_applied_view'",
          )
          .get(),
      ).toBeUndefined();
      expect(
        failed.prepare('SELECT * FROM migrations ORDER BY version').all(),
      ).toEqual(before);
    } finally {
      failed.close();
    }
    const repair = new Database(dbPath, { fileMustExist: true });
    try {
      repair.exec('DROP TRIGGER reject_applied_view_migration');
    } finally {
      repair.close();
    }
    service.initialize();
    expect(service.isInitialized()).toBe(true);
    expect(maxRecordedVersion(service.getDatabase())).toBeGreaterThanOrEqual(
      32,
    );
  });

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
    // v8 adds the event-journal foundation without replacing authority.
    expect(max).toBeGreaterThanOrEqual(8);
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
