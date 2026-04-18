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

import {
  MatchNotFoundError,
  MatchStoreSequenceCollisionError,
  type IMatchMeta,
  type IMatchMetaPatch,
  type IMatchStore,
} from './IMatchStore';

// =============================================================================
// Internal record shape
// =============================================================================

interface IMatchRecord {
  meta: IMatchMeta;
  events: IGameEvent[];
  // Set of sequences we've already stored — avoids O(n) scan on every
  // append for a duplicate-sequence check (matches can run hundreds of
  // events in a long fight).
  sequences: Set<number>;
  closed: boolean;
}

// =============================================================================
// Store
// =============================================================================

export class InMemoryMatchStore implements IMatchStore {
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

  async createMatch(meta: IMatchMeta): Promise<string> {
    if (this.records.has(meta.matchId)) {
      throw new Error(
        `Match already exists in store: ${meta.matchId} (call createMatch with a fresh id)`,
      );
    }
    this.records.set(meta.matchId, {
      meta,
      events: [],
      sequences: new Set(),
      closed: false,
    });
    if (meta.roomCode && meta.status === 'lobby') {
      this.roomCodeIndex.set(normalizeRoomCode(meta.roomCode), meta.matchId);
    }
    return meta.matchId;
  }

  async appendEvent(matchId: string, event: IGameEvent): Promise<void> {
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
  }

  async getEvents(
    matchId: string,
    fromSeq = 0,
  ): Promise<readonly IGameEvent[]> {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    if (fromSeq <= 0) {
      return rec.events.slice();
    }
    return rec.events.filter((e) => e.sequence >= fromSeq);
  }

  async getMatchMeta(matchId: string): Promise<IMatchMeta> {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    return rec.meta;
  }

  async updateMatchMeta(
    matchId: string,
    patch: IMatchMetaPatch,
  ): Promise<void> {
    const rec = this.records.get(matchId);
    if (!rec) throw new MatchNotFoundError(matchId);
    const before = rec.meta;
    rec.meta = {
      ...rec.meta,
      ...patch,
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
  }

  async getMatchByRoomCode(roomCode: string): Promise<IMatchMeta | null> {
    const normalized = normalizeRoomCode(roomCode);
    const matchId = this.roomCodeIndex.get(normalized);
    if (!matchId) return null;
    const rec = this.records.get(matchId);
    if (!rec || rec.closed) return null;
    if (rec.meta.status !== 'lobby') return null;
    return rec.meta;
  }

  async closeMatch(matchId: string): Promise<void> {
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
  }

  // Test/observability helpers — not part of the IMatchStore contract.

  /** Number of matches currently tracked. */
  size(): number {
    return this.records.size;
  }

  /** Drop everything. Used by tests for isolation. */
  _reset(): void {
    this.records.clear();
    this.roomCodeIndex.clear();
  }
}

// =============================================================================
// Factory + module-level singleton
// =============================================================================

let _singleton: InMemoryMatchStore | null = null;

/**
 * Default factory used by Wave 1's REST/WS code. Stays a singleton so
 * multiple HTTP handlers + the WebSocket upgrade share one store within
 * a Node process. Tests should construct their own `InMemoryMatchStore`
 * directly to avoid leaking state.
 */
export function getDefaultMatchStore(): InMemoryMatchStore {
  if (!_singleton) {
    _singleton = new InMemoryMatchStore();
  }
  return _singleton;
}

/** Test-only: reset the singleton so suites don't bleed into each other. */
export function _resetDefaultMatchStore(): void {
  _singleton = null;
}
