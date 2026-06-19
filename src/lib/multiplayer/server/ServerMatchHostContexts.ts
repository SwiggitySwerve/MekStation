/**
 * ServerMatchHostContexts — pure context-object factories for one
 * `ServerMatchHost`.
 *
 * Why a separate collaborator: each sibling concern (reconnect
 * lifecycle, replay, intent dispatch, lobby intents) consumes its own
 * plain context object. Assembling those four objects is mechanical
 * wiring with zero state of its own — keeping it inline bloated the
 * host with ~110 lines of boilerplate. These builders take a single
 * `IServerMatchHostInternals` port (the bits of the host the contexts
 * need) and produce the exact same context shapes the host built
 * inline.
 *
 * Behavior is identical to the inline `*Context()` methods + the
 * inline literal objects passed to `handleIntent` / `handleLobbyIntent`
 * — pure structural extraction.
 */

import type { InteractiveSession } from '@/engine/InteractiveSession';
import type { IPlayerRef } from '@/types/multiplayer/Player';
import type {
  IEventMessage,
  IIntent,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IMatchStore } from './IMatchStore';
import type { AcceptedIntentTracker } from './reconnection/AcceptedIntentTracker';
import type { IntentRateLimiter } from './reconnection/IntentRateLimiter';
import type { PendingPeerTracker } from './reconnection/PendingPeerTracker';
import type { IServerMatchHostCaptureContext } from './ServerMatchHostCaptureContext';
import type { IServerMatchHostIntentContext } from './ServerMatchHostIntent';
import type { IServerMatchHostLobbyContext } from './ServerMatchHostLobbyIntents';
import type { IServerMatchHostReconnectContext } from './ServerMatchHostReconnectLifecycle';
import type { IServerMatchHostReplayContext } from './ServerMatchHostReplay';
import type { IMatchSocket } from './ServerMatchSocketTypes';

/**
 * The slice of `ServerMatchHost` the context builders need. The host
 * implements this port; the builders never reach for anything not
 * declared here, which keeps the host ↔ context coupling explicit and
 * one-directional.
 */
export interface IServerMatchHostInternals extends IServerMatchHostCaptureContext {
  readonly matchId: string;
  readonly store: IMatchStore;
  readonly session: InteractiveSession;
  /** Current closed flag — captured by value into each context. */
  readonly closed: boolean;
  /** Current paused flag — captured by value into each context. */
  readonly isPaused: boolean;
  readonly playerRefs: ReadonlyMap<string, IPlayerRef>;
  readonly pendingPeers: PendingPeerTracker;
  readonly setPaused: (paused: boolean) => void;
  readonly broadcast: (message: IServerMessage) => void;
  readonly broadcastEvent: (message: IEventMessage) => Promise<void>;
  readonly safeSend: (socket: IMatchSocket, message: IServerMessage) => void;
  readonly closeMatch: () => Promise<void>;
  readonly maybeResume: () => void;
  readonly tryPublishOutcome: () => void;
  readonly handleLobbyIntent: (
    envelope: IIntent,
  ) => Promise<readonly IServerMessage[]>;
  /**
   * harden-multiplayer-transport (M2) — per-connection intent rate
   * limiter (design D6) and per-match accepted-intent-id tracker for
   * replay-attack detection (design D7).
   */
  readonly rateLimiter: IntentRateLimiter;
  readonly acceptedIntents: AcceptedIntentTracker;
}

/**
 * Build the reconnect-lifecycle context: the bits
 * `maybeMarkPlayerPending` / `maybeResume` and the grace-timeout
 * handler need to pause/resume a match and drive the engine.
 */
export function buildReconnectContext(
  host: IServerMatchHostInternals,
): IServerMatchHostReconnectContext {
  return {
    matchId: host.matchId,
    store: host.store,
    session: host.session,
    pendingPeers: host.pendingPeers,
    closed: host.closed,
    isPaused: host.isPaused,
    setPaused: host.setPaused,
    broadcast: host.broadcast,
    broadcastEvent: host.broadcastEvent,
    closeMatch: host.closeMatch,
    installFreshCapture: host.installFreshCapture,
    drainNewEvents: host.drainNewEvents,
    stampRollsOnNewEvents: host.stampRollsOnNewEvents,
    tryPublishOutcome: host.tryPublishOutcome,
  };
}

/**
 * Build the replay context: replay + reconnect-request handlers only
 * need to read the session, single-send to one socket, and resume.
 */
export function buildReplayContext(
  host: IServerMatchHostInternals,
): IServerMatchHostReplayContext {
  return {
    matchId: host.matchId,
    store: host.store,
    session: host.session,
    safeSend: host.safeSend,
    maybeResume: host.maybeResume,
  };
}

/**
 * Build the intent-dispatch context: everything `handleIntent` needs
 * to validate, dispatch into the engine, capture rolls, broadcast, and
 * route lobby intents back to the host.
 */
export function buildIntentContext(
  host: IServerMatchHostInternals,
): IServerMatchHostIntentContext {
  return {
    matchId: host.matchId,
    store: host.store,
    session: host.session,
    closed: host.closed,
    isPaused: host.isPaused,
    broadcast: host.broadcast,
    broadcastEvent: host.broadcastEvent,
    closeMatch: host.closeMatch,
    handleLobbyIntent: host.handleLobbyIntent,
    installFreshCapture: host.installFreshCapture,
    drainNewEvents: host.drainNewEvents,
    stampRollsOnNewEvents: host.stampRollsOnNewEvents,
    tryPublishOutcome: host.tryPublishOutcome,
    rateLimiter: host.rateLimiter,
    acceptedIntents: host.acceptedIntents,
  };
}

/**
 * Build the lobby-intent context: lobby intents need the player-ref
 * cache + pending-peer tracker on top of the engine-dispatch bits, but
 * NOT `closeMatch`/`tryPublishOutcome` (the host handles the
 * `ForfeitMatch` outcome publish after the lobby handler returns).
 */
export function buildLobbyContext(
  host: IServerMatchHostInternals,
): IServerMatchHostLobbyContext {
  return {
    matchId: host.matchId,
    store: host.store,
    session: host.session,
    playerRefs: host.playerRefs,
    pendingPeers: host.pendingPeers,
    broadcast: host.broadcast,
    broadcastEvent: host.broadcastEvent,
    maybeResume: host.maybeResume,
    installFreshCapture: host.installFreshCapture,
    drainNewEvents: host.drainNewEvents,
    stampRollsOnNewEvents: host.stampRollsOnNewEvents,
  };
}
