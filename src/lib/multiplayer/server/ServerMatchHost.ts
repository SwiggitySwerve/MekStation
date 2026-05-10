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

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IPlayerRef } from '@/types/multiplayer/Player';

import {
  publishCombatOutcome,
  type ICombatOutcomeReadyEvent,
} from '@/engine/combatOutcomeBus';
import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  type IGameSessionChannel,
  type IReconnectRequestEnvelope,
} from '@/lib/p2p/gameSessionChannel';
import {
  matchLogStorage,
  type MatchLogStorage,
} from '@/lib/p2p/matchLogStorage';
import {
  type IIntent,
  type IEventMessage,
  type IServerMessage,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';
import type { IMatchSocket } from './ServerMatchSocketTypes';

import { CryptoDiceRoller, type IServerDiceRoller } from './CryptoDiceRoller';
import { FogOfWarVisibilityCache } from './fogOfWar';
import { PendingPeerTracker } from './reconnection/PendingPeerTracker';
import { RollCapture } from './RollCapture';
import { ServerMatchBroadcaster } from './ServerMatchBroadcaster';
import {
  buildHostSession,
  type IMatchHostBootstrap,
} from './ServerMatchHostBootstrap';
import { drainNewEvents } from './ServerMatchHostEngineDispatch';
import {
  broadcastEvent as broadcastEventWithContext,
  persistInitialEvents,
  stampRollsOnNewEvents,
} from './ServerMatchHostEvents';
import { handleIntent as handleIntentWithContext } from './ServerMatchHostIntent';
import { handleLobbyIntent as handleLobbyIntentWithContext } from './ServerMatchHostLobbyIntents';
import {
  maybeMarkPlayerPending,
  maybeResume,
  type IServerMatchHostReconnectContext,
} from './ServerMatchHostReconnectLifecycle';
import {
  bindReconnectChannel,
  getEventsFromSeq,
  handleReconnectRequest,
  handleSessionJoin,
  type IServerMatchHostReplayContext,
  sendReplay,
} from './ServerMatchHostReplay';
import { ServerMatchSocketLifecycle } from './ServerMatchSocketLifecycle';

type ReconnectMetadataReader = Pick<MatchLogStorage, 'getMatchMetadata'>;

// =============================================================================
// Socket abstraction
// =============================================================================

// Re-exported for external consumers (e.g. websocket upgrade handler) so the
// canonical home (`ServerMatchSocketTypes`) doesn't force a path change.
export type { IMatchSocket } from './ServerMatchSocketTypes';

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
export type { IMatchHostBootstrap } from './ServerMatchHostBootstrap';

// =============================================================================
// Host
// =============================================================================

export class ServerMatchHost {
  private readonly broadcaster = new ServerMatchBroadcaster();
  private readonly lifecycle: ServerMatchSocketLifecycle;
  private readonly fogVisibilityCache = new FogOfWarVisibilityCache();
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
   * Wave 4: per-pending-player grace timer registry. Owns the 120s
   * timeout per disconnected human seat. Cleared on reconnect, on
   * `MarkSeatAi`, or on `closeMatch` (the last via `clearAll`).
   */
  private readonly pendingPeers = new PendingPeerTracker();

  /**
   * Wave 4: when at least one human seat is `pending`, the host pauses
   * engine-mutating intents (`Move`, `Attack`, `AdvancePhase`,
   * `Concede`). Lobby intents — including the `MarkSeatAi`/
   * `ForfeitMatch` host overrides — are still allowed.
   */
  private isPaused = false;

  /**
   * Wave 5: server-side `CombatOutcomeReady` publish guard. The
   * `InteractiveSession.tryFinalizeAndPublish` is the primary publisher
   * (already wired) — this host-side guard is the safety net that
   * fires when the engine path is bypassed (e.g., closeMatch on a
   * server-driven shutdown that left the session in `Active` but the
   * win-condition predicate already trips). Idempotent — once set, no
   * further publishes happen for this match.
   */
  private hostOutcomePublished = false;

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
    this.lifecycle = new ServerMatchSocketLifecycle({
      matchId: this.matchId,
      broadcaster: this.broadcaster,
      onLastSocketDropped: (playerId) => {
        if (this.closed) return;
        // Fire-and-forget — meta lookup is async but socket close is
        // sync. Failures here just skip the pause path; the match keeps
        // running in degraded mode rather than crashing.
        void this.maybeMarkPlayerPending(playerId);
      },
    });
    // Stable callback identity — engine holds this reference for the
    // lifetime of the match. Routes every d6 through whatever
    // `currentCapture` points at right now.
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
    const { session, sourceRoller, captureRef } = buildHostSession(bootstrap);
    const host = new ServerMatchHost(matchId, store, session, sourceRoller);
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
    // Wave 4: a (re)connecting socket whose playerId was on the
    // pending list resolves the pause (or at least one slot of it).
    // Clear the timer here; the actual MatchResumed broadcast happens
    // in `handleSessionJoin` after we've re-bound the seat metadata,
    // so the order matches the proposal: replay → LobbyUpdated →
    // MatchResumed.
    this.pendingPeers.clearPending(playerId);
    this.lifecycle.attach(socket, playerId);
  }

  /**
   * Tear down per-socket bookkeeping. Safe to call from any disconnect
   * path (client bye, heartbeat timeout, host shutdown).
   */
  detachSocket(socket: IMatchSocket): void {
    this.lifecycle.detach(socket);
  }

  /**
   * Wave 4: look up whether `playerId` occupies a `human` seat in an
   * `active` match. If so, register the grace timer and broadcast
   * `MatchPaused` (idempotent — broadcast only on first pending peer).
   */
  private async maybeMarkPlayerPending(playerId: string): Promise<void> {
    await maybeMarkPlayerPending(this.reconnectContext(), playerId);
  }

  private maybeResume(): void {
    maybeResume({
      matchId: this.matchId,
      isPaused: this.isPaused,
      pendingPeers: this.pendingPeers,
      setPaused: (paused) => {
        this.isPaused = paused;
      },
      broadcast: (message) => this.broadcast(message),
    });
  }

  private reconnectContext(): IServerMatchHostReconnectContext {
    return {
      matchId: this.matchId,
      store: this.store,
      session: this.session,
      pendingPeers: this.pendingPeers,
      closed: this.closed,
      isPaused: this.isPaused,
      setPaused: (paused) => {
        this.isPaused = paused;
      },
      broadcast: (message) => this.broadcast(message),
      broadcastEvent: (message) => this.broadcastEvent(message),
      closeMatch: () => this.closeMatch(),
      installFreshCapture: () => this.installFreshCapture(),
      drainNewEvents: () => this.drainNewEvents(),
      stampRollsOnNewEvents: (events) => this.stampRollsOnNewEvents(events),
      tryPublishOutcome: () => this.tryPublishOutcome(),
    };
  }

  /**
   * Bookkeeping called by the upgrade handler whenever ANY message
   * comes in for this socket. Resets the dead-connection timer.
   */
  noteInbound(socket: IMatchSocket): void {
    this.lifecycle.noteInbound(socket);
  }

  // ---------------------------------------------------------------------------
  // Replay
  // ---------------------------------------------------------------------------

  /**
   * Send the event history >= `fromSeq` to one socket as a
   * `ReplayStart` → 0+ `ReplayChunk` → `ReplayEnd` triple. Wave 4
   * paginates via `streamReplay` (default 64 events per chunk).
   *
   * Replay envelopes go ONLY to the requesting socket — they are NOT
   * broadcast. Live events still go to every attached socket via
   * `broadcast()`.
   */
  async sendReplay(
    socket: IMatchSocket,
    fromSeq = 0,
    playerId?: string,
  ): Promise<void> {
    await sendReplay(this.replayContext(), socket, fromSeq, playerId);
  }

  async getEventsFromSeq(seq: number): Promise<readonly IGameEvent[]> {
    return getEventsFromSeq(this.replayContext(), seq);
  }

  async handleReconnectRequest(
    request: IReconnectRequestEnvelope,
    channel: Pick<
      IGameSessionChannel,
      | 'broadcastRejection'
      | 'broadcastReconnectReject'
      | 'broadcastReplayStream'
    >,
    metadataReader: ReconnectMetadataReader = matchLogStorage,
  ): Promise<void> {
    await handleReconnectRequest(
      this.replayContext(),
      request,
      channel,
      metadataReader,
    );
  }

  bindReconnectChannel(
    channel: Pick<
      IGameSessionChannel,
      | 'broadcastRejection'
      | 'broadcastReconnectReject'
      | 'broadcastReplayStream'
      | 'onReconnectRequest'
    >,
    metadataReader: ReconnectMetadataReader = matchLogStorage,
  ): () => void {
    return bindReconnectChannel(this.replayContext(), channel, metadataReader);
  }

  async handleSessionJoin(
    socket: IMatchSocket,
    playerId: string,
    lastSeq?: number,
    requestedMatchId = this.matchId,
  ): Promise<void> {
    await handleSessionJoin(
      this.replayContext(),
      socket,
      playerId,
      lastSeq,
      requestedMatchId,
    );
  }

  private replayContext(): IServerMatchHostReplayContext {
    return {
      matchId: this.matchId,
      store: this.store,
      session: this.session,
      safeSend: (socket, message) => this.safeSend(socket, message),
      maybeResume: () => this.maybeResume(),
    };
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
    return handleIntentWithContext(
      {
        matchId: this.matchId,
        store: this.store,
        session: this.session,
        closed: this.closed,
        isPaused: this.isPaused,
        broadcast: (message) => this.broadcast(message),
        broadcastEvent: (message) => this.broadcastEvent(message),
        closeMatch: () => this.closeMatch(),
        handleLobbyIntent: (lobbyEnvelope) =>
          this.handleLobbyIntent(lobbyEnvelope),
        installFreshCapture: () => this.installFreshCapture(),
        drainNewEvents: () => this.drainNewEvents(),
        stampRollsOnNewEvents: (events) => this.stampRollsOnNewEvents(events),
        tryPublishOutcome: () => this.tryPublishOutcome(),
      },
      envelope,
    );
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
    // Wave 4: cancel every pending grace timer so a finished match
    // doesn't keep Node alive (and so a delayed timer doesn't fire a
    // SeatTimedOut envelope on a closed host).
    this.pendingPeers.clearAll();
    // Wave 5: last-chance publish before we tear everything down.
    // If the match ended naturally (engine reached Completed) the bus
    // already fired through `InteractiveSession.tryFinalizeAndPublish`
    // and our local `hostOutcomePublished` guard makes this a no-op.
    // If the match was force-closed mid-fight (host crash, admin kill)
    // and the win-condition predicate happens to trip, this catches it.
    this.tryPublishOutcome();
    const socketList = this.lifecycle.snapshot();
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

  /**
   * Wave 5: server-side `CombatOutcomeReady` publish helper. Defensive
   * safety net — `InteractiveSession.tryFinalizeAndPublish` is the
   * primary path and runs synchronously inside `concede`,
   * `advancePhase`, `applyAttack`, etc., so by the time `handleIntent`
   * returns the bus has usually already fired (and our local guard
   * mirrors the engine's `outcomePublished`). This method exists so
   * the integration test can prove the bus emits even on the
   * server-side `closeMatch` path, and so a future code path that
   * bypasses the engine's lifecycle methods can still feed the
   * campaign store.
   *
   * Behavior:
   *   - Skip if we've already published from this host.
   *   - Skip if the engine's own guard already published (we mirror
   *     by reading `hasPublishedOutcome` so we never double-emit).
   *   - Skip if the session isn't game-over (most common case).
   *   - Otherwise, lift the outcome via `getOutcome()` and publish.
   *
   * Listener errors don't propagate (the bus swallows them).
   */
  private tryPublishOutcome(): void {
    if (this.hostOutcomePublished) return;
    if (this.session.hasPublishedOutcome()) {
      // Engine already fired; mirror the guard so we don't try again.
      this.hostOutcomePublished = true;
      return;
    }
    if (!this.session.isGameOver()) return;
    let outcome;
    try {
      outcome = this.session.getOutcome();
    } catch {
      // Defensive: derivation should be safe post-game-over, but if
      // anything throws we don't want to crash the host.
      return;
    }
    // `getOutcome()` itself routes through `tryFinalizeAndPublish`,
    // which means by the time it returns the engine guard is set and
    // the bus has fired. Re-check the engine guard so we mirror it.
    if (this.session.hasPublishedOutcome()) {
      this.hostOutcomePublished = true;
      return;
    }
    // Defensive belt: the engine guard didn't trip (shouldn't happen)
    // — publish ourselves. Mark our guard before emitting so a
    // re-entrant subscriber can't loop.
    this.hostOutcomePublished = true;
    const event: ICombatOutcomeReadyEvent = {
      matchId: outcome.matchId,
      outcome,
    };
    publishCombatOutcome(event);
  }

  /** Test/observability: number of currently-connected sockets. */
  socketCount(): number {
    return this.lifecycle.count();
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

  /** Wave 4 test/observability: is the match currently paused? */
  isPausedForReconnect(): boolean {
    return this.isPaused;
  }

  /** Wave 4 test/observability: snapshot pending peers (slot+player). */
  getPendingPeersForTests(): ReadonlyArray<{
    readonly playerId: string;
    readonly slotId: string;
  }> {
    return this.pendingPeers.getAllPending().map((p) => ({
      playerId: p.playerId,
      slotId: p.slotId,
    }));
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Snapshot any events the engine appended since our last broadcast
   * cursor and advance the cursor. Pure read against the live session.
   */
  private drainNewEvents(): readonly IGameEvent[] {
    const drained = drainNewEvents(
      this.session.getSession().events,
      this.lastBroadcastSeq,
    );
    this.lastBroadcastSeq = drained.lastBroadcastSeq;
    return drained.events;
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
    return stampRollsOnNewEvents(this.currentCapture, events);
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
    await persistInitialEvents({
      matchId: this.matchId,
      store: this.store,
      events,
      setLastBroadcastSeq: (sequence) => {
        this.lastBroadcastSeq = sequence;
      },
    });
  }

  /**
   * Send to every attached socket. Failures (closed socket, etc.) are
   * swallowed — the heartbeat timer will reap dead sockets.
   */
  private broadcast(message: IServerMessage): void {
    this.broadcaster.broadcast(message);
  }

  /**
   * Broadcast one live game event. With fog disabled this is the same
   * fan-out as `broadcast`; with fog enabled each recipient receives a
   * per-player filtered/redacted envelope or no envelope at all.
   */
  private async broadcastEvent(message: IEventMessage): Promise<void> {
    await broadcastEventWithContext({
      matchId: this.matchId,
      store: this.store,
      session: this.session,
      lifecycle: this.lifecycle,
      broadcaster: this.broadcaster,
      fogVisibilityCache: this.fogVisibilityCache,
      message,
      broadcast: (serverMessage) => this.broadcast(serverMessage),
    });
  }

  /**
   * Send to a single socket, swallowing send errors. Used for join +
   * replay paths where we don't want a single bad socket to throw out
   * of the upgrade handler.
   */
  private safeSend(socket: IMatchSocket, message: IServerMessage): void {
    this.broadcaster.safeSend(socket, message);
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
    const wasPaused = this.isPaused;
    const messages = await handleLobbyIntentWithContext(
      {
        matchId: this.matchId,
        store: this.store,
        session: this.session,
        playerRefs: this.playerRefs,
        pendingPeers: this.pendingPeers,
        broadcast: (message) => this.broadcast(message),
        broadcastEvent: (message) => this.broadcastEvent(message),
        maybeResume: () => this.maybeResume(),
        installFreshCapture: () => this.installFreshCapture(),
        drainNewEvents: () => this.drainNewEvents(),
        stampRollsOnNewEvents: (events) => this.stampRollsOnNewEvents(events),
      },
      envelope,
    );
    if (envelope.intent.kind === 'ForfeitMatch') {
      if (wasPaused) {
        this.isPaused = false;
      }
      this.tryPublishOutcome();
    }
    return messages;
  }
}

// Re-export the WebSocket type for the upgrade handler so it doesn't
// need a direct `ws` import alongside the host.
export type { WsWebSocket };
