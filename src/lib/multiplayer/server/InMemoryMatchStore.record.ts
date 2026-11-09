/**
 * The in-memory match store's per-match record. Types only, split out of
 * `InMemoryMatchStore.ts` to keep that file under the repo's max-lines limit.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import type {
  IMatchCombatOutcomeOutbox,
  IMatchMeta,
  IMatchPublication,
} from './IMatchStore';
import type { IMatchCommandReceipt } from './matchCommandBatch';
import type {
  IMatchJournalAuthorityBaseline,
  IMatchJournalAuthorityStarted,
} from './matchJournalAuthority';

export interface IMatchRecord {
  meta: IMatchMeta;
  events: IGameEvent[];
  /**
   * Command receipts by `commandId`. The batch contract's identity half
   * lives here: a retry is only recognisable as one if the store
   * remembers what the first attempt committed.
   */
  receipts: Map<string, IMatchCommandReceipt>;
  /**
   * Publication outbox rows by authority sequence (umbrella task 7.1);
   * `publishedAt` null means "still owed to recipients". Written inside
   * `appendCommandBatch` beside the events, so a refused batch leaves
   * nothing here.
   */
  publications: Map<
    number,
    { readonly record: IMatchPublication; publishedAt: string | null }
  >;
  combatOutcome: IMatchCombatOutcomeOutbox | null;
  started: IMatchJournalAuthorityStarted | null;
  baseline: IMatchJournalAuthorityBaseline | null;
  importedLegacy: boolean;
  // Set of sequences we've already stored — avoids O(n) scan on every
  // append for a duplicate-sequence check (matches can run hundreds of
  // events in a long fight).
  sequences: Set<number>;
  closed: boolean;
}
