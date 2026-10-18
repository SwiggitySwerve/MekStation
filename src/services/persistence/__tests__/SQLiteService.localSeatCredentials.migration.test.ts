/**
 * LSC-1DB: local seat credential schema through the real migration
 * runner. Fresh create, upgrade from the previous head without touching
 * the primary vault row, idempotent re-apply and whole-migration
 * rollback when its record write fails. CF-LSC0-6 (LSC-0 closure): the
 * schema itself refuses a non-ciphertext seat key, a non-hash operation
 * fingerprint and any password-named column.
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

// Looked up by name, not imported, so RED fails on behaviour rather than
// on a missing module.
const MIGRATION = MIGRATIONS.find(
  (migration) => migration.name === 'local_seat_credentials_schema',
);
const VERSION = MIGRATION?.version ?? 33;
const TABLES = ['local_seat_credentials', 'local_seat_credential_operations'];

const SEAT_INSERT = `INSERT INTO local_seat_credentials
  (seat_id, label, public_key, encrypted_private_key, generation, updated_at)
  VALUES (@seatId, 'Player 1', 'pk', @key, @generation, 'now')`;
const KEY = JSON.stringify({
  ciphertext: 'Y2lwaGVy',
  iv: 'aXY=',
  salt: 'c2FsdA==',
  algorithm: 'AES-GCM-256',
});
const FP = 'a'.repeat(64);
const seat = (seatId: string, generation: number, key = KEY) => ({
  seatId,
  generation,
  key,
});

function tables(db: Database.Database): string[] {
  return (
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'local_seat%' ORDER BY name",
      )
      .all() as Array<{ name: string }>
  ).map((row) => row.name);
}

function seedPrimaryVault(db: Database.Database): void {
  // vault_identities is created lazily by IdentityRepository, never by
  // the catalog; reproduce its shape so the upgrade can be shown not to
  // touch it.
  db.exec(`CREATE TABLE IF NOT EXISTS vault_identities (
    id TEXT PRIMARY KEY, display_name TEXT NOT NULL, public_key TEXT NOT NULL,
    encrypted_private_key TEXT NOT NULL, friend_code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL, avatar TEXT, is_active INTEGER DEFAULT 0)`);
  db.prepare(
    "INSERT INTO vault_identities VALUES ('primary', 'GM', 'gm-pk', '{}', 'ABCD', 'then', NULL, 1)",
  ).run();
}

describe('SQLiteService local seat credentials migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'sqlite-local-seat-migration-'));
    dbPath = path.join(dir, 'test.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('is registered in the catalog as the head migration', () => {
    expect(MIGRATION).toBeDefined();
    expect(Math.max(...MIGRATIONS.map((m) => m.version))).toBe(VERSION);
  });

  it('creates both tables on a fresh database with fencing and lockout columns', () => {
    getSQLiteService({ path: dbPath }).initialize();
    const db = getSQLiteService().getDatabase();

    expect(tables(db)).toEqual([...TABLES].sort());
    const columns = (
      db.pragma('table_info(local_seat_credentials)') as Array<{
        name: string;
      }>
    ).map((column) => column.name);
    expect(columns).toEqual([
      'seat_id',
      'label',
      'public_key',
      'encrypted_private_key',
      'generation',
      'revoked_at',
      'failed_attempts',
      'locked_until_ms',
      'updated_at',
    ]);
  });

  it('defaults a new seat to unrevoked, unlocked and zero failures, and keys operations uniquely', () => {
    getSQLiteService({ path: dbPath }).initialize();
    const db = getSQLiteService().getDatabase();
    db.prepare(SEAT_INSERT).run(seat('local-seat-2', 1));
    expect(
      db
        .prepare(
          'SELECT revoked_at, failed_attempts, locked_until_ms FROM local_seat_credentials',
        )
        .get(),
    ).toEqual({ revoked_at: null, failed_attempts: 0, locked_until_ms: 0 });
    const op = `INSERT INTO local_seat_credential_operations VALUES ('op-1', 'local-seat-2', 'revoke', '${FP}', 2, 'now')`;
    db.prepare(op).run();
    expect(() => db.prepare(op).run()).toThrow(
      /UNIQUE constraint failed|PRIMARY KEY/,
    );
    expect(() =>
      db
        .prepare('UPDATE local_seat_credentials SET failed_attempts = -1')
        .run(),
    ).toThrow(/CHECK constraint failed/);
  });

  it('rejects unknown seats, non-positive generations and unknown operation kinds', () => {
    getSQLiteService({ path: dbPath }).initialize();
    const db = getSQLiteService().getDatabase();

    expect(() => db.prepare(SEAT_INSERT).run(seat('local-seat-3', 1))).toThrow(
      /CHECK constraint failed/,
    );
    expect(() => db.prepare(SEAT_INSERT).run(seat('local-seat-1', 0))).toThrow(
      /CHECK constraint failed/,
    );
    expect(() =>
      db
        .prepare(
          `INSERT INTO local_seat_credential_operations VALUES ('op', 'local-seat-1', 'mint', '${FP}', 1, 'now')`,
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);
    db.prepare(SEAT_INSERT).run(seat('local-seat-1', 1));
    expect(() => db.prepare(SEAT_INSERT).run(seat('local-seat-1', 2))).toThrow(
      /UNIQUE constraint failed|PRIMARY KEY/,
    );
  });

  it('CF-LSC0-6: stores only a ciphertext-shaped seat key and hash fingerprints, with no password column', () => {
    getSQLiteService({ path: dbPath }).initialize();
    const db = getSQLiteService().getDatabase();

    for (const key of [
      'plain-private-key-bytes',
      JSON.stringify({ ciphertext: 'Y2lwaGVy', iv: 'aXY=' }),
      JSON.stringify({ privateKey: 'cHJpdmF0ZQ==' }),
    ]) {
      expect(() =>
        db.prepare(SEAT_INSERT).run(seat('local-seat-1', 1, key)),
      ).toThrow(/CHECK constraint failed/);
    }
    for (const fingerprint of [
      'seat-one-pass',
      'A'.repeat(64),
      'a'.repeat(63),
    ]) {
      expect(() =>
        db
          .prepare(
            "INSERT INTO local_seat_credential_operations VALUES ('op-x', 'local-seat-1', 'provision', ?, 1, 'now')",
          )
          .run(fingerprint),
      ).toThrow(/CHECK constraint failed/);
    }
    const columns = TABLES.flatMap((table) =>
      (db.pragma(`table_info(${table})`) as Array<{ name: string }>).map(
        (column) => column.name,
      ),
    );
    expect(columns.filter((name) => /pass|secret|plain/i.test(name))).toEqual(
      [],
    );
  });

  it('refuses a key envelope missing iv or salt (a CHECK that evaluates to NULL would pass)', () => {
    getSQLiteService({ path: dbPath }).initialize();
    const db = getSQLiteService().getDatabase();

    for (const key of [
      { ciphertext: 'Y2lwaGVy', salt: 'c2FsdA==' },
      { ciphertext: 'Y2lwaGVy', iv: 'aXY=' },
      { ciphertext: 'Y2lwaGVy', iv: 1, salt: 'c2FsdA==' },
      { ciphertext: 'Y2lwaGVy', iv: 'aXY=', salt: null },
      { iv: 'aXY=', salt: 'c2FsdA==' },
    ]) {
      expect(() =>
        db
          .prepare(SEAT_INSERT)
          .run(seat('local-seat-2', 1, JSON.stringify(key))),
      ).toThrow(/CHECK constraint failed/);
    }
    expect(
      db.prepare('SELECT COUNT(*) AS n FROM local_seat_credentials').get(),
    ).toEqual({ n: 0 });
  });

  it('keeps the failure count and lock deadline durable across reopen and re-apply (CF-LSC0-8)', () => {
    getSQLiteService({ path: dbPath }).initialize();
    let db = getSQLiteService().getDatabase();
    db.prepare(SEAT_INSERT).run(seat('local-seat-1', 2));
    db.prepare(
      'UPDATE local_seat_credentials SET failed_attempts = 5, locked_until_ms = 1792358400000',
    ).run();

    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();
    db.prepare('DELETE FROM migrations WHERE version = ?').run(VERSION);
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();

    expect(
      db
        .prepare(
          'SELECT generation, failed_attempts, locked_until_ms FROM local_seat_credentials',
        )
        .get(),
    ).toEqual({
      generation: 2,
      failed_attempts: 5,
      locked_until_ms: 1792358400000,
    });
  });

  it('upgrades a previous-head database without touching the primary vault row', () => {
    getSQLiteService({
      path: dbPath,
      maxMigrationVersion: VERSION - 1,
    }).initialize();
    let db = getSQLiteService().getDatabase();
    seedPrimaryVault(db);
    const vaultBefore = db.prepare('SELECT * FROM vault_identities').all();
    expect(tables(db)).toEqual([]);

    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();

    expect(tables(db)).toEqual([...TABLES].sort());
    expect(db.prepare('SELECT * FROM vault_identities').all()).toEqual(
      vaultBefore,
    );
    expect(
      db
        .prepare(
          'SELECT COUNT(*) AS n FROM vault_identities WHERE is_active = 1',
        )
        .get(),
    ).toEqual({ n: 1 });
  });

  it('re-applies idempotently after a lost record without losing seat rows', () => {
    getSQLiteService({ path: dbPath }).initialize();
    let db = getSQLiteService().getDatabase();
    db.prepare(SEAT_INSERT).run(seat('local-seat-2', 4));
    const before = db.prepare('SELECT * FROM local_seat_credentials').all();
    db.prepare('DELETE FROM migrations WHERE version = ?').run(VERSION);

    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();

    expect(db.prepare('SELECT * FROM local_seat_credentials').all()).toEqual(
      before,
    );
    expect(
      db
        .prepare('SELECT COUNT(*) AS n FROM migrations WHERE version = ?')
        .get(VERSION),
    ).toEqual({ n: 1 });
  });

  it('rolls back both tables when the migration record is rejected', () => {
    getSQLiteService({
      path: dbPath,
      maxMigrationVersion: VERSION - 1,
    }).initialize();
    const db = getSQLiteService().getDatabase();
    const before = db
      .prepare('SELECT * FROM migrations ORDER BY version')
      .all();
    db.exec(`CREATE TRIGGER reject_local_seat_migration BEFORE INSERT ON migrations
      WHEN NEW.version = ${VERSION} BEGIN SELECT RAISE(ABORT, 'injected local seat failure'); END`);

    resetSQLiteService();
    expect(() => getSQLiteService({ path: dbPath }).initialize()).toThrow(
      'injected local seat failure',
    );
    const failed = getSQLiteService().getDatabase();
    expect(tables(failed)).toEqual([]);
    expect(
      failed.prepare('SELECT * FROM migrations ORDER BY version').all(),
    ).toEqual(before);
  });
});
