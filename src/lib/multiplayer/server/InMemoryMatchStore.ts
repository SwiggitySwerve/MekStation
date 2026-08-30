/**
 * InMemoryMatchStore — dev-only `IMatchStore` implementation backed by
 * a `Map<matchId, {meta, events}>`. Loud startup warning so nobody
 * mistakes this for a production store.
 *
 * Why a class even though state is just a Map: lets multiple instances
 * coexist in tests (each test makes its own store, so cross-test bleed
 * is structurally impossible).
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { normalizeRoomCode } from '@/lib/p2p/roomCodes';

import type {
  IMatchCommandBatch,
  IMatchCommandReceipt,
  MatchBatchAppendResult,
} from './matchCommandBatch';
import type {
  IMatchJournalAuthorityBaseline,
  IMatchJournalAuthorityStarted,
} from './matchJournalAuthority';

import {
  MatchNotFoundError,
  MatchStoreSequenceCollisionError,
  type IMatchMeta,
  type IMatchMetaPatch,
  type IMatchCombatOutcomeOutbox,
  type IMatchPublication,
  type IMatchStore,
  type IPublicationOutboxStore,
} from './IMatchStore';
import {
  firstNonContiguousSequence,
  matchCommandFingerprint,
  matchesCommandFingerprint,
} from './matchCommandBatch';

// =============================================================================
// Internal record shape
// =============================================================================

interface IMatchRecord {
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

// =============================================================================
// Store
// =============================================================================

export class InMemoryMatchStore
  implements IMatchStore, IPublicationOutboxStore
{
  private readonly records = new Map<string, IMatchRecord>();
  /**
   * Wave 3b: secondary index `normalizedRoomCode -> matchId`. Updated
   * on every meta mutation that touches `roomCode`. Cleared when the
   * match transitions to `active`/`completed` so an invite stops
   * resolving once the match starts.
   */
  private readonly roomCodeIndex = new Map<string, string>();

  /**
   * Create the store. By default, emits the dev-only warning on
   * construction (set `quiet: true` in tests to silence).
   */
  constructor(options: { quiet?: boolean } = {}) {
    if (!options.quiet) {
      // eslint-disable-next-line no-console
      console.warn(
        '[InMemoryMatchStore] dev-only store in use; configure a persistent store for production',
      );
    }
  }

  createMatch = async (meta: IMatchMeta): Promise<string> => {
    if (this.records.has(meta.matchId)) {
      throw new Error(
        `Match already exists in store: ${meta.matchId} (call createMatch with a fresh id)`,
      );
    }
    this.records.set(meta.matchId, {
      meta,
      events: [],
      sequences: new Set(),
      receipts: new Map(),
      publications: new Map(),
      combatOutcome: null,
      started: null,
      baseline: null,
      importedLegacy: false,
      closed: false,
    });
    if (meta.roomCode && meta.status === 'lobby') {
      this.roomCodeIndex.set(normalizeRoomCode(meta.roomCode), meta.matchId);
    }
    return meta.matchId;
  };

  appendEvent = async (matchId: string, event: IGameEvent): Promise<void> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    if (rec.sequences.has(event.sequence)) {
      throw new MatchStoreSequenceCollisionError(matchId, event.sequence);
    }
    // Transactional all-or-nothing semantics: only mutate the record
    // after both checks pass. If we ever made this network-backed we'd
    // wrap append+sequence-mark in a single SQL transaction.
    rec.events.push(event);
    rec.sequences.add(event.sequence);
    rec.meta = { ...rec.meta, updatedAt: new Date().toISOString() };
  };

  /**
   * Append a whole command atomically (umbrella task 2.2 - the in-memory
   * store as a CONTRACT-COMPATIBLE dev/test adapter).
   *
   * Deliberately identical in behaviour to `DurableMatchStore`, and
   * proven so by a shared contract suite rather than by inspection. A
   * dev adapter that answers differently is worse than none: every test
   * written against it would be describing a store that production does
   * not have.
   *
   * Atomicity here is not a transaction but the same guarantee reached
   * differently - every check runs before anything is written, and the
   * writes that follow cannot fail.
   */
  appendCommandBatch = async (
    matchId: string,
    batch: IMatchCommandBatch,
  ): Promise<MatchBatchAppendResult> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    if (batch.events.length === 0) {
      // An empty batch would commit a receipt for a command that did
      // nothing, and a later retry would then "succeed" having still
      // done nothing.
      return { kind: 'empty-batch' };
    }
    const offending = firstNonContiguousSequence(batch);
    if (offending !== null) {
      return {
        kind: 'non-contiguous',
        expectedRevision: batch.expectedRevision,
        offendingSequence: offending,
      };
    }

    const fingerprint = matchCommandFingerprint(batch);
    // Identity FIRST, exactly as the durable store orders it: a retry
    // that arrives after someone else moved the stream is still a
    // retry, and reporting it as a revision conflict would send the
    // caller off to rebuild state it already has.
    const prior = rec.receipts.get(batch.commandId);
    if (prior) {
      return matchesCommandFingerprint(prior.fingerprint, batch)
        ? { kind: 'duplicate-command', receipt: prior }
        : { kind: 'integrity-conflict', commandId: batch.commandId };
    }

    const head =
      rec.events.length === 0
        ? 0
        : rec.events[rec.events.length - 1].sequence + 1;
    if (head !== batch.expectedRevision) {
      return {
        kind: 'revision-conflict',
        expectedRevision: batch.expectedRevision,
        actualRevision: head,
      };
    }
    if (batch.journalAuthorityStarted && rec.started != null) {
      throw new Error('journal-authority-started already exists');
    }
    if (batch.combatOutcome && rec.combatOutcome != null) {
      throw new Error('combat-outcome already exists');
    }

    const committedAt = new Date().toISOString();
    const first = batch.events[0].sequence;
    const last = batch.events[batch.events.length - 1].sequence;
    const receipt: IMatchCommandReceipt = {
      commandId: batch.commandId,
      actorId: batch.actorId,
      matchId,
      firstRevision: first,
      lastRevision: last,
      eventCount: batch.events.length,
      fingerprint,
      expectedPostStateDigest: batch.expectedPostStateDigest ?? null,
      committedAt,
    };
    for (const event of batch.events) {
      rec.events.push(event);
      rec.sequences.add(event.sequence);
      // The publication row lands beside its event, in the same
      // all-or-nothing step the durable store uses. A commit with no
      // publication record is an event nobody is ever told about.
      rec.publications.set(event.sequence, {
        record: {
          matchId,
          sequence: event.sequence,
          commandId: batch.commandId,
          event,
          createdAt: committedAt,
        },
        publishedAt: null,
      });
    }
    rec.receipts.set(batch.commandId, receipt);
    if (batch.journalAuthorityStarted) {
      rec.started = {
        ...batch.journalAuthorityStarted,
        committedAt,
      };
    }
    if (batch.combatOutcome) {
      rec.combatOutcome = {
        matchId,
        outcomeId: batch.combatOutcome.outcomeId,
        outcomeVersion: batch.combatOutcome.outcomeVersion,
        outcome: batch.combatOutcome.outcome,
        createdAt: committedAt,
        publishedAt: null,
      };
    }
    rec.meta = { ...rec.meta, updatedAt: committedAt };
    return { kind: 'committed', receipt };
  };

  getCommandReceipt = async (
    matchId: string,
    commandId: string,
  ): Promise<IMatchCommandReceipt | null> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    return rec.receipts.get(commandId) ?? null;
  };

  getLastCommandReceipt = async (
    matchId: string,
  ): Promise<IMatchCommandReceipt | null> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    let latest: IMatchCommandReceipt | null = null;
    for (const receipt of Array.from(rec.receipts.values())) {
      if (latest == null || receipt.lastRevision > latest.lastRevision) {
        latest = receipt;
      }
    }
    return latest;
  };

  getJournalAuthorityStarted = async (
    matchId: string,
  ): Promise<IMatchJournalAuthorityStarted | null> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    return rec.started;
  };

  getCombatOutcomeOutbox = async (
    matchId: string,
  ): Promise<IMatchCombatOutcomeOutbox | null> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    return rec.combatOutcome;
  };

  markCombatOutcomePublished = async (
    matchId: string,
    outcomeId: string,
  ): Promise<void> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    const current = rec.combatOutcome;
    if (current == null || current.outcomeId !== outcomeId) return;
    if (current.publishedAt != null) return;
    rec.combatOutcome = {
      ...current,
      publishedAt: new Date().toISOString(),
    };
  };

  getJournalAuthorityBaseline = (
    matchId: string,
  ): IMatchJournalAuthorityBaseline | null => {
    const rec = this.records.get(matchId);
    return rec?.baseline ?? null;
  };

  insertJournalAuthorityBaseline = (
    baseline: IMatchJournalAuthorityBaseline,
  ): void => {
    const rec = this.records.get(baseline.streamId);
    if (!rec) throw new MatchNotFoundError(baseline.streamId);
    if (rec.baseline != null) {
      throw new Error('journal-authority-baseline already exists');
    }
    rec.baseline = baseline;
  };

  hasImportedLegacyStream = (matchId: string): boolean => {
    const rec = this.records.get(matchId);
    return rec?.importedLegacy === true;
  };

  /** See `IPublicationOutboxStore.listPendingPublications`. */
  listPendingPublications = async (
    matchId: string,
  ): Promise<readonly IMatchPublication[]> => {
    const rec = this.records.get(matchId);
    if (!rec) return [];
    return Array.from(rec.publications.values())
      .filter((row) => row.publishedAt === null)
      .map((row) => row.record)
      .sort((a, b) => a.sequence - b.sequence);
  };

  /**
   * See `IPublicationOutboxStore.markPublicationsPublished`, and the
   * durable twin for why there is no "first mark wins" guard.
   */
  markPublicationsPublished = async (
    matchId: string,
    sequences: readonly number[],
  ): Promise<void> => {
    const rec = this.records.get(matchId);
    if (!rec) return;
    const publishedAt = new Date().toISOString();
    for (const sequence of sequences) {
      const row = rec.publications.get(sequence);
      if (row) row.publishedAt = publishedAt;
    }
  };

  getEvents = async (
    matchId: string,
    fromSeq = 0,
  ): Promise<readonly IGameEvent[]> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    if (fromSeq <= 0) {
      return rec.events.slice();
    }
    return rec.events.filter((e) => e.sequence >= fromSeq);
  };

  getMatchMeta = async (matchId: string): Promise<IMatchMeta> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    return rec.meta;
  };

  updateMatchMeta = async (
    matchId: string,
    patch: IMatchMetaPatch,
  ): Promise<void> => {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    const before = rec.meta;
    // Build the next meta. The patch shape allows `roomCode: null` to
    // explicitly clear the field (the previous wire was `undefined as
    // unknown as string`, which type-laundered the same intent). When
    // we see an explicit `null` we translate to `undefined` so the
    // stored `IMatchMeta.roomCode` remains `string | undefined` (the
    // optional-property shape the rest of the system expects).
    const { roomCode: patchRoomCode, ...restPatch } = patch;
    const nextRoomCode =
      patchRoomCode === null ? undefined : (patchRoomCode ?? rec.meta.roomCode);
    rec.meta = {
      ...rec.meta,
      ...restPatch,
      roomCode: nextRoomCode,
      updatedAt: new Date().toISOString(),
    };
    // Wave 3b: keep the roomCode index in sync. Invite codes are valid
    // ONLY while the match is in `lobby` status (per spec 4.4).
    if (before.roomCode && before.roomCode !== rec.meta.roomCode) {
      this.roomCodeIndex.delete(normalizeRoomCode(before.roomCode));
    }
    if (rec.meta.roomCode && rec.meta.status === 'lobby') {
      this.roomCodeIndex.set(
        normalizeRoomCode(rec.meta.roomCode),
        rec.meta.matchId,
      );
    } else if (before.roomCode && rec.meta.status !== 'lobby') {
      this.roomCodeIndex.delete(normalizeRoomCode(before.roomCode));
    }
  };

  getMatchByRoomCode = async (roomCode: string): Promise<IMatchMeta | null> => {
    const normalized = normalizeRoomCode(roomCode);
    const matchId = this.roomCodeIndex.get(normalized);
    if (!matchId) return null;
    const rec = this.records.get(matchId);
    if (!rec || rec.closed) return null;
    if (rec.meta.status !== 'lobby') return null;
    return rec.meta;
  };

  closeMatch = async (matchId: string): Promise<void> => {
    const rec = this.records.get(matchId);
    if (!rec) return; // idempotent — closing missing/closed match is a no-op
    if (rec.closed) return;
    rec.closed = true;
    if (rec.meta.roomCode) {
      this.roomCodeIndex.delete(normalizeRoomCode(rec.meta.roomCode));
    }
    rec.meta = {
      ...rec.meta,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
  };

  /**
   * Enumerate every tracked match, optionally filtered by `status`.
   * `add-matchmaking-and-spectator` (M3, design D2): the joinable-lobby
   * and spectatable-match queries read through this method. A `closed`
   * record reports its `completed` meta — consistent with `getMatchMeta`.
   */
  listMatches = async (
    filter: { readonly status?: IMatchMeta['status'] } = {},
  ): Promise<readonly IMatchMeta[]> => {
    const all = Array.from(this.records.values()).map((rec) => rec.meta);
    return filter.status
      ? all.filter((meta) => meta.status === filter.status)
      : all;
  };

  /**
   * `add-matchmaking-and-spectator` (M3): expose the same recovery hook
   * `DurableMatchStore` has so `isRecoverableMatchStore` is consistent
   * across stores. The in-memory store has nothing to recover after a
   * process restart, but a test-time store CAN hold `active` matches.
   */
  listActiveMatches = async (): Promise<readonly IMatchMeta[]> => {
    return this.listMatches({ status: 'active' });
  };

  // Test/observability helpers — not part of the IMatchStore contract.

  /** Number of matches currently tracked. */
  size = (): number => {
    return this.records.size;
  };

  /** Drop everything. Used by tests for isolation. */
  _reset = (): void => {
    this.records.clear();
    this.roomCodeIndex.clear();
  };
}
