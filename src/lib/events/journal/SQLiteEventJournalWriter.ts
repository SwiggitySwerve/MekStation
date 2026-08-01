import type Database from 'better-sqlite3';

import type * as Journal from './EventJournalContract';

import {
  canonicalizeEventDigestV1,
  canonicalizeJsonV1,
  normalizeEntityRefsV1,
  normalizeStringSetV1,
} from './EventJournalCanonicalizer';
import { canonicalizeCommandIdentityV1 } from './EventJournalCommandIdentity';
import { CURRENT_EVENT_CANONICALIZER_VERSION } from './EventJournalContract';
import * as Schemas from './EventJournalSchemas';

type DbRow = Readonly<Record<string, unknown>>;
type ReceiptRow = DbRow & { readonly commandDigest: unknown };
export type SQLiteEventRow = DbRow & { readonly payloadJson: unknown };
type HeadRow = Readonly<{ streamRevision: number; eventDigest: string }>;

const RECEIPT_COLUMNS = `command_id AS commandId, command_digest AS commandDigest, canonicalizer_version AS canonicalizerVersion, stream_type AS streamType, stream_id AS streamId, branch_id AS branchId, event_count AS eventCount, first_stream_revision AS firstStreamRevision, last_stream_revision AS lastStreamRevision, first_commit_position AS firstCommitPosition, last_commit_position AS lastCommitPosition, recorded_at AS recordedAt`;
export const SQLITE_EVENT_JOURNAL_EVENT_COLUMNS = `event_id AS eventId, stream_type AS streamType, stream_id AS streamId, branch_id AS branchId, stream_revision AS streamRevision, commit_position AS commitPosition, command_id AS commandId, command_index AS commandIndex, event_type AS eventType, event_version AS eventVersion, correlation_id AS correlationId, actor_kind AS actorKind, actor_id AS actorId, authority_type AS authorityType, authority_id AS authorityId, occurred_at AS occurredAt, recorded_at AS recordedAt, canonicalizer_version AS canonicalizerVersion, previous_stream_event_digest AS previousStreamEventDigest, event_digest AS eventDigest, payload_json AS payloadJson`;

function integrity(message: string): never {
  throw new Error(`SQLite event journal integrity error: ${message}`);
}

export class SQLiteEventJournalWriter<TPayload = unknown> {
  public constructor(
    protected readonly db: Database.Database,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  public async append(
    raw: Journal.IAppendEventBatch<TPayload>,
  ): Promise<Journal.EventJournalAppendResult<TPayload>> {
    const parsed = Schemas.AppendEventBatchSchema.parse(raw) as typeof raw;
    const identity = canonicalizeCommandIdentityV1(parsed);
    const eventIds = new Set(
      identity.command.events.map(({ eventId }) => eventId),
    );
    if (eventIds.size !== identity.command.events.length) {
      throw new Error('Duplicate eventId');
    }
    return this.db
      .transaction(() =>
        this.appendInTransaction(identity.command, identity.digest),
      )
      .immediate();
  }

  public async getCommandReceipt(
    commandId: string,
  ): Promise<Journal.ICommandReceipt | null> {
    return this.readCommittedBatch(commandId)?.receipt ?? null;
  }

  public async captureHighWater(): Promise<Journal.IJournalHighWater> {
    return this.captureHighWaterSnapshot();
  }

  protected readCommittedBatch(
    commandId: string,
  ): Journal.ICommittedEventBatch<TPayload> | null {
    const row = this.findReceipt(commandId);
    return row ? this.hydrateBatch(row) : null;
  }

  protected captureHighWaterSnapshot(): Journal.IJournalHighWater {
    const row = this.db
      .prepare(
        `SELECT last_commit_position AS commitPosition FROM event_journal_store_state WHERE singleton_id = 1`,
      )
      .get() as { readonly commitPosition?: unknown } | undefined;
    if (
      !Number.isSafeInteger(row?.commitPosition) ||
      Number(row?.commitPosition) < 0
    ) {
      return integrity('Journal high-water singleton is missing or invalid');
    }
    return { commitPosition: Number(row?.commitPosition) };
  }

  private appendInTransaction(
    input: Journal.IAppendEventBatch<TPayload>,
    commandDigest: string,
  ): Journal.EventJournalAppendResult<TPayload> {
    const existing = this.findReceipt(input.commandId);
    if (existing) {
      const receipt = Schemas.CommandReceiptSchema.safeParse(existing);
      if (!receipt.success) integrity('Stored command receipt is invalid');
      return receipt.data.commandDigest === commandDigest
        ? this.hydrateBatch(existing)
        : { kind: 'command-identity-conflict', commandId: input.commandId };
    }

    const head = this.db
      .prepare(
        `SELECT stream_revision AS streamRevision, event_digest AS eventDigest FROM event_journal_stream_heads WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
      )
      .get(input.streamType, input.streamId, input.expectedBranchId) as
      | HeadRow
      | undefined;
    const actualRevision = head?.streamRevision ?? 0;
    if (actualRevision !== input.expectedRevision) {
      return {
        kind: 'revision-conflict',
        expectedRevision: input.expectedRevision,
        actualRevision,
      };
    }
    if (head) this.verifyHead(input, head);

    const state = this.db
      .prepare(
        `SELECT last_commit_position AS lastCommitPosition FROM event_journal_store_state WHERE singleton_id = 1`,
      )
      .get() as { readonly lastCommitPosition?: unknown } | undefined;
    if (!Number.isSafeInteger(state?.lastCommitPosition)) {
      return integrity('Journal high-water singleton is missing or invalid');
    }
    const lastPosition = Number(state?.lastCommitPosition);
    const count = input.events.length;
    if (count > Number.MAX_SAFE_INTEGER - lastPosition) {
      throw new Error('Commit position space exhausted');
    }
    if (count > Number.MAX_SAFE_INTEGER - actualRevision) {
      throw new Error('Stream revision space exhausted');
    }
    const firstPosition = lastPosition + 1;
    const recordedAt = new Date(this.now()).toISOString();
    let previousDigest = head?.eventDigest ?? null;
    const events = input.events.map((event, commandIndex) => {
      const envelope = {
        ...event,
        ...input.principal,
        streamType: input.streamType,
        streamId: input.streamId,
        branchId: input.expectedBranchId,
        streamRevision: actualRevision + commandIndex + 1,
        commitPosition: firstPosition + commandIndex,
        commandId: input.commandId,
        commandIndex,
        recordedAt,
        canonicalizerVersion: CURRENT_EVENT_CANONICALIZER_VERSION,
        previousStreamEventDigest: previousDigest,
      };
      const eventDigest = canonicalizeEventDigestV1(envelope).digest;
      previousDigest = eventDigest;
      return { ...envelope, eventDigest };
    });
    const final = events[events.length - 1];
    const receipt: Journal.ICommandReceipt = {
      commandId: input.commandId,
      commandDigest,
      canonicalizerVersion: CURRENT_EVENT_CANONICALIZER_VERSION,
      streamType: input.streamType,
      streamId: input.streamId,
      branchId: input.expectedBranchId,
      eventCount: count,
      firstStreamRevision: events[0].streamRevision,
      lastStreamRevision: final.streamRevision,
      firstCommitPosition: firstPosition,
      lastCommitPosition: final.commitPosition,
      recordedAt,
    };

    const allocation = this.db
      .prepare(
        `UPDATE event_journal_store_state SET last_commit_position = ? WHERE singleton_id = 1 AND last_commit_position = ?`,
      )
      .run(final.commitPosition, lastPosition);
    if (allocation.changes !== 1) integrity('High-water allocation failed');
    this.insertReceipt(receipt);
    for (const event of events) this.insertEvent(event);
    this.advanceHead(input, head, final);
    return { kind: 'committed', receipt, events };
  }

  private findReceipt(commandId: string): ReceiptRow | undefined {
    return this.db
      .prepare(
        `SELECT ${RECEIPT_COLUMNS} FROM event_journal_batches WHERE command_id = ?`,
      )
      .get(commandId) as ReceiptRow | undefined;
  }

  private hydrateBatch(
    row: ReceiptRow,
  ): Journal.ICommittedEventBatch<TPayload> {
    const receipt = Schemas.CommandReceiptSchema.parse(row);
    const rows = this.db
      .prepare(
        `SELECT ${SQLITE_EVENT_JOURNAL_EVENT_COLUMNS} FROM event_journal_events WHERE command_id = ? ORDER BY command_index`,
      )
      .all(receipt.commandId) as SQLiteEventRow[];
    const events = rows.map((eventRow) => this.hydrateEvent(eventRow));
    const valid =
      events.length === receipt.eventCount &&
      events.every(
        (event, index) =>
          event.commandId === receipt.commandId &&
          event.commandIndex === index &&
          event.streamType === receipt.streamType &&
          event.streamId === receipt.streamId &&
          event.branchId === receipt.branchId &&
          event.streamRevision === receipt.firstStreamRevision + index &&
          event.commitPosition === receipt.firstCommitPosition + index &&
          event.recordedAt === receipt.recordedAt &&
          event.canonicalizerVersion === receipt.canonicalizerVersion,
      ) &&
      events.at(-1)?.streamRevision === receipt.lastStreamRevision &&
      events.at(-1)?.commitPosition === receipt.lastCommitPosition;
    if (!valid)
      integrity(`Stored batch ${receipt.commandId} disagrees with its receipt`);
    return { kind: 'committed', receipt, events };
  }

  protected hydrateEvent(row: SQLiteEventRow): Journal.IStoredEvent<TPayload> {
    if (
      typeof row.eventId !== 'string' ||
      typeof row.payloadJson !== 'string'
    ) {
      return integrity('Stored event identity or payload is invalid');
    }
    let payload: unknown;
    try {
      payload = JSON.parse(row.payloadJson);
    } catch {
      return integrity(`Stored event ${row.eventId} has invalid payload JSON`);
    }
    const causationEventIds = normalizeStringSetV1(
      (
        this.db
          .prepare(
            `SELECT causation_event_id AS id FROM event_journal_causations WHERE event_id = ? ORDER BY causation_event_id`,
          )
          .all(row.eventId) as Array<{ readonly id: string }>
      ).map(({ id }) => id),
      'causationEventIds',
    );
    const entityRefs = normalizeEntityRefsV1(
      this.db
        .prepare(
          `SELECT entity_type AS entityType, entity_id AS entityId, role FROM event_journal_entity_refs WHERE event_id = ? ORDER BY entity_type, entity_id, role`,
        )
        .all(row.eventId) as Journal.IEntityEventRef[],
    );
    const { payloadJson: _payloadJson, ...stored } = row;
    const parsed = Schemas.StoredEventSchema.safeParse({
      ...stored,
      payload,
      causationEventIds,
      entityRefs,
    });
    if (!parsed.success) integrity(`Stored event ${row.eventId} is invalid`);
    const event = parsed.data as Journal.IStoredEvent<TPayload>;
    if (canonicalizeEventDigestV1(event).digest !== event.eventDigest) {
      integrity(`Stored event ${event.eventId} digest is invalid`);
    }
    return event;
  }

  private verifyHead(
    input: Journal.IAppendEventBatch<TPayload>,
    head: HeadRow,
  ): void {
    const row = this.db
      .prepare(
        `SELECT ${SQLITE_EVENT_JOURNAL_EVENT_COLUMNS} FROM event_journal_events WHERE stream_type = ? AND stream_id = ? AND branch_id = ? AND stream_revision = ?`,
      )
      .get(
        input.streamType,
        input.streamId,
        input.expectedBranchId,
        head.streamRevision,
      ) as SQLiteEventRow | undefined;
    if (!row) integrity('Stream head has no final committed event');
    if (this.hydrateEvent(row).eventDigest !== head.eventDigest) {
      return integrity('Stream head disagrees with its final committed event');
    }
  }

  private insertReceipt(receipt: Journal.ICommandReceipt): void {
    this.db
      .prepare(
        `INSERT INTO event_journal_batches (command_id, command_digest, canonicalizer_version, stream_type, stream_id, branch_id, event_count, first_stream_revision, last_stream_revision, first_commit_position, last_commit_position, recorded_at) VALUES (@commandId, @commandDigest, @canonicalizerVersion, @streamType, @streamId, @branchId, @eventCount, @firstStreamRevision, @lastStreamRevision, @firstCommitPosition, @lastCommitPosition, @recordedAt)`,
      )
      .run(receipt);
  }

  private insertEvent(event: Journal.IStoredEvent<TPayload>): void {
    this.db
      .prepare(
        `INSERT INTO event_journal_events (event_id, command_id, stream_type, stream_id, branch_id, stream_revision, commit_position, command_index, event_type, event_version, correlation_id, actor_kind, actor_id, authority_type, authority_id, occurred_at, recorded_at, canonicalizer_version, previous_stream_event_digest, event_digest, payload_json) VALUES (@eventId, @commandId, @streamType, @streamId, @branchId, @streamRevision, @commitPosition, @commandIndex, @eventType, @eventVersion, @correlationId, @actorKind, @actorId, @authorityType, @authorityId, @occurredAt, @recordedAt, @canonicalizerVersion, @previousStreamEventDigest, @eventDigest, @payloadJson)`,
      )
      .run({ ...event, payloadJson: canonicalizeJsonV1(event.payload) });
    const insertRef = this.db.prepare(
      `INSERT INTO event_journal_entity_refs (event_id, commit_position, entity_type, entity_id, role) VALUES (?, ?, ?, ?, ?)`,
    );
    for (const ref of event.entityRefs) {
      insertRef.run(
        event.eventId,
        event.commitPosition,
        ref.entityType,
        ref.entityId,
        ref.role,
      );
    }
    const insertCause = this.db.prepare(
      `INSERT INTO event_journal_causations (event_id, commit_position, causation_event_id) VALUES (?, ?, ?)`,
    );
    for (const id of event.causationEventIds) {
      insertCause.run(event.eventId, event.commitPosition, id);
    }
  }

  private advanceHead(
    input: Journal.IAppendEventBatch<TPayload>,
    head: HeadRow | undefined,
    final: Journal.IStoredEvent<TPayload>,
  ): void {
    const result = this.db
      .prepare(
        `INSERT INTO event_journal_stream_heads (stream_type, stream_id, branch_id, stream_revision, event_digest) VALUES (@streamType, @streamId, @branchId, @streamRevision, @eventDigest) ON CONFLICT(stream_type, stream_id, branch_id) DO UPDATE SET stream_revision = excluded.stream_revision, event_digest = excluded.event_digest WHERE event_journal_stream_heads.stream_revision = @expectedRevision AND event_journal_stream_heads.event_digest = @expectedDigest`,
      )
      .run({
        streamType: input.streamType,
        streamId: input.streamId,
        branchId: input.expectedBranchId,
        streamRevision: final.streamRevision,
        eventDigest: final.eventDigest,
        expectedRevision: head?.streamRevision ?? 0,
        expectedDigest: head?.eventDigest ?? null,
      });
    if (result.changes !== 1) integrity('Stream head advance failed');
  }
}
