/**
 * `@/kernel/library` — the versioned-catalog half of the kernel.
 *
 * This module owns library items, the library port, its in-memory
 * implementation, and replica sync. It must not reach into the ledger
 * (journal, save envelopes) or into compose (`enrollInstance`); the join
 * between the two halves lives on the `@/kernel` compose facade.
 */

export type {
  ILibraryItem,
  IPublishLibraryItemInput,
  LibraryPublishResult,
} from './LibraryItem';
export type { ILibraryRepository } from './ILibraryRepository';
export {
  hashLibraryContent,
  InMemoryLibraryRepository,
} from './InMemoryLibraryRepository';
export type {
  ILibrarySyncConflict,
  LibrarySyncExchange,
  LibrarySyncResolution,
} from './InMemoryLibraryReplica';
export {
  InMemoryLibraryReplica,
  LIBRARY_SYNC_RESOLUTIONS,
} from './InMemoryLibraryReplica';
