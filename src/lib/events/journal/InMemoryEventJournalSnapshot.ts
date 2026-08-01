import { z } from 'zod';

import type * as Journal from './EventJournalContract';

import {
  canonicalizeEventDigestV1,
  canonicalizeJsonV1,
} from './EventJournalCanonicalizer';
import { canonicalizeCommandIdentityV1 } from './EventJournalCommandIdentity';
import { CURRENT_EVENT_CANONICALIZER_VERSION } from './EventJournalContract';
import * as Schemas from './EventJournalSchemas';

export type InMemorySnapshotHead = Readonly<{
  streamType: string;
  streamId: string;
  revision: number;
  digest: string;
}>;
export type InMemorySnapshotState<TPayload> = Readonly<{
  highWaterCommitPosition: number;
  events: readonly Journal.IStoredEvent<TPayload>[];
  receipts: readonly Journal.ICommandReceipt[];
  heads: readonly InMemorySnapshotHead[];
}>;
type JournalSnapshot<TPayload> = InMemorySnapshotState<TPayload> &
  Readonly<{ version: 2 }>;

const SnapshotHeadSchema = z
  .object({
    streamType: z.string().trim().min(1),
    streamId: z.string().trim().min(1),
    revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    digest: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
const EventStreamIdentitySchema = z.tuple([z.string(), z.string()]);
const JournalSnapshotSchema = z
  .object({
    version: z.literal(2),
    highWaterCommitPosition: z
      .number()
      .int()
      .min(0)
      .max(Number.MAX_SAFE_INTEGER),
    events: Schemas.StoredEventSchema.array(),
    receipts: Schemas.CommandReceiptSchema.array(),
    heads: SnapshotHeadSchema.array(),
  })
  .strict();

export function eventStreamKey(streamType: string, streamId: string): string {
  return canonicalizeJsonV1([streamType, streamId]);
}

export function parseEventStreamKey(key: string): readonly [string, string] {
  return EventStreamIdentitySchema.parse(JSON.parse(key));
}

function failSnapshot(message: string): never {
  throw new Error(`Invalid in-memory journal snapshot: ${message}`);
}

function parseSnapshot<TPayload>(
  serialized: string,
): JournalSnapshot<TPayload> {
  try {
    return JournalSnapshotSchema.parse(
      JSON.parse(serialized),
    ) as JournalSnapshot<TPayload>;
  } catch (error) {
    return failSnapshot(
      error instanceof Error ? error.message : 'snapshot parse failed',
    );
  }
}

function commandFromBatch<TPayload>(
  batch: Journal.ICommittedEventBatch<TPayload>,
): Journal.IAppendEventBatch<TPayload> {
  const first = batch.events[0];
  return {
    streamType: first.streamType,
    streamId: first.streamId,
    expectedBranchId: first.branchId,
    expectedRevision: first.streamRevision - 1,
    commandId: first.commandId,
    principal: {
      actorKind: first.actorKind,
      actorId: first.actorId,
      authorityType: first.authorityType,
      authorityId: first.authorityId,
    },
    events: batch.events.map((event) => ({
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
}

function validateSnapshot<TPayload>(snapshot: JournalSnapshot<TPayload>): void {
  const eventIds = new Set<string>();
  const positions = new Set<number>();
  const eventsByCommand = new Map<string, Journal.IStoredEvent<TPayload>[]>();
  const computedHeads = new Map<string, readonly [number, string | null]>();
  let lastPosition = 0;
  for (const event of snapshot.events) {
    if (eventIds.has(event.eventId)) failSnapshot('duplicate event ID');
    if (positions.has(event.commitPosition))
      failSnapshot('duplicate commit position');
    if (event.commitPosition <= lastPosition)
      failSnapshot('events are not commit ordered');
    const key = eventStreamKey(event.streamType, event.streamId);
    const [revision, digest] = computedHeads.get(key) ?? [0, null];
    if (event.streamRevision !== revision + 1)
      failSnapshot('stream revision gap');
    if (event.previousStreamEventDigest !== digest)
      failSnapshot('predecessor mismatch');
    if (canonicalizeEventDigestV1(event).digest !== event.eventDigest) {
      failSnapshot('event digest mismatch');
    }
    eventIds.add(event.eventId);
    positions.add(event.commitPosition);
    const commandEvents = eventsByCommand.get(event.commandId) ?? [];
    commandEvents.push(event);
    eventsByCommand.set(event.commandId, commandEvents);
    computedHeads.set(key, [event.streamRevision, event.eventDigest]);
    lastPosition = event.commitPosition;
  }
  if (snapshot.highWaterCommitPosition < lastPosition)
    failSnapshot('unsafe high-water position');

  const commandIds = new Set<string>();
  for (const receipt of snapshot.receipts) {
    const events = eventsByCommand.get(receipt.commandId);
    if (!events || events.length === 0) failSnapshot('receipt lacks events');
    const batch = { kind: 'committed' as const, receipt, events };
    const first = batch.events[0];
    const final = batch.events[batch.events.length - 1];
    if (commandIds.has(first.commandId))
      failSnapshot('duplicate command receipt');
    commandIds.add(first.commandId);
    batch.events.forEach((event, index) => {
      if (
        event.commandId !== first.commandId ||
        event.commandIndex !== index ||
        event.streamType !== first.streamType ||
        event.streamId !== first.streamId ||
        event.branchId !== first.branchId ||
        event.streamRevision !== first.streamRevision + index ||
        event.commitPosition !== first.commitPosition + index ||
        event.recordedAt !== first.recordedAt ||
        event.actorKind !== first.actorKind ||
        event.actorId !== first.actorId ||
        event.authorityType !== first.authorityType ||
        event.authorityId !== first.authorityId
      ) {
        failSnapshot('invalid batch membership');
      }
    });
    const reconstructed = commandFromBatch(batch);
    const identity = canonicalizeCommandIdentityV1(reconstructed);
    if (
      canonicalizeJsonV1(reconstructed) !== canonicalizeJsonV1(identity.command)
    ) {
      failSnapshot('stored set order is not normalized');
    }
    const expectedReceipt: Journal.ICommandReceipt = {
      commandId: first.commandId,
      commandDigest: identity.digest,
      canonicalizerVersion: CURRENT_EVENT_CANONICALIZER_VERSION,
      streamType: first.streamType,
      streamId: first.streamId,
      branchId: first.branchId,
      eventCount: batch.events.length,
      firstStreamRevision: first.streamRevision,
      lastStreamRevision: final.streamRevision,
      firstCommitPosition: first.commitPosition,
      lastCommitPosition: final.commitPosition,
      recordedAt: first.recordedAt,
    };
    if (canonicalizeJsonV1(receipt) !== canonicalizeJsonV1(expectedReceipt)) {
      failSnapshot('receipt mismatch');
    }
  }
  if (commandIds.size !== eventsByCommand.size)
    failSnapshot('event lacks a receipt');

  const suppliedHeads = new Map<string, readonly [number, string | null]>();
  for (const head of snapshot.heads) {
    const key = eventStreamKey(head.streamType, head.streamId);
    if (suppliedHeads.has(key)) failSnapshot('duplicate stream head');
    suppliedHeads.set(key, [head.revision, head.digest]);
  }
  if (
    canonicalizeJsonV1(Array.from(suppliedHeads).sort()) !==
    canonicalizeJsonV1(Array.from(computedHeads).sort())
  ) {
    failSnapshot('stream head mismatch');
  }
}

export function restoreInMemorySnapshot<TPayload>(
  serialized: string,
): InMemorySnapshotState<TPayload> {
  const snapshot = parseSnapshot<TPayload>(serialized);
  validateSnapshot(snapshot);
  return snapshot;
}

export function serializeInMemorySnapshot<TPayload>(
  snapshot: InMemorySnapshotState<TPayload>,
): string {
  return canonicalizeJsonV1({ version: 2, ...snapshot });
}
