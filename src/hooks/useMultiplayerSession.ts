/**
 * useMultiplayerSession — React hook wrapping `client.ts` for the lobby
 * + match UI surfaces.
 *
 * Wave 5 of Phase 4 (capstone integration). This is the React-side
 * adapter for the framework-agnostic multiplayer client; it connects
 * once on mount, tracks lifecycle status, accumulates the latest lobby
 * snapshot, and re-emits engine events through React state so the UI
 * re-renders on each broadcast.
 *
 * `complete-multiplayer-game-surface` (Wave 3 M1) extends the hook with
 * the networked game surface's needs:
 *   - `mirrorSession` — a read-only client mirror `IGameSession` built
 *     by applying every received `IGameEvent` (replay + live) through
 *     the engine reducer in `sequence` order (D2). The networked
 *     tactical map renders from this.
 *   - `mirrorEvents` — the ordered `IGameEvent[]` the mirror was built
 *     from, fed straight to `HexMapDisplay` for animations / effects.
 *   - `sendGameIntent` — a typed forwarder that wraps an `IGameIntent`
 *     in an `Intent` envelope and sends it over the existing socket
 *     (D3). The client never resolves the action locally.
 *   - `intentError` — the most recent server `Error` envelope, surfaced
 *     as a non-fatal notification; the connection stays open (D3).
 *   - `pausedInfo` / `closedInfo` — the lifecycle payloads the game
 *     surface renders as a pause overlay / terminal panel (D6).
 *
 * SSR safety: this hook MUST NOT call `connect()` during server render.
 * All real work runs inside the `useEffect` branch so SSR sees a stable
 * initial state.
 *
 * @spec openspec/specs/multiplayer-game-surface/spec.md
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  IClientAuth,
  IConnectOptions,
  IMultiplayerClient,
} from '@/lib/multiplayer/client';
import type {
  IGameEvent,
  IGameIntent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  IIntentPayload,
  ILobbyUpdated,
} from '@/types/multiplayer/Protocol';

import { toServerIntent } from '@/lib/multiplayer/gameIntentMap';
import {
  buildMirrorSession,
  mirrorEvents as deriveMirrorEvents,
} from '@/lib/multiplayer/mirrorMatchSession';

import {
  connectMultiplayerSession,
  resetMultiplayerConnectionState,
  sendClientIntent,
} from './useMultiplayerSession.helpers';

// =============================================================================
// Types
// =============================================================================

/**
 * High-level connection lifecycle for the UI banner. Maps to the
 * lower-level client events but collapses transient frames so the
 * banner doesn't flicker mid-sequence.
 */
export type MultiplayerStatus =
  | 'idle' // hook hasn't connected yet (SSR / pre-mount)
  | 'connecting' // socket open in flight or replay streaming
  | 'ready' // replay drained; live events flowing
  | 'paused' // server reported MatchPaused
  | 'closed' // server sent Close OR socket closed by caller
  | 'error'; // connection-level failure

export interface IMultiplayerError {
  readonly code?: string;
  readonly reason?: string;
}

/**
 * The `MatchPaused` payload surfaced to the game surface so it can name
 * the pending seat(s) and render the grace countdown (D6).
 */
export interface IMatchPausedInfo {
  readonly pendingSlots: readonly string[];
  readonly graceRemainingMs: number;
  readonly pendingExpiresAtMs: number | null;
}

/**
 * The terminal `Close` payload surfaced to the game surface so it can
 * render the route-back panel (D6).
 */
export interface IMatchClosedInfo {
  readonly code?: string;
  readonly reason?: string;
}

export interface IUseMultiplayerSessionOptions {
  /**
   * Disable auto-reconnect (pass-through to the client). Tests usually
   * set this to `false` for deterministic teardown.
   */
  readonly reconnect?: boolean;
  /** Optional reconnect-attempt cap before surfacing a terminal close. */
  readonly maxReconnectAttempts?: number;
  /**
   * Override the WebSocket factory (tests inject a mock socket here so
   * the React hook doesn't need a real WS server).
   */
  readonly socketFactory?: IConnectOptions['socketFactory'];
  /**
   * Optional starting `lastSeq` for resume-on-mount. Defaults to -1
   * (full replay). The page passes through whatever the client.lastSeq
   * was on its previous connection.
   */
  readonly lastSeq?: number;
}

export interface IUseMultiplayerSessionResult {
  readonly status: MultiplayerStatus;
  readonly lobbyState: ILobbyUpdated | null;
  readonly events: readonly unknown[];
  readonly error: IMultiplayerError | null;
  readonly sendIntent: (intent: IIntentPayload) => void;
  /** Last server sequence number observed (for reconnect resume). */
  readonly lastSeq: number;
  /**
   * Read-only client mirror of the authoritative session, rebuilt from
   * every received `IGameEvent` in `sequence` order. `null` until the
   * seed `GameCreated` event has been applied (D2).
   */
  readonly mirrorSession: IGameSession | null;
  /**
   * The ordered `IGameEvent[]` the mirror was built from — fed straight
   * to `HexMapDisplay` for animations and effect overlays.
   */
  readonly mirrorEvents: readonly IGameEvent[];
  /**
   * Send a player action: wraps the `IGameIntent` in an `Intent`
   * envelope and forwards it over the socket. The client does NOT
   * resolve the action locally — the mirror updates only when the
   * server's broadcast `Event` arrives (D3). Returns `true` when the
   * intent was sent, `false` when it could not be mapped to a server
   * intent (the caller surfaces a notification).
   */
  readonly sendGameIntent: (intent: IGameIntent) => boolean;
  /**
   * Most recent server `Error` envelope (e.g. wrong-phase,
   * unauthorized-unit). Non-fatal — the connection stays open. `null`
   * until an error arrives; cleared by `clearIntentError`.
   */
  readonly intentError: IMultiplayerError | null;
  /** Clear the non-fatal `intentError` (e.g. after the toast dismisses). */
  readonly clearIntentError: () => void;
  /** `MatchPaused` payload while the match is paused; `null` otherwise. */
  readonly pausedInfo: IMatchPausedInfo | null;
  /** Terminal `Close` payload once the match has closed; `null` before. */
  readonly closedInfo: IMatchClosedInfo | null;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Connect to a multiplayer match and surface its state to React. The
 * connection is established on mount and torn down on unmount.
 *
 * Re-renders when:
 *   - status transitions
 *   - a new event arrives (and the mirror is rebuilt)
 *   - a `LobbyUpdated` snapshot lands
 *   - an error frame is received
 *
 * The returned `sendIntent` / `sendGameIntent` are stable across
 * renders (memoised) so they're safe to pass into child components.
 */
export function useMultiplayerSession(
  url: string | null,
  matchId: string | null,
  auth: IClientAuth | null,
  options: IUseMultiplayerSessionOptions = {},
): IUseMultiplayerSessionResult {
  const [status, setStatus] = useState<MultiplayerStatus>('idle');
  const [lobbyState, setLobbyState] = useState<ILobbyUpdated | null>(null);
  const [events, setEvents] = useState<readonly unknown[]>([]);
  const [error, setError] = useState<IMultiplayerError | null>(null);
  const [lastSeq, setLastSeq] = useState<number>(-1);
  const [intentError, setIntentError] = useState<IMultiplayerError | null>(
    null,
  );
  const [pausedInfo, setPausedInfo] = useState<IMatchPausedInfo | null>(null);
  const [closedInfo, setClosedInfo] = useState<IMatchClosedInfo | null>(null);
  // The full, uncapped game-event log the mirror is rebuilt from. Kept
  // in React state (not just a ref) so a new event triggers a rebuild +
  // re-render; kept SEPARATE from the capped `events` tail because the
  // mirror must apply every event since `GameCreated` to stay in sync.
  const [mirrorLog, setMirrorLog] = useState<readonly unknown[]>([]);

  // Stable ref for the live client so `sendIntent` can be memoised
  // without depending on a state value that re-renders on every event.
  const clientRef = useRef<IMultiplayerClient | null>(null);
  const lobbyStateRef = useRef<ILobbyUpdated | null>(null);

  useEffect(() => {
    // SSR + pre-config gate: nothing to do until the page has all four
    // pieces it needs (browser env, url, matchId, auth blob).
    if (typeof window === 'undefined') return;
    if (!url || !matchId || !auth) return;

    resetMultiplayerConnectionState({
      setStatus,
      setError,
      setIntentError,
      setPausedInfo,
      setClosedInfo,
      setMirrorLog,
    });

    return connectMultiplayerSession({
      auth,
      clientRef,
      lobbyStateRef,
      matchId,
      options,
      setClosedInfo,
      setError,
      setEvents,
      setIntentError,
      setLastSeq,
      setLobbyState,
      setMirrorLog,
      setPausedInfo,
      setStatus,
      url,
    });

    // We intentionally re-run only on identity change of url/matchId/
    // auth.playerId — `options.socketFactory` is expected to be stable
    // (test fixtures memoise it; pages don't pass it). Auth tokens
    // refreshing under the hood don't need a reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, matchId, auth?.playerId]);

  const sendIntent = useCallback((intent: IIntentPayload) => {
    sendClientIntent(clientRef.current, intent);
  }, []);

  // Build the mirror session + its event list from the uncapped log.
  // Memoised on the log identity so a re-render that does not change
  // the event stream reuses the prior immutable session.
  const mirrorSession = useMemo(
    () => buildMirrorSession(mirrorLog),
    [mirrorLog],
  );
  const mirrorEvents = useMemo(
    () => deriveMirrorEvents(mirrorLog),
    [mirrorLog],
  );

  const sendGameIntent = useCallback((intent: IGameIntent): boolean => {
    if (!clientRef.current) return false;
    const payload = toServerIntent(intent);
    if (!payload) return false;
    clientRef.current.send(payload);
    return true;
  }, []);

  const clearIntentError = useCallback(() => {
    setIntentError(null);
  }, []);

  return {
    status,
    lobbyState,
    events,
    error,
    sendIntent,
    lastSeq,
    mirrorSession,
    mirrorEvents,
    sendGameIntent,
    intentError,
    clearIntentError,
    pausedInfo,
    closedInfo,
  };
}
