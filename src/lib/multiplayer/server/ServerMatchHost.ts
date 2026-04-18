/**
 * ServerMatchHost — server-side wrapper around one `InteractiveSession`.
 *
 * Responsibilities:
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
 * Wave 3a — authoritative roll arbitration:
 *   - The host owns a single `IServerDiceRoller` (crypto-backed by
 *     default, `SeededDiceRoller` when the debug `?seed=N` query was
 *     supplied) and exposes it to `InteractiveSession` via a stable
 *     indirection callback. Per-intent, the host swaps in a fresh
 *     `RollCapture` so every d6 the engine consumes lands in a buffer
 *     scoped to the intent. After the engine returns, the host stamps
 *     the captured rolls onto the new event payloads (via `payload.rolls`)
 *     and ALSO rejects any inbound intent whose payload smuggles dice
 *     fields (zod refinement on `IntentSchema`).
 *
 * Out of scope for this wave:
 *   - Lobby intents (Wave 3b)
 *   - Outcome bus passthrough (Wave 5 wires it).
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

import type { WebSocket as WsWebSocket } from 'ws';

import type { IAdaptedUnit } from '@/engine/types';
import type {
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IHexGrid } from '@/types/gameplay/HexGridInterfaces';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

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
  intentHasForbiddenDiceField,
  type IIntent,
  type IServerMessage,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';

import { CryptoDiceRoller, type IServerDiceRoller } from './CryptoDiceRoller';
import { RollCapture, SeededDiceRoller } from './RollCapture';

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
  /**
   * Per `add-authoritative-roll-arbitration` (Wave 3a): optional debug
   * seed for reproducing bug reports. When set, the server replaces the
   * crypto-backed dice roller with a `SeededRandom`-backed one so two
   * runs with the same seed produce identical events. Off by default —
   * production never reads this field.
   */
  readonly diceSeed?: number;
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
   * Per Wave 3a: the source roller (crypto in prod, seeded in debug).
   * Stable for the entire match lifetime.
   */
  private readonly sourceRoller: IServerDiceRoller;

  /**
   * Per Wave 3a: the *currently active* `RollCapture`. Reset between
   * intent ticks via `installFreshCapture()` so each engine call's
   * consumed rolls land in a buffer scoped to that call. The
   * `dispatchD6Roller` callback handed to `InteractiveSession` reads
   * THROUGH this pointer — that's how a fixed callback can target
   * different capture buffers across intents.
   */
  private currentCapture: RollCapture;

  /**
   * Per Wave 3a: stable `D6Roller` callback handed to
   * `InteractiveSession` at construction. Each invocation routes through
   * `currentCapture` (which the host swaps per-intent), so the engine
   * doesn't need to know rolls are being recorded.
   */
  private readonly dispatchD6Roller: D6Roller;

  /**
   * Construct directly from an existing `InteractiveSession`. Used by
   * tests + by the registry once it has a session ready.
   *
   * Per Wave 3a: when the caller pre-built the session, they are
   * responsible for wiring the host's `dispatchD6Roller` into the
   * `InteractiveSession` constructor (or accepting that the engine will
   * fall back to its default `Math.random`). For the production code
   * path, prefer `ServerMatchHost.create()` which threads the dice
   * plumbing automatically.
   */
  constructor(
    public readonly matchId: string,
    private readonly store: IMatchStore,
    session: InteractiveSession,
    sourceRoller?: IServerDiceRoller,
  ) {
    this.session = session;
    this.sourceRoller = sourceRoller ?? new CryptoDiceRoller();
    this.currentCapture = new RollCapture(this.sourceRoller);
    // Stable callback identity — engine holds this reference for the
    // lifetime of the match. Routes every d6 through whatever
    // `currentCapture` points at right now.
    this.dispatchD6Roller = () => this.currentCapture.d6();
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
   *
   * Per Wave 3a: this is THE production code path for spinning up a
   * server-authoritative session. Sets up the dice plumbing
   * (crypto-backed by default; `SeededDiceRoller` if `bootstrap.diceSeed`
   * is set) and threads a stable indirection callback into the engine
   * so per-intent `RollCapture` swaps stay invisible to resolvers.
   */
  static create(
    matchId: string,
    store: IMatchStore,
    bootstrap: IMatchHostBootstrap,
  ): ServerMatchHost {
    // Build the source roller first so the indirection callback can
    // close over a known instance even before the host exists.
    const sourceRoller: IServerDiceRoller =
      bootstrap.diceSeed != null
        ? new SeededDiceRoller(new SeededRandom(bootstrap.diceSeed))
        : new CryptoDiceRoller();

    // Mutable capture pointer shared between the engine callback and the
    // host instance. The host re-assigns this between intents; the
    // callback always reads the current value.
    const captureRef = { current: new RollCapture(sourceRoller) };
    const engineCallback: D6Roller = () => captureRef.current.d6();

    const session = new InteractiveSession(
      bootstrap.mapRadius,
      bootstrap.turnLimit,
      bootstrap.random,
      bootstrap.grid,
      bootstrap.playerUnits,
      bootstrap.opponentUnits,
      bootstrap.gameUnits,
      {},
      engineCallback,
    );

    const host = new ServerMatchHost(matchId, store, session, sourceRoller);
    // Hand the host the same captureRef so it can swap between intents.
    host.adoptExternalCaptureRef(captureRef);
    return host;
  }

  /**
   * Per Wave 3a internal: replace the host's capture pointer with the
   * one closed over by the engine callback. Without this, the host's
   * `currentCapture` and the callback's pointer would diverge after the
   * first swap. Called only from `static create`.
   */
  private adoptExternalCaptureRef(ref: { current: RollCapture }): void {
    // The host's own `currentCapture` is irrelevant once we have an
    // external ref — we re-route both reads + writes through `ref`.
    // We do this by overwriting `currentCapture` with the ref's current
    // value AND replacing the in-memory swap helper to mutate `ref`.
    this.currentCapture = ref.current;
    this.captureSwap = (next: RollCapture) => {
      ref.current = next;
      this.currentCapture = next;
    };
  }

  /**
   * Default capture swap (no external ref): just update the host field.
   * Overridden by `adoptExternalCaptureRef` when the session was built
   * via `static create`.
   */
  private captureSwap: (next: RollCapture) => void = (next) => {
    this.currentCapture = next;
  };

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

    // Per `add-authoritative-roll-arbitration` (Wave 3a): defense in
    // depth. The Protocol's IntentSchema already rejects payloads with
    // dice fields at the parse step, but a hand-crafted `IIntent`
    // bypassing the schema (e.g., another server module synthesizing an
    // intent) MUST still be refused here. We log + reply with
    // INVALID_INTENT and do NOT touch the engine.
    if (intentHasForbiddenDiceField(envelope.intent)) {
      const err: IServerMessage = {
        kind: 'Error',
        matchId: this.matchId,
        ts: nowIso(),
        code: 'INVALID_INTENT',
        reason: 'client-rolls-forbidden',
      };
      this.broadcast(err);
      broadcasts.push(err);
      return broadcasts;
    }

    // Per Wave 3a: install a fresh `RollCapture` so every d6 the engine
    // consumes during `dispatchToEngine` lands in a buffer scoped to
    // this intent. Stamped onto the resulting events below.
    this.installFreshCapture();

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
    const newEvents = this.stampRollsOnNewEvents(this.drainNewEvents());
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
      default: {
        // Wave 3b will extend `IIntentPayload` with lobby intents; the
        // exhaustive `never` keeps the compiler honest if a variant is
        // added without a handler here.
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
   * Per `add-authoritative-roll-arbitration` (Wave 3a): swap the active
   * `RollCapture` for a fresh empty one so the next engine call's
   * consumed rolls land in a clean buffer. Identity of the engine
   * callback is stable — it reads through `currentCapture`.
   */
  private installFreshCapture(): void {
    this.captureSwap(new RollCapture(this.sourceRoller));
  }

  /**
   * Per Wave 3a: stamp the captured d6 sequence onto every fresh event
   * before persistence + broadcast. Strategy: ALL captured rolls land
   * on the FIRST event whose payload doesn't already carry `rolls`.
   *
   * Why first-event attribution: splitting rolls across multiple events
   * by consumption order requires per-resolver instrumentation (each
   * resolver would need to drain a slice into its own emitted event).
   * For Wave 3a MVP we surface the full buffer on the lead event so
   * clients can render dice without re-rolling — finer-grained
   * attribution is a follow-up if a resolver emits more than one
   * dice-bearing event per intent.
   *
   * If the buffer is empty (deterministic intent like `Move` or
   * `AdvancePhase` from a phase that consumes no dice), we no-op.
   */
  private stampRollsOnNewEvents(
    events: readonly IGameEvent[],
  ): readonly IGameEvent[] {
    const captured = this.currentCapture.drain();
    if (captured.length === 0 || events.length === 0) {
      return events;
    }
    const stamped: IGameEvent[] = [];
    let attached = false;
    for (const evt of events) {
      if (!attached) {
        // Clone the payload with `rolls` stamped on. We use a shallow
        // spread because the payload types we touch are flat objects
        // (no nested readonly arrays we'd need to deep-clone).
        const newPayload = {
          ...(evt.payload as Record<string, unknown>),
          rolls: captured,
        };
        stamped.push({
          ...evt,
          payload: newPayload as IGameEvent['payload'],
        });
        attached = true;
      } else {
        stamped.push(evt);
      }
    }
    return stamped;
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
}

// Re-export the WebSocket type for the upgrade handler so it doesn't
// need a direct `ws` import alongside the host.
export type { WsWebSocket };
