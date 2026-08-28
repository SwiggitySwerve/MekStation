export type {
  EventActorKind,
  EventBranchId,
  EventJournalAppendConflict,
  EventJournalAppendResult,
  IAppendEventBatch,
  ICommandReceipt,
  ICommittedEventBatch,
  IEntityEventRef,
  IEventJournal,
  IEventToAppend,
  IJournalHighWater,
  IReadEntityHistoryQuery,
  IResolvedJournalPrincipal,
  IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';

export {
  CURRENT_EVENT_CANONICALIZER_VERSION,
  EVENT_ACTOR_KINDS,
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
} from '@/lib/events/journal/EventJournalContract';

export { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
