import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { EVENT_HISTORY_CORRECTION_LEASES_MIGRATION } from '@/services/persistence/SQLiteService.correctionLeases.migration';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const LEASE_A = '0'.repeat(32);
const LEASE_B = '1'.repeat(32);
const LEASE_C = '2'.repeat(32);
const MIGRATION_HEAD = Math.max(...MIGRATIONS.map(({ version }) => version));

describe('event history correction lease SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'correction-lease-schema-'));
    dbPath = path.join(dir, 'leases.db');
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
   * this migration upward has to go - otherwise a later migration's record
   * keeps the head above this one and the ladder skips the replay.
   */
  function replayMigration(): Database.Database {
    resetSQLiteService();
    const raw = new Database(dbPath);
    raw
      .prepare('DELETE FROM migrations WHERE version >= ?')
      .run(EVENT_HISTORY_CORRECTION_LEASES_MIGRATION.version);
    raw.close();
    return database();
  }

  /** A root branch the lease can legally bind its expected head to. */
  function seedBranch(db: Database.Database, streamId: string): void {
    db.prepare(
      `INSERT INTO event_history_branches
         (stream_type, stream_id, branch_id, parent_branch_id, ancestor_depth,
          base_revision, base_event_id, base_digest, status, created_by,
          reason, created_at)
       VALUES ('match', ?, 'root', NULL, 0, 0, NULL, ?, 'effective',
               'migration', 'genesis', '2026-09-02T00:00:00.000Z')`,
    ).run(streamId, DIGEST_A);
  }

  function insertLease(
    db: Database.Database,
    overrides: Readonly<Record<string, unknown>> = {},
  ): void {
    db.prepare(
      `INSERT INTO event_history_correction_leases
         (stream_type, stream_id, lease_id, owner, actor, reason,
          fencing_epoch, expected_branch_id, expected_revision,
          expected_digest, expected_generation, acquired_at_ms,
          expires_at_ms, state)
       VALUES (@streamType, @streamId, @leaseId, @owner, @actor, @reason,
               @fencingEpoch, @expectedBranchId, @expectedRevision,
               @expectedDigest, @expectedGeneration, @acquiredAtMs,
               @expiresAtMs, @state)`,
    ).run({
      streamType: 'match',
      streamId: 'stream-1',
      leaseId: LEASE_A,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'authorized rewind',
      fencingEpoch: 1,
      expectedBranchId: 'root',
      expectedRevision: 4,
      expectedDigest: DIGEST_B,
      expectedGeneration: 1,
      acquiredAtMs: 1_000,
      expiresAtMs: 31_000,
      state: 'active',
      ...overrides,
    });
  }

  it('pins the migration head and creates the correction-lease table', () => {
    const db = database();
    expect(
      db.prepare('SELECT MAX(version) AS version FROM migrations').get(),
    ).toEqual({ version: MIGRATION_HEAD });
    // This migration is no longer the head - later migrations follow
    // it - so the pin is membership in the catalog at or below the
    // head, plus proof the ladder actually applied it.
    expect(MIGRATIONS).toContain(EVENT_HISTORY_CORRECTION_LEASES_MIGRATION);
    expect(
      EVENT_HISTORY_CORRECTION_LEASES_MIGRATION.version,
    ).toBeLessThanOrEqual(MIGRATION_HEAD);
    expect(
      db
        .prepare('SELECT version FROM migrations WHERE version = ?')
        .get(EVENT_HISTORY_CORRECTION_LEASES_MIGRATION.version),
    ).toEqual({ version: EVENT_HISTORY_CORRECTION_LEASES_MIGRATION.version });

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name = 'event_history_correction_leases'`,
      )
      .all() as Array<{ readonly name: string }>;
    expect(tables.map(({ name }) => name)).toEqual([
      'event_history_correction_leases',
    ]);
  });

  it('mints fencing epochs that increase by exactly one per stream and keeps climbing past a terminal lease', () => {
    const db = database();
    seedBranch(db, 'stream-1');
    seedBranch(db, 'stream-2');

    // First lease on a stream must start at 1; anything else is refused.
    expect(() => insertLease(db, { fencingEpoch: 2 })).toThrow(
      /fencing epoch must increase by exactly one/,
    );
    expect(() => insertLease(db, { fencingEpoch: 0 })).toThrow(
      /fencing epoch must increase by exactly one/,
    );
    insertLease(db, { fencingEpoch: 1 });

    // A second stream is independent: it also starts at 1.
    insertLease(db, {
      streamId: 'stream-2',
      leaseId: LEASE_B,
      fencingEpoch: 1,
    });

    // The epoch is minted from MAX over ALL rows of the stream, terminal
    // ones included - this is what makes takeover after expiry mint a
    // strictly higher epoch instead of reusing the dead one.
    db.prepare(
      `UPDATE event_history_correction_leases SET state = 'expired'
       WHERE stream_id = 'stream-1'`,
    ).run();
    expect(() =>
      insertLease(db, { leaseId: LEASE_C, fencingEpoch: 1 }),
    ).toThrow(/fencing epoch must increase by exactly one/);
    insertLease(db, { leaseId: LEASE_C, fencingEpoch: 2 });

    expect(
      db
        .prepare(
          `SELECT fencing_epoch AS epoch FROM event_history_correction_leases
           WHERE stream_id = 'stream-1' ORDER BY fencing_epoch`,
        )
        .all(),
    ).toEqual([{ epoch: 1 }, { epoch: 2 }]);
  });

  it('permits exactly one active lease per stream', () => {
    const db = database();
    seedBranch(db, 'stream-1');
    insertLease(db, { fencingEpoch: 1 });

    // A second ACTIVE row is refused by the partial unique index - the
    // load-bearing guard that binds even a writer bypassing the store.
    expect(() =>
      insertLease(db, { leaseId: LEASE_B, fencingEpoch: 2 }),
    ).toThrow(/UNIQUE constraint failed/);

    // Reaping the first one makes room for the next.
    db.prepare(
      `UPDATE event_history_correction_leases SET state = 'expired'
       WHERE lease_id = ?`,
    ).run(LEASE_A);
    insertLease(db, { leaseId: LEASE_B, fencingEpoch: 2 });
    expect(
      db
        .prepare(
          `SELECT COUNT(*) AS active FROM event_history_correction_leases
           WHERE state = 'active'`,
        )
        .get(),
    ).toEqual({ active: 1 });
  });

  it('refuses a lease whose expected branch does not resolve in its own stream', () => {
    const db = database();
    seedBranch(db, 'stream-1');
    // The branch exists - but in another stream. A lease bound to it would
    // be pinned to a head this stream never had.
    expect(() => insertLease(db, { streamId: 'stream-2' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
    expect(() => insertLease(db, { expectedBranchId: 'candidate-1' })).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('refuses malformed identity, digest, timing, and state values', () => {
    const db = database();
    seedBranch(db, 'stream-1');
    const refused: Readonly<Record<string, unknown>>[] = [
      { leaseId: 'not-opaque' },
      { leaseId: 'A'.repeat(32) },
      { owner: '   ' },
      { actor: '' },
      { reason: '' },
      { expectedDigest: 'b'.repeat(63) },
      { expectedGeneration: 0 },
      { expectedRevision: -1 },
      { state: 'building' },
      { acquiredAtMs: 5_000, expiresAtMs: 5_000 },
      { acquiredAtMs: 5_000, expiresAtMs: 4_999 },
    ];
    for (const override of refused) {
      expect(() => insertLease(db, override)).toThrow(/CHECK constraint/);
    }
    // A fractional epoch is refused by the ladder trigger rather than the
    // CHECK - SQLite runs BEFORE INSERT triggers first, and 1.5 is not
    // MAX + 1 either. Both guards say no; the trigger just says it first.
    expect(() => insertLease(db, { fencingEpoch: 1.5 })).toThrow(
      /fencing epoch must increase by exactly one/,
    );
  });

  it('keeps lease identity immutable and lets the expiry extend but never shorten', () => {
    const db = database();
    seedBranch(db, 'stream-1');
    insertLease(db);

    for (const sql of [
      `UPDATE event_history_correction_leases SET owner = 'host-2'`,
      `UPDATE event_history_correction_leases SET fencing_epoch = 9`,
      `UPDATE event_history_correction_leases SET expected_revision = 9`,
      `UPDATE event_history_correction_leases SET expected_digest = '${DIGEST_A}'`,
      `UPDATE event_history_correction_leases SET expected_generation = 9`,
      `UPDATE event_history_correction_leases SET acquired_at_ms = 2`,
      `UPDATE event_history_correction_leases SET actor = 'gm-2'`,
    ]) {
      expect(() => db.prepare(sql).run()).toThrow(/identity is immutable/);
    }

    // Renewal extends the expiry and preserves the epoch.
    db.prepare(
      `UPDATE event_history_correction_leases SET expires_at_ms = 61000`,
    ).run();
    expect(() =>
      db
        .prepare(
          `UPDATE event_history_correction_leases SET expires_at_ms = 60999`,
        )
        .run(),
    ).toThrow(/expiry may only extend/);
    expect(
      db
        .prepare(
          `SELECT fencing_epoch AS epoch, expires_at_ms AS expires
           FROM event_history_correction_leases`,
        )
        .get(),
    ).toEqual({ epoch: 1, expires: 61_000 });
  });

  it('moves a lease state from active to terminal exactly once and never back', () => {
    const db = database();
    seedBranch(db, 'stream-1');
    insertLease(db);

    // Re-asserting 'active' is refused: a no-op state write would let a
    // reaper believe it reclaimed a lease it never touched.
    expect(() =>
      db
        .prepare(`UPDATE event_history_correction_leases SET state = 'active'`)
        .run(),
    ).toThrow(/state moves from active to a terminal state exactly once/);

    db.prepare(
      `UPDATE event_history_correction_leases SET state = 'released'`,
    ).run();
    for (const next of ['active', 'expired', 'released']) {
      expect(() =>
        db
          .prepare(`UPDATE event_history_correction_leases SET state = ?`)
          .run(next),
      ).toThrow(/state moves from active to a terminal state exactly once/);
    }
  });

  it('refuses deletion so a lease and its epoch survive as evidence', () => {
    const db = database();
    seedBranch(db, 'stream-1');
    insertLease(db);
    expect(() =>
      db.prepare(`DELETE FROM event_history_correction_leases`).run(),
    ).toThrow(/leases are never deleted/);
  });

  it('is additive and replays idempotently after a lost migration record', () => {
    const seeded = database();
    seedBranch(seeded, 'stream-1');
    insertLease(seeded);

    const migrated = replayMigration();
    // The migration creates schema only - it backfills nothing, so a replay
    // must leave the one live lease exactly as it was.
    expect(
      migrated
        .prepare(
          `SELECT lease_id AS leaseId, fencing_epoch AS epoch, state
           FROM event_history_correction_leases`,
        )
        .all(),
    ).toEqual([{ leaseId: LEASE_A, epoch: 1, state: 'active' }]);
    // No foreign key into the journal: the lease names a branch, never an event.
    const referenced = migrated
      .prepare(`PRAGMA foreign_key_list(event_history_correction_leases)`)
      .all()
      .map((row) => (row as { readonly table: string }).table);
    expect(Array.from(new Set(referenced))).toEqual(['event_history_branches']);
  });
});
