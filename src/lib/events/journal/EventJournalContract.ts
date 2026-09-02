export const ROOT_EVENT_BRANCH_ID = 'root' as const;
export const EVENT_JOURNAL_MAX_PAGE_SIZE = 500 as const;
export const CURRENT_EVENT_CANONICALIZER_VERSION = 1 as const;
export const EVENT_ACTOR_KINDS = ['human', 'system', 'migration'] as const;
/**
 * A branch id. Was the literal type `'root'` until umbrella task 16.2:
 * the journal held exactly one branch, pinned in three places - this
 * type, `z.literal(ROOT_EVENT_BRANCH_ID)` in `EventJournalSchemas`,
 * and a storage CHECK on three tables (lifted by migration 26).
 *
 * All three are gone. What refuses an ARBITRARY id now is a RULE
 * rather than a wall: an append naming a branch that is not the
 * stream's current effective branch is refused typed, so only the
 * branches-leaf activation path can move which id a stream accepts.
 * `ROOT_EVENT_BRANCH_ID` remains the genesis branch every stream
 * starts on.
 */
export type EventBranchId = string;
export type EventActorKind = (typeof EVENT_ACTOR_KINDS)[number];
export interface IEntityEventRef {
  readonly entityType: string;
  readonly entityId: string;
  readonly role: string;
}
export interface IResolvedJournalPrincipal {
  readonly actorKind: EventActorKind;
  readonly actorId: string;
  readonly authorityType: string;
  readonly authorityId: string;
}
export interface IEventToAppend<TPayload = unknown> {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly correlationId: string;
  readonly causationEventIds: readonly string[];
  readonly occurredAt: string;
  readonly payload: TPayload;
  readonly entityRefs: readonly IEntityEventRef[];
}
export interface IAppendEventCommand<TPayload = unknown> {
  readonly streamType: string;
  readonly streamId: string;
  readonly expectedBranchId: EventBranchId;
  readonly expectedRevision: number;
  readonly commandId: string;
  readonly events: readonly IEventToAppend<TPayload>[];
}
export interface IAppendEventBatch<
  TPayload = unknown,
> extends IAppendEventCommand<TPayload> {
  readonly principal: IResolvedJournalPrincipal;
}
export interface IStoredEvent<TPayload = unknown>
  extends IEventToAppend<TPayload>, IResolvedJournalPrincipal {
  readonly streamType: string;
  readonly streamId: string;
  readonly branchId: EventBranchId;
  readonly streamRevision: number;
  readonly commitPosition: number;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly recordedAt: string;
  readonly canonicalizerVersion: number;
  readonly previousStreamEventDigest: string | null;
  readonly eventDigest: string;
}
export interface ICommandReceipt {
  readonly commandId: string;
  readonly commandDigest: string;
  readonly canonicalizerVersion: number;
  readonly streamType: string;
  readonly streamId: string;
  readonly branchId: EventBranchId;
  readonly eventCount: number;
  readonly firstStreamRevision: number;
  readonly lastStreamRevision: number;
  readonly firstCommitPosition: number;
  readonly lastCommitPosition: number;
  readonly recordedAt: string;
}
export interface ICommittedEventBatch<TPayload = unknown> {
  readonly kind: 'committed';
  readonly receipt: ICommandReceipt;
  readonly events: readonly IStoredEvent<TPayload>[];
}
export type EventJournalAppendConflict =
  | {
      readonly kind: 'revision-conflict';
      readonly expectedRevision: number;
      readonly actualRevision: number;
    }
  | {
      readonly kind: 'command-identity-conflict';
      readonly commandId: string;
    }
  | {
      readonly kind: 'integrity-conflict';
      readonly expectedPreviousDigest: string | null;
      readonly actualHeadDigest: string | null;
    };
export type EventJournalAppendResult<TPayload = unknown> =
  | ICommittedEventBatch<TPayload>
  | EventJournalAppendConflict;
export interface IReadStreamQuery {
  readonly streamType: string;
  readonly streamId: string;
  readonly branchId: EventBranchId;
  readonly afterRevision: number;
  readonly limit: number;
}
export interface IReadCommittedQuery {
  readonly afterCommitPosition: number;
  readonly throughCommitPosition: number;
  readonly limit: number;
}
export interface IReadEntityHistoryQuery extends IReadCommittedQuery {
  readonly entityType: string;
  readonly entityId: string;
  readonly role?: string;
}
export type EventHistorySelector =
  | Readonly<{
      kind: 'authority';
      authorityType: string;
      authorityId: string;
    }>
  | Readonly<{ kind: 'correlation' | 'causation'; id: string }>;
export interface IReadEventHistoryQuery extends IReadCommittedQuery {
  readonly selector: EventHistorySelector;
}
export interface IJournalHighWater {
  readonly commitPosition: number;
}
export interface ICommittedReadPage<TPayload = unknown> {
  readonly events: readonly IStoredEvent<TPayload>[];
  readonly nextAfterCommitPosition: number;
  readonly exhausted: boolean;
}
export interface IEventJournal<TPayload = unknown> {
  append(
    input: IAppendEventBatch<TPayload>,
  ): Promise<EventJournalAppendResult<TPayload>>;
  readStream(
    query: IReadStreamQuery,
  ): Promise<readonly IStoredEvent<TPayload>[]>;
  readEntityHistory(
    query: IReadEntityHistoryQuery,
  ): Promise<readonly IStoredEvent<TPayload>[]>;
  readEventHistory(
    query: IReadEventHistoryQuery,
  ): Promise<readonly IStoredEvent<TPayload>[]>;
  captureHighWater(): Promise<IJournalHighWater>;
  readCommitted(
    query: IReadCommittedQuery,
  ): Promise<ICommittedReadPage<TPayload>>;
  getCommandReceipt(commandId: string): Promise<ICommandReceipt | null>;
}
