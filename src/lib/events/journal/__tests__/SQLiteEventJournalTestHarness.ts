import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SQLiteService } from '@/services/persistence/SQLiteService';

import type * as Journal from '../EventJournalContract';
import type { IEventJournalConformanceHarness } from './EventJournalConformance';

import { openVerifiedSQLiteEventJournal } from '../SQLiteEventJournalRecovery';

type Payload = Readonly<{ value: string }>;

export class SQLiteEventJournalTestHarness implements IEventJournalConformanceHarness {
  private service: SQLiteService;
  private journal: Journal.IEventJournal<Payload> | null = null;
  private failNextCommit = false;

  private constructor(
    private readonly directory: string,
    private readonly databasePath: string,
  ) {
    this.service = this.newService();
  }

  public static async create(): Promise<SQLiteEventJournalTestHarness> {
    const directory = await mkdtemp(
      path.join(tmpdir(), 'event-journal-conformance-'),
    );
    const harness = new SQLiteEventJournalTestHarness(
      directory,
      path.join(directory, 'journal.db'),
    );
    try {
      await harness.open();
      return harness;
    } catch (error) {
      await harness.dispose();
      throw error;
    }
  }

  public current(): Journal.IEventJournal<Payload> {
    if (!this.journal) throw new Error('SQLite journal is not open');
    return this.journal;
  }

  public database() {
    return this.service.getDatabase();
  }

  public async restart(): Promise<void> {
    this.journal = null;
    this.service.close();
    this.service = this.newService();
    await this.open();
  }

  public failNextCommitAfterWrites(): void {
    this.failNextCommit = true;
  }

  public async assertStorageConsistent(): Promise<void> {
    await openVerifiedSQLiteEventJournal<Payload>(this.database());
  }

  public async dispose(): Promise<void> {
    this.journal = null;
    this.service.close();
    await rm(this.directory, { recursive: true, force: true, maxRetries: 3 });
  }

  private newService(): SQLiteService {
    return new SQLiteService({ path: this.databasePath });
  }

  private async open(): Promise<void> {
    this.service.initialize();
    const db = this.database();
    db.function('event_journal_fail_next_commit', () => {
      if (!this.failNextCommit) return 0;
      this.failNextCommit = false;
      return 1;
    });
    db.exec(
      `CREATE TEMP TRIGGER event_journal_fail_next_head BEFORE INSERT ON event_journal_stream_heads WHEN event_journal_fail_next_commit() = 1 BEGIN SELECT RAISE(ABORT, 'injected final-head failure'); END`,
    );
    const adapter = await openVerifiedSQLiteEventJournal<Payload>(db);
    this.journal = {
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
}

export const createSQLiteEventJournalTestHarness = () =>
  SQLiteEventJournalTestHarness.create();
