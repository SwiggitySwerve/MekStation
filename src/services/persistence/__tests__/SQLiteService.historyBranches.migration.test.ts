import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  EVENT_HISTORY_BRANCHES_MIGRATION,
  EVENT_HISTORY_GENESIS_DIGEST_LITERAL,
} from '@/services/persistence/SQLiteService.historyBranches.migration';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const MIGRATION_HEAD = Math.max(...MIGRATIONS.map(({ version }) => version));

describe('event history branches SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'event-history-branches-schema-'));
    dbPath = path.join(dir, 'branches.db');
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
   * Re-run this migration, the way a lost record after a crash does.
   *
   * The runner applies everything ABOVE `MAX(version)`, so the records from
   * this migration upward have to go - dropping only this one leaves the
   * head above it and the ladder skips the replay entirely. That was
   * invisible while this migration was the head; migration 24 made it
   * visible.
   */
  function replayMigration(): Database.Database {
    resetSQLiteService();
    const raw = new Database(dbPath);
    raw
      .prepare('DELETE FROM migrations WHERE version >= ?')
      .run(EVENT_HISTORY_BRANCHES_MIGRATION.version);
    raw.close();
    return database();
  }

  function insertStreamHead(
    db: Database.Database,
    streamId: string,
    streamRevision: number,
  ): void {
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', ?, ?)`,
    ).run(streamId, streamRevision, DIGEST_A);
  }

  function insertBaseline(
    db: Database.Database,
    streamId: string,
    effectiveGeneration: number,
  ): void {
    db.prepare(
      `INSERT INTO match_authority_baseline
         (stream_id, stream_type, branch_id, revision, digest,
          effective_generation, source, first_retained_revision, imported_at)
       VALUES (?, 'match', 'main', 4, ?, ?, 'retained-log', 0,
               '2026-09-01T00:00:00.000Z')`,
    ).run(streamId, DIGEST_B, effectiveGeneration);
  }

  function insertBranch(
    db: Database.Database,
    overrides: Readonly<Record<string, unknown>> = {},
  ): void {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES (@streamType, @streamId, @branchId, @parentBranchId,
               @ancestorDepth, @baseRevision, @baseEventId, @baseDigest,
               @status, @createdBy, @reason, @createdAt)`,
    ).run({
      streamType: 'match',
      streamId: 'stream-1',
      branchId: 'candidate-1',
      parentBranchId: 'root',
      ancestorDepth: 1,
      baseRevision: 3,
      baseEventId: 'event-3',
      baseDigest: DIGEST_B,
      status: 'building',
      createdBy: 'gm-1',
      reason: 'authorized rewind',
      createdAt: '2026-09-01T00:00:00.000Z',
      ...overrides,
    });
  }

  it('pins the migration head and creates the three branch tables', () => {
    const db = database();
    expect(
      db.prepare('SELECT MAX(version) AS version FROM migrations').get(),
    ).toEqual({ version: MIGRATION_HEAD });
    // This migration is no longer the head - later migrations follow it -
    // so the pin is that it is IN the catalog at or below the head, and
    // that the ladder actually applied it.
    expect(MIGRATIONS).toContain(EVENT_HISTORY_BRANCHES_MIGRATION);
    expect(EVENT_HISTORY_BRANCHES_MIGRATION.version).toBeLessThanOrEqual(
      MIGRATION_HEAD,
    );
    expect(
      db
        .prepare('SELECT version FROM migrations WHERE version = ?')
        .get(EVENT_HISTORY_BRANCHES_MIGRATION.version),
    ).toEqual({ version: EVENT_HISTORY_BRANCHES_MIGRATION.version });

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name LIKE 'event_history_%'
         ORDER BY name`,
      )
      .all() as Array<{ readonly name: string }>;
    expect(tables.map(({ name }) => name)).toEqual([
      'event_history_branches',
      // Migration 24's correction-lease table shares the prefix; it is a
      // later additive sibling of these three, not one of them.
      'event_history_correction_leases',
      'event_history_effective_heads',
      'event_history_supersessions',
    ]);
  });

  it('backfills exactly one genesis effective branch per existing stream and preserves the stored generation across repeated migration', () => {
    const seeded = database();
    // Two pre-existing linear streams. One carries a stored generation of
    // 3 (it was imported with a baseline); the other has none. Revisions
    // are deliberately unequal to both the stored generation and to 1, so
    // a backfill that derived the generation from the revision would be
    // visible here.
    insertStreamHead(seeded, 'stream-with-baseline', 7);
    insertStreamHead(seeded, 'stream-without-baseline', 5);
    insertBaseline(seeded, 'stream-with-baseline', 3);

    const migrated = replayMigration();
    const genesis = migrated
      .prepare(
        `SELECT stream_id, branch_id, parent_branch_id, ancestor_depth,
                base_revision, base_event_id, base_digest, status
         FROM event_history_branches ORDER BY stream_id`,
      )
      .all();
    expect(genesis).toEqual([
      {
        stream_id: 'stream-with-baseline',
        branch_id: 'root',
        parent_branch_id: null,
        ancestor_depth: 0,
        base_revision: 0,
        base_event_id: null,
        base_digest: EVENT_HISTORY_GENESIS_DIGEST_LITERAL,
        status: 'effective',
      },
      {
        stream_id: 'stream-without-baseline',
        branch_id: 'root',
        parent_branch_id: null,
        ancestor_depth: 0,
        base_revision: 0,
        base_event_id: null,
        base_digest: EVENT_HISTORY_GENESIS_DIGEST_LITERAL,
        status: 'effective',
      },
    ]);
    expect(
      migrated
        .prepare(
          `SELECT stream_id, branch_id, effective_generation
           FROM event_history_effective_heads ORDER BY stream_id`,
        )
        .all(),
    ).toEqual([
      {
        stream_id: 'stream-with-baseline',
        branch_id: 'root',
        effective_generation: 3,
      },
      {
        stream_id: 'stream-without-baseline',
        branch_id: 'root',
        effective_generation: 1,
      },
    ]);

    // Cold reopen plus a second replay of the same migration: the stored
    // generation survives untouched. A backfill that recomputed it - from
    // the revision, or by resetting to 1 - would move the first row.
    const reopened = replayMigration();
    expect(
      reopened
        .prepare(`SELECT COUNT(*) AS branches FROM event_history_branches`)
        .get(),
    ).toEqual({ branches: 2 });
    expect(
      reopened
        .prepare(
          `SELECT stream_id, effective_generation
           FROM event_history_effective_heads ORDER BY stream_id`,
        )
        .all(),
    ).toEqual([
      { stream_id: 'stream-with-baseline', effective_generation: 3 },
      { stream_id: 'stream-without-baseline', effective_generation: 1 },
    ]);
  });

  it('permits exactly one effective branch per stream', () => {
    const seeded = database();
    insertStreamHead(seeded, 'stream-1', 4);
    const db = replayMigration();

    // A non-effective sibling is fine; a second effective one is not.
    insertBranch(db, { status: 'building' });
    expect(() =>
      insertBranch(db, { branchId: 'candidate-2', status: 'effective' }),
    ).toThrow(/UNIQUE constraint failed/);
    // Another stream may hold its own effective branch.
    insertStreamHead(db, 'stream-2', 2);
    expect(() =>
      insertBranch(db, {
        streamId: 'stream-2',
        branchId: 'root-2',
        parentBranchId: null,
        ancestorDepth: 0,
        baseRevision: 0,
        baseEventId: null,
        status: 'effective',
      }),
    ).not.toThrow();
  });

  it('refuses ancestry that leaves the stream, skips a generation, or closes a cycle', () => {
    const seeded = database();
    insertStreamHead(seeded, 'stream-1', 4);
    const db = replayMigration();

    // Parent in a different stream.
    expect(() => insertBranch(db, { streamId: 'stream-other' })).toThrow(
      /same-stream and acyclic/,
    );
    // Depth must be exactly one past the parent's.
    expect(() => insertBranch(db, { ancestorDepth: 2 })).toThrow(
      /same-stream and acyclic/,
    );
    // Parent that does not exist at all.
    expect(() =>
      insertBranch(db, { parentBranchId: 'nobody', ancestorDepth: 1 }),
    ).toThrow(/same-stream and acyclic/);
    // Self-parentage is the shortest cycle there is.
    expect(() =>
      insertBranch(db, { branchId: 'loop', parentBranchId: 'loop' }),
    ).toThrow();

    insertBranch(db);
    // Re-pointing an existing branch's parent is how a longer cycle would
    // be closed; lineage is immutable, so it cannot be.
    expect(() =>
      db
        .prepare(
          `UPDATE event_history_branches SET parent_branch_id = 'candidate-1'
           WHERE branch_id = 'root'`,
        )
        .run(),
    ).toThrow(/lineage is immutable/);
  });

  it('holds root genesis semantics and rejects a non-monotonic status', () => {
    const seeded = database();
    insertStreamHead(seeded, 'stream-1', 4);
    const db = replayMigration();

    // A root (depth 0, null parent) may not claim a base event or revision.
    expect(() =>
      insertBranch(db, {
        branchId: 'fake-root',
        parentBranchId: null,
        ancestorDepth: 0,
        baseRevision: 2,
        baseEventId: 'event-2',
      }),
    ).toThrow(/CHECK constraint failed/);
    // A child may not claim genesis semantics.
    expect(() =>
      insertBranch(db, { baseEventId: null, baseRevision: 0 }),
    ).toThrow(/CHECK constraint failed/);
    // Depth and parentage must agree about which one is the root. A
    // parentless row at depth 1 is invisible to the ancestry trigger (its
    // WHEN clause needs a parent), so the CHECK is what has to catch it.
    expect(() =>
      insertBranch(db, {
        branchId: 'depth-lie',
        parentBranchId: null,
        ancestorDepth: 1,
      }),
    ).toThrow(/CHECK constraint failed/);

    insertBranch(db);
    const setStatus = (branchId: string, status: string): void => {
      db.prepare(
        `UPDATE event_history_branches SET status = ? WHERE branch_id = ?`,
      ).run(status, branchId);
    };
    setStatus('candidate-1', 'waiting-effects');
    expect(() => setStatus('candidate-1', 'building')).toThrow(
      /status must advance monotonically/,
    );
    expect(() => setStatus('candidate-1', 'waiting-effects')).toThrow(
      /status must advance monotonically/,
    );
    setStatus('candidate-1', 'blocked');
    expect(
      db
        .prepare(
          `SELECT status FROM event_history_branches WHERE branch_id = 'candidate-1'`,
        )
        .get(),
    ).toEqual({ status: 'blocked' });
  });

  it('binds supersession to a single generation step and keeps it immutable', () => {
    const seeded = database();
    insertStreamHead(seeded, 'stream-1', 4);
    const db = replayMigration();
    insertBranch(db);

    const insertSupersession = (
      overrides: Readonly<Record<string, unknown>> = {},
    ): void => {
      db.prepare(
        `INSERT INTO event_history_supersessions
           (stream_type, stream_id, superseded_branch_id,
            replacement_branch_id, prior_generation, replacement_generation,
            reason, recorded_at)
         VALUES (@streamType, @streamId, @supersededBranchId,
                 @replacementBranchId, @priorGeneration,
                 @replacementGeneration, @reason, @recordedAt)`,
      ).run({
        streamType: 'match',
        streamId: 'stream-1',
        supersededBranchId: 'root',
        replacementBranchId: 'candidate-1',
        priorGeneration: 1,
        replacementGeneration: 2,
        reason: 'authorized rewind',
        recordedAt: '2026-09-01T00:00:00.000Z',
        ...overrides,
      });
    };

    expect(() => insertSupersession({ replacementGeneration: 3 })).toThrow(
      /CHECK constraint failed/,
    );
    expect(() => insertSupersession({ replacementBranchId: 'root' })).toThrow(
      /CHECK constraint failed/,
    );
    expect(() => insertSupersession({ replacementBranchId: 'ghost' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );

    insertSupersession();
    expect(() => insertSupersession()).toThrow(/UNIQUE constraint failed/);
    expect(() =>
      db
        .prepare(
          `UPDATE event_history_supersessions SET reason = 'other'
           WHERE superseded_branch_id = 'root'`,
        )
        .run(),
    ).toThrow(/supersessions are immutable/);
    expect(() =>
      db.prepare(`DELETE FROM event_history_supersessions`).run(),
    ).toThrow(/supersessions are immutable/);
  });
});
