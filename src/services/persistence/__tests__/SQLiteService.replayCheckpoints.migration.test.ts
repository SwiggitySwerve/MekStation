/**
 * Replay checkpoint schema migration contract (replay-safety PR 15A).
 *
 * Pins: migration v10 applies and re-applies idempotently; the table
 * enforces the full PR-14 identity binding at the row level (identity
 * shape, root-branch pin, sha256-hex digests, write-once rows via the
 * UPDATE trigger, unique identity tuple); DELETE stays allowed because
 * checkpoints are disposable caches; and - the authority proof -
 * checkpoint inserts, deletes, and tampering never touch journal
 * authority rows, whose own immutability triggers keep firing.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const DIGEST_C = 'c'.repeat(64);
const RECORDED_AT = '2026-08-21T00:00:00.000Z';

const CHECKPOINT_INSERT = `
  INSERT INTO replay_checkpoints (
    checkpoint_id, stream_id, branch_id, revision,
    schema_pipeline_fingerprint, projector_id, projector_version,
    source_tail_digest, state_digest, state_json, recorded_at
  ) VALUES (
    @checkpointId, @streamId, @branchId, @revision,
    @schemaPipelineFingerprint, @projectorId, @projectorVersion,
    @sourceTailDigest, @stateDigest, @stateJson, @recordedAt
  )`;

const validCheckpoint = (overrides: Record<string, unknown> = {}) => ({
  checkpointId: 'ckpt-1',
  streamId: 'campaign-alpha',
  branchId: 'root',
  revision: 41,
  schemaPipelineFingerprint: DIGEST_A,
  projectorId: 'campaign.projector',
  projectorVersion: 1,
  sourceTailDigest: DIGEST_B,
  stateDigest: DIGEST_C,
  stateJson: '{"applied":41}',
  recordedAt: RECORDED_AT,
  ...overrides,
});

const JOURNAL_EVENT_INSERT = `
  INSERT INTO event_journal_events (
    event_id, command_id, stream_type, stream_id, branch_id,
    stream_revision, commit_position, command_index,
    event_type, event_version, correlation_id,
    actor_kind, actor_id, authority_type, authority_id,
    occurred_at, recorded_at, canonicalizer_version,
    previous_stream_event_digest, event_digest, payload_json
  ) VALUES (
    @eventId, @commandId, 'campaign', 'campaign-alpha', 'root',
    1, 1, 0,
    'probe_event', 1, 'corr-1',
    'system', 'migration-test', 'campaign', 'campaign-alpha',
    @recordedAt, @recordedAt, 1,
    NULL, @eventDigest, '{"value":"probe"}'
  )`;

const JOURNAL_BATCH_INSERT = `
  INSERT INTO event_journal_batches (
    command_id, command_digest, canonicalizer_version,
    stream_type, stream_id, branch_id, event_count,
    first_stream_revision, last_stream_revision,
    first_commit_position, last_commit_position, recorded_at
  ) VALUES (
    @commandId, @commandDigest, 1,
    'campaign', 'campaign-alpha', 'root', 1,
    1, 1, 1, 1, @recordedAt
  )`;

describe('replay checkpoint SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'replay-checkpoints-migration-'));
    dbPath = path.join(dir, 'checkpoints.db');
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

  it('applies v10 and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version FROM migrations WHERE version = 10')
      .get() as { version: number } | undefined;
    expect(recorded?.version).toBe(10);
    db.prepare(CHECKPOINT_INSERT).run(validCheckpoint());

    resetSQLiteService();
    const reopened = database();
    const count = (
      reopened
        .prepare('SELECT COUNT(*) AS c FROM replay_checkpoints')
        .get() as {
        c: number;
      }
    ).c;
    expect(count).toBe(1);
  });

  it('accepts a fully valid checkpoint row', () => {
    const db = database();
    expect(() =>
      db.prepare(CHECKPOINT_INSERT).run(validCheckpoint()),
    ).not.toThrow();
  });

  it.each([
    ['blank checkpoint_id', { checkpointId: '  ' }],
    ['blank stream_id', { streamId: '' }],
    ['non-root branch', { branchId: 'side-branch' }],
    ['negative revision', { revision: -1 }],
    ['non-integer revision', { revision: 1.5 }],
    ['short fingerprint', { schemaPipelineFingerprint: 'abc123' }],
    ['non-hex fingerprint', { schemaPipelineFingerprint: 'Z'.repeat(64) }],
    ['blank projector_id', { projectorId: ' ' }],
    ['zero projector_version', { projectorVersion: 0 }],
    ['short source_tail_digest', { sourceTailDigest: 'ff' }],
    ['short state_digest', { stateDigest: 'ff' }],
    ['empty state_json', { stateJson: '' }],
    ['blank recorded_at', { recordedAt: '  ' }],
  ])('rejects %s at the row level', (_label, overrides) => {
    const db = database();
    expect(() =>
      db.prepare(CHECKPOINT_INSERT).run(validCheckpoint(overrides)),
    ).toThrow(/CHECK constraint failed/);
  });

  it('rejects a NULL checkpoint_id (TEXT PK is NOT NULL)', () => {
    const db = database();
    expect(() =>
      db
        .prepare(CHECKPOINT_INSERT)
        .run(validCheckpoint({ checkpointId: null })),
    ).toThrow(/NOT NULL/);
  });

  it('enforces the unique identity tuple', () => {
    const db = database();
    db.prepare(CHECKPOINT_INSERT).run(validCheckpoint());
    expect(() =>
      db
        .prepare(CHECKPOINT_INSERT)
        .run(validCheckpoint({ checkpointId: 'ckpt-2' })),
    ).toThrow(/UNIQUE/);
    expect(() =>
      db
        .prepare(CHECKPOINT_INSERT)
        .run(validCheckpoint({ checkpointId: 'ckpt-3', revision: 42 })),
    ).not.toThrow();
  });

  it('rows are write-once but deletable (disposable cache)', () => {
    const db = database();
    db.prepare(CHECKPOINT_INSERT).run(validCheckpoint());
    expect(() =>
      db
        .prepare(
          `UPDATE replay_checkpoints SET state_json = '{"tampered":true}' WHERE checkpoint_id = 'ckpt-1'`,
        )
        .run(),
    ).toThrow(/write-once/);
    expect(() =>
      db
        .prepare(
          `DELETE FROM replay_checkpoints WHERE checkpoint_id = 'ckpt-1'`,
        )
        .run(),
    ).not.toThrow();
  });

  it('checkpoint tampering cannot alter authoritative journal history', () => {
    const db = database();
    db.prepare(JOURNAL_BATCH_INSERT).run({
      commandId: 'cmd-1',
      commandDigest: DIGEST_A,
      recordedAt: RECORDED_AT,
    });
    db.prepare(JOURNAL_EVENT_INSERT).run({
      eventId: 'evt-1',
      commandId: 'cmd-1',
      eventDigest: DIGEST_B,
      recordedAt: RECORDED_AT,
    });
    const snapshotAuthority = () => ({
      events: db
        .prepare(
          'SELECT event_id, event_digest, payload_json FROM event_journal_events ORDER BY commit_position',
        )
        .all(),
      batches: db
        .prepare(
          'SELECT command_id, command_digest, last_commit_position FROM event_journal_batches ORDER BY command_id',
        )
        .all(),
      storeState: db.prepare('SELECT * FROM event_journal_store_state').all(),
      streamHeads: db.prepare('SELECT * FROM event_journal_stream_heads').all(),
    });
    const journalBefore = snapshotAuthority();

    db.prepare(CHECKPOINT_INSERT).run(validCheckpoint());
    db.prepare(`DELETE FROM replay_checkpoints`).run();
    db.prepare(CHECKPOINT_INSERT).run(
      validCheckpoint({
        checkpointId: 'ckpt-tampered',
        stateJson: '{"lie":1}',
      }),
    );

    const journalAfter = snapshotAuthority();
    expect(journalAfter).toEqual(journalBefore);

    // Journal immutability triggers still stand.
    expect(() =>
      db
        .prepare(
          `UPDATE event_journal_events SET payload_json = '{}' WHERE event_id = 'evt-1'`,
        )
        .run(),
    ).toThrow(/immutable/);
    expect(() =>
      db
        .prepare(`DELETE FROM event_journal_events WHERE event_id = 'evt-1'`)
        .run(),
    ).toThrow(/immutable/);
  });

  it('the migration is additive - no triggers or schema changes on journal tables', () => {
    const db = database();
    const allTriggers = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name`,
      )
      .all() as { name: string }[];
    // The complete trigger catalog: the v8 journal immutability set, the
    // v10 write-once checkpoint trigger, the v11 action-audit guards,
    // the v12 private-record guards, the v13 delivery-epoch guards, and
    // the v14 campaign-grant guards.
    expect(allTriggers.map((trigger) => trigger.name)).toEqual([
      'action_audit_insert_not_published',
      'action_audit_no_delete',
      'action_audit_no_rewrite',
      'campaign_grant_insert_active',
      'campaign_grant_no_delete',
      'campaign_grant_revoke_only',
      'delivery_epoch_no_delete',
      'delivery_epoch_no_update',
      'delivery_event_mapping_no_delete',
      'delivery_event_mapping_no_update',
      'delivery_generation_bump_only',
      'delivery_generation_insert_baseline',
      'delivery_generation_no_delete',
      'event_history_branches_ancestry_guard',
      'event_history_branches_immutable_lineage',
      'event_history_branches_no_delete',
      'event_history_branches_status_monotonic',
      'event_history_correction_leases_epoch_monotonic',
      'event_history_correction_leases_expiry_extends_only',
      'event_history_correction_leases_immutable',
      'event_history_correction_leases_no_delete',
      'event_history_correction_leases_state_terminal',
      'event_history_supersessions_no_delete',
      'event_history_supersessions_no_update',
      'event_journal_batches_no_delete',
      'event_journal_batches_no_update',
      'event_journal_causations_no_delete',
      'event_journal_causations_no_update',
      'event_journal_entity_refs_no_delete',
      'event_journal_entity_refs_no_update',
      'event_journal_events_no_delete',
      'event_journal_events_no_update',
      'private_access_audit_no_delete',
      'private_access_audit_no_update',
      'private_record_insert_present',
      'private_record_no_delete',
      'private_record_no_rewrite',
      'replay_checkpoints_no_update',
    ]);
    const checkpointForeignKeys = db
      .prepare(`PRAGMA foreign_key_list(replay_checkpoints)`)
      .all();
    expect(checkpointForeignKeys).toEqual([]);
  });
});
