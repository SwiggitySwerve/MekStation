/**
 * Campaign-grant schema migration contract (design D5, task 2.1).
 *
 * Pins: migration v14 applies and re-applies idempotently; crash-rerun
 * after dropping the v14 record is clean; additive (v11-v13 tables
 * untouched); CHECK laws; the one-way revoke trigger (an UPDATE that
 * changes scopes or un-revokes ABORTS); no-delete; trigger-catalog
 * additions.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CREATED_AT = '2026-08-22T16:00:00.000Z';
const ISSUED_AT = '2026-08-22T16:00:00.000Z';
const EXPIRES_AT = '2026-08-22T20:00:00.000Z';
const REVOKED_AT = '2026-08-22T17:00:00.000Z';
const GRANT_A = 'a'.repeat(32);
const GRANT_B = 'b'.repeat(32);
const SCOPES_CAMPAIGN = '["campaign"]';
const SCOPES_GM = '["campaign","gm"]';

/** Stand-in issuing identity key; the schema only pins the string. */
const ISSUER_PUBLIC_KEY = 'aXNzdWVyLXB1YmxpYy1rZXktZml4dHVyZQ==';

const GRANT_INSERT = `
  INSERT INTO campaign_grant (
    grant_id, campaign_id, participant_id, issuer_public_key, scopes,
    issued_at, expires_at, revoked_at, created_at
  ) VALUES (
    @grantId, @campaignId, @participantId, @issuerPublicKey, @scopes,
    @issuedAt, @expiresAt, @revokedAt, @createdAt
  )`;

/** Valid active campaign_grant row for CHECK and trigger proofs. */
function validGrant(overrides: Record<string, unknown> = {}) {
  return {
    grantId: GRANT_A,
    campaignId: 'campaign-alpha',
    participantId: 'participant-1',
    issuerPublicKey: ISSUER_PUBLIC_KEY,
    scopes: SCOPES_CAMPAIGN,
    issuedAt: ISSUED_AT,
    expiresAt: EXPIRES_AT,
    revokedAt: null,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

describe('campaign grants SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-grants-migration-'));
    dbPath = path.join(dir, 'campaign-grants.db');
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

  it('applies v14, creates the table, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 14')
      .get() as { version: number; name: string } | undefined;
    expect(recorded).toEqual({
      version: 14,
      name: 'campaign_grants_schema',
    });
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'campaign_grant'`,
      )
      .all();
    expect(tables).toEqual([{ name: 'campaign_grant' }]);
    db.prepare(GRANT_INSERT).run(validGrant());
    resetSQLiteService();
    const reopened = database();
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM campaign_grant').get(),
    ).toEqual({ c: 1 });
  });

  it('crash-rerun after dropping the v14 record is clean', () => {
    const db = database();
    db.prepare(GRANT_INSERT).run(validGrant());
    resetSQLiteService();
    const raw = new Database(dbPath);
    raw.prepare('DELETE FROM migrations WHERE version = 14').run();
    raw.close();

    const reopened = database();
    expect(
      reopened
        .prepare('SELECT version FROM migrations WHERE version = 14')
        .get(),
    ).toEqual({ version: 14 });
    expect(
      reopened.prepare('SELECT COUNT(*) AS c FROM campaign_grant').get(),
    ).toEqual({ c: 1 });
  });

  it.each([
    ['short grant id', { grantId: 'abcd' }],
    ['non-hex grant id', { grantId: 'G'.repeat(32) }],
    ['blank campaign', { campaignId: '  ' }],
    ['blank participant', { participantId: '  ' }],
    ['empty scope array', { scopes: '[]' }],
    ['non-json scopes', { scopes: 'not-json' }],
    ['object scopes', { scopes: '{}' }],
    ['expires not after issued', { expiresAt: ISSUED_AT }],
  ])('rejects %s at the row level', (_label, overrides) => {
    const db = database();
    expect(() => db.prepare(GRANT_INSERT).run(validGrant(overrides))).toThrow(
      /CHECK constraint failed/,
    );
  });

  it('refuses insert of an already-revoked row', () => {
    const db = database();
    expect(() =>
      db.prepare(GRANT_INSERT).run(validGrant({ revokedAt: REVOKED_AT })),
    ).toThrow(/inserts must be active/);
  });

  it('allows the one-way revoke and refuses delete, un-revoke, and scope rewrite', () => {
    const db = database();
    db.prepare(GRANT_INSERT).run(validGrant());
    db.prepare(
      `UPDATE campaign_grant SET revoked_at = ? WHERE grant_id = ?`,
    ).run(REVOKED_AT, GRANT_A);
    expect(
      db
        .prepare(
          'SELECT revoked_at AS r FROM campaign_grant WHERE grant_id = ?',
        )
        .get(GRANT_A),
    ).toEqual({ r: REVOKED_AT });
    expect(() =>
      db
        .prepare(
          `UPDATE campaign_grant SET revoked_at = NULL WHERE grant_id = ?`,
        )
        .run(GRANT_A),
    ).toThrow(/identity columns are immutable|revoke an active grant/);
    expect(() =>
      db
        .prepare(`UPDATE campaign_grant SET scopes = ? WHERE grant_id = ?`)
        .run(SCOPES_GM, GRANT_A),
    ).toThrow(/identity columns are immutable|revoke an active grant/);
    expect(() =>
      db.prepare(`DELETE FROM campaign_grant WHERE grant_id = ?`).run(GRANT_A),
    ).toThrow(/audit facts/);
    expect(
      db.prepare('SELECT COUNT(*) AS c FROM campaign_grant').get(),
    ).toEqual({ c: 1 });
  });

  it('refuses re-revoke UPDATE so the first timestamp stays the audit fact', () => {
    const db = database();
    db.prepare(GRANT_INSERT).run(validGrant());
    db.prepare(
      `UPDATE campaign_grant SET revoked_at = ? WHERE grant_id = ?`,
    ).run(REVOKED_AT, GRANT_A);
    expect(() =>
      db
        .prepare(`UPDATE campaign_grant SET revoked_at = ? WHERE grant_id = ?`)
        .run('2026-08-22T18:00:00.000Z', GRANT_A),
    ).toThrow(/identity columns are immutable|revoke an active grant/);
  });

  it('is additive: grant writes do not alter v11-v13 tables', () => {
    const db = database();
    expect(db.prepare('PRAGMA foreign_key_list(campaign_grant)').all()).toEqual(
      [],
    );
    const snapshot = () => ({
      audit: db.prepare('SELECT COUNT(*) AS c FROM action_audit').get(),
      delivery: db.prepare('SELECT COUNT(*) AS c FROM delivery_epoch').get(),
      privateRows: db.prepare('SELECT COUNT(*) AS c FROM private_record').get(),
      checkpoints: db
        .prepare('SELECT COUNT(*) AS c FROM replay_checkpoints')
        .get(),
    });
    const before = snapshot();
    db.prepare(GRANT_INSERT).run(validGrant());
    db.prepare(GRANT_INSERT).run(
      validGrant({ grantId: GRANT_B, participantId: 'participant-2' }),
    );
    expect(snapshot()).toEqual(before);
  });

  it('the migration is additive - trigger catalog gains campaign-grant guards', () => {
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
