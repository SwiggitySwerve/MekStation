/**
 * Additive re-apply contract for campaign_participant_cursor (v16).
 *
 * The runner skips an already-recorded version, so a second initialize
 * alone cannot prove CREATE TABLE IF NOT EXISTS. Row A therefore
 * re-opens the same file and then executes `up` again: that is the
 * apply that must stay a no-op.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { CAMPAIGN_PARTICIPANT_CURSORS_MIGRATION } from '@/services/persistence/SQLiteService.participantCursors.migration';

const TABLE = 'campaign_participant_cursor';
const UPDATED_AT = '2026-09-02T00:00:00.000Z';

const CURSOR_INSERT = `
  INSERT INTO campaign_participant_cursor (
    campaign_id, grant_id, participant_id,
    delivery_epoch_id, acked_sequence, updated_at
  ) VALUES (
    @campaignId, @grantId, @participantId,
    @deliveryEpochId, @ackedSequence, @updatedAt
  )`;

function validCursor(overrides: Record<string, unknown> = {}) {
  return {
    campaignId: 'campaign-1',
    grantId: 'grant-1',
    participantId: 'participant-1',
    deliveryEpochId: 'a'.repeat(32),
    ackedSequence: 3,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

/** Plain objects so toStrictEqual does not fail on better-sqlite3's null prototype. */
function plain<T extends object>(row: T): T {
  return Object.assign({}, row);
}

function columnNames(db: Database.Database): string[] {
  return (
    db.prepare(`PRAGMA table_info(${TABLE})`).all() as { name: string }[]
  ).map((column) => column.name);
}

function schemaSnapshot(db: Database.Database): Array<{
  name: string;
  type: string;
  sql: string;
}> {
  return (
    db
      .prepare(
        `SELECT name, type, sql FROM sqlite_master
         WHERE tbl_name = ? AND sql IS NOT NULL
         ORDER BY type, name`,
      )
      .all(TABLE) as Array<{ name: string; type: string; sql: string }>
  ).map((row) => plain(row));
}

describe('participant cursors SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'participant-cursors-migration-'));
    dbPath = path.join(dir, 'cursors.db');
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

  it('applies v16, creates campaign_participant_cursor, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 16')
      .get() as { version: number; name: string } | undefined;
    expect(plain(recorded ?? {})).toStrictEqual({
      version: 16,
      name: 'campaign_participant_cursor_schema',
    });

    // Quoted from SQLiteService.participantCursors.migration.ts:
    // campaign_id, grant_id, participant_id, delivery_epoch_id,
    // acked_sequence, updated_at
    expect(columnNames(db)).toStrictEqual([
      'campaign_id',
      'grant_id',
      'participant_id',
      'delivery_epoch_id',
      'acked_sequence',
      'updated_at',
    ]);

    db.prepare(CURSOR_INSERT).run(validCursor());
    const schemaBefore = schemaSnapshot(db);
    const countBefore = plain(
      db.prepare(`SELECT COUNT(*) AS c FROM ${TABLE}`).get() as { c: number },
    );

    resetSQLiteService();
    const reopened = database();
    expect(schemaSnapshot(reopened)).toStrictEqual(schemaBefore);
    expect(
      plain(
        reopened.prepare(`SELECT COUNT(*) AS c FROM ${TABLE}`).get() as {
          c: number;
        },
      ),
    ).toStrictEqual(countBefore);

    // Re-executing `up` is the real second apply; IF NOT EXISTS keeps it a no-op.
    reopened.exec(CAMPAIGN_PARTICIPANT_CURSORS_MIGRATION.up);
    expect(schemaSnapshot(reopened)).toStrictEqual(schemaBefore);
    expect(
      plain(
        reopened.prepare(`SELECT COUNT(*) AS c FROM ${TABLE}`).get() as {
          c: number;
        },
      ),
    ).toStrictEqual(countBefore);
  });

  it('preserves rows across re-apply', () => {
    const db = database();
    db.prepare(CURSOR_INSERT).run(validCursor());
    const seeded = (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map(
      (row) => plain(row),
    );

    db.exec(CAMPAIGN_PARTICIPANT_CURSORS_MIGRATION.up);

    expect(
      (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map((row) =>
        plain(row),
      ),
    ).toStrictEqual(seeded);
  });
});
