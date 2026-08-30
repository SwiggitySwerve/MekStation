import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

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
    ).toEqual({ version: 22 }); // 22 = private-access write purpose (task 11.2)

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
});
