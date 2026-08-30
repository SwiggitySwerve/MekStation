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

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { GmArbitrationMode } from '@/types/campaign/CoopCampaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { IMatchSeat, TeamLayout } from '@/types/multiplayer/Lobby';

import type {
  IMatchCommandBatch,
  IMatchCommandReceipt,
  MatchBatchAppendResult,
} from './matchCommandBatch';
import type { IMatchJournalAuthorityStarted } from './matchJournalAuthority';

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
  readonly fogOfWar?: boolean;
  readonly optionalRules?: readonly string[];
  readonly contractId?: string | null;
  readonly scenarioId?: string | null;
  readonly encounterId?: string | null;
}

/**
 * Compact, durable unit bootstrap for live multiplayer hosts. Stores unit
 * references and pilot-side choices, not full adapted unit blobs; the registry
 * adapts these through the catalog when the authoritative host starts.
 */
export interface IMatchUnitBootstrapEntry {
  readonly unitId: string;
  readonly unitRef: string;
  readonly side: ISideAssignment['side'];
  readonly name?: string;
  readonly pilotRef?: string;
  readonly gunnery?: number;
  readonly piloting?: number;
  readonly startHex?: IHexCoordinate;
}

/**
 * Durable snapshot needed to rebuild the server-resident campaign host from
 * the match store. The WebSocket server may run through a separate module
 * graph from the REST API in development, so co-op campaign registration
 * cannot rely on an API-route-local in-memory map.
 */
export interface IMatchCoopCampaignRegistration {
  readonly campaignId: string;
  readonly state: ICampaignAuthoritativeState;
  readonly arbitrationMode?: GmArbitrationMode;
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
  readonly unitBootstrap?: readonly IMatchUnitBootstrapEntry[];
  readonly coopCampaign?: IMatchCoopCampaignRegistration;
}

/**
 * Patch shape for `updateMatchMeta`. Only mutable fields are exposed —
 * `matchId` and `createdAt` are immutable post-create.
 *
 * `roomCode` is widened to `string | null | undefined` so callers can
 * explicitly clear a previously-set invite code by passing `null`.
 * Implementations MUST treat `null` as "remove the field"; `undefined`
 * (the absence of the key in the patch) means "leave it alone". This
 * removes the previous `undefined as unknown as string` smuggling at
 * the `ServerMatchHost` lobby-launch path.
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
    | 'unitBootstrap'
  >
> & {
  readonly roomCode?: string | null;
};

// =============================================================================
// Durable publication outbox
// =============================================================================

/**
 * One durable publication record: "this committed event has not yet
 * been handed to recipients".
 *
 * `Commit Precedes Recipient Publication` asks for publication to be
 * driven by records written in the SAME transaction as the command
 * batch: the row survives the process, so a later drain can finish the
 * delivery without re-executing the command. The event is carried ON
 * the row rather than looked up from the log, so a drain never has to
 * re-read the stream to find out what to send.
 *
 * NOT CLAIMED: per-recipient state. The requirement names "records AND
 * cursors"; this is the records half only. A record carries ONE global
 * published mark, so a drain that reached player A and not player B
 * marks it done for both. The per-viewer cursors that would close that
 * gap exist already (`ctx.deliveryCursors`) and are deliberately not
 * consulted; until they are, what covers a half-delivered frame is the
 * SessionJoin `lastSeq` replay, not this outbox.
 */
export interface IMatchPublication {
  readonly matchId: string;
  /** The authority sequence of the committed event. */
  readonly sequence: number;
  /** The command whose batch committed it. */
  readonly commandId: string;
  readonly event: IGameEvent;
  readonly createdAt: string;
}

/**
 * The outbox half of a store, narrowed so a caller can hold exactly
 * the surface a drain needs and nothing else.
 */
export interface IPublicationOutboxStore {
  /**
   * Unpublished records for this match, ascending by sequence. An
   * unknown match answers `[]` rather than throwing
   * `MatchNotFoundError`, deliberately unlike every other reader here:
   * a boot-time drain that threw on one unknown match would take down
   * the resume for every other match beside it.
   */
  listPendingPublications(
    matchId: string,
  ): Promise<readonly IMatchPublication[]>;

  /**
   * Mark the given sequences delivered. Never touches the committed
   * events themselves — marking is about DELIVERY, not about the log a
   * reconnecting client replays.
   *
   * Idempotent means only that a repeat leaves the PENDING set the
   * same. Whether the FIRST mark's timestamp survives a repeat is
   * deliberately unspecified — nothing reads it back, so a rule about
   * it is one no test could ever fail on.
   */
  markPublicationsPublished(
    matchId: string,
    sequences: readonly number[],
  ): Promise<void>;
}

// =============================================================================
// Terminal combat outcome outbox
// =============================================================================

/**
 * The durable combat-to-campaign authority boundary. The canonical outcome
 * payload is written inside the terminal command transaction; `publishedAt`
 * records only the in-process notification attempt, never campaign receipt.
 */
export interface IMatchCombatOutcomeOutbox {
  readonly matchId: string;
  readonly outcomeId: string;
  readonly outcomeVersion: number;
  readonly outcome: ICombatOutcome;
  readonly createdAt: string;
  readonly publishedAt: string | null;
}

/** Narrow store port used by post-verify and restart outcome publication. */
export interface ICombatOutcomeOutboxStore {
  getCombatOutcomeOutbox(
    matchId: string,
  ): Promise<IMatchCombatOutcomeOutbox | null>;
  markCombatOutcomePublished(matchId: string, outcomeId: string): Promise<void>;
}

/** Structural capability guard, matching the batch/publication-port pattern. */
export function hasCombatOutcomeOutbox(
  store: IMatchStore,
): store is IMatchStore & ICombatOutcomeOutboxStore {
  const candidate = store as Partial<ICombatOutcomeOutboxStore>;
  return (
    typeof candidate.getCombatOutcomeOutbox === 'function' &&
    typeof candidate.markCombatOutcomePublished === 'function'
  );
}

/**
 * True iff the store keeps a durable publication outbox. A structural
 * flag, exactly as `appendCommandBatch` is: a store without one is not
 * broken, it simply has no publication record to resume from.
 *
 * It checks the two methods EXIST and nothing else — it cannot see
 * whether an implementation honours the same-transaction rule below.
 * `matchPublicationOutbox.test.ts` is what enforces that.
 */
export function hasPublicationOutbox(
  store: IMatchStore,
): store is IMatchStore & IPublicationOutboxStore {
  const candidate = store as Partial<IPublicationOutboxStore>;
  return (
    typeof candidate.listPendingPublications === 'function' &&
    typeof candidate.markPublicationsPublished === 'function'
  );
}

// =============================================================================
// Per-viewer delivery mapping
// =============================================================================

/**
 * One slot in a viewer's delivery record. `deliverySequence` is the
 * array index; `authoritySequence` is the authority event it carried,
 * or -1 for a send-failure / unsequenced slot. Same shape as
 * `ViewerDeliveryCursors`.
 */
export interface IViewerDeliveryRecord {
  readonly matchId: string;
  readonly playerId: string;
  readonly deliverySequence: number;
  readonly authoritySequence: number;
}

/**
 * Optional durable copy of `ViewerDeliveryCursors`. Absence is today's
 * in-memory behaviour — socket-binding tests have no DB.
 */
export interface IViewerDeliveryStore {
  appendViewerDeliveryRecord(record: IViewerDeliveryRecord): Promise<void>;
  listViewerDeliveryRecords(
    matchId: string,
  ): Promise<readonly IViewerDeliveryRecord[]>;
}

export function hasViewerDeliveryStore(
  store: IMatchStore,
): store is IMatchStore & IViewerDeliveryStore {
  const candidate = store as Partial<IViewerDeliveryStore>;
  return (
    typeof candidate.appendViewerDeliveryRecord === 'function' &&
    typeof candidate.listViewerDeliveryRecords === 'function'
  );
}

/** A participant's durable highest contiguous applied delivery receipt. */
export interface IViewerDeliveryAcknowledgement {
  readonly matchId: string;
  readonly playerId: string;
  readonly deliverySequence: number;
}

/** Optional receipt port; old stores continue with deliveryCursor fallback. */
export interface IViewerDeliveryAcknowledgementStore {
  acknowledgeViewerDelivery(
    acknowledgement: IViewerDeliveryAcknowledgement,
  ): Promise<void>;
  getViewerDeliveryAcknowledgement(
    matchId: string,
    playerId: string,
  ): Promise<IViewerDeliveryAcknowledgement | null>;
}

export function hasViewerDeliveryAcknowledgementStore(
  store: IMatchStore,
): store is IMatchStore & IViewerDeliveryAcknowledgementStore {
  const candidate = store as Partial<IViewerDeliveryAcknowledgementStore>;
  return (
    typeof candidate.acknowledgeViewerDelivery === 'function' &&
    typeof candidate.getViewerDeliveryAcknowledgement === 'function'
  );
}

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

  /**
   * Enumerate the metadata of every match the store currently tracks,
   * optionally filtered by `status`.
   *
   * Added by `add-matchmaking-and-spectator` (M3, design D2): the
   * joinable-lobby query reads `status: 'lobby'` matches and the
   * spectatable-match query reads `status: 'active'` matches through
   * this one method. No separate index structure is introduced — the
   * durable store already keeps a `status` column index, and the
   * in-memory store scans its small Map.
   */
  listMatches(filter?: {
    readonly status?: MatchStatus;
  }): Promise<readonly IMatchMeta[]>;

  /**
   * Append one command's events as a single atomic, contiguous batch
   * (adopt-combat-event-journal-authority PR 1).
   *
   * OPTIONAL on the interface so a store can be adapted without every
   * implementation moving at once - the capability is a structural flag
   * a caller tests for, exactly as the campaign event store does. A
   * store WITHOUT it is not broken, it simply has no command boundary
   * yet and callers keep using `appendEvent`.
   *
   * Never throws for an expected outcome: a revision conflict, a
   * recognised retry, a reused identity, and a gapped batch are all
   * typed results, because a caller that cannot tell them apart will
   * retry the ones that can never succeed.
   */
  appendCommandBatch?(
    matchId: string,
    batch: IMatchCommandBatch,
  ): Promise<MatchBatchAppendResult>;

  getCommandReceipt?(
    matchId: string,
    commandId: string,
  ): Promise<IMatchCommandReceipt | null>;

  /**
   * Current durable command head, ordered by its final committed revision.
   * Recovery uses this receipt only to verify a journal refold; it never
   * rewrites or synthesizes the receipt.
   */
  getLastCommandReceipt?(matchId: string): Promise<IMatchCommandReceipt | null>;

  getJournalAuthorityStarted?(
    matchId: string,
  ): Promise<IMatchJournalAuthorityStarted | null>;

  /**
   * Durable publication outbox (umbrella task 7.1). OPTIONAL for the
   * same reason `appendCommandBatch` is.
   *
   * Implementations that offer these MUST write the publication rows
   * inside the SAME transaction as `appendCommandBatch`. Writing them
   * afterwards would reintroduce the dual-write hole the outbox exists
   * to close: a commit with no publication record is an event nobody
   * will ever be told about.
   *
   * Enforced by test, not by types — the contract suite makes a
   * publication write fail on its own and asserts the events went down
   * with it, which a dual-writing store fails.
   */
  listPendingPublications?(
    matchId: string,
  ): Promise<readonly IMatchPublication[]>;
  markPublicationsPublished?(
    matchId: string,
    sequences: readonly number[],
  ): Promise<void>;

  /**
   * Terminal combat outcome outbox (umbrella task 13.1). OPTIONAL like
   * `appendCommandBatch`; capable stores write `batch.combatOutcome` in that
   * same transaction, then expose only read/mark operations to publication.
   */
  getCombatOutcomeOutbox?(
    matchId: string,
  ): Promise<IMatchCombatOutcomeOutbox | null>;
  markCombatOutcomePublished?(
    matchId: string,
    outcomeId: string,
  ): Promise<void>;

  /**
   * Per-viewer delivery mapping (leaf 3.1). OPTIONAL like the outbox
   * and membership ports: a store without it keeps process-local
   * `ViewerDeliveryCursors` only.
   */
  appendViewerDeliveryRecord?(record: IViewerDeliveryRecord): Promise<void>;
  listViewerDeliveryRecords?(
    matchId: string,
  ): Promise<readonly IViewerDeliveryRecord[]>;
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
