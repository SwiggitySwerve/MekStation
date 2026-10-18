import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type * as Journal from '../EventJournalContract';
import type { IEventJournalConformanceHarness } from './EventJournalConformance';

import { openVerifiedSQLiteEventJournal } from '../SQLiteEventJournalRecovery';

type Payload = Readonly<{ value: string }>;

export interface SQLiteEventJournalTestHarness extends IEventJournalConformanceHarness {
  database(): ReturnType<SQLiteService['getDatabase']>;
  openAdditionalService(): SQLiteService;
}

// Preserve the test-facing factory while keeping each fixture's state private.
export const SQLiteEventJournalTestHarness = {
  async create(): Promise<SQLiteEventJournalTestHarness> {
    const directory = await mkdtemp(
      path.join(tmpdir(), 'event-journal-conformance-'),
    );
    const { harness, open } = fixture(
      directory,
      path.join(directory, 'journal.db'),
    );
    try {
      await open();
      return harness;
    } catch (error) {
      await harness.dispose();
      throw error;
    }
  },
};

function fixture(directory: string, databasePath: string) {
  let service = newService();
  let journal: Journal.IEventJournal<Payload> | null = null;
  let failNextCommit = false;

  function current(): Journal.IEventJournal<Payload> {
    if (!journal) throw new Error('SQLite journal is not open');
    return journal;
  }

  function database() {
    return service.getDatabase();
  }

  function openAdditionalService(): SQLiteService {
    const additionalService = newService();
    additionalService.initialize();
    return additionalService;
  }

  async function restart(): Promise<void> {
    journal = null;
    service.close();
    service = newService();
    await open();
  }

  function failNextCommitAfterWrites(): void {
    failNextCommit = true;
  }

  async function assertStorageConsistent(): Promise<void> {
    await openVerifiedSQLiteEventJournal<Payload>(database());
  }

  async function dispose(): Promise<void> {
    journal = null;
    service.close();
    await rm(directory, { recursive: true, force: true, maxRetries: 3 });
  }

  function newService(): SQLiteService {
    return new SQLiteService({ path: databasePath });
  }

  async function open(): Promise<void> {
    service.initialize();
    const db = database();
    db.function('event_journal_fail_next_commit', () => {
      if (!failNextCommit) return 0;
      failNextCommit = false;
      return 1;
    });
    db.exec(
      `CREATE TEMP TRIGGER event_journal_fail_next_head BEFORE INSERT ON event_journal_stream_heads WHEN event_journal_fail_next_commit() = 1 BEGIN SELECT RAISE(ABORT, 'injected final-head failure'); END`,
    );
    const adapter = await openVerifiedSQLiteEventJournal<Payload>(db);
    journal = {
      append: async (input) => {
        try {
          return await adapter.append(input);
        } catch (cause) {
          throw new Error(
            cause instanceof Error ? cause.message : 'SQLite append failed',
            { cause },
          );
        }
      },
      readStream: adapter.readStream.bind(adapter),
      readEntityHistory: adapter.readEntityHistory.bind(adapter),
      readEventHistory: adapter.readEventHistory.bind(adapter),
      captureHighWater: adapter.captureHighWater.bind(adapter),
      readCommitted: adapter.readCommitted.bind(adapter),
      getCommandReceipt: adapter.getCommandReceipt.bind(adapter),
    };
  }

  const harness: SQLiteEventJournalTestHarness = {
    current,
    database,
    openAdditionalService,
    restart,
    failNextCommitAfterWrites,
    assertStorageConsistent,
    dispose,
  };
  return { harness, open };
}

export const createSQLiteEventJournalTestHarness = () =>
  SQLiteEventJournalTestHarness.create();
