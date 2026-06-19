/**
 * ServerMatchSocketLifecycle — owns the per-socket heartbeat timer and
 * the attached-socket registry for one `ServerMatchHost`.
 *
 * Responsibilities (extracted from `ServerMatchHost`):
 *   - Track every attached socket plus the per-socket bookkeeping
 *     (`playerId`, `lastInboundAt`, heartbeat `setInterval` handle).
 *   - On `attach`, register the socket with the broadcaster so fan-out
 *     reaches it, then spin up the heartbeat timer (server pings every
 *     `HEARTBEAT_INTERVAL_MS`; missing inbound traffic for
 *     `HEARTBEAT_TIMEOUT_MS` is treated as a dead connection and
 *     auto-detaches).
 *   - On `detach`, kill the heartbeat, deregister from the broadcaster,
 *     drop our local row, and `socket.close()` (swallowing errors).
 *   - When the LAST socket for a given `playerId` drops, fire the
 *     `onLastSocketDropped` callback so the host can run its
 *     reconnection grace-pause logic. Reattaches that introduce new
 *     sockets do NOT fire the callback; only the fall-to-zero edge does.
 *   - Provide a `noteInbound` hook so the upgrade handler can reset the
 *     dead-connection timer on every inbound envelope.
 *   - Expose `count()` / `snapshot()` for observability + closeMatch().
 *
 * Design notes:
 *   - Owns nothing about the engine, store, or session — strictly socket
 *     plumbing. Callbacks decouple it from the host's pause / forfeit
 *     state machines.
 *   - Send failures from heartbeat pings are swallowed: the next idle
 *     check will reap the dead socket. The broadcaster has the same
 *     contract for fan-out.
 *
 * Extracted from `ServerMatchHost` so the host facade can orchestrate
 * collaborators (broadcaster, this lifecycle, pause controller, intent
 * dispatchers) without owning the wire-level bookkeeping itself.
 */

import {
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type { ServerMatchBroadcaster } from './ServerMatchBroadcaster';
import type { IMatchSocket } from './ServerMatchSocketTypes';

/**
 * Per-socket bookkeeping kept in a side-Map. We don't subclass the
 * socket itself because the `ws` library's WebSocket type is not
 * trivially extendable across versions.
 */
interface ISocketState {
  socket: IMatchSocket;
  playerId: string;
  lastInboundAt: number;
  /**
   * Wall-clock ms when this socket attached. Per
   * `harden-multiplayer-transport` design D4, host migration promotes
   * the *longest-connected* surviving human seat — `connectedAt` is the
   * tiebreak so the most stable connection inherits host privilege.
   */
  connectedAt: number;
  heartbeatTimer: NodeJS.Timeout;
}

/**
 * Construction-time dependencies. The host owns the broadcaster + match
 * id + the "what to do when the last socket drops for a player"
 * callback; the lifecycle just borrows them.
 */
export interface IServerMatchSocketLifecycleDeps {
  readonly matchId: string;
  readonly broadcaster: ServerMatchBroadcaster;
  /**
   * Fired when a `detach` reduces the open-socket count for a
   * particular `playerId` to zero. The host uses this hook to start
   * the Wave 4 reconnect grace timer (see
   * `ServerMatchHost.maybeMarkPlayerPending`). Re-entrant safe — the
   * lifecycle has already removed the socket before invoking.
   */
  readonly onLastSocketDropped: (playerId: string) => void;
}

export class ServerMatchSocketLifecycle {
  /**
   * Live registry of attached sockets keyed by socket identity. The
   * broadcaster keeps its own parallel set (registered via `attach` /
   * `detach`) — we don't read the broadcaster's set, we just keep the
   * two in lockstep.
   */
  private readonly sockets = new Map<IMatchSocket, ISocketState>();

  constructor(private readonly deps: IServerMatchSocketLifecycleDeps) {}

  /**
   * Register a socket with the broadcaster and start its heartbeat
   * timer. Idempotent for the broadcaster (`Set.add`); for the
   * lifecycle, calling `attach` twice on the same socket overwrites
   * the prior heartbeat entry — callers shouldn't do that, but we
   * defensively `clearInterval` the old timer so we don't leak.
   */
  attach = (socket: IMatchSocket, playerId: string): void => {
    const existing = this.sockets.get(socket);
    if (existing) {
      // Defensive: caller re-attached the same socket. Kill the old
      // timer so we don't leak it. Real callers (the upgrade handler)
      // never hit this path; tests that re-use a mock socket might.
      clearInterval(existing.heartbeatTimer);
    }

    this.deps.broadcaster.register(socket);

    const heartbeatTimer = setInterval(() => {
      const state = this.sockets.get(socket);
      if (!state) return;
      const idleFor = Date.now() - state.lastInboundAt;
      if (idleFor > HEARTBEAT_TIMEOUT_MS) {
        // Treat as dead — close + detach. The detach path also
        // unregisters with the broadcaster so subsequent fan-outs
        // skip this socket.
        this.detach(socket);
        return;
      }
      try {
        socket.send(
          JSON.stringify({
            kind: 'Heartbeat',
            matchId: this.deps.matchId,
            ts: nowIso(),
          }),
        );
      } catch {
        // Socket is dead — the next idle check will reap it.
      }
    }, HEARTBEAT_INTERVAL_MS);

    // `unref` so a dangling timer doesn't keep Node alive in tests; it
    // exists only on `NodeJS.Timeout`, never on the browser-style
    // `Timer`. We're always in Node here, but the cast keeps TS happy.
    if (typeof (heartbeatTimer as NodeJS.Timeout).unref === 'function') {
      (heartbeatTimer as NodeJS.Timeout).unref();
    }

    const nowMs = Date.now();
    this.sockets.set(socket, {
      socket,
      playerId,
      lastInboundAt: nowMs,
      connectedAt: nowMs,
      heartbeatTimer,
    });
  };

  /**
   * Tear down per-socket bookkeeping. Safe to call from any disconnect
   * path (client bye, heartbeat timeout, host shutdown). Idempotent —
   * detach on an already-detached socket is a no-op.
   *
   * Order of operations matters:
   *   1. Look up the per-socket state. Bail if not present (idempotent).
   *   2. Kill the heartbeat timer so a late tick doesn't fire after detach.
   *   3. Drop from our local registry + the broadcaster's fan-out set.
   *   4. Compute "was this the last socket for that playerId?" by
   *      scanning the post-delete map. If yes, fire the callback so
   *      the host can start the grace timer.
   *   5. Close the underlying socket, swallowing errors (it's normal
   *      for `ws` to throw if the peer already FIN'd).
   */
  detach = (socket: IMatchSocket): void => {
    const state = this.sockets.get(socket);
    if (!state) return;
    clearInterval(state.heartbeatTimer);
    this.sockets.delete(socket);
    this.deps.broadcaster.unregister(socket);

    const { playerId } = state;
    const stillHasSocket = Array.from(this.sockets.values()).some(
      (s) => s.playerId === playerId,
    );
    if (!stillHasSocket) {
      this.deps.onLastSocketDropped(playerId);
    }

    try {
      socket.close();
    } catch {
      // already closed — ignore
    }
  };

  /**
   * Bookkeeping called by the upgrade handler whenever ANY message
   * comes in for this socket. Resets the dead-connection timer.
   * No-op if the socket isn't tracked (e.g. already detached).
   */
  noteInbound = (socket: IMatchSocket): void => {
    const state = this.sockets.get(socket);
    if (!state) return;
    state.lastInboundAt = Date.now();
  };

  /** Number of currently-attached sockets. */
  count = (): number => {
    return this.sockets.size;
  };

  /**
   * Snapshot the currently-attached sockets. Returned as an array so
   * callers can iterate without observing concurrent mutations to the
   * registry (e.g. `closeMatch` walks every socket and detaches each
   * one).
   */
  snapshot = (): readonly IMatchSocket[] => {
    return Array.from(this.sockets.keys());
  };

  /**
   * Snapshot sockets with their authenticated player id. Used by
   * per-recipient delivery paths such as fog-of-war filtering.
   */
  snapshotRecipients = (): readonly {
    readonly socket: IMatchSocket;
    readonly playerId: string;
  }[] => {
    return Array.from(this.sockets.values()).map((state) => ({
      socket: state.socket,
      playerId: state.playerId,
    }));
  };

  /**
   * True iff `playerId` currently has at least one attached socket.
   * Used by host migration (design D4) to decide which seats survive.
   */
  hasPlayer = (playerId: string): boolean => {
    return Array.from(this.sockets.values()).some(
      (s) => s.playerId === playerId,
    );
  };

  /**
   * Snapshot every connected player id with the wall-clock ms its
   * *earliest* still-attached socket connected. Per design D4 host
   * migration ranks surviving human seats by connection longevity —
   * the smallest `connectedAt` is the longest-connected player. A
   * player with two tabs is reported once, with the earlier tab's time.
   */
  snapshotConnectedSince = (): ReadonlyMap<string, number> => {
    const earliest = new Map<string, number>();
    for (const state of Array.from(this.sockets.values())) {
      const prior = earliest.get(state.playerId);
      if (prior === undefined || state.connectedAt < prior) {
        earliest.set(state.playerId, state.connectedAt);
      }
    }
    return earliest;
  };
}
