/**
 * `@/kernel` — the composition facade.
 *
 * The kernel is two modules plus a join. Prefer the named barrels
 * `@/kernel/library` and `@/kernel/ledger` when a consumer only needs one
 * half. This facade re-exports both and additionally owns the join itself:
 * `createRepositories`, enroll/mutate inputs, `IGamePlugin`, and
 * `assertKernelChannel`.
 */

export type { KernelChannel, KernelMutationKind } from './types/Consistency';
export {
  assertKernelChannel,
  KERNEL_CHANNELS,
  KERNEL_MUTATION_KINDS,
  KernelConsistencyError,
} from './types/Consistency';
export type { IGamePlugin } from './types/GamePlugin';
export { pluginAllowsContentType } from './types/GamePlugin';
export type {
  KernelPackagingRung,
  KernelScorecardScores,
} from './extractionLadder';
export {
  KERNEL_PACKAGING_RUNG,
  KERNEL_PACKAGING_RUNGS,
  KERNEL_SCORECARD_AT_INTRODUCTION,
  KERNEL_SCORECARD_DIMENSIONS,
  recommendedKernelPackagingRung,
  sumKernelScorecard,
} from './extractionLadder';
export type {
  ILibraryItem,
  ILibraryRepository,
  ILibrarySyncConflict,
  IPublishLibraryItemInput,
  LibraryPublishResult,
  LibrarySyncExchange,
  LibrarySyncResolution,
} from './library';
export {
  hashLibraryContent,
  InMemoryLibraryReplica,
  InMemoryLibraryRepository,
} from './library';
export type {
  EventJournalAppendResult,
  IEntityEventRef,
  IEventJournal,
  IInstanceProvenance,
  ISaveEnvelope,
  ISaveEnvelopeRepository,
  IStoredEvent,
  SaveEnvelopeWriteResult,
} from './ledger';
export {
  InMemoryEventJournal,
  InMemorySaveEnvelopeRepository,
  ROOT_EVENT_BRANCH_ID,
} from './ledger';
export type {
  IKernelAdapters,
  IKernelRepositories,
  IPublishLibraryCommand,
} from './repositories/createRepositories';
export { createRepositories } from './repositories/createRepositories';
export type {
  IEnrollInstanceInput,
  IMutateInstanceInput,
} from './repositories/enrollInstance';
export { TOY_CARD_PLUGIN } from './plugins/toyCardPlugin';
