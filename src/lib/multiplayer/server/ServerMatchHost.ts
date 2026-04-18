/**
 * ServerMatchHost — server-side wrapper around one `InteractiveSession`.
 *
 * Responsibilities (Wave 1 scope):
 *   - Own the lifetime of one `InteractiveSession` per active match.
 *   - Accept `Intent` envelopes, validate, dispatch into the engine.
 *   - Compute the *diff* of new events produced by the engine call,
 *     append each one to the `IMatchStore` (write-through), and
 *     broadcast `Event` envelopes to every connected socket for this
 *     match (including the originator — clients drive their state from
 *     broadcasts, not local optimism).
 *   - Manage per-socket heartbeats (server pings every 20s; missing
 *     inbound traffic for >60s is treated as a dead connection).
 *   - Expose `closeMatch` for clean shutdown (clears sockets, kills
 *     heartbeats, marks the store closed).
 *
 * Out of scope for Wave 1 (handled by later waves):
 *   - Lobby intents (Wave 3b)
 *   - Server-side dice arbitration (Wave 3a) — for now the engine's own
 *     `SeededRandom` produces rolls; arbitrating crypto rolls server-
 *     side is a Wave 3a concern.
 *   - Outcome bus passthrough (Wave 5 wires it).
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 */

import type { WebSocket as WsWebSocket } from 'ws';

import type { IAdaptedUnit } from '@/engine/types';
import type {
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';
import type { IPlayerRef } from '@/types/multiplayer/Player';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameSide,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';
import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  type IIntent,
  type ILobbyUpdated,
  type IServerMessage,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';

import {
  canLaunch,
  leaveSeat,
  LobbyStateError,
  occupySeat,
  reassignSeat,
  setAiSlot,
  setHumanSlot,
  setReady,
} from './lobby/lobbyStateMachine';

// =============================================================================
// Socket abstraction
// =============================================================================

/**
 * Minimal interface the host needs from a connected socket. Lets tests
 * inject a `Set<MockSocket>` without standing up a real WebSocket
 * server. In production this is a `ws.WebSocket`.
 */
export interface IMatchSocket {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  readonly readyState: number;
}

/**
 * Per-socket bookkeeping kept in a side-Map. We don't subclass the
 * socket itself because the `ws` library's WebSocket type is not
 * trivially extendable across versions.
 */
interface ISocketState {
  socket: IMatchSocket;
  playerId: string;
  lastInboundAt: number;
  heartbeatTimer: NodeJS.Timeout;
}

// =============================================================================
// Engine bootstrap input — Wave 1 keeps it minimal
// =============================================================================

/**
 * Everything `ServerMatchHost.create()` needs to spin up an
 * `InteractiveSession`. Wave 1 lets the caller pass a constructed
 * session OR a factory blob — tests typically pass the pre-built
 * session, the production REST `POST /matches` route would pass the
 * factory blob.
 */
export interface IMatchHostBootstrap {
  readonly mapRadius: number;
  readonly turnLimit: number;
  readonly random: SeededRandom;
  readonly grid: IHexGrid;
  readonly playerUnits: readonly IAdaptedUnit[];
  readonly opponentUnits: readonly IAdaptedUnit[];
  readonly gameUnits: readonly IGameUnit[];
}

// =============================================================================
// Host
// =============================================================================

export class ServerMatchHost {
  private readonly sockets = new Map<IMatchSocket, ISocketState>();
  private readonly session: InteractiveSession;
  private lastBroadcastSeq: number;
  private closed = false;
  /**
   * Wave 3b: cache of `playerId -> IPlayerRef` so OccupySeat intents
   * can resolve a display name. Populated by `registerPlayerRef` (called
   * from the WS upgrade handler on SessionJoin and from tests).
   */
  private readonly playerRefs = new Map<string, IPlayerRef>();

  /**
   * Construct directly from an existing `InteractiveSession`. Used by
   * tests + by the registry once it has a session ready.
   */
  constructor(
    public readonly matchId: string,
    private readonly store: IMatchStore,
    session: InteractiveSession,
  ) {
    this.session = session;
    // The engine appends `GameCreated` + `GameStarted` events during
    // construction. Persist them BEFORE accepting any intents so the
    // store + the in-memory session never drift.
    const initialEvents = session.getSession().events;
    this.lastBroadcastSeq = -1;
    void this.persistInitialEvents(initialEvents);
  }

  /**
   * Convenience factory: build a `ServerMatchHost` from a bootstrap
   * blob without forcing the caller to import `InteractiveSession`.
   */
  static create(
    matchId: string,
    store: IMatchStore,
    bootstrap: IMatchHostBootstrap,
  ): ServerMatchHost {
    const session = new InteractiveSession(
      bootstrap.mapRadius,
      bootstrap.turnLimit,
      bootstrap.random,
      bootstrap.grid,
      bootstrap.playerUnits,
      bootstrap.opponentUnits,
      bootstrap.gameUnits,
    );
    return new ServerMatchHost(matchId, store, session);
  }

  // ---------------------------------------------------------------------------
  // Socket management
  // ---------------------------------------------------------------------------

  /**
   * Attach a socket to this match. Spins up the per-socket heartbeat
   * timer. Caller is responsible for sending the replay stream
   * (`ReplayStart` + `ReplayChunk` + `ReplayEnd`) right after — the
   * host doesn't send replay automatically because the WebSocket
   * upgrade handler also needs to react to `BAD_ENVELOPE` rejections
   * before then.
   */
  attachSocket(socket: IMatchSocket, playerId: string): void {
    if (this.closed) {
      this.safeSend(socket, {
        kind: 'Close',
        matchId: this.matchId,
        ts: nowIso(),
        code: 'UNKNOWN_MATCH',
        reason: 'Match has been closed',
      });
      socket.close();
      return;
    }
    const heartbeatTimer = setInterval(() => {
      const state = this.sockets.get(socket);
      if (!state) return;
      const idleFor = Date.now() - state.lastInboundAt;
      if (idleFor > HEARTBEAT_TIMEOUT_MS) {
        // Treat as dead — close + detach. Caller's `on('close')`
        // listener is what actually removes from the set.
        this.detachSocket(socket);
        return;
      }
      this.safeSend(socket, {
        kind: 'Heartbeat',
        matchId: this.matchId,
        ts: nowIso(),
      });
    }, HEARTBEAT_INTERVAL_MS);

    // `unref` so a dangling timer doesn't keep Node alive in tests; it
    // exists only on `NodeJS.Timeout`, never on the browser-style
    // `Timer`. We're always in Node here, but the cast keeps TS happy.
    if (typeof (heartbeatTimer as NodeJS.Timeout).unref === 'function') {
      (heartbeatTimer as NodeJS.Timeout).unref();
    }

    this.sockets.set(socket, {
      socket,
      playerId,
      lastInboundAt: Date.now(),
      heartbeatTimer,
    });
  }

  /**
   * Tear down per-socket bookkeeping. Safe to call from any disconnect
   * path (client bye, heartbeat timeout, host shutdown).
   */
  detachSocket(socket: IMatchSocket): void {
    const state = this.sockets.get(socket);
    if (!state) return;
    clearInterval(state.heartbeatTimer);
    this.sockets.delete(socket);
    // Wave 1: disconnection MUST NOT end the match — the spec is
    // explicit. Wave 4 will mark the seat as `pending` so reconnect
    // works.
    try {
      socket.close();
    } catch {
      // already closed — ignore
    }
  }

  /**
   * Bookkeeping called by the upgrade handler whenever ANY message
   * comes in for this socket. Resets the dead-connection timer.
   */
  noteInbound(socket: IMatchSocket): void {
    const state = this.sockets.get(socket);
    if (!state) return;
    state.lastInboundAt = Date.now();
  }

  // ---------------------------------------------------------------------------
  // Replay
  // ---------------------------------------------------------------------------

  /**
   * Send the full event history to one socket as a `ReplayStart` →
   * `ReplayChunk` → `ReplayEnd` triple. Wave 1 emits a single chunk
   * because matches are short; Wave 4 will paginate.
   */
  async sendReplay(socket: IMatchSocket, fromSeq = 0): Promise<void> {
    const events = await this.store.getEvents(this.matchId, fromSeq);
    this.safeSend(socket, {
      kind: 'ReplayStart',
      matchId: this.matchId,
      ts: nowIso(),
      fromSeq,
      totalEvents: events.length,
    });
    if (events.length > 0) {
      this.safeSend(socket, {
        kind: 'ReplayChunk',
        matchId: this.matchId,
        ts: nowIso(),
        events: events.slice() as unknown[],
      });
    }
    const toSeq =
      events.length > 0 ? events[events.length - 1].sequence : fromSeq;
    this.safeSend(socket, {
      kind: 'ReplayEnd',
      matchId: this.matchId,
      ts: nowIso(),
      toSeq,
    });
  }

  // ---------------------------------------------------------------------------
  // Intent dispatch
  // ---------------------------------------------------------------------------

  /**
   * Apply an intent. Returns a list of broadcast envelopes (events +
   * any error) that have already been sent to all sockets. Returning
   * them lets tests assert without reaching into the socket mock.
   */
  async handleIntent(envelope: IIntent): Promise<readonly IServerMessage[]> {
    const broadcasts: IServerMessage[] = [];

    if (this.closed) {
      const err: IServerMessage = {
        kind: 'Error',
        matchId: this.matchId,
        ts: nowIso(),
        code: 'UNKNOWN_MATCH',
        reason: 'Match is closed',
      };
      this.broadcast(err);
      broadcasts.push(err);
      return broadcasts;
    }

    // Wave 3b: split lobby intents off the engine path. Lobby intents
    // mutate `meta.seats` and emit `LobbyUpdated` envelopes; they never
    // touch the `InteractiveSession`. Routing here keeps the engine
    // dispatcher's switch statement (Wave 1 + 3a territory) unchanged.
    if (isLobbyIntentKind(envelope.intent.kind)) {
      const lobbyMessages = await this.handleLobbyIntent(envelope);
      for (const m of lobbyMessages) broadcasts.push(m);
      return broadcasts;
    }

    try {
      this.dispatchToEngine(envelope.intent);
    } catch (e) {
      const err: IServerMessage = {
        kind: 'Error',
        matchId: this.matchId,
        ts: nowIso(),
        code: 'INVALID_INTENT',
        reason: e instanceof Error ? e.message : 'Engine rejected intent',
      };
      this.broadcast(err);
      broadcasts.push(err);
      return broadcasts;
    }

    // Drain any new events the engine produced this tick and persist +
    // broadcast each one IN ORDER. Persisting first means a store
    // failure shuts down the match before clients see a phantom event.
    const newEvents = this.drainNewEvents();
    for (const event of newEvents) {
      try {
        await this.store.appendEvent(this.matchId, event);
      } catch (e) {
        const err: IServerMessage = {
          kind: 'Error',
          matchId: this.matchId,
          ts: nowIso(),
          code: 'STORE_FAILURE',
          reason: e instanceof Error ? e.message : 'Store append failed',
        };
        this.broadcast(err);
        broadcasts.push(err);
        await this.closeMatch();
        return broadcasts;
      }
      const envelopeOut: IServerMessage = {
        kind: 'Event',
        matchId: this.matchId,
        ts: nowIso(),
        event,
      };
      this.broadcast(envelopeOut);
      broadcasts.push(envelopeOut);
    }

    return broadcasts;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Close the match: drop all sockets, kill heartbeats, mark the store.
   * Idempotent.
   */
  async closeMatch(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    const socketList = Array.from(this.sockets.keys());
    for (const socket of socketList) {
      this.safeSend(socket, {
        kind: 'Close',
        matchId: this.matchId,
        ts: nowIso(),
        reason: 'Match closed',
      });
      this.detachSocket(socket);
    }
    await this.store.closeMatch(this.matchId);
  }

  /** Test/observability: number of currently-connected sockets. */
  socketCount(): number {
    return this.sockets.size;
  }

  /** Test/observability: most recent broadcast sequence (or -1). */
  highestSeq(): number {
    return this.lastBroadcastSeq;
  }

  /** Test/observability: pull the live session (for assertions). */
  getSessionForTests(): IGameSession {
    return this.session.getSession();
  }

  isClosed(): boolean {
    return this.closed;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Translate a `Protocol.IIntentPayload` into the matching
   * `InteractiveSession` method call. Throws on unknown / malformed
   * intent so the outer try/catch turns it into an `Error` envelope.
   */
  private dispatchToEngine(intent: IIntent['intent']): void {
    switch (intent.kind) {
      case 'Move': {
        const movementType = this.parseMovementType(intent.movementType);
        const facing = intent.facing as Facing;
        // The engine reads the unit's current position; we only need to
        // hand it the destination + facing + movement type.
        this.session.applyMovement(
          intent.unitId,
          { q: intent.to.q, r: intent.to.r },
          facing,
          movementType,
        );
        return;
      }
      case 'Attack': {
        this.session.applyAttack(
          intent.attackerId,
          intent.targetId,
          intent.weaponIds,
        );
        return;
      }
      case 'AdvancePhase': {
        this.session.advancePhase();
        return;
      }
      case 'Concede': {
        const side =
          intent.side === 'player' ? GameSide.Player : GameSide.Opponent;
        this.session.concede(side);
        return;
      }
      // Wave 3b lobby intents are handled in `handleLobbyIntent` BEFORE
      // we reach the engine dispatcher (see `handleIntent` above). They
      // appear here only to keep the discriminated-union exhaustive
      // check honest — if any of them ever falls through to the engine
      // we want a typed error instead of `never` blowing up.
      case 'OccupySeat':
      case 'LeaveSeat':
      case 'ReassignSeat':
      case 'SetAiSlot':
      case 'SetHumanSlot':
      case 'SetReady':
      case 'LaunchMatch': {
        throw new Error(
          `Lobby intent ${intent.kind} routed to engine dispatcher (bug)`,
        );
      }
      default: {
        // Exhaustive — any future intent variant added without a handler
        // here will fail typecheck.
        const _exhaustive: never = intent;
        throw new Error(
          `Unknown intent kind: ${(intent as { kind: string }).kind} (${String(_exhaustive)})`,
        );
      }
    }
  }

  /**
   * Map Protocol's string `movementType` onto the engine's enum.
   * Throws on unknown so a malformed intent surfaces as INVALID_INTENT.
   */
  private parseMovementType(kind: string): MovementType {
    switch (kind) {
      case 'walk':
      case 'Walk':
        return MovementType.Walk;
      case 'run':
      case 'Run':
        return MovementType.Run;
      case 'jump':
      case 'Jump':
        return MovementType.Jump;
      case 'stationary':
      case 'Stationary':
        return MovementType.Stationary;
      default:
        throw new Error(`Unknown movement type: ${kind}`);
    }
  }

  /**
   * Snapshot any events the engine appended since our last broadcast
   * cursor and advance the cursor. Pure read against the live session.
   */
  private drainNewEvents(): readonly IGameEvent[] {
    const all = this.session.getSession().events;
    const fresh: IGameEvent[] = [];
    for (const evt of all) {
      if (evt.sequence > this.lastBroadcastSeq) {
        fresh.push(evt);
      }
    }
    if (fresh.length > 0) {
      this.lastBroadcastSeq = fresh[fresh.length - 1].sequence;
    }
    return fresh;
  }

  /**
   * Persist whatever events the session emitted at construction time
   * (typically `GameCreated` + `GameStarted`). Runs as fire-and-forget;
   * any store failure here is logged and the host stays usable —
   * subsequent `appendEvent` calls would surface the same store
   * failure synchronously and shut the match down properly.
   */
  private async persistInitialEvents(
    events: readonly IGameEvent[],
  ): Promise<void> {
    for (const evt of events) {
      try {
        await this.store.appendEvent(this.matchId, evt);
        this.lastBroadcastSeq = evt.sequence;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(
          `[ServerMatchHost ${this.matchId}] failed to persist initial event seq=${evt.sequence}`,
          e,
        );
      }
    }
  }

  /**
   * Send to every attached socket. Failures (closed socket, etc.) are
   * swallowed — the heartbeat timer will reap dead sockets.
   */
  private broadcast(message: IServerMessage): void {
    const payload = JSON.stringify(message);
    this.sockets.forEach((_state, socket) => {
      try {
        socket.send(payload);
      } catch {
        // Socket is dead — let the heartbeat / close handler clean up.
      }
    });
  }

  /**
   * Send to a single socket, swallowing send errors. Used for join +
   * replay paths where we don't want a single bad socket to throw out
   * of the upgrade handler.
   */
  private safeSend(socket: IMatchSocket, message: IServerMessage): void {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Wave 3b — lobby intent handlers
  // ---------------------------------------------------------------------------

  /**
   * Public test hook so the integration suite can simulate "host joined
   * via WS and registered a player ref" without standing up the whole
   * REST + auth path. Production wiring sets the ref on first
   * SessionJoin so subsequent OccupySeat intents have a name to use.
   */
  registerPlayerRef(ref: IPlayerRef): void {
    this.playerRefs.set(ref.playerId, ref);
  }

  /**
   * Top-level lobby intent dispatcher. Loads the current meta, routes
   * by kind, persists the new seats, and broadcasts a `LobbyUpdated`
   * envelope to every attached socket. Returns the broadcasts (errors +
   * the LobbyUpdated message) so tests can assert without reaching
   * into the socket mock.
   */
  private async handleLobbyIntent(
    envelope: IIntent,
  ): Promise<readonly IServerMessage[]> {
    const out: IServerMessage[] = [];
    const meta = await this.store.getMatchMeta(this.matchId);
    const seats = meta.seats ?? [];
    const intent = envelope.intent;

    // Authorization gate: host-only intents.
    const hostOnly =
      intent.kind === 'ReassignSeat' ||
      intent.kind === 'SetAiSlot' ||
      intent.kind === 'SetHumanSlot' ||
      intent.kind === 'LaunchMatch';
    if (hostOnly && envelope.playerId !== meta.hostPlayerId) {
      const err: IServerMessage = {
        kind: 'Error',
        matchId: this.matchId,
        ts: nowIso(),
        code: 'AUTH_REJECTED',
        reason: `Intent ${intent.kind} requires host privileges`,
      };
      this.broadcast(err);
      out.push(err);
      return out;
    }

    let nextSeats: IMatchSeat[];
    let nextStatus = meta.status;
    let clearRoomCode = false;

    try {
      switch (intent.kind) {
        case 'OccupySeat': {
          nextSeats = this.handleOccupySeat(seats, intent.slotId, envelope);
          break;
        }
        case 'LeaveSeat': {
          nextSeats = this.handleLeaveSeat(
            seats,
            intent.slotId,
            envelope.playerId,
          );
          break;
        }
        case 'ReassignSeat': {
          nextSeats = this.handleReassignSeat(
            seats,
            intent.slotId,
            intent.toSide,
            intent.toSeat,
          );
          break;
        }
        case 'SetAiSlot': {
          nextSeats = this.handleSetAiSlot(
            seats,
            intent.slotId,
            intent.aiProfile,
          );
          break;
        }
        case 'SetHumanSlot': {
          nextSeats = this.handleSetHumanSlot(seats, intent.slotId);
          break;
        }
        case 'SetReady': {
          nextSeats = this.handleSetReady(
            seats,
            intent.slotId,
            envelope.playerId,
            intent.ready,
          );
          break;
        }
        case 'LaunchMatch': {
          nextSeats = seats.slice();
          if (!canLaunch(nextSeats)) {
            throw new LobbyStateError(
              'Cannot launch: not all seats are filled and ready',
            );
          }
          nextStatus = 'active';
          clearRoomCode = true;
          // Wave 5 wires the `BotPlayer` driver per AI seat. For Wave 3b
          // we just log so integration tests can grep for the marker.
          for (const seat of nextSeats) {
            if (seat.kind === 'ai') {
              // eslint-disable-next-line no-console
              console.info(
                `[ServerMatchHost ${this.matchId}] AI seat would run BotPlayer here (slotId=${seat.slotId}, profile=${seat.aiProfile ?? 'basic'})`,
              );
            }
          }
          break;
        }
        default: {
          throw new LobbyStateError(
            `Unhandled lobby intent: ${(intent as { kind: string }).kind}`,
          );
        }
      }
    } catch (e) {
      const err: IServerMessage = {
        kind: 'Error',
        matchId: this.matchId,
        ts: nowIso(),
        code: 'INVALID_INTENT',
        reason: e instanceof Error ? e.message : 'Lobby state machine rejected',
      };
      this.broadcast(err);
      out.push(err);
      return out;
    }

    try {
      await this.store.updateMatchMeta(this.matchId, {
        seats: nextSeats,
        status: nextStatus,
        ...(clearRoomCode ? { roomCode: undefined as unknown as string } : {}),
      });
    } catch (e) {
      const err: IServerMessage = {
        kind: 'Error',
        matchId: this.matchId,
        ts: nowIso(),
        code: 'STORE_FAILURE',
        reason: e instanceof Error ? e.message : 'Lobby persist failed',
      };
      this.broadcast(err);
      out.push(err);
      return out;
    }

    const update: ILobbyUpdated = {
      kind: 'LobbyUpdated',
      matchId: this.matchId,
      ts: nowIso(),
      seats: nextSeats,
      status: nextStatus,
      hostPlayerId: meta.hostPlayerId,
    };
    this.broadcast(update);
    out.push(update);
    return out;
  }

  /**
   * Resolve the player ref for an occupy intent. We trust auth: the
   * envelope's `playerId` is the verified socket identity. Display
   * name comes from the most recent `SessionJoin`/`registerPlayerRef`
   * call; if we have no ref yet we synthesise a minimal one from the
   * playerId so the lobby still has *something* to render.
   */
  private handleOccupySeat(
    seats: readonly IMatchSeat[],
    slotId: string,
    envelope: IIntent,
  ): IMatchSeat[] {
    const ref =
      this.playerRefs.get(envelope.playerId) ??
      ({
        playerId: envelope.playerId,
        displayName: envelope.playerId,
      } as IPlayerRef);
    return occupySeat(seats, slotId, ref);
  }

  private handleLeaveSeat(
    seats: readonly IMatchSeat[],
    slotId: string,
    playerId: string,
  ): IMatchSeat[] {
    return leaveSeat(seats, slotId, playerId);
  }

  private handleReassignSeat(
    seats: readonly IMatchSeat[],
    slotId: string,
    toSide: string,
    toSeat: number,
  ): IMatchSeat[] {
    return reassignSeat(seats, slotId, toSide, toSeat);
  }

  private handleSetAiSlot(
    seats: readonly IMatchSeat[],
    slotId: string,
    aiProfile?: string,
  ): IMatchSeat[] {
    return setAiSlot(seats, slotId, aiProfile);
  }

  private handleSetHumanSlot(
    seats: readonly IMatchSeat[],
    slotId: string,
  ): IMatchSeat[] {
    return setHumanSlot(seats, slotId);
  }

  /**
   * Self-readiness check + setReady delegation. The slot owner is the
   * only player allowed to flip their own ready flag — host doesn't
   * get a shortcut here (per spec 6.1).
   */
  private handleSetReady(
    seats: readonly IMatchSeat[],
    slotId: string,
    playerId: string,
    ready: boolean,
  ): IMatchSeat[] {
    const seat = seats.find((s) => s.slotId === slotId);
    if (!seat) {
      throw new LobbyStateError(`Unknown slotId: ${slotId}`);
    }
    if (!seat.occupant || seat.occupant.playerId !== playerId) {
      throw new LobbyStateError(
        `Player ${playerId} cannot toggle ready on slot ${slotId} they don't occupy`,
      );
    }
    return setReady(seats, slotId, ready);
  }
}

/**
 * Type guard that returns true for any of the Wave 3b lobby intent
 * kinds. Centralised here so `handleIntent` can route without
 * pattern-matching on the union literal in two places.
 */
function isLobbyIntentKind(kind: IIntent['intent']['kind']): boolean {
  return (
    kind === 'OccupySeat' ||
    kind === 'LeaveSeat' ||
    kind === 'ReassignSeat' ||
    kind === 'SetAiSlot' ||
    kind === 'SetHumanSlot' ||
    kind === 'SetReady' ||
    kind === 'LaunchMatch'
  );
}

// Re-export the WebSocket type for the upgrade handler so it doesn't
// need a direct `ws` import alongside the host.
export type { WsWebSocket };
