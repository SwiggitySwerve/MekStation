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
 * SSR safety: this hook MUST NOT call `connect()` during server render
 * (Next.js Pages Router invokes hooks during `getServerSideProps`-less
 * pages too, but the connection logic depends on `WebSocket` which only
 * exists in the browser). All real work runs inside the `useEffect`
 * branch so SSR sees a stable initial state.
 *
 * State surface:
 *   - `status`: connection lifecycle for the UI banner.
 *   - `lobbyState`: latest `ILobbyUpdated` payload (seats + status +
 *     hostPlayerId). `null` until the first snapshot arrives.
 *   - `events`: accumulated game events (capped to last 200 to avoid
 *     unbounded React state growth). Pages that need full history can
 *     re-fetch via the REST endpoint.
 *   - `error`: most recent error frame (cleared on reconnect).
 *   - `sendIntent`: forwarder to `client.send`.
 *
 * Pure presentational state — no campaign / engine business logic
 * lives here. Pages own composition.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  IClientAuth,
  IConnectOptions,
  IMultiplayerClient,
} from '@/lib/multiplayer/client';
import type {
  IIntentPayload,
  ILobbyUpdated,
  IMatchPaused,
  IMatchResumed,
  ISeatTimedOut,
} from '@/types/multiplayer/Protocol';

import { connect } from '@/lib/multiplayer/client';

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
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Cap accumulated events so a long match doesn't unbound React state.
 * 200 is enough for the tail of a fight; UIs that need full history
 * should fetch from the REST endpoint instead of polling React state.
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
 *   - a new event arrives
 *   - a `LobbyUpdated` snapshot lands
 *   - an error frame is received
 *
 * The returned `sendIntent` is stable across renders (memoised) so it's
 * safe to pass into child components without causing prop-change
 * cascades.
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

  // Stable ref for the live client so `sendIntent` can be memoised
  // without depending on a state value that re-renders on every event.
  const clientRef = useRef<IMultiplayerClient | null>(null);

  useEffect(() => {
    // SSR + pre-config gate: nothing to do until the page has all four
    // pieces it needs (browser env, url, matchId, auth blob).
    if (typeof window === 'undefined') return;
    if (!url || !matchId || !auth) return;

    setStatus('connecting');
    setError(null);

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
          setLobbyState(raw as ILobbyUpdated);
          return;
        }
        if (kind === 'MatchPaused') {
          setStatus('paused');
          // Stamp the pending slots into the most recent error so the
          // UI banner can print "waiting for X to reconnect".
          const paused = raw as IMatchPaused;
          setError({
            code: 'MATCH_PAUSED',
            reason: `Waiting for ${paused.pendingSlots.join(', ')} to reconnect`,
          });
          return;
        }
        if (kind === 'MatchResumed') {
          setStatus('ready');
          setError(null);
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
          return;
        }
      }
      // Plain game event — append to the rolling buffer + advance the
      // lastSeq cursor.
      setEvents((prev) => {
        const next = prev.concat([raw]);
        return next.length > MAX_EVENTS_RETAINED
          ? next.slice(next.length - MAX_EVENTS_RETAINED)
          : next;
      });
      setLastSeq(client.lastSeq());
    });

    const unsubError = client.on('error', (payload) => {
      setStatus('error');
      const err = payload as { code?: string; reason?: string } | Error;
      if (err instanceof Error) {
        setError({ code: 'CLIENT_ERROR', reason: err.message });
      } else {
        setError({ code: err.code, reason: err.reason });
      }
    });

    const unsubClose = client.on('close', () => {
      setStatus('closed');
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

  return {
    status,
    lobbyState,
    events,
    error,
    sendIntent,
    lastSeq,
  };
}
