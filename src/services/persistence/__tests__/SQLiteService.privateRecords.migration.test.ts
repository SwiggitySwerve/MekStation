/**
 * Private-record schema migration contract (authority-audit PR 5).
 *
 * Pins: migration v12 applies and re-applies idempotently; crash-rerun
 * after dropping the v12 record is clean; payload/state CHECK law and
 * opaque-ref shape hold; DELETE is refused; legal present-to-erased
 * updates work; and writes never touch action_audit or journal rows.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CREATED_AT = '2026-08-21T21:00:00.000Z';
const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const OPAQUE = 'c'.repeat(32);

const RECORD_INSERT = `
  INSERT INTO private_record (
    opaque_ref, campaign_session_id, command_id, record_kind, payload,
    payload_state, retention_class, created_at, updated_at
  ) VALUES (
    @opaqueRef, @campaignSessionId, @commandId, @recordKind, @payload,
    @payloadState, @retentionClass, @createdAt, @updatedAt
  )`;

const AUDIT_INSERT = `
  INSERT INTO action_audit (
    command_id, campaign_session_id, match_id, stream_type, stream_id,
    command_digest, actor_principal_id, actor_participant_id, actor_role,
    lifecycle_state, safe_reason_code, correlation_id, created_at, updated_at,
    published_receipt_id, committed_first_revision, committed_last_revision,
    committed_event_count
  ) VALUES (
    @commandId, @campaignSessionId, @matchId, @streamType, @streamId,
    @commandDigest, @actorPrincipalId, @actorParticipantId, @actorRole,
    @lifecycleState, @safeReasonCode, @correlationId, @createdAt, @updatedAt,
    @publishedReceiptId, @committedFirstRevision, @committedLastRevision,
    @committedEventCount
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

/** Valid present private_record row for CHECK and trigger proofs. */
function validPresent(overrides: Record<string, unknown> = {}) {
  return {
    opaqueRef: OPAQUE,
    campaignSessionId: 'session-1',
    commandId: 'cmd-1',
    recordKind: 'gm-reason',
    payload: 'secret-body',
    payloadState: 'present',
    retentionClass: 'session',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

describe('private records SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'private-records-migration-'));
    dbPath = path.join(dir, 'private-records.db');
    resetSQLiteService();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  /** Opens the file-backed service and returns the live handle. */
  function database(): Database.Database {
    getSQLiteService({ path: dbPath }).initialize();
    return getSQLiteService().getDatabase();
  }

  it('applies v12, creates the three tables, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 12')
      .get() as { version: number; name: string } | undefined;
    expect(recorded).toEqual({ version: 12, name: 'private_records_schema' });
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table'
         AND name IN ('private_record', 'private_access_audit', 'private_retention_state')
         ORDER BY name`,
      )
      .all();
    expect(tables).toEqual([
      { name: 'private_access_audit' },
      { name: 'private_record' },
      { name: 'private_retention_state' },
    ]);
    db.prepare(RECORD_INSERT).run(validPresent());
    resetSQLiteService();
    const reopened = database();
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM private_record').get(),
    ).toEqual({ c: 1 });
    expect(
      reopened
        .prepare('SELECT COUNT(*) AS c FROM private_retention_state')
        .get(),
    ).toEqual({ c: 3 });
  });

  it('crash-rerun after dropping the v12 record is clean', () => {
    const db = database();
    db.prepare(RECORD_INSERT).run(validPresent());
    resetSQLiteService();
    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version >= 12').run();
    raw.close();

    const reopened = database();
    expect(
      reopened
        .prepare('SELECT version FROM migrations WHERE version = 12')
        .get(),
    ).toEqual({ version: 12 });
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM private_record').get(),
    ).toEqual({ c: 1 });
  });

  it.each([
    ['short opaque_ref', { opaqueRef: 'abcd' }],
    ['non-hex opaque_ref', { opaqueRef: 'G'.repeat(32) }],
    ['present with null payload', { payload: null }],
    ['erased with payload', { payloadState: 'erased', payload: 'x' }],
    ['redacted with null payload', { payloadState: 'redacted', payload: null }],
    ['invalid kind', { recordKind: 'notes' }],
    ['invalid retention class', { retentionClass: 'forever' }],
  ])('rejects %s at the row level', (_label, overrides) => {
    const db = database();
    expect(() =>
      db.prepare(RECORD_INSERT).run(validPresent(overrides)),
    ).toThrow(/CHECK constraint failed|payload_state present/);
  });

  it('refuses delete, allows present-to-erased, and refuses identity rewrite', () => {
    const db = database();
    db.prepare(RECORD_INSERT).run(validPresent());
    expect(() =>
      db.prepare(`DELETE FROM private_record WHERE opaque_ref = ?`).run(OPAQUE),
    ).toThrow(/may not be deleted/);
    db.prepare(
      `UPDATE private_record
       SET payload_state = 'erased', payload = NULL, updated_at = ?
       WHERE opaque_ref = ?`,
    ).run('2026-08-21T21:05:00.000Z', OPAQUE);
    expect(
      db
        .prepare(
          'SELECT payload_state, payload FROM private_record WHERE opaque_ref = ?',
        )
        .get(OPAQUE),
    ).toEqual({ payload_state: 'erased', payload: null });
    expect(() =>
      db
        .prepare(
          `UPDATE private_record SET record_kind = 'gm-draft' WHERE opaque_ref = ?`,
        )
        .run(OPAQUE),
    ).toThrow(/identity pinned/);
  });

  it('is additive: private writes do not alter action_audit or journal authority', () => {
    const db = database();
    db.prepare(JOURNAL_BATCH_INSERT).run({
      commandId: 'cmd-1',
      commandDigest: DIGEST_A,
      recordedAt: CREATED_AT,
    });
    db.prepare(JOURNAL_EVENT_INSERT).run({
      eventId: 'evt-1',
      commandId: 'cmd-1',
      eventDigest: DIGEST_B,
      recordedAt: CREATED_AT,
    });
    db.prepare(AUDIT_INSERT).run({
      commandId: 'cmd-1',
      campaignSessionId: 'session-1',
      matchId: 'match-1',
      streamType: 'campaign',
      streamId: 'campaign-alpha',
      commandDigest: DIGEST_A,
      actorPrincipalId: 'principal-1',
      actorParticipantId: 'participant-1',
      actorRole: 'player',
      lifecycleState: 'rejected',
      safeReasonCode: 'command-rejected',
      correlationId: 'corr-1',
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      publishedReceiptId: null,
      committedFirstRevision: null,
      committedLastRevision: null,
      committedEventCount: null,
    });
    const snapshot = () => ({
      audit: db.prepare('SELECT * FROM action_audit ORDER BY command_id').all(),
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
    });
    const before = snapshot();
    db.prepare(RECORD_INSERT).run(validPresent());
    expect(snapshot()).toEqual(before);
    expect(db.prepare('PRAGMA foreign_key_list(private_record)').all()).toEqual(
      [],
    );
    const accessColumns = db
      .prepare('PRAGMA table_info(private_access_audit)')
      .all() as Array<{ name: string }>;
    expect(accessColumns.map((column) => column.name)).not.toContain('payload');
  });

  it('the migration is additive - trigger catalog gains private-record guards', () => {
    const db = database();
    const allTriggers = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name`,
      )
      .all() as { name: string }[];
    expect(allTriggers.map((trigger) => trigger.name)).toEqual([
      'action_audit_insert_not_published',
      'action_audit_no_delete',
      'action_audit_no_rewrite',
      'delivery_epoch_no_delete',
      'delivery_epoch_no_update',
      'delivery_event_mapping_no_delete',
      'delivery_event_mapping_no_update',
      'delivery_generation_bump_only',
      'delivery_generation_insert_baseline',
      'delivery_generation_no_delete',
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
  });
});
