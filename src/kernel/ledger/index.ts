/**
 * `@/kernel/ledger` — the append-only-history half of the kernel.
 *
 * This module owns save envelopes, instance provenance, the snapshot port,
 * and re-exports the event-journal contract from `../journal`. It must not
 * reach into the library (replica, `ILibraryRepository`); the join between
 * the two halves lives on the `@/kernel` compose facade.
 */

export type { IInstanceProvenance } from './InstanceProvenance';
export type { ISaveEnvelope, SaveEnvelopeWriteResult } from './SaveEnvelope';
export type { ISaveEnvelopeRepository } from './ISaveEnvelopeRepository';
export { InMemorySaveEnvelopeRepository } from './InMemorySaveEnvelopeRepository';
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
} from '../journal';
export {
  CURRENT_EVENT_CANONICALIZER_VERSION,
  EVENT_ACTOR_KINDS,
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  InMemoryEventJournal,
  ROOT_EVENT_BRANCH_ID,
} from '../journal';
