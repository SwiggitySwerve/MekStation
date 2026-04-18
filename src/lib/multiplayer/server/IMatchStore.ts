/**
 * IMatchStore — pluggable match persistence contract.
 *
 * Wave 1 ships an `InMemoryMatchStore` that satisfies this interface so
 * the rest of the multiplayer stack can be built and tested without a
 * production database. A future change (out of scope for Phase 4) swaps
 * in SQLite / Postgres / Redis. The contract is deliberately small and
 * async so that future implementations can be transactional /
 * network-backed without leaking persistence details into callers.
 *
 * Key invariants:
 *   - `appendEvent` is all-or-nothing: a sequence collision MUST throw
 *     `MatchStoreSequenceCollisionError` (the in-memory impl uses a
 *     synchronous Map but still rejects via Promise.reject).
 *   - `getEvents(matchId, fromSeq?)` returns events with sequence
 *     >= fromSeq, in ascending order.
 *   - `closeMatch` is idempotent (closing twice is a no-op).
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IMatchSeat, TeamLayout } from '@/types/multiplayer/Lobby';

// =============================================================================
// Match metadata
// =============================================================================

/**
 * Match lifecycle states. `lobby` -> `active` -> `completed`. Wave 3b
 * (lobby) extends this slightly (`pending` for awaiting reconnect) but
 * the base set is locked here so Wave 1 stores can be forward-compatible.
 */
export type MatchStatus = 'lobby' | 'active' | 'completed';

/**
 * Player <-> side assignment. Wave 1 keeps this simple — Wave 3b's
 * `add-multiplayer-lobby-and-matchmaking-2-8` extends with full
 * `IMatchSeat` (team, ready flag, AI vs human kind, etc.).
 */
export interface ISideAssignment {
  readonly playerId: string;
  readonly side: 'player' | 'opponent';
}

/**
 * Free-form match configuration blob — engine-specific knobs the host
 * picked at match creation time (map radius, turn limit, optional
 * rules). Stored verbatim so a later wave can rehydrate `IGameConfig`
 * from it without re-deriving from event history.
 */
export interface IMatchConfig {
  readonly mapRadius: number;
  readonly turnLimit: number;
  readonly optionalRules?: readonly string[];
  readonly contractId?: string | null;
  readonly scenarioId?: string | null;
  readonly encounterId?: string | null;
}

/**
 * `IMatchMeta` — durable description of a match. Anything a server
 * restart would need to rebuild the `ServerMatchHost` belongs here.
 */
export interface IMatchMeta {
  readonly matchId: string;
  readonly hostPlayerId: string;
  readonly playerIds: readonly string[];
  readonly sideAssignments: readonly ISideAssignment[];
  readonly status: MatchStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly config: IMatchConfig;
  /**
   * Wave 3b additions — lobby/matchmaking. `roomCode` is the 6-char
   * shareable invite code (case-insensitive); `layout` drives seat
   * generation; `seats` is the live lobby state. Optional on the
   * interface so Wave 1 fixtures stay backwards-compatible, but
   * Wave 3b match creation always populates them.
   */
  readonly roomCode?: string;
  readonly layout?: TeamLayout;
  readonly seats?: readonly IMatchSeat[];
}

/**
 * Patch shape for `updateMatchMeta`. Only mutable fields are exposed —
 * `matchId` and `createdAt` are immutable post-create.
 */
export type IMatchMetaPatch = Partial<
  Pick<
    IMatchMeta,
    | 'hostPlayerId'
    | 'playerIds'
    | 'sideAssignments'
    | 'status'
    | 'config'
    | 'seats'
    | 'layout'
    | 'roomCode'
  >
>;

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown when an `appendEvent` call uses a sequence number that already
 * exists for the match. This is a hard error — the caller should treat
 * it as a server bug (concurrent writers to the same match) and close
 * the match with `STORE_FAILURE`.
 */
export class MatchStoreSequenceCollisionError extends Error {
  constructor(
    public readonly matchId: string,
    public readonly sequence: number,
  ) {
    super(
      `Sequence collision: match ${matchId} already has an event at sequence ${sequence}`,
    );
    this.name = 'MatchStoreSequenceCollisionError';
  }
}

/**
 * Thrown when a method is called for a match that doesn't exist.
 */
export class MatchNotFoundError extends Error {
  constructor(public readonly matchId: string) {
    super(`Match not found: ${matchId}`);
    this.name = 'MatchNotFoundError';
  }
}

// =============================================================================
// Interface
// =============================================================================

/**
 * `IMatchStore` — the persistence boundary for the multiplayer server.
 *
 * All methods are async so future implementations can use a network
 * backend without changing call sites. Synchronous implementations
 * (like `InMemoryMatchStore`) satisfy the contract via `Promise.resolve`.
 */
export interface IMatchStore {
  /**
   * Persist a brand-new match. Implementations MUST reject if a match
   * with the same `matchId` already exists.
   */
  createMatch(meta: IMatchMeta): Promise<string>;

  /**
   * Append a single event. Sequence collisions MUST reject with
   * `MatchStoreSequenceCollisionError`. Implementations are responsible
   * for transactional all-or-nothing behaviour.
   */
  appendEvent(matchId: string, event: IGameEvent): Promise<void>;

  /**
   * Return all events with sequence >= `fromSeq` (default 0) in
   * ascending sequence order. An unknown match throws
   * `MatchNotFoundError`.
   */
  getEvents(matchId: string, fromSeq?: number): Promise<readonly IGameEvent[]>;

  /**
   * Return the meta blob for a match. Throws `MatchNotFoundError` if
   * the match doesn't exist.
   */
  getMatchMeta(matchId: string): Promise<IMatchMeta>;

  /**
   * Wave 3b: resolve a 6-char invite room code to the underlying
   * match meta. Returns `null` if no match has that code (or the
   * match's `roomCode` was cleared on launch). Implementations MUST
   * normalise input to upper-case and ignore separator characters
   * before looking up.
   */
  getMatchByRoomCode(roomCode: string): Promise<IMatchMeta | null>;

  /**
   * Apply a partial patch to the meta blob. The `updatedAt` field is
   * stamped automatically by the implementation.
   */
  updateMatchMeta(matchId: string, patch: IMatchMetaPatch): Promise<void>;

  /**
   * Mark the match as `completed` and free any in-memory bookkeeping.
   * Idempotent — closing an already-closed match is a no-op.
   */
  closeMatch(matchId: string): Promise<void>;
}

// =============================================================================
// Factory type (so production stores can swap in transparently)
// =============================================================================

/**
 * Factory shape for swapping store implementations. Wave 1 wires
 * `InMemoryMatchStore` via `createInMemoryMatchStore`; production picks
 * its own factory and the call sites only depend on `IMatchStore`.
 */
export type MatchStoreFactory = () => IMatchStore;
