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
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
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
  IMatchPaused,
  IMatchResumed,
  ISeatTimedOut,
} from '@/types/multiplayer/Protocol';

import { connect } from '@/lib/multiplayer/client';
import { toServerIntent } from '@/lib/multiplayer/gameIntentMap';
import {
  buildMirrorSession,
  mirrorEvents as deriveMirrorEvents,
} from '@/lib/multiplayer/mirrorMatchSession';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { RECONNECT_GRACE_MS } from '@/types/multiplayer/Protocol';

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
// Constants
// =============================================================================

/**
 * Cap the consumer-facing `events` tail so a long match doesn't unbound
 * React state. 200 is enough for the event-log panel; the mirror keeps
 * its OWN uncapped log because it must replay the full history to stay
 * in sync with the authoritative session.
 */
const MAX_EVENTS_RETAINED = 200;

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

    setStatus('connecting');
    setError(null);
    setIntentError(null);
    setPausedInfo(null);
    setClosedInfo(null);
    setMirrorLog([]);

    const client = connect(url, matchId, auth, {
      reconnect: options.reconnect ?? true,
      socketFactory: options.socketFactory,
      lastSeq: options.lastSeq,
    });
    clientRef.current = client;

    const unsubReady = client.on('ready', () => {
      setStatus('ready');
      setLastSeq(client.lastSeq());
    });

    const unsubEvent = client.on('event', (raw) => {
      // Branch on `kind` so the lobby snapshot doesn't pollute the
      // event log AND vice versa. Lifecycle envelopes (paused/resumed/
      // seat-timed-out) update derived state without entering the
      // event tail buffer.
      if (typeof raw === 'object' && raw !== null && 'kind' in raw) {
        const kind = (raw as { kind: string }).kind;
        if (kind === 'LobbyUpdated') {
          lobbyStateRef.current = raw as ILobbyUpdated;
          setLobbyState(raw as ILobbyUpdated);
          return;
        }
        if (kind === 'MatchPaused') {
          setStatus('paused');
          const paused = raw as IMatchPaused;
          const remainingMs = paused.graceRemainingMs ?? RECONNECT_GRACE_MS;
          const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
          const isHost =
            lobbyStateRef.current?.hostPlayerId != null &&
            lobbyStateRef.current.hostPlayerId === auth.playerId;
          const store = useGameplayStore.getState();
          store.setLocalMatchStatus(isHost ? 'guestPending' : 'hostPending', {
            graceMs: remainingMs,
            nowMs: Date.now(),
          });
          if (paused.pendingExpiresAtMs != null) {
            store.setLocalMatchGraceDeadline(paused.pendingExpiresAtMs);
          }
          // D6: surface the structured pause payload so the game
          // surface can name the pending seats + render the countdown.
          setPausedInfo({
            pendingSlots: paused.pendingSlots,
            graceRemainingMs: remainingMs,
            pendingExpiresAtMs: paused.pendingExpiresAtMs ?? null,
          });
          setError({
            code: 'MATCH_PAUSED',
            reason: `Waiting for opponent to reconnect (${remainingSeconds} seconds remaining)...`,
          });
          return;
        }
        if (kind === 'MatchResumed') {
          setStatus('ready');
          setError(null);
          setPausedInfo(null);
          useGameplayStore.getState().resetLocalMatchStatus();
          void (raw as IMatchResumed);
          return;
        }
        if (kind === 'SeatTimedOut') {
          // Surface the timeout so the host UI can render its modal.
          // We don't change `status` — match stays paused until the
          // host overrides via MarkSeatAi/ForfeitMatch.
          const timed = raw as ISeatTimedOut;
          setError({
            code: 'SEAT_TIMED_OUT',
            reason: `Seat ${timed.slotId} (player ${timed.playerId}) timed out`,
          });
          useGameplayStore.getState().setLocalMatchStatus('aborted');
          return;
        }
      }
      // Plain game event — append to the rolling buffer + advance the
      // lastSeq cursor. Also append to the uncapped mirror log so the
      // mirror session rebuilds with the full history.
      setEvents((prev) => {
        const next = prev.concat([raw]);
        return next.length > MAX_EVENTS_RETAINED
          ? next.slice(next.length - MAX_EVENTS_RETAINED)
          : next;
      });
      setMirrorLog((prev) => prev.concat([raw]));
      setLastSeq(client.lastSeq());
    });

    const unsubError = client.on('error', (payload) => {
      const err = payload as { code?: string; reason?: string } | Error;
      // A server `Error` envelope (wrong-phase, unauthorized-unit, ...)
      // carries a stable `code` string and is NON-FATAL — the
      // connection stays open. Surface it as `intentError` and DO NOT
      // flip `status` to 'error'. A connection-level failure (an
      // `Error` instance or a transport `code`) is fatal and flips
      // `status` (D3).
      if (err instanceof Error) {
        setStatus('error');
        setError({ code: 'CLIENT_ERROR', reason: err.message });
        return;
      }
      if (typeof err.code === 'string' && err.code !== 'CLIENT_ERROR') {
        // Treated as a non-fatal intent rejection — the server keeps
        // the socket open and the mirror is untouched.
        setIntentError({ code: err.code, reason: err.reason });
        return;
      }
      setStatus('error');
      setError({ code: err.code, reason: err.reason });
    });

    const unsubClose = client.on('close', (payload) => {
      setStatus('closed');
      // D6: capture the terminal payload so the surface renders the
      // route-back panel. A caller-initiated close passes `null`.
      if (payload && typeof payload === 'object') {
        const closeInfo = payload as { code?: string; reason?: string };
        setClosedInfo({ code: closeInfo.code, reason: closeInfo.reason });
      } else {
        setClosedInfo({});
      }
    });

    return () => {
      unsubReady();
      unsubEvent();
      unsubError();
      unsubClose();
      try {
        client.close();
      } catch {
        // ignore — already closed
      }
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
    // We intentionally re-run only on identity change of url/matchId/
    // auth.playerId — `options.socketFactory` is expected to be stable
    // (test fixtures memoise it; pages don't pass it). Auth tokens
    // refreshing under the hood don't need a reconnect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, matchId, auth?.playerId]);

  const sendIntent = useCallback((intent: IIntentPayload) => {
    if (!clientRef.current) return;
    clientRef.current.send(intent);
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
