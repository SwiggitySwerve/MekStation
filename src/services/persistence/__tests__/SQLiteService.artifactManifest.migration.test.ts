import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { EVENT_HISTORY_ARTIFACT_MANIFEST_MIGRATION } from '@/services/persistence/SQLiteService.artifactManifest.migration';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const MIGRATION_HEAD = Math.max(...MIGRATIONS.map(({ version }) => version));

describe('event history artifact manifest SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'artifact-manifest-schema-'));
    dbPath = path.join(dir, 'manifest.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  /**
   * Re-run this migration, the way a lost record after a crash does. The
   * runner applies everything ABOVE `MAX(version)`, so every record from
   * this migration upward has to go.
   */
  function replayMigration(): Database.Database {
    resetSQLiteService();
    const raw = new Database(dbPath);
    raw
      .prepare('DELETE FROM migrations WHERE version >= ?')
      .run(EVENT_HISTORY_ARTIFACT_MANIFEST_MIGRATION.version);
    raw.close();
    return database();
  }

  /** A root branch plus the candidate a manifest is derived against. */
  function seedBranches(db: Database.Database): void {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', 'root', NULL, 0, 0, NULL, ?, 'effective',
               'migration', 'genesis', '2026-09-02T00:00:00.000Z')`,
    ).run(DIGEST_A);
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', 'candidate-1', 'root', 1, 4, 'event-4', ?,
               'building', 'host-1', 'correction-rebuild:x:1:rewind',
               '2026-09-02T00:00:00.000Z')`,
    ).run(DIGEST_B);
  }

  function insertEntry(
    db: Database.Database,
    overrides: Readonly<Record<string, unknown>> = {},
  ): void {
    db.prepare(
      `INSERT INTO event_history_artifact_manifest_entries
         (stream_type, stream_id, candidate_branch_id, artifact_kind,
          artifact_id, source_revision)
       VALUES (@streamType, @streamId, @candidateBranchId, @artifactKind,
               @artifactId, @sourceRevision)`,
    ).run({
      streamType: 'match',
      streamId: 'stream-1',
      candidateBranchId: 'candidate-1',
      artifactKind: 'replay',
      artifactId: 'replay-1',
      sourceRevision: 4,
      ...overrides,
    });
  }

  function sealManifest(
    db: Database.Database,
    overrides: Readonly<Record<string, unknown>> = {},
  ): void {
    db.prepare(
      `INSERT INTO event_history_artifact_manifests
         (stream_type, stream_id, candidate_branch_id, manifest_digest,
          entry_count, derived_at)
       VALUES (@streamType, @streamId, @candidateBranchId, @manifestDigest,
               @entryCount, @derivedAt)`,
    ).run({
      streamType: 'match',
      streamId: 'stream-1',
      candidateBranchId: 'candidate-1',
      manifestDigest: DIGEST_A,
      entryCount: 1,
      derivedAt: '2026-09-02T00:00:00.000Z',
      ...overrides,
    });
  }

  it('pins the migration head and creates the two manifest tables', () => {
    const db = database();
    expect(
      db.prepare('SELECT MAX(version) AS version FROM migrations').get(),
    ).toEqual({ version: MIGRATION_HEAD });
    expect(EVENT_HISTORY_ARTIFACT_MANIFEST_MIGRATION.version).toBe(
      MIGRATION_HEAD,
    );

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name LIKE 'event_history_artifact_%'
         ORDER BY name`,
      )
      .all() as Array<{ readonly name: string }>;
    expect(tables.map(({ name }) => name)).toEqual([
      'event_history_artifact_manifest_entries',
      'event_history_artifact_manifests',
    ]);
  });

  it('seals a manifest: once the header lands no entry may be added', () => {
    const db = database();
    seedBranches(db);
    insertEntry(db);
    insertEntry(db, { artifactKind: 'checkpoint', artifactId: 'ckpt-1' });
    sealManifest(db, { entryCount: 2 });

    // The seal is what makes the manifest immutable in the strong sense:
    // a later writer cannot widen the blast radius of an activation that
    // was already reviewed against a fixed list.
    expect(() =>
      insertEntry(db, { artifactKind: 'export', artifactId: 'export-1' }),
    ).toThrow(/manifest is sealed/);
    expect(
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM event_history_artifact_manifest_entries`,
        )
        .get(),
    ).toEqual({ n: 2 });
  });

  it('admits entries for a different candidate after another is sealed', () => {
    const db = database();
    seedBranches(db);
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', 'stream-1', 'candidate-2', 'root', 1, 4, 'event-4', ?,
               'building', 'host-1', 'correction-rebuild:y:2:rewind',
               '2026-09-02T00:00:00.000Z')`,
    ).run(DIGEST_B);
    insertEntry(db);
    sealManifest(db);

    // The seal is per candidate, not per stream: a second correction gets
    // its own manifest.
    expect(() =>
      insertEntry(db, { candidateBranchId: 'candidate-2' }),
    ).not.toThrow();
  });

  it('refuses a manifest or entry bound to a branch that does not exist here', () => {
    const db = database();
    seedBranches(db);
    expect(() => insertEntry(db, { candidateBranchId: 'ghost' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
    expect(() => insertEntry(db, { streamId: 'stream-2' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
    expect(() => sealManifest(db, { candidateBranchId: 'ghost' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('refuses malformed kinds, identities, digests, and counts', () => {
    const db = database();
    seedBranches(db);
    for (const override of [
      { artifactKind: 'screenshot' },
      { artifactKind: '' },
      { artifactId: '  ' },
      { sourceRevision: -1 },
      { sourceRevision: 1.5 },
    ]) {
      expect(() => insertEntry(db, override)).toThrow(/CHECK constraint/);
    }
    for (const override of [
      { manifestDigest: 'a'.repeat(63) },
      { manifestDigest: 'A'.repeat(64) },
      { entryCount: -1 },
      { derivedAt: '' },
    ]) {
      expect(() => sealManifest(db, override)).toThrow(/CHECK constraint/);
    }
  });

  it('records one row per artifact identity and refuses a duplicate', () => {
    const db = database();
    seedBranches(db);
    insertEntry(db);
    expect(() => insertEntry(db)).toThrow(/UNIQUE constraint failed/);
    // The same id under a different kind is a different artifact.
    expect(() => insertEntry(db, { artifactKind: 'export' })).not.toThrow();
  });

  it('keeps a derived manifest immutable and undeletable', () => {
    const db = database();
    seedBranches(db);
    insertEntry(db);
    sealManifest(db);

    expect(() =>
      db
        .prepare(`UPDATE event_history_artifact_manifests SET entry_count = 9`)
        .run(),
    ).toThrow(/manifests are immutable/);
    expect(() =>
      db.prepare(`DELETE FROM event_history_artifact_manifests`).run(),
    ).toThrow(/manifests are immutable/);
    expect(() =>
      db
        .prepare(
          `UPDATE event_history_artifact_manifest_entries SET artifact_id = 'x'`,
        )
        .run(),
    ).toThrow(/manifest entries are immutable/);
    expect(() =>
      db.prepare(`DELETE FROM event_history_artifact_manifest_entries`).run(),
    ).toThrow(/manifest entries are immutable/);
  });

  it('is additive and replays idempotently after a lost migration record', () => {
    const seeded = database();
    seedBranches(seeded);
    insertEntry(seeded);
    sealManifest(seeded);

    const migrated = replayMigration();
    // Schema only - the migration derives nothing, so a replay leaves the
    // sealed manifest exactly as it was.
    expect(
      migrated
        .prepare(
          `SELECT candidate_branch_id AS candidate, entry_count AS entries
           FROM event_history_artifact_manifests`,
        )
        .all(),
    ).toEqual([{ candidate: 'candidate-1', entries: 1 }]);
    // No foreign key into the journal: a manifest names artifacts and the
    // branch it was derived for, never an event.
    const referenced = migrated
      .prepare(`PRAGMA foreign_key_list(event_history_artifact_manifests)`)
      .all()
      .map((row) => (row as { readonly table: string }).table);
    expect(Array.from(new Set(referenced))).toEqual(['event_history_branches']);
  });
});
