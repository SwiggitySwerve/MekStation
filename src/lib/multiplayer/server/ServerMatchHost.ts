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
 * Architecture: this class is a thin orchestrator. The heavy concerns
 * live in co-located collaborators — `ServerMatchSocketLifecycle`,
 * `ServerMatchBroadcaster`, `ServerMatchHostCapture` (roll capture),
 * `ServerMatchHostOutcomePublisher` (Wave 5 publish safety net), and
 * the `ServerMatchHost*` free-function modules for replay / intent /
 * lobby / reconnect logic. `ServerMatchHostContexts` assembles the
 * plain context objects those free functions consume.
 *
 * Out of scope for this wave:
 *   - Lobby intents (Wave 3b)
 *   - Outcome bus passthrough (Wave 5 wires it).
 *
 * @spec openspec/changes/add-multiplayer-server-infrastructure/specs/multiplayer-server/spec.md
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

export type { WebSocket as WsWebSocket } from 'ws';

import type {
  IGameEvent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IPlayerRef } from '@/types/multiplayer/Player';

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
import type { IPublishNetworkedCommandResultInput } from './ServerMatchHostCommandResults';
import type { IMatchSocket } from './ServerMatchSocketTypes';

import { type IServerDiceRoller } from './CryptoDiceRoller';
import { FogOfWarVisibilityCache } from './fogOfWar';
import { AcceptedIntentTracker } from './reconnection/AcceptedIntentTracker';
import {
  migrateHostIfNeeded,
  type IHostMigrationResult,
} from './reconnection/HostMigration';
import { IntentRateLimiter } from './reconnection/IntentRateLimiter';
import { PendingPeerTracker } from './reconnection/PendingPeerTracker';
import { ServerMatchBroadcaster } from './ServerMatchBroadcaster';
import {
  buildHostSession,
  type IMatchHostBootstrap,
} from './ServerMatchHostBootstrap';
import { ServerMatchHostCapture } from './ServerMatchHostCapture';
import { publishNetworkedCommandResult } from './ServerMatchHostCommandResults';
import {
  buildCommandResultContext,
  buildIntentContext,
  buildLobbyContext,
  buildReconnectContext,
  buildReplayContext,
  type IServerMatchHostInternals,
} from './ServerMatchHostContexts';
import { drainNewEvents } from './ServerMatchHostEngineDispatch';
import {
  broadcastEvent as broadcastEventWithContext,
  persistInitialEvents,
} from './ServerMatchHostEvents';
import { handleIntent as handleIntentWithContext } from './ServerMatchHostIntent';
import { handleLobbyIntent as handleLobbyIntentWithContext } from './ServerMatchHostLobbyIntents';
import { ServerMatchHostOutcomePublisher } from './ServerMatchHostOutcomePublisher';
import {
  maybeMarkPlayerPending,
  maybeResume,
} from './ServerMatchHostReconnectLifecycle';
import {
  bindReconnectChannel,
  getEventsFromSeq,
  handleReconnectRequest,
  handleSessionJoin,
  sendReplay,
} from './ServerMatchHostReplay';
import { ServerMatchSocketLifecycle } from './ServerMatchSocketLifecycle';

type ReconnectMetadataReader = Pick<MatchLogStorage, 'getMatchMetadata'>;
type PendingPeerSnapshot = {
  readonly playerId: string;
  readonly slotId: string;
};

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
   * Wave 3a: the roll-capture cluster (source roller + per-intent
   * `RollCapture` swap + per-event stamping). A dedicated collaborator
   * so the host stays a thin orchestrator.
   */
  private readonly capture: ServerMatchHostCapture;

  /**
   * Wave 5: server-side `CombatOutcomeReady` publish safety net. A
   * dedicated collaborator owning the idempotency guard; the host
   * calls `tryPublish()` from `closeMatch` and the `ForfeitMatch` path.
   */
  private readonly outcomePublisher: ServerMatchHostOutcomePublisher;

  /**
   * harden-multiplayer-transport (M2), design D6 — per-connection
   * token-bucket intent rate limiter. One limiter per host; each
   * connection gets its own bucket keyed by socket identity.
   */
  private readonly rateLimiter = new IntentRateLimiter();

  /**
   * harden-multiplayer-transport (M2), design D7 — per-match
   * accepted-intent-id set for replay-attack detection. Reconstructed
   * from the event log when a match is recovered on server restart so
   * the replay window does not reopen.
   */
  private acceptedIntents = new AcceptedIntentTracker();

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
    options: { readonly recovered?: boolean } = {},
  ) {
    this.session = session;
    this.capture = new ServerMatchHostCapture(sourceRoller);
    this.outcomePublisher = new ServerMatchHostOutcomePublisher(session);
    this.lifecycle = new ServerMatchSocketLifecycle({
      matchId: this.matchId,
      broadcaster: this.broadcaster,
      onLastSocketDropped: (playerId) => {
        if (this.closed) return;
        // Fire-and-forget — meta lookup is async but socket close is
        // sync. Failures here just skip the degradation path; the match
        // keeps running rather than crashing.
        // harden-multiplayer-transport (M2): a host-connection loss
        // runs BOTH paths — host migration (design D4, privilege
        // reassignment to a survivor) AND the grace path (design D5,
        // pause-not-abort). They are independent: migration keeps
        // privileged ops available while the pause waits out the
        // dropped seat's grace window.
        void this.handleSocketDropped(playerId);
      },
    });
    const sessionEvents = session.getSession().events;
    if (options.recovered) {
      // Recovery path (design D3): the session was rebuilt by replaying
      // the durable event log, so the store already holds every event.
      // Do NOT re-persist — set the broadcast cursor to the tail and
      // reconstruct the replay-attack window from the stored log so a
      // restart does not reopen it (design D7).
      this.lastBroadcastSeq =
        sessionEvents.length > 0
          ? sessionEvents[sessionEvents.length - 1].sequence
          : -1;
      this.acceptedIntents = AcceptedIntentTracker.fromEventLog(sessionEvents);
    } else {
      // Fresh match: the engine appended `GameCreated` + `GameStarted`
      // during construction. Persist them BEFORE accepting any intents
      // so the store + the in-memory session never drift.
      this.lastBroadcastSeq = -1;
      void this.persistInitialEvents(sessionEvents);
    }
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
    // Re-route the host's capture pointer through the ref the engine
    // callback closed over, so per-intent swaps stay invisible.
    host.capture.adoptExternalCaptureRef(captureRef);
    return host;
  }

  /**
   * harden-multiplayer-transport (M2), design D3 — recovery factory.
   *
   * Build a `ServerMatchHost` for a match recovered from the durable
   * store on server startup. The caller has already replayed the
   * stored event log into `session` (via `hydrateGameSessionFromEvents`
   * wrapped in an `InteractiveSession`). This constructor variant skips
   * the initial-event persist (the events are already durably stored)
   * and reconstructs the replay-attack window from the log so a
   * restart does not reopen it.
   *
   * A reconnecting client's `SessionJoin` with its `lastSeq` then
   * streams the missing events through the already-built replay path —
   * recovery does not need to do anything special for that.
   */
  static recover(
    matchId: string,
    store: IMatchStore,
    session: InteractiveSession,
  ): ServerMatchHost {
    return new ServerMatchHost(matchId, store, session, undefined, {
      recovered: true,
    });
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
  attachSocket = (socket: IMatchSocket, playerId: string): void => {
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
  };

  /**
   * Tear down per-socket bookkeeping. Safe to call from any disconnect
   * path (client bye, heartbeat timeout, host shutdown).
   */
  detachSocket = (socket: IMatchSocket): void => {
    this.lifecycle.detach(socket);
  };

  /**
   * Wave 4: look up whether `playerId` occupies a `human` seat in an
   * `active` match. If so, register the grace timer and broadcast
   * `MatchPaused` (idempotent — broadcast only on first pending peer).
   */
  private async maybeMarkPlayerPending(playerId: string): Promise<void> {
    await maybeMarkPlayerPending(
      buildReconnectContext(this.internals()),
      playerId,
    );
  }

  /**
   * harden-multiplayer-transport (M2): a socket fully dropping for
   * `playerId` runs two independent paths:
   *   - design D4 — if the dropped player held `hostPlayerId`, host
   *     migration promotes the longest-connected surviving human seat
   *     so privileged operations stay available.
   *   - design D5 — the dropped seat enters the pending/grace path so
   *     the match pauses rather than aborting.
   * Migration runs first so a privileged op issued during the pause
   * window is authorized against the already-migrated host.
   */
  private async handleSocketDropped(playerId: string): Promise<void> {
    await this.migrateHostIfNeeded(playerId);
    await this.maybeMarkPlayerPending(playerId);
  }

  /**
   * Design D4 — promote a survivor to `hostPlayerId` when the host's
   * connection is lost. A no-op when `playerId` was not the host or
   * when no human seat survives (the grace path then handles it).
   */
  private async migrateHostIfNeeded(
    playerId: string,
  ): Promise<IHostMigrationResult> {
    return migrateHostIfNeeded(
      {
        matchId: this.matchId,
        store: this.store,
        connectedSince: () => this.lifecycle.snapshotConnectedSince(),
        broadcast: (message) => this.broadcast(message),
      },
      playerId,
    );
  }

  /**
   * Wave 4: resolve the pause when the last pending peer reconnects.
   */
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

  /**
   * Bookkeeping called by the upgrade handler whenever ANY message
   * comes in for this socket. Resets the dead-connection timer.
   */
  noteInbound = (socket: IMatchSocket): void => {
    this.lifecycle.noteInbound(socket);
  };

  // ---------------------------------------------------------------------------
  // Replay
  // ---------------------------------------------------------------------------

  /**
   * Stream the event history >= `fromSeq` to one socket. Delegates to
   * `ServerMatchHostReplay.sendReplay` (framing + fog filtering there).
   */
  sendReplay = async (
    socket: IMatchSocket,
    fromSeq = 0,
    playerId?: string,
  ): Promise<void> => {
    await sendReplay(
      buildReplayContext(this.internals()),
      socket,
      fromSeq,
      playerId,
    );
  };

  /** Read the raw event history >= `seq` (delegates to replay module). */
  getEventsFromSeq = async (seq: number): Promise<readonly IGameEvent[]> => {
    return getEventsFromSeq(buildReplayContext(this.internals()), seq);
  };

  /** Answer a P2P reconnect request (delegates to replay module). */
  handleReconnectRequest = async (
    request: IReconnectRequestEnvelope,
    channel: Pick<
      IGameSessionChannel,
      | 'broadcastRejection'
      | 'broadcastReconnectReject'
      | 'broadcastReplayStream'
    >,
    metadataReader: ReconnectMetadataReader = matchLogStorage,
  ): Promise<void> => {
    await handleReconnectRequest(
      buildReplayContext(this.internals()),
      request,
      channel,
      metadataReader,
    );
  };

  /**
   * Subscribe to reconnect requests on a P2P channel; returns an
   * unsubscribe function (delegates to replay module).
   */
  bindReconnectChannel = (
    channel: Pick<
      IGameSessionChannel,
      | 'broadcastRejection'
      | 'broadcastReconnectReject'
      | 'broadcastReplayStream'
      | 'onReconnectRequest'
    >,
    metadataReader: ReconnectMetadataReader = matchLogStorage,
  ): (() => void) => {
    return bindReconnectChannel(
      buildReplayContext(this.internals()),
      channel,
      metadataReader,
    );
  };

  /**
   * Handle a `SessionJoin`: replay history, re-bind seat metadata, and
   * broadcast `LobbyUpdated`/`MatchResumed` (delegates to replay
   * module).
   */
  handleSessionJoin = async (
    socket: IMatchSocket,
    playerId: string,
    lastSeq?: number,
    requestedMatchId = this.matchId,
  ): Promise<void> => {
    await handleSessionJoin(
      buildReplayContext(this.internals()),
      socket,
      playerId,
      lastSeq,
      requestedMatchId,
    );
  };

  // ---------------------------------------------------------------------------
  // Intent dispatch
  // ---------------------------------------------------------------------------

  /**
   * Apply an intent. Returns a list of broadcast envelopes (events +
   * any error) that have already been sent to all sockets. Returning
   * them lets tests assert without reaching into the socket mock.
   *
   * `connectionKey` identifies the inbound socket so the per-connection
   * rate limiter (design D6) debits the right bucket. The WebSocket
   * upgrade handler passes the per-socket identity; tests may pass any
   * stable string (or omit it for a shared bucket).
   */
  handleIntent = async (
    envelope: IIntent,
    connectionKey?: string,
  ): Promise<readonly IServerMessage[]> => {
    return handleIntentWithContext(
      buildIntentContext(this.internals()),
      envelope,
      connectionKey,
    );
  };

  publishHostCommandResult = async (
    input: IPublishNetworkedCommandResultInput,
  ): Promise<IEventMessage> => {
    if (this.closed) {
      throw new Error('Match is closed');
    }

    const message = await publishNetworkedCommandResult(
      buildCommandResultContext(this.internals()),
      input,
    );
    this.lastBroadcastSeq = Math.max(
      this.lastBroadcastSeq,
      (message.event as IGameEvent).sequence,
    );
    return message;
  };

  /**
   * harden-multiplayer-transport (M2) test/observability: drop a
   * connection's rate-limit bucket. The WebSocket upgrade handler calls
   * this on socket detach so per-socket state is not retained forever.
   */
  releaseConnection = (connectionKey: string): void =>
    void this.rateLimiter.release(connectionKey);

  /** Test/observability: number of accepted intent ids retained. */
  acceptedIntentCount = (): number => this.acceptedIntents.size();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Close the match: drop all sockets, kill heartbeats, mark the store.
   * Idempotent.
   */
  closeMatch = async (): Promise<void> => {
    if (this.closed) return;
    this.closed = true;
    // Wave 4: cancel every pending grace timer so a finished match
    // doesn't keep Node alive (and so a delayed timer doesn't fire a
    // SeatTimedOut envelope on a closed host).
    this.pendingPeers.clearAll();
    // Wave 5: last-chance publish before we tear everything down.
    // If the match ended naturally (engine reached Completed) the bus
    // already fired through `InteractiveSession.tryFinalizeAndPublish`
    // and the publisher's `hostOutcomePublished` guard makes this a
    // no-op. If the match was force-closed mid-fight (host crash, admin
    // kill) and the win-condition predicate happens to trip, this
    // catches it.
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
  };

  /**
   * Wave 5: delegate to the outcome-publisher safety net. Kept as a
   * host method so the context builders can pass a stable callback.
   */
  private tryPublishOutcome = (): void =>
    void this.outcomePublisher.tryPublish();

  /** Test/observability: number of currently-connected sockets. */
  socketCount = (): number => this.lifecycle.count();

  /** Test/observability: most recent broadcast sequence (or -1). */
  highestSeq = (): number => this.lastBroadcastSeq;

  /** Test/observability: pull the live session (for assertions). */
  getSessionForTests = (): IGameSession => this.session.getSession();

  /** Whether `closeMatch` has run. */
  isClosed = (): boolean => this.closed;

  /** Wave 4 test/observability: is the match currently paused? */
  isPausedForReconnect = (): boolean => this.isPaused;

  /** Wave 4 test/observability: snapshot pending peers (slot+player). */
  getPendingPeersForTests = (): ReadonlyArray<PendingPeerSnapshot> =>
    this.pendingPeers.getAllPending().map((p) => ({
      playerId: p.playerId,
      slotId: p.slotId,
    }));

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /**
   * Assemble the `IServerMatchHostInternals` port the context builders
   * consume. A fresh object per call so the `closed` / `isPaused`
   * fields are captured by value at the moment a context is built —
   * matching the prior inline `*Context()` semantics exactly. All
   * callbacks are bound arrows so the free-function modules can hold
   * stable references without `this` rebinding.
   */
  private internals(): IServerMatchHostInternals {
    return {
      matchId: this.matchId,
      store: this.store,
      session: this.session,
      closed: this.closed,
      isPaused: this.isPaused,
      playerRefs: this.playerRefs,
      pendingPeers: this.pendingPeers,
      setPaused: (paused) => {
        this.isPaused = paused;
      },
      broadcast: (message) => this.broadcast(message),
      broadcastEvent: (message) => this.broadcastEvent(message),
      safeSend: (socket, message) => this.safeSend(socket, message),
      closeMatch: () => this.closeMatch(),
      maybeResume: () => this.maybeResume(),
      installFreshCapture: () => this.installFreshCapture(),
      drainNewEvents: () => this.drainNewEvents(),
      stampRollsOnNewEvents: (events) => this.stampRollsOnNewEvents(events),
      tryPublishOutcome: () => this.tryPublishOutcome(),
      handleLobbyIntent: (envelope) => this.handleLobbyIntent(envelope),
      rateLimiter: this.rateLimiter,
      acceptedIntents: this.acceptedIntents,
    };
  }

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
   * Per Wave 3a: swap the active `RollCapture` for a fresh empty one so
   * the next engine call's consumed rolls land in a clean buffer.
   * Delegates to the capture collaborator.
   */
  private installFreshCapture = (): void => void this.capture.installFresh();

  /**
   * Per Wave 3a: stamp the captured d6 sequence onto every fresh event
   * before persistence + broadcast. Delegates to the capture
   * collaborator (first-event attribution strategy documented there).
   */
  private stampRollsOnNewEvents = (
    events: readonly IGameEvent[],
  ): readonly IGameEvent[] => this.capture.stampRollsOnNewEvents(events);

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
  private broadcast = (message: IServerMessage): void =>
    void this.broadcaster.broadcast(message);

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
  private safeSend = (socket: IMatchSocket, message: IServerMessage): void =>
    void this.broadcaster.safeSend(socket, message);

  // ---------------------------------------------------------------------------
  // Wave 3b — lobby intent handlers
  // ---------------------------------------------------------------------------

  /**
   * Public test hook so the integration suite can simulate "host joined
   * via WS and registered a player ref" without standing up the whole
   * REST + auth path. Production wiring sets the ref on first
   * SessionJoin so subsequent OccupySeat intents have a name to use.
   */
  registerPlayerRef = (ref: IPlayerRef): void =>
    void this.playerRefs.set(ref.playerId, ref);

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
      buildLobbyContext(this.internals()),
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
