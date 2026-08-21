import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const DIGEST_A = 'a'.repeat(64);
const RECORDED_AT = '2026-08-01T00:00:00.000Z';

const BATCH_INSERT = `
  INSERT INTO event_journal_batches (
    command_id, command_digest, canonicalizer_version,
    stream_type, stream_id, branch_id, event_count,
    first_stream_revision, last_stream_revision,
    first_commit_position, last_commit_position, recorded_at
  ) VALUES (
    @commandId, @commandDigest, @canonicalizerVersion,
    @streamType, @streamId, @branchId, @eventCount,
    @firstStreamRevision, @lastStreamRevision,
    @firstCommitPosition, @lastCommitPosition, @recordedAt
  )`;

const EVENT_INSERT = `
  INSERT INTO event_journal_events (
    event_id, command_id, stream_type, stream_id, branch_id,
    stream_revision, commit_position, command_index,
    event_type, event_version, correlation_id,
    actor_kind, actor_id, authority_type, authority_id,
    occurred_at, recorded_at, canonicalizer_version,
    previous_stream_event_digest, event_digest, payload_json
  ) VALUES (
    @eventId, @commandId, @streamType, @streamId, @branchId,
    @streamRevision, @commitPosition, @commandIndex,
    @eventType, @eventVersion, @correlationId,
    @actorKind, @actorId, @authorityType, @authorityId,
    @occurredAt, @recordedAt, @canonicalizerVersion,
    @previousStreamEventDigest, @eventDigest, @payloadJson
  )`;

describe('event journal SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'event-journal-migration-'));
    dbPath = path.join(dir, 'journal.db');
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

  function insertBatch(
    db: Database.Database,
    overrides: Readonly<Record<string, unknown>> = {},
  ): void {
    db.prepare(BATCH_INSERT).run({
      commandId: 'command-1',
      commandDigest: DIGEST_A,
      canonicalizerVersion: 1,
      streamType: 'test',
      streamId: 'alpha',
      branchId: 'root',
      eventCount: 1,
      firstStreamRevision: 1,
      lastStreamRevision: 1,
      firstCommitPosition: 1,
      lastCommitPosition: 1,
      recordedAt: RECORDED_AT,
      ...overrides,
    });
  }

  function insertEvent(
    db: Database.Database,
    overrides: Readonly<Record<string, unknown>> = {},
  ): void {
    db.prepare(EVENT_INSERT).run({
      eventId: 'event-1',
      commandId: 'command-1',
      streamType: 'test',
      streamId: 'alpha',
      branchId: 'root',
      streamRevision: 1,
      commitPosition: 1,
      commandIndex: 0,
      eventType: 'TestEvent',
      eventVersion: 1,
      correlationId: 'correlation-1',
      actorKind: 'human',
      actorId: 'player-1',
      authorityType: 'test-host',
      authorityId: 'host-1',
      occurredAt: RECORDED_AT,
      recordedAt: RECORDED_AT,
      canonicalizerVersion: 1,
      previousStreamEventDigest: null,
      eventDigest: DIGEST_A,
      payloadJson: '{"value":"alpha"}',
      ...overrides,
    });
  }

  function seedImmutableFacts(db: Database.Database): void {
    insertBatch(db);
    insertEvent(db);
    db.prepare(
      `INSERT INTO event_journal_entity_refs
         (event_id, commit_position, entity_type, entity_id, role)
       VALUES (?, ?, ?, ?, ?)`,
    ).run('event-1', 1, 'unit', 'unit-1', 'subject');
    db.prepare(
      `INSERT INTO event_journal_causations
         (event_id, commit_position, causation_event_id)
       VALUES (?, ?, ?)`,
    ).run('event-1', 1, 'origin-event');
  }

  function indexColumns(db: Database.Database, index: string): string[] {
    return (
      db.pragma(`index_info(${index})`) as Array<{ readonly name: string }>
    ).map(({ name }) => name);
  }

  it('creates the additive schema and preserves the singleton on an idempotent file reopen', () => {
    const db = database();
    const expectedTables = [
      'event_journal_batches',
      'event_journal_causations',
      'event_journal_entity_refs',
      'event_journal_events',
      'event_journal_store_state',
      'event_journal_stream_heads',
    ];
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name LIKE 'event_journal_%'
         ORDER BY name`,
      )
      .all() as Array<{ readonly name: string }>;
    expect(tables.map(({ name }) => name)).toEqual(expectedTables);
    expect(
      db.prepare('SELECT MAX(version) AS version FROM migrations').get(),
    ).toEqual({ version: 10 }); // 10 = replay_checkpoints_schema (replay-safety PR 15A)
    expect(db.prepare('SELECT * FROM event_journal_store_state').all()).toEqual(
      [{ singleton_id: 1, last_commit_position: 0 }],
    );

    db.prepare(
      'UPDATE event_journal_store_state SET last_commit_position = 7 WHERE singleton_id = 1',
    ).run();
    resetSQLiteService();
    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version = 8').run();
    raw.close();

    const reopened = database();
    expect(
      reopened.prepare('SELECT * FROM event_journal_store_state').all(),
    ).toEqual([{ singleton_id: 1, last_commit_position: 7 }]);
    expect(
      reopened.prepare('SELECT COUNT(*) AS count FROM migrations').get(),
    ).toEqual({ count: 9 });
  });

  it('enforces root, safe-range, batch-range, chain, uniqueness, and foreign-key constraints', () => {
    const db = database();
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(() =>
      db.prepare('INSERT INTO event_journal_store_state VALUES (2, 0)').run(),
    ).toThrow(/CHECK constraint failed/);
    expect(() => insertBatch(db, { branchId: 'fork' })).toThrow(
      /CHECK constraint failed/,
    );
    expect(() => insertBatch(db, { eventCount: 2 })).toThrow(
      /CHECK constraint failed/,
    );
    expect(() =>
      insertBatch(db, {
        eventCount: 1.5,
        lastStreamRevision: 1.5,
        lastCommitPosition: 1.5,
      }),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      db
        .prepare(
          'UPDATE event_journal_store_state SET last_commit_position = 9007199254740992',
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      db
        .prepare(
          'UPDATE event_journal_store_state SET last_commit_position = 0.5',
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);

    insertBatch(db);
    expect(() =>
      insertEvent(db, {
        eventId: 'bad-chain',
        streamRevision: 2,
        previousStreamEventDigest: null,
      }),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      insertEvent(db, {
        eventId: 'fractional-revision',
        streamRevision: 1.5,
        previousStreamEventDigest: DIGEST_A,
      }),
    ).toThrow(/CHECK constraint failed/);
    expect(() =>
      insertEvent(db, {
        eventId: 'missing-command-event',
        commandId: 'missing-command',
        commitPosition: 2,
      }),
    ).toThrow(/FOREIGN KEY constraint failed/);

    insertEvent(db);
    expect(() =>
      db
        .prepare(
          `INSERT INTO event_journal_entity_refs
             (event_id, commit_position, entity_type, entity_id, role)
           VALUES ('event-1', 2, 'unit', 'unit-1', 'subject')`,
        )
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
    expect(() =>
      db
        .prepare(
          `INSERT INTO event_journal_causations
             (event_id, commit_position, causation_event_id)
           VALUES ('missing-event', 1, 'origin-event')`,
        )
        .run(),
    ).toThrow(/FOREIGN KEY constraint failed/);
    expect(() => insertEvent(db, { eventId: 'duplicate-position' })).toThrow(
      /UNIQUE constraint failed/,
    );
  });

  it('installs role-aware, role-agnostic, authority, and causal query indexes', () => {
    const db = database();
    expect(indexColumns(db, 'idx_event_journal_entity_position')).toEqual([
      'entity_type',
      'entity_id',
      'commit_position',
      'event_id',
    ]);
    expect(indexColumns(db, 'idx_event_journal_entity_role_position')).toEqual([
      'entity_type',
      'entity_id',
      'role',
      'commit_position',
      'event_id',
    ]);
    expect(indexColumns(db, 'idx_event_journal_authority_position')).toEqual([
      'authority_type',
      'authority_id',
      'commit_position',
    ]);
    expect(indexColumns(db, 'idx_event_journal_causation_position')).toEqual([
      'causation_event_id',
      'commit_position',
      'event_id',
    ]);
  });

  it.each([
    ['event_journal_batches', 'command_digest'],
    ['event_journal_events', 'event_digest'],
    ['event_journal_entity_refs', 'role'],
    ['event_journal_causations', 'causation_event_id'],
  ])('rejects direct updates and deletes from %s', (table, column) => {
    const db = database();
    seedImmutableFacts(db);
    expect(() =>
      db.prepare(`UPDATE ${table} SET ${column} = ${column}`).run(),
    ).toThrow(new RegExp(`${table} are immutable`));
    expect(() => db.prepare(`DELETE FROM ${table}`).run()).toThrow(
      new RegExp(`${table} are immutable`),
    );
    expect(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({
      count: 1,
    });
  });
});
