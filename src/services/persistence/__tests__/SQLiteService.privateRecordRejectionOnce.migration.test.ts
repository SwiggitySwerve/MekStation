/**
 * v29 private rejection-detail once. The partial unique index and
 * INSERT trigger cover residual 9. Erase and redact stay on the
 * shipped private_record_no_rewrite path.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CREATED_AT = '2026-09-02T19:00:00.000Z';
const UPDATED_AT = '2026-09-02T19:05:00.000Z';

const RECORD_INSERT = `
  INSERT INTO private_record (
    opaque_ref, campaign_session_id, command_id, record_kind, payload,
    payload_state, retention_class, created_at, updated_at
  ) VALUES (
    @opaqueRef, @campaignSessionId, @commandId, @recordKind, @payload,
    @payloadState, @retentionClass, @createdAt, @updatedAt
  )`;

const ERASE_SQL = `UPDATE private_record
  SET payload_state = 'erased', payload = NULL, updated_at = ?
  WHERE opaque_ref = ?`;

const REDACT_SQL = `UPDATE private_record
  SET payload_state = 'redacted', payload = ?, updated_at = ?
  WHERE opaque_ref = ?`;

function validPresent(overrides: Record<string, unknown> = {}) {
  return {
    opaqueRef: 'c'.repeat(32),
    campaignSessionId: 'session-1',
    commandId: 'cmd-1',
    recordKind: 'rejection-detail',
    payload: 'secret-body',
    payloadState: 'present',
    retentionClass: 'session',
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
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
         WHERE tbl_name = 'private_record' AND sql IS NOT NULL
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

describe('private record rejection-detail once SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'private-record-reject-once-'));
    dbPath = path.join(dir, 'private-record-reject.db');
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

  it('refuses two rejection-detail rows for one session and command as UNIQUE', () => {
    const db = database();
    db.prepare(RECORD_INSERT).run(validPresent());
    expect(() =>
      db
        .prepare(RECORD_INSERT)
        .run(validPresent({ opaqueRef: 'd'.repeat(32) })),
    ).toThrow(/UNIQUE/);
  });

  it('refuses a rejection-detail insert with NULL command_id', () => {
    const db = database();
    expect(() =>
      db.prepare(RECORD_INSERT).run(validPresent({ commandId: null })),
    ).toThrow(/rejection-detail rows require a nonempty command_id/);
  });

  it('refuses a rejection-detail insert with blank command_id', () => {
    const db = database();
    expect(() =>
      db.prepare(RECORD_INSERT).run(validPresent({ commandId: '   ' })),
    ).toThrow(/rejection-detail rows require a nonempty command_id/);
  });

  it('allows gm-draft rows to omit command_id and to share one', () => {
    const db = database();
    db.prepare(RECORD_INSERT).run(
      validPresent({
        opaqueRef: 'e'.repeat(32),
        recordKind: 'gm-draft',
        commandId: null,
      }),
    );
    db.prepare(RECORD_INSERT).run(
      validPresent({
        opaqueRef: 'f'.repeat(32),
        recordKind: 'gm-draft',
        commandId: null,
      }),
    );
    db.prepare(RECORD_INSERT).run(
      validPresent({
        opaqueRef: 'a'.repeat(32),
        recordKind: 'gm-draft',
        commandId: 'shared-cmd',
      }),
    );
    db.prepare(RECORD_INSERT).run(
      validPresent({
        opaqueRef: 'b'.repeat(32),
        recordKind: 'gm-draft',
        commandId: 'shared-cmd',
      }),
    );
    expect(
      db.prepare('SELECT COUNT(*) AS c FROM private_record').get(),
    ).toEqual({ c: 4 });
  });

  it('admits erase and redact UPDATEs on a rejection-detail row', () => {
    const db = database();
    const eraseRef = 'c'.repeat(32);
    const redactRef = 'd'.repeat(32);
    db.prepare(RECORD_INSERT).run(validPresent({ opaqueRef: eraseRef }));
    db.prepare(RECORD_INSERT).run(
      validPresent({ opaqueRef: redactRef, commandId: 'cmd-2' }),
    );
    db.prepare(ERASE_SQL).run(UPDATED_AT, eraseRef);
    db.prepare(REDACT_SQL).run('redacted-body', UPDATED_AT, redactRef);
    expect(
      plain(
        db
          .prepare(
            `SELECT payload_state, payload FROM private_record WHERE opaque_ref = ?`,
          )
          .get(eraseRef) as { payload_state: string; payload: string | null },
      ),
    ).toStrictEqual({ payload_state: 'erased', payload: null });
    expect(
      plain(
        db
          .prepare(
            `SELECT payload_state, payload FROM private_record WHERE opaque_ref = ?`,
          )
          .get(redactRef) as { payload_state: string; payload: string },
      ),
    ).toStrictEqual({ payload_state: 'redacted', payload: 'redacted-body' });
  });

  it('refuses an identity rewrite on a rejection-detail row', () => {
    const db = database();
    db.prepare(RECORD_INSERT).run(validPresent());
    expect(() =>
      db
        .prepare(
          `UPDATE private_record SET command_id = 'other' WHERE opaque_ref = ?`,
        )
        .run('c'.repeat(32)),
    ).toThrow(/identity pinned/);
  });

  it('re-applies v29 idempotently with index and trigger once', () => {
    const db = database();
    expect(
      plain(
        db
          .prepare('SELECT version, name FROM migrations WHERE version = 29')
          .get() as { version: number; name: string },
      ),
    ).toStrictEqual({
      version: 29,
      name: 'private_record_rejection_detail_once',
    });
    db.prepare(RECORD_INSERT).run(validPresent());
    const schemaBefore = ownedSchema(db);

    resetSQLiteService();
    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version >= 29').run();
    raw.close();

    const reopened = database();
    expect(ownedSchema(reopened)).toStrictEqual(schemaBefore);
    expect(nameCount(reopened, 'idx_private_record_rejection_detail')).toBe(1);
    expect(
      nameCount(reopened, 'private_record_rejection_detail_requires_command'),
    ).toBe(1);
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM private_record').get(),
    ).toEqual({ c: 1 });
  });

  it('the trigger catalog includes private_record_rejection_detail_requires_command in alphabetical order', () => {
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
