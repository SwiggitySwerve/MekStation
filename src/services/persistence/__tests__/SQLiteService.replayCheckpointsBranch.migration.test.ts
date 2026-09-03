/**
 * The checkpoint cache's branch pin, and what lifting it did not disturb
 * (umbrella task 16.2, Seam C1b).
 *
 * Migration 10 pinned `replay_checkpoints.branch_id` to `'root'` to
 * mirror the journal's own root pin. Migration 26 lifted the journal's
 * side; this suite pins what migration 27 does to the other side - the
 * widened rule admits a candidate branch (row R1), the pin narrows rather
 * than vanishes (R2), root-era rows and the table's own constraints come
 * through the rebuild untouched (R3, R5), and the write-once trigger comes
 * back with a byte-identical BODY rather than merely its name (R4).
 *
 * RED BEFORE THE MIGRATION (measured on a version-26 tree, which is what
 * `openBeforeMigration` builds): R1's insert failed with
 * `CHECK constraint failed: branch_id = 'root'`.
 *
 * The ledger head is pinned explicitly (R6) for the reason Seam B1's
 * finding #54 records: both existing head constants are self-adjusting,
 * so dropping a migration changes both sides equally and nothing goes
 * red.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { sha256Sync } from '@/utils/events/hashUtils';

import { MIGRATIONS } from '../SQLiteService.migrations';
import { REPLAY_CHECKPOINTS_BRANCH_MIGRATION } from '../SQLiteService.replayCheckpointsBranch.migration';

const NOW = '2026-09-02T00:00:00.000Z';
const FINGERPRINT = 'f'.repeat(64);
const TAIL_DIGEST = 'a'.repeat(64);
const STATE_DIGEST = 'b'.repeat(64);

const CHECKPOINT_INSERT = `
  INSERT INTO replay_checkpoints (
    checkpoint_id, stream_id, branch_id, revision,
    schema_pipeline_fingerprint, projector_id, projector_version,
    source_tail_digest, state_digest, state_json, recorded_at
  ) VALUES (@checkpointId, 'campaign-ckpt', @branchId, @revision,
    '${FINGERPRINT}', 'campaign.authoritative', 1,
    '${TAIL_DIGEST}', '${STATE_DIGEST}', '{"balance":1}', '${NOW}')`;

/**
 * A database stopped one version BEFORE this migration, the way the
 * runner would leave it. Both sides of the rebuild are observable only
 * from here - the service always migrates to the head.
 */
function openBeforeMigration(file: string): Database.Database {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  for (const migration of MIGRATIONS) {
    if (migration.version >= REPLAY_CHECKPOINTS_BRANCH_MIGRATION.version) {
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

/** Apply the migration exactly as `runMigration` would. */
function applyMigration(db: Database.Database): void {
  const apply = db.transaction((): void => {
    REPLAY_CHECKPOINTS_BRANCH_MIGRATION.up(db);
    db.prepare(
      `INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)`,
    ).run(
      REPLAY_CHECKPOINTS_BRANCH_MIGRATION.version,
      REPLAY_CHECKPOINTS_BRANCH_MIGRATION.name,
      NOW,
    );
  });
  apply();
}

/** Every stored checkpoint row, content-digested. */
function checkpointDigest(db: Database.Database): string {
  return sha256Sync(
    JSON.stringify(
      db
        .prepare(`SELECT * FROM replay_checkpoints ORDER BY checkpoint_id`)
        .all(),
    ),
  );
}

/** This table's triggers and indexes, name to exact stored text. */
function schemaObjects(db: Database.Database): Record<string, string> {
  const rows = db
    .prepare(
      `SELECT name, sql FROM sqlite_master
        WHERE tbl_name = 'replay_checkpoints' AND sql IS NOT NULL
          AND type IN ('trigger', 'index')
        ORDER BY name`,
    )
    .all() as { name: string; sql: string }[];
  return Object.fromEntries(rows.map((row) => [row.name, row.sql]));
}

describe('replay checkpoint branch pin', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'checkpoint-branch-pin-'));
    dbPath = path.join(dir, 'checkpoints.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** The fully migrated database the service hands production. */
  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  it('R1: a checkpoint on a candidate branch is storable', () => {
    const db = database();

    db.prepare(CHECKPOINT_INSERT).run({
      checkpointId: 'ckpt-candidate',
      branchId: '0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f',
      revision: 4,
    });

    // The whole point of the lift: a rewound stream answers from a branch
    // that is not root, and its checkpoints have to be nameable or the
    // cache silently stops working for exactly the streams a rebuild made
    // expensive to replay.
    // `Object.assign` because better-sqlite3 rows carry a null prototype
    // and a strict comparison against a literal fails on that alone.
    expect(
      Object.assign(
        {},
        db
          .prepare(
            `SELECT branch_id AS branchId FROM replay_checkpoints
              WHERE checkpoint_id = 'ckpt-candidate'`,
          )
          .get(),
      ),
    ).toStrictEqual({ branchId: '0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f' });
  });

  it('R2: a blank branch id is still refused - the pin narrowed', () => {
    const db = database();

    // Migration 26's rule, character for character. Widening to "any
    // text" would have made the two tables disagree about what a branch
    // id is, and a blank one names nothing on either side.
    expect(() =>
      db
        .prepare(CHECKPOINT_INSERT)
        .run({ checkpointId: 'ckpt-blank', branchId: '   ', revision: 4 }),
    ).toThrow(/CHECK constraint failed/);
  });

  it('R3: root-era rows come through the rebuild unchanged', () => {
    const db = openBeforeMigration(dbPath);
    db.prepare(CHECKPOINT_INSERT).run({
      checkpointId: 'ckpt-root-4',
      branchId: 'root',
      revision: 4,
    });
    db.prepare(CHECKPOINT_INSERT).run({
      checkpointId: 'ckpt-root-7',
      branchId: 'root',
      revision: 7,
    });
    const before = checkpointDigest(db);
    const beforeColumns = (
      db.pragma('table_info(replay_checkpoints)') as { name: string }[]
    ).map((row) => row.name);

    applyMigration(db);

    // A rebuild moves every row through a staging table. The digest is
    // over the rows themselves, so a dropped column, a reordered copy, or
    // a coerced value all fail here rather than being noticed later by
    // whoever tries to recover from one.
    expect(checkpointDigest(db)).toStrictEqual(before);
    expect(
      (db.pragma('table_info(replay_checkpoints)') as { name: string }[]).map(
        (row) => row.name,
      ),
    ).toStrictEqual(beforeColumns);
    db.close();
  });

  it('R4: the write-once trigger survives with an identical body', () => {
    const db = openBeforeMigration(dbPath);
    const before = schemaObjects(db);

    applyMigration(db);

    // Name AND text. A trigger recreated from a retyped body would keep
    // its name while quietly guarding something else - and this one is
    // what makes a checkpoint an immutable claim rather than a mutable
    // cache entry.
    expect(schemaObjects(db)).toStrictEqual(before);
    expect(Object.keys(before)).toContain('replay_checkpoints_no_update');

    db.prepare(CHECKPOINT_INSERT).run({
      checkpointId: 'ckpt-immutable',
      branchId: 'candidate-1',
      revision: 4,
    });
    expect(() =>
      db
        .prepare(
          `UPDATE replay_checkpoints SET state_json = '{"balance":2}'
            WHERE checkpoint_id = 'ckpt-immutable'`,
        )
        .run(),
    ).toThrow(/write-once/);
    db.close();
  });

  it('R5: the UNIQUE identity tuple still binds after the rebuild', () => {
    const db = database();
    db.prepare(CHECKPOINT_INSERT).run({
      checkpointId: 'ckpt-first',
      branchId: 'candidate-1',
      revision: 4,
    });

    // The UNIQUE lives in the table body, so it survives only because the
    // DDL was derived rather than retyped. Two rows claiming the same
    // (stream, branch, projector, pipeline, revision) is precisely the
    // duplicate the cache's writer has to be told about.
    expect(() =>
      db.prepare(CHECKPOINT_INSERT).run({
        checkpointId: 'ckpt-second',
        branchId: 'candidate-1',
        revision: 4,
      }),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('R6: the migration ledger pins the head version explicitly', () => {
    const db = database();

    // Finding #54: `MIGRATIONS.length - 1` and `max(version)` both
    // self-adjust, so neither can kill a dropped migration.
    expect(
      Object.assign(
        {},
        db.prepare('SELECT MAX(version) AS version FROM migrations').get(),
      ),
    ).toStrictEqual({ version: 30 });
  });
});
