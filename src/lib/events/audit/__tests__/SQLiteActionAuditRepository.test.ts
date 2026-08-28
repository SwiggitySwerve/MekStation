/**
 * SQLite action-audit repository contract (authority-audit PR 4),
 * against REAL SQLite files.
 *
 * Pins: terminal lifecycles persist across reopen; matching retries are
 * idempotent; conflicting digest/state is typed and does not overwrite;
 * published stamps once; rejected/vetoed/timed-out writes leave a live
 * SQLiteEventJournal's event tables and receipts untouched.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/audit-timeline/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

import type * as Journal from '../../journal/EventJournalContract';

import { SQLiteEventJournal } from '../../journal/SQLiteEventJournal';
import {
  ActionAuditError,
  type IAcceptedActionAuditInsert,
  type IActionAuditInsert,
  type IFailedActionAuditInsert,
} from '../IActionAuditRepository';
import { SQLiteActionAuditRepository } from '../SQLiteActionAuditRepository';

const DIGEST_A = 'a'.repeat(64);
const DIGEST_B = 'b'.repeat(64);
const CREATED_AT = '2026-08-21T20:00:00.000Z';
const STAMPED_AT = '2026-08-21T20:05:00.000Z';
const NOW = '2026-08-21T20:00:00.000Z';

const actor = {
  principalId: 'principal-1',
  participantId: 'participant-1',
  role: 'player' as const,
};

const accepted = (
  overrides: Partial<IAcceptedActionAuditInsert> = {},
): IAcceptedActionAuditInsert => ({
  campaignSessionId: 'session-1',
  matchId: 'match-1',
  streamType: 'campaign',
  streamId: 'campaign-alpha',
  commandId: 'cmd-accepted',
  commandDigest: DIGEST_A,
  actor,
  correlationId: 'corr-1',
  createdAt: CREATED_AT,
  lifecycleState: 'accepted',
  safeReasonCode: null,
  committedFirstRevision: 1,
  committedLastRevision: 1,
  committedEventCount: 1,
  ...overrides,
});

const failed = (
  lifecycleState: IFailedActionAuditInsert['lifecycleState'],
  safeReasonCode: IFailedActionAuditInsert['safeReasonCode'],
  commandId: string,
): IFailedActionAuditInsert => ({
  campaignSessionId: 'session-1',
  matchId: 'match-1',
  streamType: 'campaign',
  streamId: 'campaign-alpha',
  commandId,
  commandDigest: DIGEST_A,
  actor,
  correlationId: 'corr-fail',
  createdAt: CREATED_AT,
  lifecycleState,
  safeReasonCode,
  committedFirstRevision: null,
  committedLastRevision: null,
  committedEventCount: null,
});

describe('SQLite action audit repository', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'action-audit-repo-'));
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

  function countRows(db: Database.Database): number {
    return (
      db.prepare('SELECT COUNT(*) AS c FROM action_audit').get() as {
        c: number;
      }
    ).c;
  }

  it('records terminal lifecycles that survive a database reopen', () => {
    const db = database();
    const repo = new SQLiteActionAuditRepository(db);
    const inserts: IActionAuditInsert[] = [
      accepted(),
      failed('rejected', 'command-rejected', 'cmd-rejected'),
      failed('vetoed', 'policy-veto', 'cmd-vetoed'),
      failed('timed-out', 'deadline-expired', 'cmd-timed-out'),
    ];
    for (const insert of inserts) {
      expect(repo.recordLifecycle(insert).kind).toBe('created');
    }
    const before = inserts.map((insert) =>
      repo.readByCommandId(insert.commandId),
    );
    resetSQLiteService();
    const reopened = new SQLiteActionAuditRepository(database());
    const after = inserts.map((insert) =>
      reopened.readByCommandId(insert.commandId),
    );
    expect(after).toEqual(before);
    expect(after.map((row) => row?.lifecycleState)).toEqual([
      'accepted',
      'rejected',
      'vetoed',
      'timed-out',
    ]);
    expect(reopened.readBySession('session-1')).toHaveLength(4);
  });

  it('retries of the same terminal identity return the existing row', () => {
    const db = database();
    const repo = new SQLiteActionAuditRepository(db);
    const first = repo.recordLifecycle(
      failed('rejected', 'no-viewer', 'cmd-retry'),
    );
    const second = repo.recordLifecycle(
      failed('rejected', 'no-viewer', 'cmd-retry'),
    );
    expect(first.kind).toBe('created');
    expect(second.kind).toBe('existing');
    expect(second.record).toEqual(first.record);
    expect(countRows(db)).toBe(1);
  });

  it('conflicting digest is a typed error and leaves the stored row unchanged', () => {
    const db = database();
    const repo = new SQLiteActionAuditRepository(db);
    const original = repo.recordLifecycle(
      failed('rejected', 'command-rejected', 'cmd-conflict'),
    );
    let error: ActionAuditError | null = null;
    try {
      repo.recordLifecycle({
        ...failed('rejected', 'command-rejected', 'cmd-conflict'),
        commandDigest: DIGEST_B,
      });
    } catch (caught) {
      if (caught instanceof ActionAuditError) error = caught;
      else throw caught;
    }
    expect(error?.code).toBe('identity-conflict');
    expect(countRows(db)).toBe(1);
    expect(repo.readByCommandId('cmd-conflict')).toEqual(original.record);
  });

  it('stamps published receipt identity once; same value is idempotent', () => {
    const db = database();
    const repo = new SQLiteActionAuditRepository(db);
    repo.recordLifecycle(accepted());
    const stamped = repo.linkPublishedReceipt(
      'cmd-accepted',
      'receipt-1',
      STAMPED_AT,
    );
    expect(stamped.kind).toBe('created');
    expect(stamped.record.lifecycleState).toBe('published');
    expect(stamped.record.publishedReceiptId).toBe('receipt-1');
    expect(stamped.record.updatedAt).toBe(STAMPED_AT);
    const again = repo.linkPublishedReceipt(
      'cmd-accepted',
      'receipt-1',
      STAMPED_AT,
    );
    expect(again.kind).toBe('existing');
    expect(again.record).toEqual(stamped.record);
    let error: ActionAuditError | null = null;
    try {
      repo.linkPublishedReceipt('cmd-accepted', 'receipt-other', STAMPED_AT);
    } catch (caught) {
      if (caught instanceof ActionAuditError) error = caught;
      else throw caught;
    }
    expect(error?.code).toBe('receipt-conflict');
    expect(repo.readByCommandId('cmd-accepted')?.publishedReceiptId).toBe(
      'receipt-1',
    );
    repo.recordLifecycle(
      failed('rejected', 'command-rejected', 'cmd-rejected'),
    );
    let rejectedError: ActionAuditError | null = null;
    try {
      repo.linkPublishedReceipt('cmd-rejected', 'receipt-1', STAMPED_AT);
    } catch (caught) {
      if (caught instanceof ActionAuditError) rejectedError = caught;
      else throw caught;
    }
    expect(rejectedError?.code).toBe('not-accepted');
  });

  it('rejected, vetoed, and timed-out records do not create gameplay facts', async () => {
    const db = database();
    const journal = new SQLiteEventJournal<{ value: string }>(db, () => NOW);
    const repo = new SQLiteActionAuditRepository(db);
    const batch: Journal.IAppendEventBatch<{ value: string }> = {
      streamType: 'campaign',
      streamId: 'campaign-alpha',
      expectedBranchId: 'root',
      expectedRevision: 0,
      commandId: 'cmd-gameplay',
      principal: {
        actorKind: 'human',
        actorId: 'principal-1',
        authorityType: 'campaign',
        authorityId: 'campaign-alpha',
      },
      events: [
        {
          eventId: 'evt-gameplay',
          eventType: 'ProbeEvent',
          eventVersion: 1,
          correlationId: 'corr-gameplay',
          causationEventIds: ['origin-a'],
          occurredAt: NOW,
          payload: { value: 'probe' },
          entityRefs: [
            { entityType: 'unit', entityId: 'unit-1', role: 'subject' },
          ],
        },
      ],
    };
    const committed = await journal.append(batch);
    expect(committed.kind).toBe('committed');
    const snapshot = () => ({
      events: (
        db.prepare('SELECT COUNT(*) AS c FROM event_journal_events').get() as {
          c: number;
        }
      ).c,
      batches: (
        db.prepare('SELECT COUNT(*) AS c FROM event_journal_batches').get() as {
          c: number;
        }
      ).c,
      refs: (
        db
          .prepare('SELECT COUNT(*) AS c FROM event_journal_entity_refs')
          .get() as { c: number }
      ).c,
      causations: (
        db
          .prepare('SELECT COUNT(*) AS c FROM event_journal_causations')
          .get() as { c: number }
      ).c,
      heads: (
        db
          .prepare('SELECT COUNT(*) AS c FROM event_journal_stream_heads')
          .get() as { c: number }
      ).c,
      store: db.prepare('SELECT * FROM event_journal_store_state').all(),
    });
    const before = snapshot();
    expect(before.events).toBe(1);
    expect(before.batches).toBe(1);

    repo.recordLifecycle(failed('rejected', 'no-viewer', 'cmd-rejected'));
    repo.recordLifecycle(failed('vetoed', 'policy-veto', 'cmd-vetoed'));
    repo.recordLifecycle(
      failed('timed-out', 'deadline-expired', 'cmd-timed-out'),
    );

    expect(snapshot()).toEqual(before);
    expect(await journal.getCommandReceipt('cmd-rejected')).toBeNull();
    expect(await journal.getCommandReceipt('cmd-vetoed')).toBeNull();
    expect(await journal.getCommandReceipt('cmd-timed-out')).toBeNull();
    expect(await journal.getCommandReceipt('cmd-gameplay')).not.toBeNull();
    expect(countRows(db)).toBe(3);
  });
});
