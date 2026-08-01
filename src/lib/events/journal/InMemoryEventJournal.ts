import { sha256 } from 'js-sha256';

import type * as Journal from './EventJournalContract';

import {
  canonicalizeEventDigestV1,
  canonicalizeJsonV1,
} from './EventJournalCanonicalizer';
import { CURRENT_EVENT_CANONICALIZER_VERSION } from './EventJournalContract';
import * as Schemas from './EventJournalSchemas';

type StreamHead = readonly [revision: number, digest: string | null];
type CommitGate = Readonly<{ enter(): void; wait: Promise<void> }>;
type ReceiptEntry<TPayload> = Readonly<{
  batch: Journal.ICommittedEventBatch<TPayload>;
  digest: string;
}>;
const ignore = (): undefined => undefined;

function clone<T>(value: T): T {
  return JSON.parse(canonicalizeJsonV1(value)) as T;
}

function canonicalizeCommand<TPayload>(
  input: Journal.IAppendEventBatch<TPayload>,
): string {
  const events = input.events.map((event) => ({
    ...event,
    causationEventIds: [...event.causationEventIds].sort(),
    entityRefs: [...event.entityRefs].sort((left, right) => {
      const leftKey = canonicalizeJsonV1(left);
      const rightKey = canonicalizeJsonV1(right);
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    }),
  }));
  return canonicalizeJsonV1({ ...input, events });
}

export class InMemoryEventJournal<
  TPayload = unknown,
> implements Journal.IEventJournal<TPayload> {
  private readonly eventIds = new Set<string>();
  private readonly events: Journal.IStoredEvent<TPayload>[] = [];
  private readonly heads = new Map<string, StreamHead>();
  private readonly receipts = new Map<string, ReceiptEntry<TPayload>>();
  private failCommit = false;
  private gate: CommitGate | null = null;
  private nextCommitPosition = 1;
  private writeTail: Promise<void> = Promise.resolve();

  public constructor(
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  public append(
    input: Journal.IAppendEventBatch<TPayload>,
  ): Promise<Journal.EventJournalAppendResult<TPayload>> {
    const result = this.writeTail.then(() => this.appendNow(input));
    this.writeTail = result.then(ignore, ignore);
    return result;
  }

  public async readStream(
    input: Journal.IReadStreamQuery,
  ): Promise<readonly Journal.IStoredEvent<TPayload>[]> {
    const query = Schemas.ReadStreamQuerySchema.parse(input);
    return clone(
      this.events
        .filter(
          (event) =>
            event.streamType === query.streamType &&
            event.streamId === query.streamId &&
            event.branchId === query.branchId &&
            event.streamRevision > query.afterRevision,
        )
        .slice(0, query.limit),
    );
  }

  public async readEntityHistory(
    input: Journal.IReadEntityHistoryQuery,
  ): Promise<readonly Journal.IStoredEvent<TPayload>[]> {
    const query = Schemas.ReadEntityHistoryQuerySchema.parse(input);
    return clone(
      this.inCommitRange(query)
        .filter((event) =>
          event.entityRefs.some(
            (ref) =>
              ref.entityType === query.entityType &&
              ref.entityId === query.entityId &&
              (query.role === undefined || ref.role === query.role),
          ),
        )
        .slice(0, query.limit),
    );
  }

  public async readEventHistory(
    input: Journal.IReadEventHistoryQuery,
  ): Promise<readonly Journal.IStoredEvent<TPayload>[]> {
    const query = Schemas.ReadEventHistoryQuerySchema.parse(input);
    return clone(
      this.inCommitRange(query)
        .filter((event) => {
          const selector = query.selector;
          if (selector.kind === 'authority') {
            return (
              event.authorityType === selector.authorityType &&
              event.authorityId === selector.authorityId
            );
          }
          return selector.kind === 'correlation'
            ? event.correlationId === selector.id
            : event.causationEventIds.includes(selector.id);
        })
        .slice(0, query.limit),
    );
  }

  public captureHighWater(): Promise<Journal.IJournalHighWater> {
    const capture = this.writeTail.then(() => ({
      commitPosition: this.nextCommitPosition - 1,
    }));
    this.writeTail = capture.then(ignore, ignore);
    return capture;
  }

  public async readCommitted(
    input: Journal.IReadCommittedQuery,
  ): Promise<Journal.ICommittedReadPage<TPayload>> {
    const query = Schemas.ReadCommittedQuerySchema.parse(input);
    const matches = this.inCommitRange(query);
    const events = matches.slice(0, query.limit);
    const exhausted = matches.length <= query.limit;
    return clone({
      events,
      exhausted,
      nextAfterCommitPosition: exhausted
        ? query.throughCommitPosition
        : events[events.length - 1].commitPosition,
    });
  }

  public async getCommandReceipt(
    commandId: string,
  ): Promise<Journal.ICommandReceipt | null> {
    const receipt = this.receipts.get(commandId)?.batch.receipt;
    return receipt ? clone(receipt) : null;
  }

  public failNextCommit(): void {
    this.failCommit = true;
  }

  public holdNextCommit(): {
    readonly entered: Promise<void>;
    release(): void;
  } {
    if (this.gate) throw new Error('A commit gate is already pending');
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.gate = { enter, wait };
    return { entered, release };
  }

  private async appendNow(
    raw: Journal.IAppendEventBatch<TPayload>,
  ): Promise<Journal.EventJournalAppendResult<TPayload>> {
    const parsed = Schemas.AppendEventBatchSchema.parse(raw) as typeof raw;
    const input = clone(parsed);
    const digest = sha256(new TextEncoder().encode(canonicalizeCommand(input)));
    const existing = this.receipts.get(input.commandId);
    if (existing) {
      return existing.digest === digest
        ? clone(existing.batch)
        : { kind: 'command-identity-conflict', commandId: input.commandId };
    }

    const newEventIds = new Set(input.events.map((event) => event.eventId));
    if (
      newEventIds.size !== input.events.length ||
      Array.from(newEventIds).some((eventId) => this.eventIds.has(eventId))
    ) {
      throw new Error('Duplicate eventId');
    }
    const key = `${input.streamType}\u0000${input.streamId}`;
    const [revision, headDigest] = this.heads.get(key) ?? [0, null];
    if (revision !== input.expectedRevision) {
      return {
        kind: 'revision-conflict',
        expectedRevision: input.expectedRevision,
        actualRevision: revision,
      };
    }

    const firstPosition = this.nextCommitPosition;
    this.nextCommitPosition += input.events.length;
    const recordedAt = new Date(this.now()).toISOString();
    let previousDigest = headDigest;
    const events = input.events.map((event, commandIndex) => {
      const envelope = {
        ...event,
        ...input.principal,
        streamType: input.streamType,
        streamId: input.streamId,
        branchId: input.expectedBranchId,
        streamRevision: revision + commandIndex + 1,
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

    const gate = this.gate;
    this.gate = null;
    if (gate) {
      gate.enter();
      await gate.wait;
    }
    if (this.failCommit) {
      this.failCommit = false;
      throw new Error('Injected commit failure');
    }

    const final = events[events.length - 1];
    const receipt: Journal.ICommandReceipt = {
      commandId: input.commandId,
      commandDigest: digest,
      canonicalizerVersion: CURRENT_EVENT_CANONICALIZER_VERSION,
      streamType: input.streamType,
      streamId: input.streamId,
      branchId: input.expectedBranchId,
      eventCount: events.length,
      firstStreamRevision: events[0].streamRevision,
      lastStreamRevision: final.streamRevision,
      firstCommitPosition: firstPosition,
      lastCommitPosition: final.commitPosition,
      recordedAt,
    };
    const batch = { kind: 'committed' as const, receipt, events };
    this.events.push(...events);
    newEventIds.forEach((eventId) => this.eventIds.add(eventId));
    this.receipts.set(input.commandId, { batch, digest });
    this.heads.set(key, [final.streamRevision, final.eventDigest]);
    return clone(batch);
  }

  private inCommitRange(
    query: Journal.IReadCommittedQuery,
  ): Journal.IStoredEvent<TPayload>[] {
    return this.events.filter(
      (event) =>
        event.commitPosition > query.afterCommitPosition &&
        event.commitPosition <= query.throughCommitPosition,
    );
  }
}
