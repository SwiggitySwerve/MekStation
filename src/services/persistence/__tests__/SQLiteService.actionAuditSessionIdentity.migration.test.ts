/**
 * v28 action-audit session identity. PK stays command_id; the named
 * pair index and action_audit_no_update are additive. The admitted
 * stamp is the same accepted-to-published transition as v11.
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
const CREATED_AT = '2026-09-02T18:00:00.000Z';
const STAMPED_AT = '2026-09-02T18:05:00.000Z';

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

const PUBLISH_SQL = `UPDATE action_audit
  SET lifecycle_state = 'published', published_receipt_id = ?, updated_at = ?
  WHERE command_id = ?`;

function validAccepted(overrides: Record<string, unknown> = {}) {
  return {
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
  };
}

function plain<T extends object>(row: T): T {
  return Object.assign({}, row);
}

function ownedSchema(db: Database.Database) {
  return (
    db
      .prepare(
        `SELECT name, type, sql FROM sqlite_master
         WHERE tbl_name = 'action_audit' AND sql IS NOT NULL
         ORDER BY type, name`,
      )
      .all() as Array<{ name: string; type: string; sql: string }>
  ).map((row) => plain(row));
}

function nameCount(db: Database.Database, name: string): number {
  return (
    db
      .prepare('SELECT COUNT(*) AS c FROM sqlite_master WHERE name = ?')
      .get(name) as { c: number }
  ).c;
}

describe('action audit session identity SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'action-audit-session-id-'));
    dbPath = path.join(dir, 'action-audit-session.db');
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

  it('names idx_action_audit_session_command exactly once', () => {
    const db = database();
    expect(nameCount(db, 'idx_action_audit_session_command')).toBe(1);
    const index = plain(
      db
        .prepare(
          `SELECT name, type FROM sqlite_master
           WHERE name = 'idx_action_audit_session_command'`,
        )
        .get() as { name: string; type: string },
    );
    expect(index).toStrictEqual({
      name: 'idx_action_audit_session_command',
      type: 'index',
    });
  });

  it('refuses two rows with the same session and command as UNIQUE', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validAccepted());
    expect(() => db.prepare(AUDIT_INSERT).run(validAccepted())).toThrow(
      /UNIQUE/,
    );
  });

  it('refuses the same command_id in a second session at the primary key', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validAccepted());
    expect(() =>
      db
        .prepare(AUDIT_INSERT)
        .run(validAccepted({ campaignSessionId: 'session-2' })),
    ).toThrow(/UNIQUE constraint failed: action_audit.command_id/);
  });

  it('admits the accepted-to-published stamp through PUBLISH_SQL', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validAccepted());
    db.prepare(PUBLISH_SQL).run('receipt-1', STAMPED_AT, 'cmd-accepted');
    expect(
      plain(
        db
          .prepare(
            `SELECT lifecycle_state, published_receipt_id FROM action_audit
             WHERE command_id = 'cmd-accepted'`,
          )
          .get() as { lifecycle_state: string; published_receipt_id: string },
      ),
    ).toStrictEqual({
      lifecycle_state: 'published',
      published_receipt_id: 'receipt-1',
    });
  });

  it('refuses a command_digest rewrite with the no_update message', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validAccepted());
    expect(() =>
      db
        .prepare(
          `UPDATE action_audit SET command_digest = ? WHERE command_id = ?`,
        )
        .run(DIGEST_B, 'cmd-accepted'),
    ).toThrow(
      /action_audit rows are append-once; only accepted may stamp published once/,
    );
  });

  it('refuses DELETE of an action_audit row', () => {
    const db = database();
    db.prepare(AUDIT_INSERT).run(validAccepted());
    expect(() =>
      db
        .prepare(`DELETE FROM action_audit WHERE command_id = 'cmd-accepted'`)
        .run(),
    ).toThrow(/action_audit rows are append-once and may not be deleted/);
  });

  it('re-applies v28 idempotently with index and trigger once', () => {
    const db = database();
    expect(
      plain(
        db
          .prepare('SELECT version, name FROM migrations WHERE version = 28')
          .get() as { version: number; name: string },
      ),
    ).toStrictEqual({
      version: 28,
      name: 'action_audit_session_command_identity',
    });
    db.prepare(AUDIT_INSERT).run(validAccepted());
    const schemaBefore = ownedSchema(db);

    resetSQLiteService();
    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version >= 28').run();
    raw.close();

    const reopened = database();
    expect(ownedSchema(reopened)).toStrictEqual(schemaBefore);
    expect(nameCount(reopened, 'idx_action_audit_session_command')).toBe(1);
    expect(nameCount(reopened, 'action_audit_no_update')).toBe(1);
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM action_audit').get(),
    ).toEqual({ c: 1 });
  });

  it('the trigger catalog includes action_audit_no_update in alphabetical order', () => {
    const db = database();
    const names = (
      db
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name`,
        )
        .all() as { name: string }[]
    ).map((trigger) => trigger.name);
    expect(names).toEqual([
      'action_audit_insert_not_published',
      'action_audit_no_delete',
      'action_audit_no_rewrite',
      'action_audit_no_update',
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
      'event_history_artifact_entries_no_delete',
      'event_history_artifact_entries_no_update',
      'event_history_artifact_manifest_sealed',
      'event_history_artifact_manifests_no_delete',
      'event_history_artifact_manifests_no_update',
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
      'private_record_rejection_detail_requires_command',
      'replay_checkpoints_no_update',
    ]);
  });
});
