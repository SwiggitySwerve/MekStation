/**
 * Action-audit schema migration contract (authority-audit PR 4).
 *
 * Pins: migration v11 applies and re-applies idempotently; crash-rerun
 * after dropping the v11 record is clean; the table enforces append-once
 * command identity, closed safe reason codes, lifecycle/range law, and
 * the accepted-to-published stamp; DELETE is refused; and inserts never
 * touch journal authority rows.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/audit-timeline/spec.md
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const CREATED_AT = '2026-08-21T20:00:00.000Z';

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

const validAccepted = (overrides: Record<string, unknown> = {}) => ({
  commandId: 'cmd-accepted',
  campaignSessionId: 'session-1',
  matchId: 'match-1',
  streamType: 'campaign',
  streamId: 'campaign-alpha',
  commandDigest: DIGEST_A,
  actorPrincipalId: 'principal-1',
  actorParticipantId: 'participant-1',
  actorRole: 'player',
  lifecycleState: 'accepted',
  safeReasonCode: null,
  correlationId: 'corr-1',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  publishedReceiptId: null,
  committedFirstRevision: 1,
  committedLastRevision: 1,
  committedEventCount: 1,
  ...overrides,
});

const validRejected = (overrides: Record<string, unknown> = {}) =>
  validAccepted({
    commandId: 'cmd-rejected',
    lifecycleState: 'rejected',
    safeReasonCode: 'command-rejected',
    committedFirstRevision: null,
    committedLastRevision: null,
    committedEventCount: null,
    ...overrides,
  });

describe('action audit SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'action-audit-migration-'));
    dbPath = path.join(dir, 'action-audit.db');
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

  it('applies v11, creates the table, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 11')
      .get() as { version: number; name: string } | undefined;
    expect(recorded).toEqual({ version: 11, name: 'action_audit_schema' });
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'action_audit'`,
      )
      .all();
    expect(tables).toEqual([{ name: 'action_audit' }]);
    db.prepare(AUDIT_INSERT).run(validAccepted());

    resetSQLiteService();
    const reopened = database();
    const count = (
      reopened.prepare('SELECT COUNT(*) AS c FROM action_audit').get() as {
        c: number;
      }
    ).c;
    expect(count).toBe(1);
  });

  it('crash-rerun after dropping the v11 record is clean', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validRejected());
    resetSQLiteService();
    const raw = new Database(dbPath);
    // v14 is now latest, so deleting only v11 would leave MAX=14 and the
    // runner would not re-apply v11. Drop v11+ so later versions re-run
    // idempotently.
    raw.prepare('DELETE FROM migrations WHERE version >= 11').run();
    raw.close();

    const reopened = database();
    expect(
      reopened
        .prepare('SELECT version FROM migrations WHERE version = 11')
        .get(),
    ).toEqual({ version: 11 });
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM action_audit').get(),
    ).toEqual({ c: 1 });
  });

  it.each([
    ['blank command_id', { commandId: '  ' }],
    ['short digest', { commandDigest: 'abc123' }],
    ['non-hex digest', { commandDigest: 'Z'.repeat(64) }],
    ['invalid role', { actorRole: 'admin' }],
    ['accepted without range', { committedFirstRevision: null }],
    [
      'rejected with range',
      {
        commandId: 'cmd-rejected',
        lifecycleState: 'rejected',
        safeReasonCode: 'command-rejected',
      },
    ],
    [
      'vetoed with wrong reason',
      {
        commandId: 'cmd-vetoed',
        lifecycleState: 'vetoed',
        safeReasonCode: 'command-rejected',
        committedFirstRevision: null,
        committedLastRevision: null,
        committedEventCount: null,
      },
    ],
  ])('rejects %s at the row level', (_label, overrides) => {
    const db = database();
    expect(() =>
      db.prepare(AUDIT_INSERT).run(validAccepted(overrides)),
    ).toThrow(/CHECK constraint failed/);
  });

  it('enforces unique command_id and refuses delete plus identity rewrite', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validAccepted());
    expect(() =>
      db
        .prepare(AUDIT_INSERT)
        .run(validAccepted({ campaignSessionId: 'session-2' })),
    ).toThrow(/UNIQUE/);
    expect(() =>
      db
        .prepare(`DELETE FROM action_audit WHERE command_id = 'cmd-accepted'`)
        .run(),
    ).toThrow(/append-once/);
    expect(() =>
      db
        .prepare(
          `UPDATE action_audit SET command_digest = ? WHERE command_id = 'cmd-accepted'`,
        )
        .run(DIGEST_B),
    ).toThrow(/append-once/);
  });

  it('allows the accepted published stamp once and refuses insert of published', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validAccepted());
    expect(() =>
      db.prepare(AUDIT_INSERT).run(
        validAccepted({
          commandId: 'cmd-published',
          lifecycleState: 'published',
          publishedReceiptId: 'receipt-1',
        }),
      ),
    ).toThrow(/one-time stamp/);
    db.prepare(
      `UPDATE action_audit
       SET lifecycle_state = 'published', published_receipt_id = 'receipt-1',
           updated_at = ?
       WHERE command_id = 'cmd-accepted'`,
    ).run('2026-08-21T20:05:00.000Z');
    expect(() =>
      db
        .prepare(
          `UPDATE action_audit SET published_receipt_id = 'receipt-2' WHERE command_id = 'cmd-accepted'`,
        )
        .run(),
    ).toThrow(/append-once/);
  });

  it('is additive: audit writes do not alter journal authority', () => {
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
    db.prepare(AUDIT_INSERT).run(validRejected());
    expect(snapshotAuthority()).toEqual(journalBefore);
    expect(() =>
      db
        .prepare(
          `UPDATE event_journal_events SET payload_json = '{}' WHERE event_id = 'evt-1'`,
        )
        .run(),
    ).toThrow(/immutable/);
    expect(db.prepare(`PRAGMA foreign_key_list(action_audit)`).all()).toEqual(
      [],
    );
  });

  it('the migration is additive - trigger catalog includes later private-record guards', () => {
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
