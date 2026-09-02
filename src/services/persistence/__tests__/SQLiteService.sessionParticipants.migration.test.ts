/**
 * Additive re-apply contract for campaign_session_participant (v17).
 *
 * Membership rows are revoked by timestamp, never deleted. A recreate
 * on re-apply would erase that history, which is why the second `up`
 * must leave sqlite_master and the seeded row byte-equal.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { CAMPAIGN_SESSION_PARTICIPANTS_MIGRATION } from '@/services/persistence/SQLiteService.sessionParticipants.migration';

const TABLE = 'campaign_session_participant';
const BOUND_AT = '2026-09-02T00:00:00.000Z';

const PARTICIPANT_INSERT = `
  INSERT INTO campaign_session_participant (
    campaign_id, session_id, participant_id, seat, bound_at, revoked_at
  ) VALUES (
    @campaignId, @sessionId, @participantId, @seat, @boundAt, @revokedAt
  )`;

function validParticipant(overrides: Record<string, unknown> = {}) {
  return {
    campaignId: 'campaign-1',
    sessionId: 'session-1',
    participantId: 'participant-1',
    seat: 'player',
    boundAt: BOUND_AT,
    revokedAt: null,
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

describe('session participants SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'session-participants-migration-'));
    dbPath = path.join(dir, 'participants.db');
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

  it('applies v17, creates campaign_session_participant, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 17')
      .get() as { version: number; name: string } | undefined;
    expect(plain(recorded ?? {})).toStrictEqual({
      version: 17,
      name: 'campaign_session_participant_schema',
    });

    // Quoted from SQLiteService.sessionParticipants.migration.ts:
    // campaign_id, session_id, participant_id, seat, bound_at, revoked_at
    expect(columnNames(db)).toStrictEqual([
      'campaign_id',
      'session_id',
      'participant_id',
      'seat',
      'bound_at',
      'revoked_at',
    ]);

    db.prepare(PARTICIPANT_INSERT).run(validParticipant());
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

    reopened.exec(CAMPAIGN_SESSION_PARTICIPANTS_MIGRATION.up);
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
    db.prepare(PARTICIPANT_INSERT).run(validParticipant());
    const seeded = (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map(
      (row) => plain(row),
    );

    db.exec(CAMPAIGN_SESSION_PARTICIPANTS_MIGRATION.up);

    expect(
      (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map((row) =>
        plain(row),
      ),
    ).toStrictEqual(seeded);
  });
});
