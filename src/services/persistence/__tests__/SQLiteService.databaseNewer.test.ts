/**
 * S1b startup refusal (matrix row N): a build never opens a database whose
 * recorded migration version is above the highest this build knows.
 *
 * The shipped runner skips migrations it has already seen and never compares
 * the stored maximum with its own catalog, so an older build opens a newer file
 * and runs on it. From this build on, every build refuses instead, and the
 * refusal leaves the file alone. This also covers a manual file copy, which the
 * backup-restore check cannot see.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import Database from 'better-sqlite3';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  DatabaseNewerThanAppError,
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

const HEAD = Math.max(...MIGRATIONS.map((migration) => migration.version));

function recordVersion(dbPath: string, version: number): void {
  const db = new Database(dbPath);
  try {
    db.prepare(
      'INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)',
    ).run(version, `from-a-newer-build-${version}`, '2026-11-10T00:00:00.000Z');
  } finally {
    db.close();
  }
}

function migrationRows(dbPath: string): number {
  const db = new Database(dbPath, { readonly: true });
  try {
    return (
      db.prepare('SELECT COUNT(*) AS n FROM migrations').get() as { n: number }
    ).n;
  } finally {
    db.close();
  }
}

describe('database newer than the app', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'sqlite-newer-'));
    dbPath = path.join(dir, 'newer.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function seedAtHead(): void {
    getSQLiteService({ path: dbPath }).initialize();
    resetSQLiteService();
  }

  it('refuses a file recorded above the catalog, closes the handle, and leaves it unchanged', async () => {
    seedAtHead();
    recordVersion(dbPath, HEAD + 1);
    const rowsBefore = migrationRows(dbPath);
    const mainBefore = await readFile(dbPath);

    const service = getSQLiteService({ path: dbPath });
    expect(() => service.initialize()).toThrow(DatabaseNewerThanAppError);
    expect(service.isInitialized()).toBe(false);

    expect(migrationRows(dbPath)).toBe(rowsBefore);
    expect(await readFile(dbPath)).toEqual(mainBefore);
  });

  it('says in plain words what to do', () => {
    seedAtHead();
    recordVersion(dbPath, HEAD + 3);
    expect(() => getSQLiteService({ path: dbPath }).initialize()).toThrow(
      /saved by a newer version of MekStation[\s\S]*Update MekStation[\s\S]*Nothing was changed/,
    );
  });

  it('refuses one version above, not only far above (the comparison is strict >)', () => {
    seedAtHead();
    recordVersion(dbPath, HEAD + 1);
    expect(() => getSQLiteService({ path: dbPath }).initialize()).toThrow(
      DatabaseNewerThanAppError,
    );
  });

  it('control: a file exactly at the catalog head opens', () => {
    seedAtHead();
    expect(() => getSQLiteService({ path: dbPath }).initialize()).not.toThrow();
  });

  it('control: a file below the head opens and the runner finishes it', () => {
    getSQLiteService({ path: dbPath, maxMigrationVersion: 7 }).initialize();
    resetSQLiteService();
    const service = getSQLiteService({ path: dbPath });
    expect(() => service.initialize()).not.toThrow();
    expect(migrationRows(dbPath)).toBe(MIGRATIONS.length);
  });

  it('control: a new file opens', () => {
    expect(() => getSQLiteService({ path: dbPath }).initialize()).not.toThrow();
  });
});
