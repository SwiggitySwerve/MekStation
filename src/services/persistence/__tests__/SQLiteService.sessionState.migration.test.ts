/**
 * Additive re-apply contract for campaign_session (v20).
 *
 * Readiness revision and active branch are session facts a restart
 * recomputes against. Recreating the table on boot would reset the
 * counter, so the second `up` must change neither schema text nor rows.
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { CAMPAIGN_SESSION_STATE_MIGRATION } from '@/services/persistence/SQLiteService.sessionState.migration';

const TABLE = 'campaign_session';

const SESSION_INSERT = `
  INSERT INTO campaign_session (
    campaign_id, session_id, readiness_revision, active_branch
  ) VALUES (
    @campaignId, @sessionId, @readinessRevision, @activeBranch
  )`;

function validSession(overrides: Record<string, unknown> = {}) {
  return {
    campaignId: 'campaign-1',
    sessionId: 'session-1',
    readinessRevision: 4,
    activeBranch: 'branch-alpha',
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

describe('campaign session state SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'session-state-migration-'));
    dbPath = path.join(dir, 'session-state.db');
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

  it('applies v20, creates campaign_session, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 20')
      .get() as { version: number; name: string } | undefined;
    expect(plain(recorded ?? {})).toStrictEqual({
      version: 20,
      name: 'campaign_session_schema',
    });

    // Quoted from SQLiteService.sessionState.migration.ts:
    // campaign_id, session_id, readiness_revision, active_branch
    expect(columnNames(db)).toStrictEqual([
      'campaign_id',
      'session_id',
      'readiness_revision',
      'active_branch',
    ]);

    db.prepare(SESSION_INSERT).run(validSession());
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

    reopened.exec(CAMPAIGN_SESSION_STATE_MIGRATION.up);
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
    db.prepare(SESSION_INSERT).run(validSession());
    const seeded = (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map(
      (row) => plain(row),
    );

    db.exec(CAMPAIGN_SESSION_STATE_MIGRATION.up);

    expect(
      (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map((row) =>
        plain(row),
      ),
    ).toStrictEqual(seeded);
  });
});
