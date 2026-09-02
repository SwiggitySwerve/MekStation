/**
 * The journal's branch pin, and the rule that replaces it
 * (umbrella task 16.2 prerequisite, Seam B1).
 *
 * Three journal tables pinned `branch_id` to the literal `'root'` at the
 * schema level, so a replacement branch could not exist in the journal
 * even though the branches leaf shipped every table above it. This suite
 * pins what the pin did (row a), what replaces it (row b), and that
 * lifting it changed no stored history (row d).
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const NOW = '2026-09-02T00:00:00.000Z';
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);

/** The three tables that carried `CHECK (branch_id = 'root')`. */
const BATCH_INSERT = `
  INSERT INTO event_journal_batches (
    command_id, command_digest, canonicalizer_version,
    stream_type, stream_id, branch_id, event_count,
    first_stream_revision, last_stream_revision,
    first_commit_position, last_commit_position, recorded_at
  ) VALUES (@commandId, @commandDigest, 1,
    'campaign', 'campaign-pin', @branchId, 1,
    @position, @position, @position, @position, @recordedAt)`;

const EVENT_INSERT = `
  INSERT INTO event_journal_events (
    event_id, command_id, stream_type, stream_id, branch_id,
    stream_revision, commit_position, command_index,
    event_type, event_version, correlation_id,
    actor_kind, actor_id, authority_type, authority_id,
    occurred_at, recorded_at, canonicalizer_version,
    previous_stream_event_digest, event_digest, payload_json
  ) VALUES (@eventId, @commandId, 'campaign', 'campaign-pin', @branchId,
    @position, @position, @position, 'probe_event', 1, 'corr-1',
    'system', 'pin-test', 'campaign', 'campaign-pin',
    @recordedAt, @recordedAt, 1, @previousDigest, @eventDigest, '{"v":1}')`;

const HEAD_INSERT = `
  INSERT INTO event_journal_stream_heads (
    stream_type, stream_id, branch_id, stream_revision, event_digest
  ) VALUES ('campaign', 'campaign-pin', @branchId, @position, @eventDigest)`;

describe('journal branch pin', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'branch-pin-migration-'));
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

  /** A committed root-era command, exactly as the journal writes one. */
  function seedRootEra(db: Database.Database): void {
    db.prepare(BATCH_INSERT).run({
      commandId: 'cmd-root',
      commandDigest: DIGEST_A,
      branchId: 'root',
      position: 1,
      recordedAt: NOW,
    });
    db.prepare(EVENT_INSERT).run({
      eventId: 'evt-root',
      commandId: 'cmd-root',
      branchId: 'root',
      position: 1,
      previousDigest: null,
      eventDigest: DIGEST_B,
      recordedAt: NOW,
    });
    db.prepare(HEAD_INSERT).run({
      branchId: 'root',
      eventDigest: DIGEST_B,
      position: 1,
    });
  }

  it.each([
    [
      'event_journal_batches',
      BATCH_INSERT,
      {
        commandId: 'cmd-x',
        commandDigest: DIGEST_A,
        position: 2,
        recordedAt: NOW,
      },
    ],
    [
      'event_journal_events',
      EVENT_INSERT,
      {
        eventId: 'evt-x',
        commandId: 'cmd-root',
        position: 2,
        previousDigest: DIGEST_B,
        eventDigest: DIGEST_B,
        recordedAt: NOW,
      },
    ],
    [
      'event_journal_stream_heads',
      HEAD_INSERT,
      { eventDigest: DIGEST_B, position: 1 },
    ],
  ])(
    'row (b): %s accepts a non-root branch id at the schema level',
    (_table, statement, params) => {
      const db = database();
      seedRootEra(db);
      // After migration 26 the CHECK is gone: a non-root id is admitted by
      // the SCHEMA. What refuses an arbitrary one is the head rule, which
      // lives above this layer - the schema is no longer the gate.
      expect(() =>
        db.prepare(statement).run({ ...params, branchId: 'candidate-1' }),
      ).not.toThrow();
    },
  );

  it.each([
    [
      'event_journal_batches',
      BATCH_INSERT,
      {
        commandId: 'cmd-y',
        commandDigest: DIGEST_A,
        position: 3,
        recordedAt: NOW,
      },
    ],
    [
      'event_journal_events',
      EVENT_INSERT,
      {
        eventId: 'evt-y',
        commandId: 'cmd-root',
        position: 3,
        previousDigest: DIGEST_B,
        eventDigest: DIGEST_B,
        recordedAt: NOW,
      },
    ],
    [
      'event_journal_stream_heads',
      HEAD_INSERT,
      { eventDigest: DIGEST_B, position: 1 },
    ],
  ])('%s still refuses a blank branch id', (_table, statement, params) => {
    const db = database();
    seedRootEra(db);
    expect(() =>
      db.prepare(statement).run({ ...params, branchId: '   ' }),
    ).toThrow(/CHECK constraint failed/);
  });

  it('row (d): root-era rows survive the lift byte-identically', () => {
    const db = database();
    seedRootEra(db);
    const snapshot = {
      batches: db.prepare('SELECT * FROM event_journal_batches').all(),
      events: db.prepare('SELECT * FROM event_journal_events').all(),
      heads: db.prepare('SELECT * FROM event_journal_stream_heads').all(),
      storeState: db.prepare('SELECT * FROM event_journal_store_state').all(),
    };

    resetSQLiteService();
    const reopened = database();
    expect({
      batches: reopened.prepare('SELECT * FROM event_journal_batches').all(),
      events: reopened.prepare('SELECT * FROM event_journal_events').all(),
      heads: reopened.prepare('SELECT * FROM event_journal_stream_heads').all(),
      storeState: reopened
        .prepare('SELECT * FROM event_journal_store_state')
        .all(),
    }).toStrictEqual(snapshot);

    // The immutability triggers survived the rebuild.
    expect(() =>
      reopened
        .prepare(
          `UPDATE event_journal_events SET payload_json = '{}' WHERE event_id = 'evt-root'`,
        )
        .run(),
    ).toThrow(/immutable/);
    expect(() =>
      reopened
        .prepare(`DELETE FROM event_journal_events WHERE event_id = 'evt-root'`)
        .run(),
    ).toThrow(/immutable/);
    // And the foreign key into batches still binds.
    expect(reopened.pragma('foreign_key_check')).toStrictEqual([]);
  });

  it('the migration ledger records this migration explicitly', () => {
    // This asserted `MAX(version) === 26` while 26 WAS the head. It is no
    // longer - migration 27 lifts the checkpoint table's matching branch
    // pin - so the row now pins that THIS migration is applied, by its own
    // version rather than by a head that later migrations keep moving.
    // The explicit head pin (finding #54's point: both head constants
    // self-adjust, so neither can kill a dropped migration) lives with the
    // newest migration, currently
    // `SQLiteService.replayCheckpointsBranch.migration.test`.
    const db = database();
    const applied = db
      .prepare('SELECT name FROM migrations WHERE version = 26')
      .get() as { name: string } | undefined;
    expect(applied?.name).toBe('event_journal_branch_pin_lift');
  });
});
