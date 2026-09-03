/**
 * Migration 30: campaign artifact kinds on the invalidation manifest.
 *
 * Predicted red before this file existed: inserting 'scenario' (or any
 * of the five new kinds) threw `CHECK constraint failed`.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { EVENT_HISTORY_ARTIFACT_MANIFEST_KINDS_MIGRATION } from '@/services/persistence/SQLiteService.artifactManifestKinds.migration';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

const NOW = '2026-09-02T00:00:00.000Z';
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

const CAMPAIGN_KINDS = [
  'scenario',
  'encounter',
  'salvage',
  'contract',
  'external-effect',
] as const;

function openBeforeMigration(file: string): Database.Database {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  for (const migration of MIGRATIONS) {
    if (
      migration.version >=
      EVENT_HISTORY_ARTIFACT_MANIFEST_KINDS_MIGRATION.version
    ) {
      continue;
    }
    const apply = db.transaction((): void => {
      if (typeof migration.up === 'string') db.exec(migration.up);
      else migration.up(db);
      db.prepare(
        `INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)`,
      ).run(migration.version, migration.name, NOW);
    });
    apply();
  }
  return db;
}

function applyMigration(db: Database.Database): void {
  const apply = db.transaction((): void => {
    EVENT_HISTORY_ARTIFACT_MANIFEST_KINDS_MIGRATION.up(db);
    db.prepare(
      `INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)`,
    ).run(
      EVENT_HISTORY_ARTIFACT_MANIFEST_KINDS_MIGRATION.version,
      EVENT_HISTORY_ARTIFACT_MANIFEST_KINDS_MIGRATION.name,
      NOW,
    );
  });
  apply();
}

function seedBranches(db: Database.Database, streamType: string): void {
  db.prepare(
    `INSERT INTO event_history_branches
       (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
        base_revision, base_event_id, base_digest, status, created_by,
        reason, created_at)
     VALUES (?, 'stream-1', 'root', NULL, 0, 0, NULL, ?, 'effective',
             'migration', 'genesis', ?)`,
  ).run(streamType, DIGEST_A, NOW);
  db.prepare(
    `INSERT INTO event_history_branches
       (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
        base_revision, base_event_id, base_digest, status, created_by,
        reason, created_at)
     VALUES (?, 'stream-1', 'candidate-1', 'root', 1, 2, 'event-2', ?,
             'building', 'host-1', 'correction-rebuild:x:1:rewind', ?)`,
  ).run(streamType, DIGEST_B, NOW);
}

function insertEntry(
  db: Database.Database,
  streamType: string,
  artifactKind: string,
  artifactId: string,
): void {
  db.prepare(
    `INSERT INTO event_history_artifact_manifest_entries
       (stream_type, stream_id, candidate_branch_id, artifact_kind,
        artifact_id, source_revision)
     VALUES (?, 'stream-1', 'candidate-1', ?, ?, 4)`,
  ).run(streamType, artifactKind, artifactId);
}

describe('event history artifact manifest campaign kinds (migration 30)', () => {
  let dir: string;
  let file: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'artifact-kinds-30-'));
    file = path.join(dir, 'kinds.db');
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('CHECK admits the five campaign kinds and still refuses an unknown kind', () => {
    const db = openBeforeMigration(file);
    seedBranches(db, 'match');
    expect(() => insertEntry(db, 'match', 'scenario', 'scn-1')).toThrow(
      /CHECK constraint failed/,
    );
    applyMigration(db);
    seedBranches(db, 'campaign');
    for (const kind of CAMPAIGN_KINDS) {
      expect(() =>
        insertEntry(db, 'campaign', kind, `id-${kind}`),
      ).not.toThrow();
    }
    expect(() => insertEntry(db, 'campaign', 'screenshot', 'nope')).toThrow(
      /CHECK constraint failed/,
    );
    db.close();
  });

  it('is idempotent on re-apply and leaves existing combat rows untouched', () => {
    const db = openBeforeMigration(file);
    seedBranches(db, 'match');
    insertEntry(db, 'match', 'replay', 'replay-1');
    applyMigration(db);
    expect(
      db
        .prepare(
          `SELECT artifact_kind AS kind, artifact_id AS id
           FROM event_history_artifact_manifest_entries`,
        )
        .all(),
    ).toEqual([{ kind: 'replay', id: 'replay-1' }]);
    EVENT_HISTORY_ARTIFACT_MANIFEST_KINDS_MIGRATION.up(db);
    expect(() =>
      insertEntry(db, 'match', 'scenario', 'scn-kept'),
    ).not.toThrow();
    expect(
      db
        .prepare(
          `SELECT artifact_id AS id FROM event_history_artifact_manifest_entries
           ORDER BY artifact_id`,
        )
        .all(),
    ).toEqual([{ id: 'replay-1' }, { id: 'scn-kept' }]);
    db.close();
  });
});
