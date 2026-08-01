import type Database from 'better-sqlite3';

import type * as Journal from './EventJournalContract';

import { canonicalizeCommandIdentityV1 } from './EventJournalCommandIdentity';
import { SQLiteEventJournal } from './SQLiteEventJournal';
import {
  SQLITE_EVENT_JOURNAL_EVENT_COLUMNS,
  type SQLiteEventRow,
} from './SQLiteEventJournalWriter';

type PositionSummary = Readonly<{
  count: number;
  distinctPositions: number;
  maxPosition: number;
}>;
type HeadRow = Readonly<{
  streamType: unknown;
  streamId: unknown;
  branchId: unknown;
  streamRevision: unknown;
  eventDigest: unknown;
}>;

export class SQLiteEventJournalRecoveryError extends Error {
  public readonly name = 'SQLiteEventJournalRecoveryError';
  public readonly code = 'event-journal-recovery-verification-failed';

  public constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

function corrupt(message: string): never {
  throw new SQLiteEventJournalRecoveryError(message);
}

function streamKey(
  streamType: string,
  streamId: string,
  branchId: string,
): string {
  return JSON.stringify([streamType, streamId, branchId]);
}

class VerifyingSQLiteEventJournal<
  TPayload,
> extends SQLiteEventJournal<TPayload> {
  public verifyStorageSnapshot(): void {
    if (this.db.pragma('quick_check', { simple: true }) !== 'ok') {
      corrupt('SQLite quick check failed');
    }
    if ((this.db.pragma('foreign_key_check') as unknown[]).length !== 0) {
      corrupt('SQLite foreign-key check failed');
    }

    const highWater = this.captureHighWaterSnapshot().commitPosition;
    const positions = this.db
      .prepare(
        `SELECT COUNT(*) AS count, COUNT(DISTINCT commit_position) AS distinctPositions, COALESCE(MAX(commit_position), 0) AS maxPosition FROM event_journal_events`,
      )
      .get() as PositionSummary;
    if (
      !Number.isSafeInteger(positions.count) ||
      !Number.isSafeInteger(positions.distinctPositions) ||
      !Number.isSafeInteger(positions.maxPosition) ||
      positions.count !== positions.distinctPositions ||
      positions.maxPosition !== highWater
    ) {
      corrupt('Commit positions or high-water are inconsistent');
    }

    const events = this.readAllCommittedSnapshot(highWater);
    if (events.length !== positions.count) {
      corrupt('Committed event scan is incomplete');
    }
    const lastByStream = new Map<string, Journal.IStoredEvent<TPayload>>();
    const byCommand = new Map<string, Journal.IStoredEvent<TPayload>[]>();
    for (const event of events) {
      const key = streamKey(event.streamType, event.streamId, event.branchId);
      const previous = lastByStream.get(key);
      if (
        event.streamRevision !== (previous?.streamRevision ?? 0) + 1 ||
        event.previousStreamEventDigest !== (previous?.eventDigest ?? null)
      ) {
        corrupt(`Stream chain is invalid at event ${event.eventId}`);
      }
      lastByStream.set(key, event);
      const batch = byCommand.get(event.commandId) ?? [];
      batch.push(event);
      byCommand.set(event.commandId, batch);
    }

    this.verifyHeads(lastByStream);
    this.verifyCommandBatches(byCommand);
  }

  private readAllCommittedSnapshot(
    highWater: number,
  ): Journal.IStoredEvent<TPayload>[] {
    return (
      this.db
        .prepare(
          `SELECT ${SQLITE_EVENT_JOURNAL_EVENT_COLUMNS} FROM event_journal_events WHERE commit_position <= ? ORDER BY commit_position`,
        )
        .all(highWater) as SQLiteEventRow[]
    ).map((row) => this.hydrateEvent(row));
  }

  private verifyHeads(
    lastByStream: ReadonlyMap<string, Journal.IStoredEvent<TPayload>>,
  ): void {
    const heads = this.db
      .prepare(
        `SELECT stream_type AS streamType, stream_id AS streamId, branch_id AS branchId, stream_revision AS streamRevision, event_digest AS eventDigest FROM event_journal_stream_heads`,
      )
      .all() as HeadRow[];
    if (heads.length !== lastByStream.size)
      corrupt('Stream head count differs');
    for (const head of heads) {
      if (
        typeof head.streamType !== 'string' ||
        typeof head.streamId !== 'string' ||
        typeof head.branchId !== 'string' ||
        !Number.isSafeInteger(head.streamRevision) ||
        typeof head.eventDigest !== 'string'
      ) {
        corrupt('Stored stream head is invalid');
      }
      const expected = lastByStream.get(
        streamKey(head.streamType, head.streamId, head.branchId),
      );
      if (
        expected?.streamRevision !== head.streamRevision ||
        expected?.eventDigest !== head.eventDigest
      ) {
        corrupt('Stored stream head disagrees with its final event');
      }
    }
  }

  private verifyCommandBatches(
    byCommand: ReadonlyMap<string, readonly Journal.IStoredEvent<TPayload>[]>,
  ): void {
    const rows = this.db
      .prepare(`SELECT command_id AS commandId FROM event_journal_batches`)
      .all() as Array<{ readonly commandId: unknown }>;
    if (rows.length !== byCommand.size) corrupt('Command batch count differs');
    for (const row of rows) {
      if (typeof row.commandId !== 'string') corrupt('Command ID is invalid');
      const receipt = this.readCommittedBatch(row.commandId)?.receipt;
      const events = byCommand.get(row.commandId);
      if (!receipt || !events?.length) corrupt('Command batch is incomplete');
      const first = events[0];
      if (
        events.some(
          (event) =>
            event.actorKind !== first.actorKind ||
            event.actorId !== first.actorId ||
            event.authorityType !== first.authorityType ||
            event.authorityId !== first.authorityId,
        )
      ) {
        corrupt(`Command ${row.commandId} has inconsistent principal fields`);
      }
      const command: Journal.IAppendEventBatch<TPayload> = {
        streamType: receipt.streamType,
        streamId: receipt.streamId,
        expectedBranchId: receipt.branchId,
        expectedRevision: receipt.firstStreamRevision - 1,
        commandId: receipt.commandId,
        principal: {
          actorKind: first.actorKind,
          actorId: first.actorId,
          authorityType: first.authorityType,
          authorityId: first.authorityId,
        },
        events: events.map((event) => ({
          eventId: event.eventId,
          eventType: event.eventType,
          eventVersion: event.eventVersion,
          correlationId: event.correlationId,
          causationEventIds: event.causationEventIds,
          occurredAt: event.occurredAt,
          payload: event.payload,
          entityRefs: event.entityRefs,
        })),
      };
      if (
        canonicalizeCommandIdentityV1(command).digest !== receipt.commandDigest
      ) {
        corrupt(`Command ${row.commandId} identity digest is invalid`);
      }
    }
  }
}

/** Verify a borrowed initialized handle before exposing its durable adapter. */
export async function openVerifiedSQLiteEventJournal<TPayload = unknown>(
  db: Database.Database,
  now?: () => string,
): Promise<SQLiteEventJournal<TPayload>> {
  try {
    if (db.inTransaction) {
      corrupt('Verified opening requires an idle SQLite handle');
    }
    const journal = new VerifyingSQLiteEventJournal<TPayload>(db, now);
    db.transaction(() => journal.verifyStorageSnapshot()).deferred();
    return journal;
  } catch (cause) {
    if (cause instanceof SQLiteEventJournalRecoveryError) throw cause;
    throw new SQLiteEventJournalRecoveryError(
      'SQLite event journal verification failed',
      cause,
    );
  }
}
