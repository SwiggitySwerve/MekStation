import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { CAMPAIGN_COMBAT_OUTCOME_INBOX_MIGRATION } from '@/services/persistence/SQLiteService.campaignOutcomeInbox.migration';
import { MIGRATIONS } from '@/services/persistence/SQLiteService.migrations';

/** The migration head, derived from the catalog rather than a literal. */
const MIGRATION_HEAD = Math.max(...MIGRATIONS.map(({ version }) => version));

const TABLE = 'campaign_combat_outcome_inbox';

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

describe('campaign combat outcome inbox SQLite migration', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'campaign-outcome-inbox-schema-'));
    dbPath = path.join(dir, 'campaign.db');
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

  function insertReceipt(
    db: Database.Database,
    overrides: Readonly<Record<string, unknown>> = {},
  ): void {
    db.prepare(
      `INSERT INTO campaign_combat_outcome_inbox
         (outcome_id, outcome_version, campaign_id, command_id, command_digest,
          first_stream_revision, last_stream_revision, first_commit_position,
          last_commit_position, received_at)
       VALUES (@outcomeId, @outcomeVersion, @campaignId, @commandId,
               @commandDigest, @firstStreamRevision, @lastStreamRevision,
               @firstCommitPosition, @lastCommitPosition, @receivedAt)`,
    ).run({
      outcomeId: 'combat-outcome-1',
      outcomeVersion: 1,
      campaignId: 'campaign-1',
      commandId: 'campaign-outcome:campaign-1:combat-outcome-1:1',
      commandDigest: 'a'.repeat(64),
      firstStreamRevision: 2,
      lastStreamRevision: 4,
      firstCommitPosition: 2,
      lastCommitPosition: 4,
      receivedAt: '2026-08-29T12:00:00.000Z',
      ...overrides,
    });
  }

  it('pins the migration head and enforces one receipt per outcome identity and version', () => {
    const db = database();
    expect(
      db.prepare('SELECT MAX(version) AS version FROM migrations').get(),
    ).toEqual({ version: MIGRATION_HEAD }); // the migration head

    insertReceipt(db);
    expect(() => insertReceipt(db)).toThrow(/UNIQUE constraint failed/);
    expect(() => insertReceipt(db, { outcomeVersion: 0 })).toThrow(
      /CHECK constraint failed/,
    );
    expect(
      db
        .prepare(
          'SELECT outcome_id, outcome_version FROM campaign_combat_outcome_inbox',
        )
        .all(),
    ).toEqual([{ outcome_id: 'combat-outcome-1', outcome_version: 1 }]);
  });

  it('applies v21, creates campaign_combat_outcome_inbox, and re-initializes idempotently', () => {
    const db = database();
    const recorded = db
      .prepare('SELECT version, name FROM migrations WHERE version = 21')
      .get() as { version: number; name: string } | undefined;
    expect(plain(recorded ?? {})).toStrictEqual({
      version: 21,
      name: 'campaign_combat_outcome_inbox_schema',
    });

    // Quoted from SQLiteService.campaignOutcomeInbox.migration.ts:
    // outcome_id, outcome_version, campaign_id, command_id, command_digest,
    // first_stream_revision, last_stream_revision, first_commit_position,
    // last_commit_position, received_at
    expect(columnNames(db)).toStrictEqual([
      'outcome_id',
      'outcome_version',
      'campaign_id',
      'command_id',
      'command_digest',
      'first_stream_revision',
      'last_stream_revision',
      'first_commit_position',
      'last_commit_position',
      'received_at',
    ]);

    insertReceipt(db);
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

    reopened.exec(CAMPAIGN_COMBAT_OUTCOME_INBOX_MIGRATION.up);
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
    insertReceipt(db);
    const seeded = (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map(
      (row) => plain(row),
    );

    db.exec(CAMPAIGN_COMBAT_OUTCOME_INBOX_MIGRATION.up);

    expect(
      (db.prepare(`SELECT * FROM ${TABLE}`).all() as object[]).map((row) =>
        plain(row),
      ),
    ).toStrictEqual(seeded);
  });
});
