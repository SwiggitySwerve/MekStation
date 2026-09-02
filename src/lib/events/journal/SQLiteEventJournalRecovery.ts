import type Database from 'better-sqlite3';

import type * as Journal from './EventJournalContract';

import { canonicalizeCommandIdentityV1 } from './EventJournalCommandIdentity';
import { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';
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

type ChainAnchor = Readonly<{
  streamRevision: number;
  eventDigest: string | null;
}>;

const GENESIS_CHAIN_ANCHOR: ChainAnchor = Object.freeze({
  streamRevision: 0,
  eventDigest: null,
});

function streamKey(
  streamType: string,
  streamId: string,
  branchId: string,
): string {
  return JSON.stringify([streamType, streamId, branchId]);
}

/**
 * Where a (stream, branch) chain is allowed to begin.
 *
 * A correction candidate is cut at a parent event. Its first stored
 * event is numbered from that base, not from genesis: revision
 * base+1 chained to the base digest. Root rows keep (0, null) even
 * though the genesis record stores the empty-history digest — the
 * first root event still names a null predecessor. No table, no
 * record, and any root record all stay on that genesis start so a
 * pre-migration-23 database does not change behaviour.
 */
function chainAnchorForBranch(
  branches: SQLiteEventHistoryBranchStore | null,
  streamType: string,
  streamId: string,
  branchId: string,
): ChainAnchor {
  if (branches === null) return GENESIS_CHAIN_ANCHOR;
  const branch = branches.readBranch({ streamType, streamId }, branchId);
  if (branch === null || branch.parentBranchId === null) {
    return GENESIS_CHAIN_ANCHOR;
  }
  return {
    streamRevision: branch.baseRevision,
    eventDigest: branch.baseDigest,
  };
}

function isTypedHead(head: HeadRow): head is HeadRow & {
  readonly streamType: string;
  readonly streamId: string;
  readonly branchId: string;
  readonly streamRevision: number;
  readonly eventDigest: string;
} {
  return (
    typeof head.streamType === 'string' &&
    typeof head.streamId === 'string' &&
    typeof head.branchId === 'string' &&
    Number.isSafeInteger(head.streamRevision) &&
    typeof head.eventDigest === 'string'
  );
}

/** Pre-migration-23 databases have no branch table to reconcile against. */
function historyBranchesTableExists(db: Database.Database): boolean {
  return (
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'event_history_branches' LIMIT 1`,
      )
      .get() !== undefined
  );
}

/**
 * A head with no events is a C1a seed only when it still copies the
 * branch record's own base. Migration 26 lets a stream hold several
 * head rows; the mint writes one per candidate at that base before any
 * event lands on the branch. Counting those rows against event-derived
 * chains is what declared a freshly minted candidate corrupt on boot.
 *
 * Event-backed heads stay in the returned list so the existing count
 * and disagreement checks keep their old meaning. A well-typed
 * event-less head that does not match a branch record also stays, so
 * an orphan still fails as 'Stream head count differs'. A seed whose
 * revision or digest disagrees with the branch it names is a different
 * lie and is refused here. No branch table means every head stays
 * event-backed: the pre-23 comparison.
 */
function eventBackedHeads(
  db: Database.Database,
  heads: readonly HeadRow[],
  lastByStream: ReadonlyMap<string, unknown>,
): HeadRow[] {
  if (!historyBranchesTableExists(db)) return [...heads];
  const branches = new SQLiteEventHistoryBranchStore(db);
  const eventBacked: HeadRow[] = [];
  for (const head of heads) {
    if (isVerifiedCandidateSeed(head, lastByStream, branches)) continue;
    eventBacked.push(head);
  }
  return eventBacked;
}

function isVerifiedCandidateSeed(
  head: HeadRow,
  lastByStream: ReadonlyMap<string, unknown>,
  branches: SQLiteEventHistoryBranchStore,
): boolean {
  if (!isTypedHead(head)) return false;
  if (
    lastByStream.has(streamKey(head.streamType, head.streamId, head.branchId))
  )
    return false;
  const branch = branches.readBranch(
    { streamType: head.streamType, streamId: head.streamId },
    head.branchId,
  );
  if (branch === null) return false;
  if (head.streamRevision !== branch.baseRevision) {
    corrupt('Candidate seed disagrees with its branch record');
  }
  if (head.eventDigest !== branch.baseDigest) {
    corrupt('Candidate seed disagrees with its branch record');
  }
  return true;
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
    const branches = historyBranchesTableExists(this.db)
      ? new SQLiteEventHistoryBranchStore(this.db)
      : null;
    for (const event of events) {
      const key = streamKey(event.streamType, event.streamId, event.branchId);
      const previous = lastByStream.get(key);
      const start = previous
        ? {
            streamRevision: previous.streamRevision,
            eventDigest: previous.eventDigest,
          }
        : chainAnchorForBranch(
            branches,
            event.streamType,
            event.streamId,
            event.branchId,
          );
      if (
        event.streamRevision !== start.streamRevision + 1 ||
        event.previousStreamEventDigest !== start.eventDigest
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
    const eventBacked = eventBackedHeads(this.db, heads, lastByStream);
    if (eventBacked.length !== lastByStream.size)
      corrupt('Stream head count differs');
    for (const head of eventBacked) {
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
