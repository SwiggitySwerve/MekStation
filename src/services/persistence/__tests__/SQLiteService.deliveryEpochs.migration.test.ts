/**
 * Delivery-epoch schema migration contract (authority-audit PR 7).
 *
 * Pins: migration v13 applies and re-applies idempotently; crash-rerun
 * after dropping the v13 record is clean; UNIQUE laws on the 8-tuple
 * and on (epoch, identity) / (epoch, sequence) hold; mapping and epoch
 * rows are append-only; generation inserts start at 1 and bump by
 * exactly 1; writes never touch journal, audit, or private-record rows.
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

const CREATED_AT = '2026-08-21T23:00:00.000Z';
const EPOCH_A = 'a'.repeat(32);
const EPOCH_B = 'b'.repeat(32);
const IDENTITY_A = 'digest-alpha';
const IDENTITY_B = 'digest-bravo';

const EPOCH_INSERT = `
  INSERT INTO delivery_epoch (
    delivery_epoch_id, principal_id, campaign_session_id, participant_id,
    membership_revision, stream_type, stream_id, projector_version,
    effective_generation, created_at
  ) VALUES (
    @deliveryEpochId, @principalId, @campaignSessionId, @participantId,
    @membershipRevision, @streamType, @streamId, @projectorVersion,
    @effectiveGeneration, @createdAt
  )`;

const MAPPING_INSERT = `
  INSERT INTO delivery_event_mapping (
    delivery_epoch_id, projected_event_identity, delivery_sequence, created_at
  ) VALUES (
    @deliveryEpochId, @projectedEventIdentity, @deliverySequence, @createdAt
  )`;

/** Valid delivery_epoch row for CHECK and UNIQUE proofs. */
function validEpoch(overrides: Record<string, unknown> = {}) {
  return {
    deliveryEpochId: EPOCH_A,
    principalId: 'principal-1',
    campaignSessionId: 'session-1',
    participantId: 'participant-1',
    membershipRevision: 3,
    streamType: 'campaign',
    streamId: 'campaign-alpha',
    projectorVersion: 1,
    effectiveGeneration: 1,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

/** Valid mapping row for UNIQUE and append-only proofs. */
function validMapping(overrides: Record<string, unknown> = {}) {
  return {
    deliveryEpochId: EPOCH_A,
    projectedEventIdentity: IDENTITY_A,
    deliverySequence: 1,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

describe('delivery epochs SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'delivery-epochs-migration-'));
    dbPath = path.join(dir, 'delivery-epochs.db');
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

  it('applies v13, creates the three tables, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 13')
      .get() as { version: number; name: string } | undefined;
    expect(recorded).toEqual({
      version: 13,
      name: 'delivery_epochs_schema',
    });
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table'
         AND name IN ('delivery_epoch', 'delivery_event_mapping', 'delivery_generation')
         ORDER BY name`,
      )
      .all();
    expect(tables).toEqual([
      { name: 'delivery_epoch' },
      { name: 'delivery_event_mapping' },
      { name: 'delivery_generation' },
    ]);
    db.prepare(EPOCH_INSERT).run(validEpoch());
    resetSQLiteService();
    const reopened = database();
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM delivery_epoch').get(),
    ).toEqual({ c: 1 });
  });

  it('crash-rerun after dropping the v13 record is clean', () => {
    const db = database();
    db.prepare(EPOCH_INSERT).run(validEpoch());
    resetSQLiteService();
    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version >= 13').run();
    raw.close();

    const reopened = database();
    expect(
      reopened
        .prepare('SELECT version FROM migrations WHERE version = 13')
        .get(),
    ).toEqual({ version: 13 });
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM delivery_epoch').get(),
    ).toEqual({ c: 1 });
  });

  it.each([
    ['short epoch id', { deliveryEpochId: 'abcd' }],
    ['non-hex epoch id', { deliveryEpochId: 'G'.repeat(32) }],
    ['blank principal', { principalId: '  ' }],
    ['zero projector version', { projectorVersion: 0 }],
    ['zero generation', { effectiveGeneration: 0 }],
  ])('rejects %s at the epoch row level', (_label, overrides) => {
    const db = database();
    expect(() => db.prepare(EPOCH_INSERT).run(validEpoch(overrides))).toThrow(
      /CHECK constraint failed/,
    );
  });

  it('enforces UNIQUE on the complete 8-tuple and on mapping identity and sequence', () => {
    const db = database();
    db.prepare(EPOCH_INSERT).run(validEpoch());
    expect(() =>
      db.prepare(EPOCH_INSERT).run(validEpoch({ deliveryEpochId: EPOCH_B })),
    ).toThrow(/UNIQUE constraint failed/);
    db.prepare(MAPPING_INSERT).run(validMapping());
    expect(() =>
      db.prepare(MAPPING_INSERT).run(validMapping({ deliverySequence: 2 })),
    ).toThrow(/UNIQUE constraint failed/);
    expect(() =>
      db.prepare(MAPPING_INSERT).run(
        validMapping({
          projectedEventIdentity: IDENTITY_B,
          deliverySequence: 1,
        }),
      ),
    ).toThrow(/UNIQUE constraint failed/);
  });

  it('refuses mapping sequence 0, update, and delete', () => {
    const db = database();
    db.prepare(EPOCH_INSERT).run(validEpoch());
    expect(() =>
      db.prepare(MAPPING_INSERT).run(validMapping({ deliverySequence: 0 })),
    ).toThrow(/CHECK constraint failed/);
    db.prepare(MAPPING_INSERT).run(validMapping());
    expect(() =>
      db
        .prepare(
          `UPDATE delivery_event_mapping SET delivery_sequence = 2
           WHERE projected_event_identity = ?`,
        )
        .run(IDENTITY_A),
    ).toThrow(/append-only/);
    expect(() =>
      db
        .prepare(
          `DELETE FROM delivery_event_mapping WHERE projected_event_identity = ?`,
        )
        .run(IDENTITY_A),
    ).toThrow(/append-only/);
    expect(() =>
      db
        .prepare(`DELETE FROM delivery_epoch WHERE delivery_epoch_id = ?`)
        .run(EPOCH_A),
    ).toThrow(/append-only/);
  });

  it('enforces one-way generation bump: insert at 1, reject decrement and skip', () => {
    const db = database();
    expect(() =>
      db
        .prepare(
          `INSERT INTO delivery_generation (
             campaign_session_id, stream_type, stream_id, effective_generation
           ) VALUES (?, ?, ?, 2)`,
        )
        .run('session-1', 'campaign', 'campaign-alpha'),
    ).toThrow(/must start at 1/);
    db.prepare(
      `INSERT INTO delivery_generation (
         campaign_session_id, stream_type, stream_id, effective_generation
       ) VALUES (?, ?, ?, 1)`,
    ).run('session-1', 'campaign', 'campaign-alpha');
    db.prepare(
      `UPDATE delivery_generation SET effective_generation = 2
       WHERE campaign_session_id = ?`,
    ).run('session-1');
    expect(
      db
        .prepare('SELECT effective_generation AS g FROM delivery_generation')
        .get(),
    ).toEqual({ g: 2 });
    expect(() =>
      db
        .prepare(
          `UPDATE delivery_generation SET effective_generation = 1
           WHERE campaign_session_id = ?`,
        )
        .run('session-1'),
    ).toThrow(/increment effective_generation by 1/);
    expect(() =>
      db
        .prepare(
          `UPDATE delivery_generation SET effective_generation = 4
           WHERE campaign_session_id = ?`,
        )
        .run('session-1'),
    ).toThrow(/increment effective_generation by 1/);
  });

  it('is additive: delivery writes do not alter journal, audit, or private rows', () => {
    const db = database();
    expect(db.prepare('PRAGMA foreign_key_list(delivery_epoch)').all()).toEqual(
      [],
    );
    expect(
      db.prepare('PRAGMA foreign_key_list(delivery_event_mapping)').all(),
    ).toEqual([]);
    expect(
      db.prepare('PRAGMA foreign_key_list(delivery_generation)').all(),
    ).toEqual([]);
    const snapshot = () => ({
      audit: db.prepare('SELECT COUNT(*) AS c FROM action_audit').get(),
      events: db
        .prepare('SELECT COUNT(*) AS c FROM event_journal_events')
        .get(),
      privateRows: db.prepare('SELECT COUNT(*) AS c FROM private_record').get(),
    });
    const before = snapshot();
    db.prepare(EPOCH_INSERT).run(validEpoch());
    db.prepare(MAPPING_INSERT).run(validMapping());
    expect(snapshot()).toEqual(before);
  });

  it('the migration is additive - trigger catalog gains delivery-epoch guards', () => {
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
