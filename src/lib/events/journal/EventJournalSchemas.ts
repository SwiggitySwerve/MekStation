import { z } from 'zod';

import type * as JournalContract from './EventJournalContract';

import {
  EVENT_ACTOR_KINDS,
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
} from './EventJournalContract';

const DurableIdSchema = z.string().trim().min(1);
const SafeNonnegativeIntegerSchema = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);
const PositiveSafeIntegerSchema = SafeNonnegativeIntegerSchema.min(1);
const PageSizeSchema = PositiveSafeIntegerSchema.max(
  EVENT_JOURNAL_MAX_PAGE_SIZE,
);
const TimestampSchema = z.string().datetime({ offset: true });
const DigestSchema = z.string().regex(/^[0-9a-f]{64}$/);
export const EntityEventRefSchema = z
  .object({
    entityType: DurableIdSchema,
    entityId: DurableIdSchema,
    role: DurableIdSchema,
  })
  .strict() satisfies z.ZodType<JournalContract.IEntityEventRef>;
export const ResolvedJournalPrincipalSchema = z
  .object({
    actorKind: z.enum(EVENT_ACTOR_KINDS),
    actorId: DurableIdSchema,
    authorityType: DurableIdSchema,
    authorityId: DurableIdSchema,
  })
  .strict() satisfies z.ZodType<JournalContract.IResolvedJournalPrincipal>;
export const EventToAppendSchema = z
  .object({
    eventId: DurableIdSchema,
    eventType: DurableIdSchema,
    eventVersion: PositiveSafeIntegerSchema,
    correlationId: DurableIdSchema,
    causationEventIds: z.array(DurableIdSchema),
    occurredAt: TimestampSchema,
    payload: z.unknown(),
    entityRefs: z.array(EntityEventRefSchema),
  })
  .strict() satisfies z.ZodType<JournalContract.IEventToAppend>;
const AppendCommandShape = {
  streamType: DurableIdSchema,
  streamId: DurableIdSchema,
  // Widened from `z.literal(ROOT_EVENT_BRANCH_ID)` with task 16.2: the
  // same non-empty-id rule every other durable id carries. The pin
  // narrowed to a shape check; the branch RULE above the journal is
  // what refuses an id that is not the stream's effective branch.
  expectedBranchId: DurableIdSchema,
  expectedRevision: SafeNonnegativeIntegerSchema,
  commandId: DurableIdSchema,
  events: z.array(EventToAppendSchema).min(1),
};
export const AppendEventCommandSchema = z
  .object(AppendCommandShape)
  .strict() satisfies z.ZodType<JournalContract.IAppendEventCommand>;
export const AppendEventBatchSchema = z
  .object({
    ...AppendCommandShape,
    principal: ResolvedJournalPrincipalSchema,
  })
  .strict() satisfies z.ZodType<JournalContract.IAppendEventBatch>;
export const StoredEventSchema = z
  .object({
    ...EventToAppendSchema.shape,
    ...ResolvedJournalPrincipalSchema.shape,
    streamType: DurableIdSchema,
    streamId: DurableIdSchema,
    // Same widening as expectedBranchId: a stored row may name a
    // correction candidate. The root literal was the old pin; the
    // branch rule, not this schema, decides which id is effective.
    branchId: DurableIdSchema,
    streamRevision: PositiveSafeIntegerSchema,
    commitPosition: PositiveSafeIntegerSchema,
    commandId: DurableIdSchema,
    commandIndex: SafeNonnegativeIntegerSchema,
    recordedAt: TimestampSchema,
    canonicalizerVersion: PositiveSafeIntegerSchema,
    previousStreamEventDigest: DigestSchema.nullable(),
    eventDigest: DigestSchema,
  })
  .strict() satisfies z.ZodType<JournalContract.IStoredEvent>;
export const CommandReceiptSchema = z
  .object({
    commandId: DurableIdSchema,
    commandDigest: DigestSchema,
    canonicalizerVersion: PositiveSafeIntegerSchema,
    streamType: DurableIdSchema,
    streamId: DurableIdSchema,
    branchId: DurableIdSchema,
    eventCount: PositiveSafeIntegerSchema,
    firstStreamRevision: PositiveSafeIntegerSchema,
    lastStreamRevision: PositiveSafeIntegerSchema,
    firstCommitPosition: PositiveSafeIntegerSchema,
    lastCommitPosition: PositiveSafeIntegerSchema,
    recordedAt: TimestampSchema,
  })
  .strict() satisfies z.ZodType<JournalContract.ICommandReceipt>;
export const ReadStreamQuerySchema = z
  .object({
    streamType: DurableIdSchema,
    streamId: DurableIdSchema,
    branchId: z.literal(ROOT_EVENT_BRANCH_ID),
    afterRevision: SafeNonnegativeIntegerSchema,
    limit: PageSizeSchema,
  })
  .strict() satisfies z.ZodType<JournalContract.IReadStreamQuery>;
const CommittedReadShape = {
  afterCommitPosition: SafeNonnegativeIntegerSchema,
  throughCommitPosition: SafeNonnegativeIntegerSchema,
  limit: PageSizeSchema,
};
const EventHistorySelectorSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('authority'),
      authorityType: DurableIdSchema,
      authorityId: DurableIdSchema,
    })
    .strict(),
  z.object({ kind: z.literal('correlation'), id: DurableIdSchema }).strict(),
  z.object({ kind: z.literal('causation'), id: DurableIdSchema }).strict(),
]) satisfies z.ZodType<JournalContract.EventHistorySelector>;
function requireOrderedCommitBounds(
  value: {
    readonly afterCommitPosition: number;
    readonly throughCommitPosition: number;
  },
  context: z.core.$RefinementCtx,
): void {
  if (value.afterCommitPosition > value.throughCommitPosition) {
    context.addIssue({
      code: 'custom',
      path: ['throughCommitPosition'],
      message: 'throughCommitPosition must not precede afterCommitPosition',
    });
  }
}
export const ReadCommittedQuerySchema = z
  .object(CommittedReadShape)
  .strict()
  .superRefine(
    requireOrderedCommitBounds,
  ) satisfies z.ZodType<JournalContract.IReadCommittedQuery>;
export const ReadEntityHistoryQuerySchema = z
  .object({
    entityType: DurableIdSchema,
    entityId: DurableIdSchema,
    role: DurableIdSchema.optional(),
    ...CommittedReadShape,
  })
  .strict()
  .superRefine(
    requireOrderedCommitBounds,
  ) satisfies z.ZodType<JournalContract.IReadEntityHistoryQuery>;
export const ReadEventHistoryQuerySchema = z
  .object({ selector: EventHistorySelectorSchema, ...CommittedReadShape })
  .strict()
  .superRefine(
    requireOrderedCommitBounds,
  ) satisfies z.ZodType<JournalContract.IReadEventHistoryQuery>;
